import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OfflineSyncService,
  SyncQueueItem,
  OfflineDraft,
  generateUUID,
} from '../frontend/src/services/offline-sync.service';

describe('LuminaFM Offline-Capable PWA Engine & Operator Synchronization Architecture', () => {
  let syncService: OfflineSyncService;
  const TENANT_ID = 'tenant-colombo-hotel';
  const USER_ID = 'user-operator-kavinda';

  beforeEach(() => {
    syncService = new OfflineSyncService();
    syncService.setSessionScope(TENANT_ID, USER_ID);
    syncService.clearQueue();
  });

  describe('1. Offline Logbook Creation & Idempotency Key Generation', () => {
    it('should generate a valid RFC 4122 UUIDv4 idempotency key for each offline submission', () => {
      const id1 = generateUUID();
      const id2 = generateUUID();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should enqueue an offline daily logbook with pending status and immutable clientSubmissionId', () => {
      const submissionId = generateUUID();
      const queued = syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1000000-0000-0000-0000-000000000001',
        assetCode: 'BLR-001',
        title: 'Morning Shift Logbook (BLR-001)',
        payload: {
          shift: 'SHIFT_A',
          logDate: '2026-11-15',
          operatingPeriod: '08:00',
          readings: { operating_steam_pressure: 8.5, flue_gas_stack_temperature: 175.0 },
        },
        baseVersion: 1,
      });

      expect(queued.clientSubmissionId).toBe(submissionId);
      expect(queued.status).toBe('pending');
      expect(queued.retryCount).toBe(0);
      expect(queued.maxRetries).toBe(5);
      expect(queued.baseVersion).toBe(1);

      const allQueue = syncService.getQueue();
      expect(allQueue).toHaveLength(1);
      expect(allQueue[0].clientSubmissionId).toBe(submissionId);
    });
  });

  describe('2. Local Draft Storage & Incremental Saving', () => {
    it('should save, retrieve and update local drafts prior to submission', () => {
      const draft: Omit<OfflineDraft, 'updatedAt'> = {
        draftId: 'draft-blr-001-shift-a',
        assetId: 'a1000000-0000-0000-0000-000000000001',
        assetCode: 'BLR-001',
        shift: 'SHIFT_A',
        logDate: '2026-11-15',
        data: { steamPressure: 8.5, flueTemp: 175.0, waterLevel: true },
      };

      syncService.saveDraft(draft);

      const retrieved = syncService.getDraft(
        'a1000000-0000-0000-0000-000000000001',
        'SHIFT_A',
        '2026-11-15'
      );
      expect(retrieved).not.toBeNull();
      expect(retrieved?.data.steamPressure).toBe(8.5);

      // Update draft
      syncService.saveDraft({
        ...draft,
        data: { ...draft.data, steamPressure: 8.7 },
      });

      const updated = syncService.getDraft(
        'a1000000-0000-0000-0000-000000000001',
        'SHIFT_A',
        '2026-11-15'
      );
      expect(updated?.data.steamPressure).toBe(8.7);
    });

    it('should delete draft upon final submission', () => {
      syncService.saveDraft({
        draftId: 'draft-temp',
        assetId: 'a1',
        assetCode: 'BLR-001',
        shift: 'SHIFT_A',
        logDate: '2026-11-15',
        data: {},
      });

      expect(syncService.getDraft('a1', 'SHIFT_A', '2026-11-15')).not.toBeNull();
      syncService.deleteDraft('draft-temp');
      expect(syncService.getDraft('a1', 'SHIFT_A', '2026-11-15')).toBeNull();
    });
  });

  describe('3. Offline Photo Attachments Queue', () => {
    it('should queue offline photo attachments and link them to clientSubmissionId', () => {
      const submissionId = generateUUID();
      const att = syncService.saveOfflineAttachment({
        clientSubmissionId: submissionId,
        fileName: 'boiler-drum-glass.jpg',
        mimeType: 'image/jpeg',
        dataUri: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      });

      expect(att.clientSubmissionId).toBe(submissionId);
      expect(att.uploaded).toBe(false);

      const pending = syncService.getPendingAttachments(submissionId);
      expect(pending).toHaveLength(1);
      expect(pending[0].fileName).toBe('boiler-drum-glass.jpg');

      syncService.markAttachmentUploaded(att.id);
      expect(syncService.getPendingAttachments(submissionId)).toHaveLength(0);
    });
  });

  describe('4. Network Loss During Submission & Exponential Backoff Calculation', () => {
    it('should calculate exponential backoff delay with upper bounds', () => {
      const delay0 = syncService.calculateNextRetryDelayMs(0); // ~1000ms + jitter
      const delay1 = syncService.calculateNextRetryDelayMs(1); // ~2000ms + jitter
      const delay2 = syncService.calculateNextRetryDelayMs(2); // ~4000ms + jitter
      const delay5 = syncService.calculateNextRetryDelayMs(5); // ~32000ms + jitter
      const delay8 = syncService.calculateNextRetryDelayMs(8); // capped at 60000ms

      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThan(1600);

      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay5).toBeGreaterThanOrEqual(32000);
      expect(delay8).toBe(60000);
    });

    it('should pause synchronization when browser goes offline', () => {
      syncService.setMockOnlineStatus(false);
      const status = syncService.getStatus();
      expect(status.isOnline).toBe(false);
      expect(status.state).toBe('offline');
    });
  });

  describe('5. Authoritative PostgreSQL Database & Conflict Detection (409)', () => {
    it('should flag conflict when server rejects submission due to concurrent modification', async () => {
      const submissionId = generateUUID();
      const item = syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1000000-0000-0000-0000-000000000001',
        assetCode: 'BLR-001',
        title: 'Morning Shift Logbook',
        payload: { shift: 'SHIFT_A', logDate: '2026-11-15', operatingPeriod: '08:00' },
        baseVersion: 1,
      });

      // Simulate conflict rejection from server
      const conflictError = {
        status: 409,
        code: 'OPERATIONAL_SYNC_CONFLICT',
        message: 'Conflict: shift already submitted by another operator at 08:05:00',
        serverRecord: {
          logNumber: 'LOG-BLR-20261115-0800',
          operatorName: 'Dr. Nalin Fernando',
          completedAt: '2026-11-15T08:05:00Z',
          status: 'completed',
        },
      };

      // Mock private dispatch method to throw conflict
      (syncService as any).dispatchItemToServer = vi.fn().mockRejectedValue(conflictError);

      syncService.setMockOnlineStatus(true);
      const res = await syncService.processQueue();

      expect(res.conflicts).toBe(1);

      const queue = syncService.getQueue();
      const conflicted = queue.find((i) => i.clientSubmissionId === submissionId);
      expect(conflicted?.status).toBe('conflict');
      expect(conflicted?.conflictDetails).not.toBeNull();
      expect(conflicted?.conflictDetails?.serverRecord?.operatorName).toBe('Dr. Nalin Fernando');
    });

    it('should require a mandatory justification reason when resolving conflict as traceable amendment', async () => {
      const submissionId = generateUUID();
      syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Shift Log',
        payload: { readings: {} },
        baseVersion: 1,
      });

      // Mark as conflict
      const queue = syncService.getQueue();
      queue[0].status = 'conflict';
      (syncService as any).saveQueue(queue);

      // Attempt resolve with empty reason -> must throw
      await expect(
        syncService.resolveConflict(submissionId, 'amend_as_traceable_revision', '')
      ).rejects.toThrow(/justification reason is strictly required/);

      // Resolve with valid reason -> updates to traceable amendment
      await syncService.resolveConflict(
        submissionId,
        'amend_as_traceable_revision',
        'Re-verified drum pressure calibration with deadweight tester; updating shift record.'
      );

      const updatedQueue = syncService.getQueue();
      const updatedItem = updatedQueue[0];
      expect(updatedItem.status).toBe('pending');
      expect(updatedItem.baseVersion).toBe(2);
      expect(updatedItem.payload.isAmendmentSubmission).toBe(true);
      expect(updatedItem.payload.amendmentReason).toContain('deadweight tester');
    });

    it('should allow discarding local duplicate without altering authoritative server data', async () => {
      const submissionId = generateUUID();
      syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Duplicate Log',
        payload: {},
        baseVersion: 1,
      });

      const queue = syncService.getQueue();
      queue[0].status = 'conflict';
      (syncService as any).saveQueue(queue);

      await syncService.resolveConflict(submissionId, 'discard_local_duplicate');

      const afterDiscard = syncService.getQueue();
      expect(afterDiscard).toHaveLength(0);
    });
  });

  describe('6. Recovery After Application Restart', () => {
    it('should reset stale "syncing" items back to "pending" upon service launch', () => {
      const queue: SyncQueueItem[] = [
        {
          id: 'item-1',
          clientSubmissionId: 'sub-1',
          entityType: 'daily_logbook',
          tenantId: TENANT_ID,
          userId: USER_ID,
          assetId: 'a1',
          assetCode: 'BLR-001',
          title: 'Interrupted Sync Item',
          payload: {},
          baseVersion: 1,
          status: 'syncing', // Browser crashed during sync
          retryCount: 1,
          maxRetries: 5,
          createdAt: new Date().toISOString(),
        },
      ];

      (syncService as any).saveQueue(queue);
      expect(syncService.getQueue()[0].status).toBe('syncing');

      // Trigger restart recovery
      syncService.recoverStaleSyncingItems();

      const recovered = syncService.getQueue();
      expect(recovered[0].status).toBe('pending');
      expect(recovered[0].nextRetryAt).toBeDefined();
    });
  });

  describe('7. Secure Logout & Data Isolation', () => {
    it('should detect pending queue items before user logs out', () => {
      syncService.enqueueSubmission({
        clientSubmissionId: generateUUID(),
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Pending Shift',
        payload: {},
        baseVersion: 1,
      });

      const check = syncService.checkPendingSyncBeforeLogout();
      expect(check.pendingCount).toBe(1);
      expect(check.conflictCount).toBe(0);
    });

    it('should purge tenant drafts and queue when clearPending is explicitly chosen on shared device', () => {
      syncService.enqueueSubmission({
        clientSubmissionId: generateUUID(),
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Pending Shift',
        payload: {},
        baseVersion: 1,
      });

      syncService.handleSecureLogout(true);

      expect(syncService.getQueue()).toHaveLength(0);
      expect(syncService.getAllDrafts()).toHaveLength(0);
    });

    it('should preserve queued records when operator chooses to leave queued on device', () => {
      syncService.enqueueSubmission({
        clientSubmissionId: generateUUID(),
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Preserved Shift',
        payload: {},
        baseVersion: 1,
      });

      syncService.handleSecureLogout(false);
      expect(syncService.getQueue()).toHaveLength(1);
    });
  });

  describe('8. Prolonged Offline Periods & FIFO Queue Processing', () => {
    it('should accumulate multiple shift records during long offline periods and process sequentially', async () => {
      syncService.setMockOnlineStatus(false);

      const sub1 = generateUUID();
      const sub2 = generateUUID();
      const sub3 = generateUUID();

      syncService.enqueueSubmission({
        clientSubmissionId: sub1,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: '08:00 Reading',
        payload: { period: '08:00' },
        baseVersion: 1,
      });

      syncService.enqueueSubmission({
        clientSubmissionId: sub2,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: '10:00 Reading',
        payload: { period: '10:00' },
        baseVersion: 1,
      });

      syncService.enqueueSubmission({
        clientSubmissionId: sub3,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: '12:00 Reading',
        payload: { period: '12:00' },
        baseVersion: 1,
      });

      expect(syncService.getQueue()).toHaveLength(3);

      // Reconnect to network
      syncService.setMockOnlineStatus(true);
      (syncService as any).dispatchItemToServer = vi.fn().mockResolvedValue({ status: 'completed' });

      const res = await syncService.processQueue();
      expect(res.synced).toBe(3);
      expect(res.conflicts).toBe(0);
      expect(res.failed).toBe(0);

      const queue = syncService.getQueue();
      expect(queue.every((i) => i.status === 'synced')).toBe(true);
    });

    it('should support idempotent server replay when duplicate event occurs', async () => {
      const submissionId = generateUUID();
      syncService.setMockOnlineStatus(true);

      const serverRecord = {
        id: 'insp-2026-001',
        inspectionNumber: 'LOG-BLR-20261115-0800',
        status: 'completed',
        clientSubmissionId: submissionId,
      };

      // Mock first dispatch
      (syncService as any).dispatchItemToServer = vi.fn().mockResolvedValue(serverRecord);

      syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Initial Submission',
        payload: { readings: {} },
        baseVersion: 1,
      });

      const res1 = await syncService.processQueue();
      expect(res1.synced).toBe(1);

      // Re-dispatch identical clientSubmissionId (simulating duplicate retry after network cut)
      (syncService as any).dispatchItemToServer = vi.fn().mockResolvedValue({
        ...serverRecord,
        isIdempotentReplay: true,
      });

      syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Duplicate Event',
        payload: { readings: {} },
        baseVersion: 1,
      });

      const res2 = await syncService.processQueue();
      expect(res2.synced).toBe(1);
    });

    it('should transition to failed status when retryCount reaches maxRetries limit', async () => {
      syncService.setMockOnlineStatus(true);
      (syncService as any).dispatchItemToServer = vi.fn().mockRejectedValue(new Error('TypeError: Failed to fetch'));

      const submissionId = generateUUID();
      const item = syncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: TENANT_ID,
        userId: USER_ID,
        assetId: 'a1',
        assetCode: 'BLR-001',
        title: 'Failing Network Item',
        payload: {},
        maxRetries: 3,
        baseVersion: 1,
      });

      // Attempt 1: retryCount becomes 1
      await syncService.processQueue();
      let q = syncService.getQueue();
      expect(q[0].retryCount).toBe(1);
      expect(q[0].status).toBe('pending');

      // Fast-forward nextRetryAt and Attempt 2: retryCount becomes 2
      q[0].nextRetryAt = new Date(Date.now() - 1000).toISOString();
      (syncService as any).saveQueue(q);
      await syncService.processQueue();
      q = syncService.getQueue();
      expect(q[0].retryCount).toBe(2);

      // Fast-forward nextRetryAt and Attempt 3: reaches maxRetries (3) -> status becomes failed
      q[0].nextRetryAt = new Date(Date.now() - 1000).toISOString();
      (syncService as any).saveQueue(q);
      await syncService.processQueue();
      q = syncService.getQueue();
      expect(q[0].retryCount).toBe(3);
      expect(q[0].status).toBe('failed');
      expect(q[0].errorMessage).toContain('Failed to fetch');
    });
  });
});
