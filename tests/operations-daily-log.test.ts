import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/lib/prisma';
import { signToken } from '../src/utils/jwt.utils';
import { operationsService } from '../src/modules/operations/operations.service';

describe('Operations, Inspections, Meters & Daily Logbook Domain', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const ASSET_BOILER_ID = 'a1000000-0000-0000-0000-000000000001';
  const TEMPLATE_ID = 'c1000000-0000-0000-0000-000000000001';
  const ITEM_TEMP_ID = 'i1000000-0000-0000-0000-000000000001';
  const ITEM_PRESS_ID = 'i1000000-0000-0000-0000-000000000002';
  const ITEM_WATER_ID = 'i1000000-0000-0000-0000-000000000003';
  const METER_TEMP_ID = 'm1000000-0000-0000-0000-000000000001';
  const METER_PRESS_ID = 'm1000000-0000-0000-0000-000000000002';
  const INSPECTION_ID = '99999999-9999-9999-9999-999999999999';
  const currentYear = new Date().getUTCFullYear();

  const validTokenTenantA = signToken({
    userId: USER_ID,
    email: 'boiler.operator@colombohotel.lk',
    organizationId: TENANT_A_ID,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Multi-Tenant Authentication & Sequential Inspection Numbers', () => {
    it('should reject unauthenticated requests to /api/operations/daily-log with 401', async () => {
      const res = await request(app)
        .post('/api/operations/daily-log')
        .send({ responses: [] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should generate INSP-YYYY-00001 when organization has no prior inspections', async () => {
      const mockTx = {
        inspection: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      const inspNum = await operationsService.generateInspectionNumber(
        TENANT_A_ID,
        mockTx
      );
      expect(inspNum).toBe(`INSP-${currentYear}-00001`);
    });

    it('should increment sequentially to INSP-YYYY-00015 when prior inspection is INSP-YYYY-00014', async () => {
      const mockTx = {
        inspection: {
          findFirst: vi.fn().mockResolvedValue({
            inspectionNumber: `INSP-${currentYear}-00014`,
          }),
        },
      } as any;

      const inspNum = await operationsService.generateInspectionNumber(
        TENANT_A_ID,
        mockTx
      );
      expect(inspNum).toBe(`INSP-${currentYear}-00015`);
    });
  });

  describe('2. Checklist Templates & Checklist Items CRUD', () => {
    it('POST /api/checklist-templates should create a boiler checklist template with nested items', async () => {
      const mockTx = {
        checklistTemplate: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null) // 1st call: check existing
            .mockResolvedValueOnce({     // 2nd call: return created template with items
              id: TEMPLATE_ID,
              organizationId: TENANT_A_ID,
              code: 'BOILER-SHIFT-LOG',
              name: 'Boiler Shift Operational Logbook',
              version: 1,
              items: [
                {
                  id: ITEM_TEMP_ID,
                  itemCode: 'FLUE_GAS_TEMP',
                  question: 'Record Flue Gas Stack Temperature (°C)',
                  responseType: 'number',
                  minValue: 140,
                  maxValue: 250,
                  unitCode: '°C',
                  sequenceNo: 1,
                },
                {
                  id: ITEM_PRESS_ID,
                  itemCode: 'STEAM_PRESSURE',
                  question: 'Record Main Steam Header Pressure (bar)',
                  responseType: 'number',
                  minValue: 8.0,
                  maxValue: 12.0,
                  unitCode: 'bar',
                  sequenceNo: 2,
                },
              ],
            }),
          create: vi.fn().mockResolvedValue({
            id: TEMPLATE_ID,
            organizationId: TENANT_A_ID,
            code: 'BOILER-SHIFT-LOG',
            name: 'Boiler Shift Operational Logbook',
            version: 1,
          }),
        },
        checklistItem: {
          create: vi.fn().mockResolvedValue({}),
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(
        async (callback: any) => callback(mockTx)
      );

      const res = await request(app)
        .post('/api/checklist-templates')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          code: 'boiler-shift-log',
          name: 'Boiler Shift Operational Logbook',
          items: [
            {
              itemCode: 'flue_gas_temp',
              question: 'Record Flue Gas Stack Temperature (°C)',
              responseType: 'number',
              minValue: 140,
              maxValue: 250,
              unitCode: '°C',
            },
            {
              itemCode: 'steam_pressure',
              question: 'Record Main Steam Header Pressure (bar)',
              responseType: 'number',
              minValue: 8.0,
              maxValue: 12.0,
              unitCode: 'bar',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('BOILER-SHIFT-LOG');
      expect(res.body.data.items).toHaveLength(2);
      expect(mockTx.checklistItem.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Meter Readings CRUD', () => {
    it('POST /api/meter-readings should record a manual meter reading for an asset meter', async () => {
      vi.spyOn(operationsService, 'createMeterReading').mockResolvedValueOnce({
        id: 'mr-101',
        organizationId: TENANT_A_ID,
        assetMeterId: METER_PRESS_ID,
        readingValue: 10.5 as any,
        recordedAt: new Date(),
        source: 'manual',
        qualityStatus: 'valid',
        notes: 'Morning shift pressure check',
        recordedBy: USER_ID,
        createdAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/meter-readings')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          meterCode: 'MTR-BLR001-PRESS',
          readingValue: 10.5,
          notes: 'Morning shift pressure check',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.readingValue)).toBe(10.5);
    });
  });

  describe('4. Composite Daily Logbook Endpoint (POST /api/operations/daily-log)', () => {
    it('should atomically save shift readings (Temperature, Pressure, Water Level) to inspection_responses and meter_readings inside a single database transaction', async () => {
      const checklistItemsMap: Record<string, any> = {
        FLUE_GAS_TEMP: {
          id: ITEM_TEMP_ID,
          organizationId: TENANT_A_ID,
          checklistTemplateId: TEMPLATE_ID,
          itemCode: 'FLUE_GAS_TEMP',
          question: 'Flue Gas Stack Temperature',
          responseType: 'number',
          minValue: 140,
          maxValue: 250,
          unitCode: '°C',
        },
        STEAM_PRESSURE: {
          id: ITEM_PRESS_ID,
          organizationId: TENANT_A_ID,
          checklistTemplateId: TEMPLATE_ID,
          itemCode: 'STEAM_PRESSURE',
          question: 'Operating Steam Pressure',
          responseType: 'number',
          minValue: 8.0,
          maxValue: 12.0,
          unitCode: 'bar',
        },
        WATER_LEVEL_OK: {
          id: ITEM_WATER_ID,
          organizationId: TENANT_A_ID,
          checklistTemplateId: TEMPLATE_ID,
          itemCode: 'WATER_LEVEL_OK',
          question: 'Sight Glass Drum Water Level Normal?',
          responseType: 'yes_no',
          minValue: null,
          maxValue: null,
          unitCode: null,
        },
      };

      const metersMap: Record<string, any> = {
        'MTR-BLR001-TEMP': {
          id: METER_TEMP_ID,
          organizationId: TENANT_A_ID,
          assetId: ASSET_BOILER_ID,
          meterCode: 'MTR-BLR001-TEMP',
        },
        'MTR-BLR001-PRESS': {
          id: METER_PRESS_ID,
          organizationId: TENANT_A_ID,
          assetId: ASSET_BOILER_ID,
          meterCode: 'MTR-BLR001-PRESS',
        },
      };

      const mockTx = {
        asset: {
          findFirst: vi.fn().mockResolvedValue({
            id: ASSET_BOILER_ID,
            locationId: 'loc-1',
          }),
        },
        checklistTemplate: {
          findFirst: vi.fn().mockResolvedValue({ id: TEMPLATE_ID }),
        },
        inspection: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: INSPECTION_ID,
            organizationId: TENANT_A_ID,
            inspectionNumber: `INSP-${currentYear}-00001`,
            checklistTemplateId: TEMPLATE_ID,
            assetId: ASSET_BOILER_ID,
            status: 'in_progress',
          }),
          update: vi.fn().mockImplementation(async ({ data }) => ({
            id: INSPECTION_ID,
            organizationId: TENANT_A_ID,
            inspectionNumber: `INSP-${currentYear}-00001`,
            checklistTemplateId: TEMPLATE_ID,
            assetId: ASSET_BOILER_ID,
            status: data.status,
            overallResult: data.overallResult,
            completedAt: data.completedAt,
          })),
        },
        checklistItem: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            return checklistItemsMap[where.itemCode] || null;
          }),
        },
        inspectionResponse: {
          upsert: vi.fn().mockImplementation(async ({ create }) => ({
            id: `resp-${create.checklistItemId}`,
            ...create,
          })),
        },
        assetMeter: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            return metersMap[where.meterCode] || null;
          }),
        },
        meterReading: {
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: `mr-${data.assetMeterId}`,
            ...data,
          })),
        },
      };

      const txSpy = vi
        .spyOn(prisma, '$transaction')
        .mockImplementationOnce(async (callback: any) => callback(mockTx));

      const res = await request(app)
        .post('/api/operations/daily-log')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          assetId: ASSET_BOILER_ID,
          checklistTemplateId: TEMPLATE_ID,
          shiftName: 'Morning Shift A',
          notes: 'Boiler BLR-001 normal firing load',
          responses: [
            {
              itemCode: 'FLUE_GAS_TEMP',
              meterCode: 'MTR-BLR001-TEMP',
              value: 215.5,
              notes: 'Stack temperature steady',
            },
            {
              itemCode: 'STEAM_PRESSURE',
              meterCode: 'MTR-BLR001-PRESS',
              value: 10.4,
              notes: 'Header pressure nominal',
            },
            {
              itemCode: 'WATER_LEVEL_OK',
              value: true,
              notes: 'Sight glass blown down and verified clear',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(txSpy).toHaveBeenCalledTimes(1);

      // Verify all 3 checklist responses were saved to inspection_responses
      expect(mockTx.inspectionResponse.upsert).toHaveBeenCalledTimes(3);
      expect(res.body.data.inspectionResponses).toHaveLength(3);

      // Verify both meter readings (Temperature & Pressure) were saved to meter_readings
      expect(mockTx.meterReading.create).toHaveBeenCalledTimes(2);
      expect(res.body.data.meterReadings).toHaveLength(2);

      // Verify overall inspection was marked completed with 'pass'
      expect(res.body.data.summary.overallResult).toBe('pass');
      expect(res.body.data.summary.failedItemsCount).toBe(0);
    });

    it('should automatically flag resultStatus="fail" and overallResult="fail" when a reading exceeds checklist item maxValue', async () => {
      const mockTx = {
        asset: {
          findFirst: vi.fn().mockResolvedValue({ id: ASSET_BOILER_ID }),
        },
        checklistTemplate: {
          findFirst: vi.fn().mockResolvedValue({ id: TEMPLATE_ID }),
        },
        inspection: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: INSPECTION_ID,
            organizationId: TENANT_A_ID,
            inspectionNumber: `INSP-${currentYear}-00002`,
            checklistTemplateId: TEMPLATE_ID,
          }),
          update: vi.fn().mockImplementation(async ({ data }) => ({
            id: INSPECTION_ID,
            inspectionNumber: `INSP-${currentYear}-00002`,
            status: data.status,
            overallResult: data.overallResult,
          })),
        },
        checklistItem: {
          findFirst: vi.fn().mockResolvedValue({
            id: ITEM_TEMP_ID,
            organizationId: TENANT_A_ID,
            checklistTemplateId: TEMPLATE_ID,
            itemCode: 'FLUE_GAS_TEMP',
            responseType: 'number',
            minValue: 140,
            maxValue: 230, // Max allowed is 230°C
          }),
        },
        inspectionResponse: {
          upsert: vi.fn().mockImplementation(async ({ create }) => ({
            id: 'resp-fail-1',
            ...create,
          })),
        },
        assetMeter: {
          findFirst: vi.fn().mockResolvedValue({
            id: METER_TEMP_ID,
            organizationId: TENANT_A_ID,
            meterCode: 'MTR-BLR001-TEMP',
          }),
        },
        meterReading: {
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'mr-temp-high',
            ...data,
          })),
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(
        async (callback: any) => callback(mockTx)
      );

      const res = await request(app)
        .post('/api/operations/daily-log')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          assetId: ASSET_BOILER_ID,
          checklistTemplateId: TEMPLATE_ID,
          responses: [
            {
              itemCode: 'FLUE_GAS_TEMP',
              meterCode: 'MTR-BLR001-TEMP',
              value: 268.0, // Exceeds 230°C max threshold!
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.inspectionResponses[0].resultStatus).toBe('fail');
      expect(res.body.data.summary.overallResult).toBe('fail');
      expect(res.body.data.summary.failedItemsCount).toBe(1);
    });

    it('should abort the transaction if any referenced meter or checklist item belongs to another tenant or does not exist', async () => {
      const mockTx = {
        asset: {
          findFirst: vi.fn().mockResolvedValue({ id: ASSET_BOILER_ID }),
        },
        checklistTemplate: {
          findFirst: vi.fn().mockResolvedValue({ id: TEMPLATE_ID }),
        },
        inspection: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: INSPECTION_ID,
            organizationId: TENANT_A_ID,
            inspectionNumber: `INSP-${currentYear}-00003`,
            checklistTemplateId: TEMPLATE_ID,
          }),
        },
        checklistItem: {
          findFirst: vi.fn().mockResolvedValue({
            id: ITEM_PRESS_ID,
            organizationId: TENANT_A_ID,
            checklistTemplateId: TEMPLATE_ID,
            itemCode: 'STEAM_PRESSURE',
            responseType: 'number',
            minValue: 8,
            maxValue: 12,
          }),
        },
        inspectionResponse: {
          upsert: vi.fn().mockResolvedValue({ id: 'resp-1' }),
        },
        assetMeter: {
          // Foreign/unknown meter returns null -> triggers ForeignKeyViolationError inside $transaction
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(
        async (callback: any) => callback(mockTx)
      );

      const res = await request(app)
        .post('/api/operations/daily-log')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          assetId: ASSET_BOILER_ID,
          checklistTemplateId: TEMPLATE_ID,
          responses: [
            {
              itemCode: 'STEAM_PRESSURE',
              meterCode: 'NON-EXISTENT-FOREIGN-METER',
              value: 10.2,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
    });
  });
});
