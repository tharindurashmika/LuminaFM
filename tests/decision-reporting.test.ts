import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataClassificationType,
  DATA_CLASSIFICATIONS,
  DecisionReportingSummary,
  OperationalAbnormalityItem,
  NotificationChannelConfig,
  AlertAcknowledgementPayload,
} from '../frontend/src/types/reporting.types';
import { reportingApiService } from '../frontend/src/services/reporting.service';

/**
 * Re-creates the multi-section CSV string generation logic for test verification
 * (mirrors frontend/src/utils/report-export.utils.ts)
 */
function generateMultiSectionCsvString(
  reportTitle: string,
  sections: Array<{
    title: string;
    classification?: DataClassificationType;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
  }>
): string {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const lines: string[] = [];
  lines.push(escapeCell('LuminaFM Enterprise CMMS & Decision Support Audit Report'));
  lines.push(escapeCell(`TITLE: ${reportTitle}`));
  lines.push('');

  for (const section of sections) {
    const classTag = section.classification
      ? ` [CLASSIFICATION: ${section.classification.toUpperCase()}]`
      : '';
    lines.push(`=== ${section.title.toUpperCase()}${classTag} ===`);
    lines.push(section.headers.map(escapeCell).join(','));

    for (const row of section.rows) {
      lines.push(row.map(escapeCell).join(','));
    }
    lines.push('');
  }

  return '\uFEFF' + lines.join('\r\n');
}

describe('LuminaFM Decision-Support and Reporting Experience', () => {
  describe('1. Data Classification System (Strict Distinction)', () => {
    it('defines distinct metadata for measured, calculated, benchmark, and expert types', () => {
      expect(DATA_CLASSIFICATIONS.measured.shortLabel).toBe('MEASURED');
      expect(DATA_CLASSIFICATIONS.measured.badgeTone).toBe('cyan');

      expect(DATA_CLASSIFICATIONS.calculated.shortLabel).toBe('CALCULATED');
      expect(DATA_CLASSIFICATIONS.calculated.badgeTone).toBe('indigo');

      expect(DATA_CLASSIFICATIONS.benchmark.shortLabel).toBe('BENCHMARK');
      expect(DATA_CLASSIFICATIONS.benchmark.badgeTone).toBe('amber');

      expect(DATA_CLASSIFICATIONS.expert.shortLabel).toBe('EXPERT REC');
      expect(DATA_CLASSIFICATIONS.expert.badgeTone).toBe('gold');
    });

    it('accurately categorizes operational parameters into their respective data classifications', () => {
      const sampleAttributes = [
        { name: 'Flue Gas Stack Temperature (248.4 °C)', classification: 'measured' as DataClassificationType },
        { name: 'ANP Priority Vector pa = 0.4320', classification: 'calculated' as DataClassificationType },
        { name: 'ASME Max Allowable Working Pressure (> 12.0 bar)', classification: 'benchmark' as DataClassificationType },
        { name: 'Kingsbury Sootblower Overhaul Strategy', classification: 'expert' as DataClassificationType },
      ];

      for (const attr of sampleAttributes) {
        const meta = DATA_CLASSIFICATIONS[attr.classification];
        expect(meta).toBeDefined();
        expect(meta.type).toBe(attr.classification);
      }
    });
  });

  describe('2. Model Validation Gating & Strict Approval Enforcement', () => {
    it('correctly identifies validated academic baseline models vs unvalidated client proposals', () => {
      // Academic validated baseline (Kingsbury dissertation)
      const isValidAcademic = reportingApiService.isModelValidated(
        'academic_validated',
        'peer_reviewed_dissertation'
      );
      expect(isValidAcademic).toBe(true);

      // Commercial validated baseline
      const isValidCommercial = reportingApiService.isModelValidated(
        'commercial_validated',
        'commercial_field_tested'
      );
      expect(isValidCommercial).toBe(true);

      // Unvalidated commercial client proposal
      const isUnvalidatedProposal = reportingApiService.isModelValidated(
        'client_proposed',
        'unvalidated_client_proposal'
      );
      expect(isUnvalidatedProposal).toBe(false);

      // Pending expert validation
      const isPendingValidation = reportingApiService.isModelValidated(
        'pending_expert_validation',
        'industry_expert_panel'
      );
      expect(isPendingValidation).toBe(false);
    });

    it('strictly PREVENTS approving recommendations from an unvalidated ANP decision run', async () => {
      const unvalidatedRunId = 'drun-anp-unvalidated-002';
      const unvalidatedRecId = 'rec-client-001';

      await expect(
        reportingApiService.reviewRecommendation(
          unvalidatedRunId,
          unvalidatedRecId,
          'approve',
          'Marcus Thorne',
          'Attempting approval of unvalidated model output'
        )
      ).rejects.toThrow(
        /SECURITY & SAFETY COMPLIANCE ERROR: Unvalidated ANP model outputs cannot be approved as operational maintenance decisions/
      );
    });

    it('allows non-approval actions (reject, convert to draft work order) on unvalidated runs', async () => {
      const unvalidatedRunId = 'drun-anp-unvalidated-002';
      const unvalidatedRecId = 'rec-client-001';

      const result = await reportingApiService.reviewRecommendation(
        unvalidatedRunId,
        unvalidatedRecId,
        'convert_to_work_order',
        'Marcus Thorne',
        'Convert to exploratory inspection work order'
      );

      expect(result.status).toBe('CONVERTED_TO_WORK_ORDER');
      expect(result.workOrderNumber).toMatch(/^WO-2026-\d{4}$/);
    });

    it('permits approval of recommendations originating from an academic validated baseline run', async () => {
      const validatedRunId = 'drun-anp-baseline-001';
      const validatedRecId = 'rec-001';

      const result = await reportingApiService.reviewRecommendation(
        validatedRunId,
        validatedRecId,
        'approve',
        'Eng. Marcus Thorne, CMRP',
        'Approved following flue gas stack excursion verification.'
      );

      expect(result.status).toBe('APPROVED');
      expect(result.message).toContain('approved for execution by Eng. Marcus Thorne, CMRP');

      const run = await reportingApiService.getDecisionRunById(validatedRunId);
      const rec = run?.recommendations.find((r) => r.recommendationId === validatedRecId);
      expect(rec?.reviewStatus).toBe('APPROVED');
      expect(rec?.reviewedByUserId).toBe('Eng. Marcus Thorne, CMRP');
      expect(rec?.reviewedAt).toBeDefined();
    });
  });

  describe('3. ANP Limit Supermatrix Mathematical Priorities & Criteria Attribution', () => {
    it('reconstructs monotonically decreasing priority ranking (p1 > p2 > p3 > p4)', async () => {
      const run = await reportingApiService.getDecisionRunById('drun-anp-baseline-001');
      expect(run).toBeDefined();

      const recs = run!.recommendations;
      expect(recs.length).toBeGreaterThanOrEqual(4);

      for (let i = 0; i < recs.length - 1; i++) {
        expect(recs[i].priorityValue).toBeGreaterThan(recs[i + 1].priorityValue);
        expect(recs[i].relativeWeightPercentage).toBeGreaterThan(recs[i + 1].relativeWeightPercentage);
        expect(recs[i].rank).toBe(i + 1);
      }

      // Check sum of relative weights is 100% (within rounding)
      const sumWeights = recs.reduce((acc, r) => acc + r.relativeWeightPercentage, 0);
      expect(sumWeights).toBeCloseTo(100.0, 1);
    });

    it('explains the criteria influence attribution that drove the top recommendation', async () => {
      const run = await reportingApiService.getDecisionRunById('drun-anp-baseline-001');
      const topRec = run!.recommendations[0];

      expect(topRec.alternativeCode).toBe('ALT-SOOTBLOW-OVERHAUL');
      expect(topRec.criteriaAttribution.length).toBeGreaterThan(0);

      // Primary attribution is FLUE_GAS_TEMP due to 248.4°C excursion
      const stackTempContrib = topRec.criteriaAttribution.find(
        (c) => c.criterionCode === 'FLUE_GAS_TEMP'
      );
      expect(stackTempContrib).toBeDefined();
      expect(stackTempContrib!.contributionPercentage).toBeGreaterThan(40.0);
      expect(stackTempContrib!.observedValue).toBe(248.4);
    });
  });

  describe('4. Operational Abnormalities & Operator Acknowledgement Workflow', () => {
    it('retrieves active operational abnormalities with physical values and benchmarks', async () => {
      const abns = await reportingApiService.getOperationalAbnormalities();
      expect(abns.length).toBeGreaterThanOrEqual(4);

      const stackOvertemp = abns.find((a) => a.parameterCode === 'FLUE_GAS_TEMP');
      expect(stackOvertemp).toBeDefined();
      expect(stackOvertemp!.measuredValue).toBe(248.4);
      expect(stackOvertemp!.benchmarkThreshold).toBe(190.0);
      expect(stackOvertemp!.benchmarkOperator).toBe('>');
      expect(stackOvertemp!.unit).toBe('°C');
      expect(stackOvertemp!.severity).toBe('CRITICAL');
    });

    it('successfully processes operator acknowledgement and records traceable audit trail', async () => {
      const abns = await reportingApiService.getOperationalAbnormalities();
      const target = abns.find((a) => a.parameterCode === 'TDS_LEVEL')!;
      expect(target.acknowledged).toBe(false);

      const payload: AlertAcknowledgementPayload = {
        abnormalityId: target.id,
        acknowledgedBy: 'Sarah Lin (Boiler Operator)',
        acknowledgementNotes: 'Initiated continuous surface blowdown and verified softener bed.',
        actionTaken: 'dispatched_work_order',
      };

      const acknowledged = await reportingApiService.acknowledgeAbnormality(payload);
      expect(acknowledged.acknowledged).toBe(true);
      expect(acknowledged.acknowledgedBy).toBe('Sarah Lin (Boiler Operator)');
      expect(acknowledged.acknowledgedAt).toBeDefined();
      expect(acknowledged.acknowledgementNotes).toBe(payload.acknowledgementNotes);
    });

    it('throws error when acknowledging a non-existent abnormality', async () => {
      await expect(
        reportingApiService.acknowledgeAbnormality({
          abnormalityId: 'non-existent-id-999',
          acknowledgedBy: 'Test User',
          acknowledgementNotes: 'Testing error path',
        })
      ).rejects.toThrow(/not found/);
    });
  });

  describe('5. Configurable Notification Channels & Dispatch Rules', () => {
    it('retrieves configured channels for in_app, email, sms, and webhook', async () => {
      const channels = await reportingApiService.getNotificationChannels();
      expect(channels.length).toBe(4);

      const types = channels.map((c) => c.channelType);
      expect(types).toContain('in_app');
      expect(types).toContain('email');
      expect(types).toContain('sms');
      expect(types).toContain('webhook');
    });

    it('updates channel configuration parameters including thresholds and cooldown', async () => {
      const channels = await reportingApiService.getNotificationChannels();
      const emailChannel = channels.find((c) => c.channelType === 'email')!;

      const updated = await reportingApiService.updateNotificationChannel(emailChannel.id, {
        minSeverity: 'CRITICAL',
        minAnpPriorityScore: 0.90,
        cooldownMinutes: 20,
      });

      expect(updated.minSeverity).toBe('CRITICAL');
      expect(updated.minAnpPriorityScore).toBe(0.90);
      expect(updated.cooldownMinutes).toBe(20);
    });

    it('executes test dispatch on notification channels and records dispatch count', async () => {
      const channels = await reportingApiService.getNotificationChannels();
      const smsChannel = channels.find((c) => c.channelType === 'sms')!;
      const initialCount = smsChannel.dispatchCount;

      const result = await reportingApiService.dispatchTestNotification(smsChannel.id);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test alert dispatched successfully');

      const recheckedChannels = await reportingApiService.getNotificationChannels();
      const recheckedSms = recheckedChannels.find((c) => c.id === smsChannel.id)!;
      expect(recheckedSms.dispatchCount).toBe(initialCount + 1);
      expect(recheckedSms.lastDispatchedAt).toBeDefined();
    });
  });

  describe('6. Preventive Maintenance Tracking & Overdue Compliance', () => {
    it('retrieves upcoming and overdue PM items with day countdowns', async () => {
      const pmItems = await reportingApiService.getPreventiveMaintenanceSchedule();
      expect(pmItems.length).toBeGreaterThanOrEqual(4);

      const overdueItems = pmItems.filter((p) => p.isOverdue);
      expect(overdueItems.length).toBeGreaterThan(0);
      for (const item of overdueItems) {
        expect(item.daysRemainingOrOverdue).toBeLessThan(0);
      }

      const futureItems = pmItems.filter((p) => !p.isOverdue);
      expect(futureItems.length).toBeGreaterThan(0);
      for (const item of futureItems) {
        expect(item.daysRemainingOrOverdue).toBeGreaterThan(0);
      }
    });
  });

  describe('7. Regulatory CSV & Excel Export Generation', () => {
    it('generates compliant RFC 4180 CSV with UTF-8 BOM, multi-sections, and classification headers', () => {
      const sections = [
        {
          title: 'Measured Operational Signals',
          classification: 'measured' as DataClassificationType,
          headers: ['Parameter', 'Measured Value', 'Unit'],
          rows: [
            ['Flue Gas Stack Temperature', 248.4, '°C'],
            ['Operating Steam Pressure', 13.4, 'bar'],
          ],
        },
        {
          title: 'ANP Calculated Priorities',
          classification: 'calculated' as DataClassificationType,
          headers: ['Rank', 'Strategy', 'Priority (pa)'],
          rows: [
            [1, 'Sootblower Overhaul & Convection Tube Cleaning', 0.4320],
            [2, 'Burner Linkage Calibration', 0.2810],
          ],
        },
      ];

      const csvString = generateMultiSectionCsvString('Test Facility Audit Report', sections);

      // Verify UTF-8 BOM
      expect(csvString.startsWith('\uFEFF')).toBe(true);

      // Verify section titles with classification tags
      expect(csvString).toContain('=== MEASURED OPERATIONAL SIGNALS [CLASSIFICATION: MEASURED] ===');
      expect(csvString).toContain('=== ANP CALCULATED PRIORITIES [CLASSIFICATION: CALCULATED] ===');

      // Verify cell escaping
      expect(csvString).toContain('"Flue Gas Stack Temperature"');
      expect(csvString).toContain('"248.4"');
      expect(csvString).toContain('"0.432"');
    });
  });
});
