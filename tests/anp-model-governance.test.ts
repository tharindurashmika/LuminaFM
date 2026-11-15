import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../src/lib/prisma';
import tenantPrisma from '../src/tenant/tenant.client';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import { Prisma } from '@prisma/client';
import { modelGovernanceService } from '../src/modules/decision-support/governance/governance.service';
import {
  DISSERTATION_LITERATURE_CATALOG,
  DISSERTATION_EXPERT_ROSTER,
  DISSERTATION_CRITERIA_GOVERNANCE,
  DISSERTATION_BASELINE_GOVERNANCE_SNAPSHOT,
} from '../src/modules/decision-support/governance/dissertation-baseline.governance';
import { compareDecisionModelVersions } from '../src/modules/decision-support/governance/model-diff.engine';
import { DISSERTATION_PENDING_MODEL_CONFIG } from '../src/modules/decision-support/dissertation-model.reconstruction';

describe('ANP Model Governance & Validation Module (Dissertation Baseline vs Commercial Client Configurations)', () => {
  const TENANT_ID = '44444444-4444-4444-4444-444444444444';
  const ADMIN_USER_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
  const REVIEWER_USER_ID = 'bbbbbbbb-1111-2222-3333-444444444444';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. REPRODUCIBLE ACADEMIC DISSERTATION BASELINE
  // ===========================================================================
  describe('1. Authoritative Academic Dissertation Baseline Preservation', () => {
    it('should provide the complete peer-reviewed literature references from Dissertation Chapter 2', () => {
      const literature = DISSERTATION_LITERATURE_CATALOG;
      expect(literature.length).toBeGreaterThanOrEqual(5);

      const saatyLit = literature.find((l) => l.citationKey === 'SAATY_1996_ANP');
      expect(saatyLit).toBeDefined();
      expect(saatyLit?.author).toContain('Saaty');
      expect(saatyLit?.year).toBe(1996);
      expect(saatyLit?.title).toContain('Analytic Network Process');

      const asmeLit = literature.find((l) => l.citationKey === 'ASME_BPVC_SEC_VII');
      expect(asmeLit).toBeDefined();
      expect(asmeLit?.title).toContain('Care of Power Boilers');

      const bsLit = literature.find((l) => l.citationKey === 'BS_EN_12953_SHELL');
      expect(bsLit).toBeDefined();
      expect(bsLit?.title).toContain('Shell Boilers');

      const cbLit = literature.find((l) => l.citationKey === 'CLEAVER_BROOKS_2018');
      expect(cbLit).toBeDefined();
      expect(cbLit?.excerpts).toContain('20 °C rise in stack flue gas temperature');

      const mcConachieLit = literature.find((l) => l.citationKey === 'MCCONACHIE_2019_VAL');
      expect(mcConachieLit).toBeDefined();
      expect(mcConachieLit?.excerpts).toContain('>= 80% consensus');
    });

    it('should preserve the 5 expert interview profiles with anonymized public references', () => {
      const roster = DISSERTATION_EXPERT_ROSTER;
      expect(roster).toHaveLength(5);

      // Verify expert E1 (34 yrs, Steam Engineering)
      const e1 = roster.find((e) => e.expertId === 'E1');
      expect(e1).toBeDefined();
      expect(e1?.yearsOfExperience).toBe(34);
      expect(e1?.isAnonymized).toBe(true);
      expect(e1?.publicReference).toContain('Regional Site Manager');
      expect(e1?.sector).toContain('Steam Engineering');

      // Verify expert E2 (35 yrs, Chief Hospitality Engineer)
      const e2 = roster.find((e) => e.expertId === 'E2');
      expect(e2).toBeDefined();
      expect(e2?.yearsOfExperience).toBe(35);
      expect(e2?.professionalRole).toBe('Chief Engineer');
      expect(e2?.sector).toContain('Hospitality');

      // Verify expert E5 (52 yrs, Senior Operator)
      const e5 = roster.find((e) => e.expertId === 'E5');
      expect(e5).toBeDefined();
      expect(e5?.yearsOfExperience).toBe(52);
      expect(e5?.technicalFocus).toContain('Empirical failure modes');
    });

    it('should preserve criteria governance with >= 80% consensus and empirical evidence for all baseline criteria', () => {
      const criteriaGov = DISSERTATION_CRITERIA_GOVERNANCE;
      const codes = Object.keys(criteriaGov);
      expect(codes.length).toBeGreaterThanOrEqual(22);

      // Flue gas temp governance
      const flueGov = criteriaGov['FLUE_GAS_TEMP'];
      expect(flueGov).toBeDefined();
      expect(flueGov.source).toBe('expert_interview');
      expect(flueGov.expertRetentionRate).toBe(100); // 5/5 experts retained
      expect(flueGov.validationStatus).toBe('academic_validated');
      expect(flueGov.literatureReferences.length).toBeGreaterThan(0);
      expect(flueGov.evidence.length).toBeGreaterThan(0);
      expect(flueGov.evidence[0].isDissertationBaseline).toBe(true);

      // Feed pump runtime governance
      const pumpGov = criteriaGov['PUMP_OPERATING_HOURS'];
      expect(pumpGov).toBeDefined();
      expect(pumpGov.expertRetentionRate).toBe(100);
      expect(pumpGov.validationStatus).toBe('academic_validated');
      expect(pumpGov.expertEvaluations).toHaveLength(5);
    });

    it('should return authoritative baseline snapshot with peer_reviewed_dissertation validation level', () => {
      const baseline = modelGovernanceService.getBaselineDissertationGovernance();
      expect(baseline.modelProvenance).toBe('dissertation_baseline');
      expect(baseline.isAcademicBaseline).toBe(true);
      expect(baseline.academicValidationLevel).toBe('peer_reviewed_dissertation');
      expect(baseline.approvalHistory).toHaveLength(1);
      expect(baseline.approvalHistory[0].actorName).toContain('Faculty Examination Panel');
      expect(baseline.approvalHistory[0].validationStatusResult).toBe('academic_validated');
    });
  });

  // ===========================================================================
  // 2. COMMERCIAL CLIENT CONFIGURATION PROPOSAL WORKFLOW
  // ===========================================================================
  describe('2. Commercial Client Configuration Proposal & Separation', () => {
    it('should propose a new commercial configuration strictly tagged as commercial_client and unvalidated', async () => {
      const createSpy = vi.fn().mockImplementation(async ({ data }: any) => ({
        id: 'dm-comm-001',
        ...data,
      }));

      const critCreateSpy = vi.fn().mockImplementation(async ({ data }: any) => ({
        id: `crit-${data.code}`,
        ...data,
      }));

      const altCreateSpy = vi.fn().mockImplementation(async ({ data }: any) => ({
        id: `alt-${data.code}`,
        ...data,
      }));

      const findFirstSpy = vi.fn().mockImplementation(async ({ where }: any) => {
        if (where.id === 'dm-comm-001') {
          return {
            id: 'dm-comm-001',
            code: 'BOILER_HOTEL_COLOMBO_PROPOSAL',
            name: 'Colombo Hotel Customized Boiler ANP Proposal',
            version: 1,
            status: 'draft',
            criteria: [
              { code: 'FLUE_GAS_TEMP', name: 'Stack Flue Temp', weight: 0.7 },
              { code: 'FEEDWATER_TDS', name: 'Feedwater Total Dissolved Solids', weight: 0.3 },
            ],
            alternatives: [
              { code: 'EMA_1', name: 'Clean Economizer Coils' },
            ],
          };
        }
        return null; // For version lookup
      });

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockImplementation(findFirstSpy);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) =>
        cb({
          decisionModel: {
            create: createSpy,
            findFirst: findFirstSpy,
          },
          decisionCriterion: {
            create: critCreateSpy,
          },
          decisionAlternative: {
            create: altCreateSpy,
          },
        })
      );

      await runWithTenantContext(TENANT_ID, async () => {
        const proposal = await modelGovernanceService.proposeModelConfiguration({
          code: 'BOILER_HOTEL_COLOMBO_PROPOSAL',
          name: 'Colombo Hotel Customized Boiler ANP Proposal',
          proposerUserId: ADMIN_USER_ID,
          proposerName: 'Facilities Lead Engineer',
          notes: 'Added client-specific TDS water quality parameter for high-mineral bore well supply.',
          criteria: [
            {
              code: 'FLUE_GAS_TEMP',
              name: 'Stack Flue Temp',
              criterionType: 'risk',
              weight: 0.7,
              benchmarkOperator: '>',
              benchmarkValue: 195,
            },
            {
              code: 'FEEDWATER_TDS',
              name: 'Feedwater Total Dissolved Solids',
              criterionType: 'risk',
              weight: 0.3,
              benchmarkOperator: '>',
              benchmarkValue: 2500,
            },
          ],
          alternatives: [
            { code: 'EMA_1', name: 'Clean Economizer Coils' },
          ],
        });

        expect(proposal).toBeDefined();
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              code: 'BOILER_HOTEL_COLOMBO_PROPOSAL',
              status: 'draft',
              configuration: expect.objectContaining({
                modelProvenance: 'commercial_client',
                isAcademicBaseline: false,
                academicValidationLevel: 'unvalidated_client_proposal',
              }),
            }),
          })
        );
      });
    });

    it('should strictly reject commercial client proposal from claiming peer-reviewed academic validation', async () => {
      const mockCommercialId = 'dm-client-fraud-attempt';

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockCommercialId,
        organizationId: TENANT_ID,
        code: 'COMMERCIAL_CUSTOM_BOILER_V1',
        version: 1,
        status: 'draft',
        configuration: {
          modelProvenance: 'commercial_client',
          isAcademicBaseline: false,
          academicValidationLevel: 'unvalidated_client_proposal',
        },
        criteria: [],
        alternatives: [],
      } as any);

      vi.spyOn(tenantPrisma.decisionPairwiseComparison, 'findMany').mockResolvedValue([]);

      await runWithTenantContext(TENANT_ID, async () => {
        await expect(
          modelGovernanceService.approveModelProposal(mockCommercialId, {
            reviewerUserId: REVIEWER_USER_ID,
            reviewerName: 'Commercial Auditor',
            approvalNotes: 'Attempting to claim academic validation without thesis peer review.',
            claimedValidationLevel: 'peer_reviewed_dissertation', // ILLEGAL!
          })
        ).rejects.toMatchObject({
          status: 422,
          code: 'ILLEGAL_ACADEMIC_VALIDATION_CLAIM',
        });
      });
    });
  });

  // ===========================================================================
  // 3. MODEL VERSION COMPARISON & ANP PRIORITY SHIFT DIFF ENGINE
  // ===========================================================================
  describe('3. Model Version Comparison & Deep Diff Engine', () => {
    it('should detect added, removed, and modified criteria between two model versions', () => {
      const modelA = {
        id: 'm1',
        code: 'BOILER_ANP',
        name: 'Boiler Model (Baseline)',
        version: 1,
        status: 'validated',
        configuration: {
          modelProvenance: 'dissertation_baseline' as const,
          academicValidationLevel: 'peer_reviewed_dissertation' as const,
        },
        criteria: [
          {
            id: 'c1',
            code: 'FLUE_GAS_TEMP',
            name: 'Flue Gas Stack Temperature',
            criterionType: 'risk',
            weight: 0.6,
            benchmarkOperator: '>',
            benchmarkValue: 190.0,
            sequenceNo: 1,
          },
          {
            id: 'c2',
            code: 'PUMP_OPERATING_HOURS',
            name: 'Pump Operating Hours',
            criterionType: 'cost',
            weight: 0.4,
            benchmarkOperator: '>=',
            benchmarkValue: 12000,
            sequenceNo: 2,
          },
        ],
        alternatives: [
          { id: 'a1', code: 'EMA_1', name: 'Economizer Soot Cleaning' },
          { id: 'a2', code: 'FPMA_1', name: 'Replace Pump Seals' },
        ],
      };

      const modelB = {
        id: 'm2',
        code: 'BOILER_ANP',
        name: 'Boiler Model (Client Adjusted)',
        version: 2,
        status: 'draft',
        configuration: {
          modelProvenance: 'commercial_client' as const,
          academicValidationLevel: 'unvalidated_client_proposal' as const,
        },
        criteria: [
          {
            id: 'c1',
            code: 'FLUE_GAS_TEMP',
            name: 'Flue Gas Stack Temperature',
            criterionType: 'risk',
            weight: 0.7, // Weight modified: 0.6 -> 0.7
            benchmarkOperator: '>',
            benchmarkValue: 195.0, // Benchmark modified: 190 -> 195
            sequenceNo: 1,
          },
          // c2 PUMP_OPERATING_HOURS removed!
          {
            id: 'c3',
            code: 'FEEDWATER_TDS', // c3 Added!
            name: 'Feedwater Total Dissolved Solids',
            criterionType: 'risk',
            weight: 0.3,
            benchmarkOperator: '>',
            benchmarkValue: 2500,
            sequenceNo: 2,
          },
        ],
        alternatives: [
          { id: 'a1', code: 'EMA_1', name: 'Economizer Soot Cleaning' },
          { id: 'a2', code: 'FPMA_1', name: 'Replace Pump Seals' },
          { id: 'a3', code: 'BLOWDOWN_AUTO', name: 'Automated Blowdown Cycle' }, // a3 Added!
        ],
      };

      const diff = compareDecisionModelVersions(modelA, modelB);

      expect(diff.provenanceDifference.isProvenanceEqual).toBe(false);
      expect(diff.provenanceDifference.message).toContain('Peer-Reviewed Academic Baseline');

      // Criteria diff
      expect(diff.criteriaDiff.added).toHaveLength(1);
      expect(diff.criteriaDiff.added[0].criterionCode).toBe('FEEDWATER_TDS');

      expect(diff.criteriaDiff.removed).toHaveLength(1);
      expect(diff.criteriaDiff.removed[0].criterionCode).toBe('PUMP_OPERATING_HOURS');

      expect(diff.criteriaDiff.modified).toHaveLength(1);
      expect(diff.criteriaDiff.modified[0].criterionCode).toBe('FLUE_GAS_TEMP');
      expect(diff.criteriaDiff.modified[0].changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'weight', valueA: 0.6, valueB: 0.7 }),
          expect.objectContaining({ field: 'benchmarkValue', valueA: 190.0, valueB: 195.0 }),
        ])
      );

      // Alternatives diff
      expect(diff.alternativesDiff.added).toHaveLength(1);
      expect(diff.alternativesDiff.added[0].alternativeCode).toBe('BLOWDOWN_AUTO');
      expect(diff.alternativesDiff.removed).toHaveLength(0);

      // Mathematical priority shifts
      expect(diff.anpPriorityShifts.shifts.length).toBeGreaterThan(0);
      for (const shift of diff.anpPriorityShifts.shifts) {
        expect(shift.deltaPriority).toBeDefined();
        expect(shift.rankA).toBeGreaterThanOrEqual(1);
        expect(shift.rankB).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ===========================================================================
  // 4. EVIDENCE, EXPERT EVALUATIONS & COMMENTS
  // ===========================================================================
  describe('4. Evidence Attachments, Expert Evaluations & Validation Comments', () => {
    it('should attach operational evidence to a criterion and persist in configuration', async () => {
      const mockModelId = 'dm-ev-test';
      const initialConfig = {
        criteriaGovernance: {},
      };

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        configuration: initialConfig,
      } as any);

      const updateSpy = vi.spyOn(tenantPrisma.decisionModel, 'update').mockResolvedValue({} as any);

      await runWithTenantContext(TENANT_ID, async () => {
        const evidence = await modelGovernanceService.recordCriterionEvidence(
          mockModelId,
          'FLUE_GAS_TEMP',
          {
            evidenceType: 'operational_log_sheet',
            title: 'Shift B Logsheet Parameter Excursion',
            description: 'Pyrometer logged stack temp of 214 °C at 16:00 during high steam demand.',
            sourceReference: 'Physical Log Sheet #2026-11-14-B',
            storageUri: 's3://lumina-fm-attachments/org-44/evidence/log_20261114.pdf',
            userId: ADMIN_USER_ID,
          }
        );

        expect(evidence).toBeDefined();
        expect(evidence.title).toBe('Shift B Logsheet Parameter Excursion');
        expect(evidence.isDissertationBaseline).toBe(false);

        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockModelId },
            data: expect.objectContaining({
              configuration: expect.objectContaining({
                criteriaGovernance: expect.objectContaining({
                  FLUE_GAS_TEMP: expect.objectContaining({
                    evidence: expect.arrayContaining([
                      expect.objectContaining({ title: 'Shift B Logsheet Parameter Excursion' }),
                    ]),
                  }),
                }),
              }),
            }),
          })
        );
      });
    });

    it('should record expert evaluation, update expert roster, and compute McConachie retention rate', async () => {
      const mockModelId = 'dm-expert-test';
      const initialConfig = {
        criteriaGovernance: {
          FEEDWATER_TDS: {
            criterionCode: 'FEEDWATER_TDS',
            criterionName: 'Feedwater TDS',
            source: 'commercial_client_proposal',
            literatureReferences: [],
            expertEvaluations: [
              {
                expertId: 'EXP_01',
                retentionVote: true,
                operationalRelevanceRating: 5,
                expertComments: 'Crucial for coastal hotel installations.',
              },
              {
                expertId: 'EXP_02',
                retentionVote: true,
                operationalRelevanceRating: 4,
                expertComments: 'Prevents scaling.',
              },
            ],
            expertRetentionRate: 100,
            validationStatus: 'pending_expert_validation',
            validationComments: [],
            evidence: [],
          },
        },
        expertRoster: [],
      };

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        configuration: initialConfig,
      } as any);

      vi.spyOn(tenantPrisma.decisionModel, 'update').mockResolvedValue({} as any);

      await runWithTenantContext(TENANT_ID, async () => {
        // Third expert votes YES (3/3 = 100% >= 80% -> transitions to commercial_validated)
        const updatedCrit = await modelGovernanceService.recordExpertEvaluation(
          mockModelId,
          'FEEDWATER_TDS',
          {
            expertId: 'EXP_03',
            isAnonymized: true,
            publicReference: 'Water Treatment Specialist (Commercial Steam Systems)',
            yearsOfExperience: 22,
            sector: 'Industrial Chemical & Water Services',
            retentionVote: true,
            operationalRelevanceRating: 5,
            suggestedBenchmarkThreshold: '> 2500 ppm',
            expertComments: 'Validated as mandatory threshold for heavy-scale feedwaters.',
          }
        );

        expect(updatedCrit.expertEvaluations).toHaveLength(3);
        expect(updatedCrit.expertRetentionRate).toBe(100);
        expect(updatedCrit.validationStatus).toBe('commercial_validated');
      });
    });

    it('should add validation comments and audit feedback to criterion record', async () => {
      const mockModelId = 'dm-comment-test';
      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        configuration: { criteriaGovernance: {} },
      } as any);

      const updateSpy = vi.spyOn(tenantPrisma.decisionModel, 'update').mockResolvedValue({} as any);

      await runWithTenantContext(TENANT_ID, async () => {
        const comment = await modelGovernanceService.addValidationComment(
          mockModelId,
          'STEAM_PRESSURE',
          {
            userId: REVIEWER_USER_ID,
            userName: 'Lead Quality Engineer',
            commentType: 'admin_review',
            comment: 'Lower limit of 8.0 bar verified against hotel laundry steam requirements.',
          }
        );

        expect(comment).toBeDefined();
        expect(comment.comment).toContain('hotel laundry steam requirements');
        expect(updateSpy).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // 5. APPROVAL WORKFLOW & ACTIVATION LIFECYCLE
  // ===========================================================================
  describe('5. Validated Proposal Approval & Operational Activation', () => {
    it('should approve commercial model proposal into commercial_validated status and append approvalHistory', async () => {
      const mockModelId = 'dm-approve-success';

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        code: 'COMMERCIAL_BOILER_V1',
        version: 1,
        status: 'draft',
        configuration: {
          modelProvenance: 'commercial_client',
          isAcademicBaseline: false,
          academicValidationLevel: 'unvalidated_client_proposal',
          approvalHistory: [],
        },
        criteria: [],
        alternatives: [],
      } as any);

      // Consistent pairwise comparison cells (3x3 Saaty reference)
      const consistentCells = [
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e1', colElementId: 'e2', saatyValue: new Prisma.Decimal(3.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e1', colElementId: 'e3', saatyValue: new Prisma.Decimal(7.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e2', colElementId: 'e3', saatyValue: new Prisma.Decimal(5.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e2', colElementId: 'e1', saatyValue: new Prisma.Decimal(1.0 / 3.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e3', colElementId: 'e1', saatyValue: new Prisma.Decimal(1.0 / 7.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e3', colElementId: 'e2', saatyValue: new Prisma.Decimal(1.0 / 5.0) },
      ];

      vi.spyOn(tenantPrisma.decisionPairwiseComparison, 'findMany').mockResolvedValue(consistentCells as any);

      const updateSpy = vi.spyOn(tenantPrisma.decisionModel, 'update').mockImplementation(async ({ data }: any) => ({
        id: mockModelId,
        status: data.status,
        configuration: data.configuration,
        criteria: [],
        alternatives: [],
      } as any));

      await runWithTenantContext(TENANT_ID, async () => {
        const approved = await modelGovernanceService.approveModelProposal(mockModelId, {
          reviewerUserId: REVIEWER_USER_ID,
          reviewerName: 'Chief Plant Inspector',
          approvalNotes: 'Expert consensus reached and pairwise matrix CR <= 0.10 verified.',
          claimedValidationLevel: 'commercial_field_tested',
        });

        expect(approved.status).toBe('validated');
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockModelId },
            data: expect.objectContaining({
              status: 'validated',
              configuration: expect.objectContaining({
                academicValidationLevel: 'commercial_field_tested',
                approvalHistory: expect.arrayContaining([
                  expect.objectContaining({
                    action: 'approved',
                    validationStatusResult: 'commercial_validated',
                    actorUserId: REVIEWER_USER_ID,
                  }),
                ]),
              }),
            }),
          })
        );
      });
    });

    it('should activate validated model and retire previously active model for the organization', async () => {
      const mockModelId = 'dm-act-001';

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        code: 'COMMERCIAL_BOILER',
        version: 2,
        status: 'validated',
        configuration: {
          approvalHistory: [],
        },
      } as any);

      const updateManySpy = vi.fn().mockResolvedValue({ count: 1 });
      const updateSpy = vi.fn().mockImplementation(async ({ data }: any) => ({
        id: mockModelId,
        status: data.status,
        criteria: [],
        alternatives: [],
      }));

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) =>
        cb({
          decisionModel: {
            updateMany: updateManySpy,
            update: updateSpy,
          },
        })
      );

      await runWithTenantContext(TENANT_ID, async () => {
        const activated = await modelGovernanceService.activateModel(
          mockModelId,
          ADMIN_USER_ID
        );

        expect(activated.status).toBe('active');
        expect(updateManySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              organizationId: TENANT_ID,
              code: 'COMMERCIAL_BOILER',
              status: 'active',
              id: { not: mockModelId },
            }),
            data: expect.objectContaining({ status: 'retired' }),
          })
        );
      });
    });
  });
});
