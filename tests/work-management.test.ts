import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/lib/prisma';
import { signToken } from '../src/utils/jwt.utils';
import {
  validateStatusTransition,
  isValidStatusTransition,
  InvalidWorkOrderStatusTransitionError,
} from '../src/modules/work-orders/work-order.state-machine';
import { workOrdersService } from '../src/modules/work-orders/work-orders.service';
import { runWithTenantContext } from '../src/tenant/tenant.context';

describe('Work Management Domain (Work Orders, Tasks, Labor, Parts & State Machine)', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const WO_ID = '77777777-7777-7777-7777-777777777777';
  const currentYear = new Date().getUTCFullYear();

  const validTokenTenantA = signToken({
    userId: USER_ID,
    email: 'chief.engineer@hotelgroup.com',
    organizationId: TENANT_A_ID,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Work Order State Machine (draft -> open -> in_progress -> completed -> closed)', () => {
    it('should permit the full canonical lifecycle transition sequence: draft -> open -> in_progress -> completed -> closed', () => {
      expect(() => validateStatusTransition('draft', 'open')).not.toThrow();
      expect(() => validateStatusTransition('open', 'in_progress')).not.toThrow();
      expect(() => validateStatusTransition('in_progress', 'completed')).not.toThrow();
      expect(() => validateStatusTransition('completed', 'closed')).not.toThrow();
    });

    it('should permit operational intermediate states (approved, assigned, on_hold, cancelled)', () => {
      expect(isValidStatusTransition('open', 'approved')).toBe(true);
      expect(isValidStatusTransition('approved', 'assigned')).toBe(true);
      expect(isValidStatusTransition('assigned', 'in_progress')).toBe(true);
      expect(isValidStatusTransition('in_progress', 'on_hold')).toBe(true);
      expect(isValidStatusTransition('on_hold', 'in_progress')).toBe(true);
      expect(isValidStatusTransition('draft', 'cancelled')).toBe(true);
    });

    it('should reject illegal forward jumps (e.g. draft -> in_progress, draft -> completed, open -> closed)', () => {
      expect(() => validateStatusTransition('draft', 'in_progress')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('draft', 'completed')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('draft', 'closed')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('open', 'completed')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('open', 'closed')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('in_progress', 'closed')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });

    it('should strictly block any transition out of terminal states (closed, cancelled)', () => {
      expect(() => validateStatusTransition('closed', 'open')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('closed', 'in_progress')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('cancelled', 'draft')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('cancelled', 'open')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });

    it('should reject no-op self-transitions (e.g. open -> open)', () => {
      expect(() => validateStatusTransition('open', 'open')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });
  });

  describe('2. Per-Organization Sequential Work Order Number Generator', () => {
    it('should generate WO-YYYY-00001 when organization has no prior work orders', async () => {
      const mockTx = {
        workOrder: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      const woNumber = await workOrdersService.generateWorkOrderNumber(TENANT_A_ID, mockTx);
      expect(woNumber).toBe(`WO-${currentYear}-00001`);
      expect(mockTx.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: TENANT_A_ID,
            workOrderNumber: { startsWith: `WO-${currentYear}-` },
          },
        })
      );
    });

    it('should increment sequentially based on the organization latest work_order_number', async () => {
      const mockTx = {
        workOrder: {
          findFirst: vi.fn().mockResolvedValue({
            workOrderNumber: `WO-${currentYear}-00041`,
          }),
        },
      } as any;

      const woNumber = await workOrdersService.generateWorkOrderNumber(TENANT_A_ID, mockTx);
      expect(woNumber).toBe(`WO-${currentYear}-00042`);
    });

    it('should maintain independent sequences across different tenant organizations', async () => {
      const mockTx = {
        workOrder: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            if (where.organizationId === TENANT_A_ID) {
              return { workOrderNumber: `WO-${currentYear}-00105` };
            }
            return null; // TENANT_B has no work orders yet
          }),
        },
      } as any;

      const numberTenantA = await workOrdersService.generateWorkOrderNumber(TENANT_A_ID, mockTx);
      const numberTenantB = await workOrdersService.generateWorkOrderNumber(TENANT_B_ID, mockTx);

      expect(numberTenantA).toBe(`WO-${currentYear}-00106`);
      expect(numberTenantB).toBe(`WO-${currentYear}-00001`);
    });
  });

  describe('3. Transactional Status History Logging in Service Layer', () => {
    it('should execute status update and status_history log inside a database transaction', async () => {
      // Mock existing work order in 'open' status
      vi.spyOn(workOrdersService, 'getWorkOrderById').mockResolvedValueOnce({
        id: WO_ID,
        organizationId: TENANT_A_ID,
        workOrderNumber: `WO-${currentYear}-00001`,
        status: 'open',
        actualStartAt: null,
        actualEndAt: null,
      } as any);

      const mockTxWorkOrderUpdate = vi.fn().mockResolvedValue({ id: WO_ID, status: 'in_progress' });
      const mockTxStatusHistoryCreate = vi.fn().mockResolvedValue({ id: 'hist-2' });
      const mockTxWorkOrderFindUnique = vi.fn().mockResolvedValue({
        id: WO_ID,
        organizationId: TENANT_A_ID,
        workOrderNumber: `WO-${currentYear}-00001`,
        status: 'in_progress',
        statusHistory: [
          { oldStatus: null, newStatus: 'draft' },
          { oldStatus: 'draft', newStatus: 'open' },
          { oldStatus: 'open', newStatus: 'in_progress', changedBy: USER_ID },
        ],
      });

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          workOrder: {
            update: mockTxWorkOrderUpdate,
            findUnique: mockTxWorkOrderFindUnique,
          },
          workOrderStatusHistory: {
            create: mockTxStatusHistoryCreate,
          },
        };
        return callback(fakeTx);
      });

      const result = await runWithTenantContext(TENANT_A_ID, async () =>
        workOrdersService.transitionWorkOrderStatus(
          WO_ID,
          { status: 'in_progress', comment: 'Technician started boiler burner inspection' },
          USER_ID
        )
      );

      expect(mockTxWorkOrderUpdate).toHaveBeenCalledTimes(1);
      // Should automatically set actualStartAt when entering in_progress
      expect(mockTxWorkOrderUpdate.mock.calls[0][0].data.status).toBe('in_progress');
      expect(mockTxWorkOrderUpdate.mock.calls[0][0].data.actualStartAt).toBeInstanceOf(Date);

      // Should log to work_order_status_history in the same transaction
      expect(mockTxStatusHistoryCreate).toHaveBeenCalledTimes(1);
      expect(mockTxStatusHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: TENANT_A_ID,
          workOrderId: WO_ID,
          oldStatus: 'open',
          newStatus: 'in_progress',
          changedBy: USER_ID,
          comment: 'Technician started boiler burner inspection',
        }),
      });

      expect(result?.status).toBe('in_progress');
      expect(result?.statusHistory).toHaveLength(3);
    });
  });

  describe('4. Work Orders & State Transition REST API Endpoints', () => {
    it('POST /api/work-orders should create a new work order in draft status with generated work_order_number', async () => {
      vi.spyOn(workOrdersService, 'createWorkOrder').mockResolvedValueOnce({
        id: WO_ID,
        organizationId: TENANT_A_ID,
        workOrderNumber: `WO-${currentYear}-00001`,
        siteId: 'site-1',
        maintenanceTypeId: 'mtype-pm',
        assetId: 'asset-blr-1',
        title: 'Annual Boiler Safety Valve Calibration',
        priority: 'high',
        status: 'draft',
        tasks: [
          {
            id: 'task-1',
            sequenceNo: 1,
            title: 'Isolate steam header',
            status: 'pending',
          },
        ],
        statusHistory: [
          {
            id: 'hist-1',
            oldStatus: null,
            newStatus: 'draft',
            comment: 'Work order initialized in draft status',
          },
        ],
      } as any);

      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          siteId: 'site-1',
          maintenanceTypeId: 'mtype-pm',
          assetId: 'asset-blr-1',
          title: 'Annual Boiler Safety Valve Calibration',
          priority: 'high',
          tasks: [{ title: 'Isolate steam header', sequenceNo: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workOrderNumber).toBe(`WO-${currentYear}-00001`);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.statusHistory).toHaveLength(1);
    });

    it('POST /api/work-orders/:id/status should transition status and return updated history', async () => {
      vi.spyOn(workOrdersService, 'transitionWorkOrderStatus').mockResolvedValueOnce({
        id: WO_ID,
        organizationId: TENANT_A_ID,
        workOrderNumber: `WO-${currentYear}-00001`,
        status: 'open',
        statusHistory: [
          { oldStatus: null, newStatus: 'draft' },
          { oldStatus: 'draft', newStatus: 'open', comment: 'Released for execution' },
        ],
      } as any);

      const res = await request(app)
        .post(`/api/work-orders/${WO_ID}/status`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          status: 'open',
          comment: 'Released for execution',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.statusHistory).toHaveLength(2);
    });

    it('POST /api/work-orders/:id/status should return 400 INVALID_STATUS_TRANSITION on illegal transition', async () => {
      vi.spyOn(workOrdersService, 'transitionWorkOrderStatus').mockRejectedValueOnce(
        new InvalidWorkOrderStatusTransitionError('draft', 'completed', ['open', 'cancelled'])
      );

      const res = await request(app)
        .post(`/api/work-orders/${WO_ID}/status`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          status: 'completed',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(res.body.error.current_status).toBe('draft');
      expect(res.body.error.attempted_status).toBe('completed');
      expect(res.body.error.allowed_transitions).toEqual(['open', 'cancelled']);
    });
  });

  describe('5. Work Order Tasks, Labor, and Parts Sub-Resource Endpoints', () => {
    it('POST /api/work-orders/:id/tasks & PATCH /api/work-orders/:id/tasks/:taskId should manage tasks', async () => {
      vi.spyOn(workOrdersService, 'addWorkOrderTask').mockResolvedValueOnce({
        id: 'task-2',
        organizationId: TENANT_A_ID,
        workOrderId: WO_ID,
        title: 'Inspect burner nozzle assembly',
        sequenceNo: 2,
        status: 'pending',
      } as any);

      const createRes = await request(app)
        .post(`/api/work-orders/${WO_ID}/tasks`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          title: 'Inspect burner nozzle assembly',
          sequenceNo: 2,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.title).toBe('Inspect burner nozzle assembly');

      vi.spyOn(workOrdersService, 'updateWorkOrderTask').mockResolvedValueOnce({
        id: 'task-2',
        organizationId: TENANT_A_ID,
        workOrderId: WO_ID,
        title: 'Inspect burner nozzle assembly',
        sequenceNo: 2,
        status: 'completed',
        completedBy: USER_ID,
        completedAt: new Date(),
      } as any);

      const patchRes = await request(app)
        .patch(`/api/work-orders/${WO_ID}/tasks/task-2`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          status: 'completed',
          completionNotes: 'Nozzle cleaned and verified',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.status).toBe('completed');
    });

    it('POST /api/work-orders/:id/labor should record technician labor hours and cost', async () => {
      vi.spyOn(workOrdersService, 'addWorkOrderLabor').mockResolvedValueOnce({
        id: 'labor-1',
        organizationId: TENANT_A_ID,
        workOrderId: WO_ID,
        userId: USER_ID,
        technicianName: 'Kamal Perera',
        hoursWorked: 4.5,
        hourlyCost: 2500,
        notes: 'Replaced pressure relief gasket and tested pop pressure',
      } as any);

      const res = await request(app)
        .post(`/api/work-orders/${WO_ID}/labor`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          userId: USER_ID,
          technicianName: 'Kamal Perera',
          hoursWorked: 4.5,
          hourlyCost: 2500,
          notes: 'Replaced pressure relief gasket and tested pop pressure',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hoursWorked).toBe(4.5);
    });

    it('POST /api/work-orders/:id/parts should record spare parts consumed', async () => {
      vi.spyOn(workOrdersService, 'addWorkOrderPart').mockResolvedValueOnce({
        id: 'part-1',
        organizationId: TENANT_A_ID,
        workOrderId: WO_ID,
        partCode: 'GKT-SPIRAL-4IN',
        description: '4-inch Spiral Wound Graphite Gasket',
        quantity: 2,
        unitCost: 4800,
      } as any);

      const res = await request(app)
        .post(`/api/work-orders/${WO_ID}/parts`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          partCode: 'GKT-SPIRAL-4IN',
          description: '4-inch Spiral Wound Graphite Gasket',
          quantity: 2,
          unitCost: 4800,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partCode).toBe('GKT-SPIRAL-4IN');
      expect(res.body.data.quantity).toBe(2);
    });
  });
});

