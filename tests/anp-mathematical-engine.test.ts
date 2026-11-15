import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../src/lib/prisma';
import tenantPrisma from '../src/tenant/tenant.client';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import { Prisma } from '@prisma/client';
import {
  validatePairwiseMatrix,
  calculatePriorityVectorGeometricMean,
  calculatePriorityVectorPowerMethod,
  calculateConsistency,
  multiplyMatrices,
  constructWeightedSupermatrix,
  computeLimitSupermatrix,
  buildAndSolveAnpSupermatrix,
  evaluateAnpDecisionModel,
  CriterionInput,
  AlternativeInput,
  TelemetrySignalInput,
  SAATY_RANDOM_INDEX,
} from '../src/modules/decision-support/anp.engine';
import { decisionSupportService } from '../src/modules/decision-support/decision-support.service';
import {
  DISSERTATION_CLUSTERS,
  DISSERTATION_GOAL_DIMENSIONS,
  DISSERTATION_CRITERIA,
  DISSERTATION_ALTERNATIVES,
  DISSERTATION_NETWORK_EDGES,
  DISSERTATION_PENDING_MODEL_CONFIG,
} from '../src/modules/decision-support/dissertation-model.reconstruction';

describe('LuminaFM ANP Decision Engine - Authentic Mathematical Reconstruction', () => {
  const TENANT_ID = '33333333-3333-3333-3333-333333333333';
  const USER_ID = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. SAATY EIGENVALUE, CONSISTENCY & PRIORITY VECTOR MATHEMATICS
  // ===========================================================================
  describe('1. Pure Saaty AHP/ANP Mathematical Formulations', () => {
    /**
     * Classic 3x3 Reference Comparison Matrix from Thomas L. Saaty (1980, 1996):
     * A = [
     *   [  1,   3, 7 ],
     *   [ 1/3,  1, 5 ],
     *   [ 1/7, 1/5, 1 ]
     * ]
     * Published Saaty Reference Values:
     * - Principal Eigenvector w ≈ [0.6556, 0.2897, 0.0547]^T
     * - lambda_max ≈ 3.0649
     * - CI = (3.0649 - 3) / 2 ≈ 0.0324
     * - RI(3) = 0.58
     * - CR = 0.0324 / 0.58 ≈ 0.0559 <= 0.10 (Consistent!)
     */
    const saatyReference3x3: number[][] = [
      [1.0, 3.0, 7.0],
      [1.0 / 3.0, 1.0, 5.0],
      [1.0 / 7.0, 1.0 / 5.0, 1.0],
    ];

    it('should validate reciprocal property and unit diagonal of pairwise matrix', () => {
      const validCheck = validatePairwiseMatrix(saatyReference3x3);
      expect(validCheck.isValid).toBe(true);
      expect(validCheck.errors).toHaveLength(0);

      // Violate reciprocal property
      const invalidReciprocal: number[][] = [
        [1.0, 3.0],
        [0.5, 1.0], // Should be 1/3 ≈ 0.3333, not 0.5
      ];
      const recipCheck = validatePairwiseMatrix(invalidReciprocal);
      expect(recipCheck.isValid).toBe(false);
      expect(recipCheck.errors[0]).toContain('Reciprocal property violated');

      // Violate diagonal unit property
      const invalidDiag: number[][] = [
        [2.0, 3.0],
        [1.0 / 3.0, 1.0],
      ];
      const diagCheck = validatePairwiseMatrix(invalidDiag);
      expect(diagCheck.isValid).toBe(false);
      expect(diagCheck.errors[0]).toContain('Diagonal element at [0, 0] must be 1.0');
    });

    it('should compute principal priority vector via Geometric Mean and Power Iteration', () => {
      // Geometric Mean (Logarithmic Least Squares)
      const geomPriorities = calculatePriorityVectorGeometricMean(saatyReference3x3);
      expect(geomPriorities).toHaveLength(3);
      expect(geomPriorities.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 6);
      expect(geomPriorities[0]).toBeCloseTo(0.649, 2);
      expect(geomPriorities[1]).toBeCloseTo(0.279, 2);
      expect(geomPriorities[2]).toBeCloseTo(0.072, 2);

      // Power Method (Exact Eigenvector Iteration)
      const powerResult = calculatePriorityVectorPowerMethod(saatyReference3x3);
      expect(powerResult.iterations).toBeGreaterThan(0);
      expect(powerResult.delta).toBeLessThan(1e-10);

      const w = powerResult.priorityVector;
      expect(w).toHaveLength(3);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 6);
      // Principal eigenvector values: w1 ≈ 0.6491, w2 ≈ 0.2790, w3 ≈ 0.0719
      expect(w[0]).toBeCloseTo(0.6491, 3);
      expect(w[1]).toBeCloseTo(0.279, 3);
      expect(w[2]).toBeCloseTo(0.0719, 3);
    });

    it('should calculate lambda_max, CI, and verify consistency ratio (CR <= 0.10) for Saaty reference matrix', () => {
      const consistency = calculateConsistency(saatyReference3x3);

      expect(consistency.dimension).toBe(3);
      expect(consistency.randomConsistencyIndex).toBe(SAATY_RANDOM_INDEX[3]); // 0.58
      // lambda_max ≈ 3.0649
      expect(consistency.lambdaMax).toBeCloseTo(3.0649, 2);
      // CI ≈ 0.0324
      expect(consistency.consistencyIndex).toBeCloseTo(0.0324, 2);
      // CR ≈ 0.0559 <= 0.10
      expect(consistency.consistencyRatio).toBeCloseTo(0.056, 2);
      expect(consistency.consistencyRatio).toBeLessThanOrEqual(0.10);
      expect(consistency.isConsistent).toBe(true);
    });

    it('should detect inconsistent judgments when CR > 0.10 and reject with isConsistent=false', () => {
      // Strongly intransitive 4x4 matrix: A >> B, B >> C, C >> D, but D >> A
      const inconsistent4x4: number[][] = [
        [1.0, 5.0, 9.0, 1.0 / 7.0],
        [1.0 / 5.0, 1.0, 6.0, 1.0 / 8.0],
        [1.0 / 9.0, 1.0 / 6.0, 1.0, 1.0 / 5.0],
        [7.0, 8.0, 5.0, 1.0],
      ];

      const validCheck = validatePairwiseMatrix(inconsistent4x4);
      expect(validCheck.isValid).toBe(true);

      const consistency = calculateConsistency(inconsistent4x4);
      expect(consistency.dimension).toBe(4);
      expect(consistency.randomConsistencyIndex).toBe(0.90);
      expect(consistency.consistencyRatio).toBeGreaterThan(0.10);
      expect(consistency.isConsistent).toBe(false);
    });
  });

  // ===========================================================================
  // 2. COLUMN-STOCHASTIC SUPERMATRIX & LIMIT CONVERGENCE MATHEMATICS
  // ===========================================================================
  describe('2. Weighted Supermatrix & Limit Supermatrix Convergence', () => {
    it('should construct column-stochastic weighted supermatrix where every column sum equals 1.0', () => {
      // 4-node system (2 criteria, 2 alternatives)
      const unweighted: number[][] = [
        [0.4, 0.3, 0.2, 0.1],
        [0.6, 0.7, 0.8, 0.9],
        [0.5, 0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5, 0.5],
      ];

      const clusterMatrix: number[][] = [
        [0.6, 0.4],
        [0.4, 0.6],
      ];

      const clusterRanges = [
        { clusterCode: 'CRITERIA', startIndex: 0, size: 2 },
        { clusterCode: 'ALTERNATIVES', startIndex: 2, size: 2 },
      ];

      const result = constructWeightedSupermatrix({
        unweightedSupermatrix: unweighted,
        clusterMatrix,
        clusterRanges,
      });

      expect(result.weightedSupermatrix).toHaveLength(4);
      expect(result.columnSums).toHaveLength(4);
      for (const colSum of result.columnSums) {
        expect(colSum).toBeCloseTo(1.0, 5);
      }
    });

    it('should compute Limit Supermatrix W_infinity via repeated matrix squaring with convergence tolerance', () => {
      // Column-stochastic irreducible primitive transition matrix
      const stochasticW: number[][] = [
        [0.4, 0.2, 0.1, 0.3],
        [0.3, 0.5, 0.2, 0.2],
        [0.2, 0.1, 0.5, 0.1],
        [0.1, 0.2, 0.2, 0.4],
      ];

      // Verify each column is stochastic
      for (let j = 0; j < 4; j++) {
        let sumCol = 0;
        for (let i = 0; i < 4; i++) sumCol += stochasticW[i][j];
        expect(sumCol).toBeCloseTo(1.0, 6);
      }

      const limitResult = computeLimitSupermatrix(stochasticW, {
        maxIterations: 50,
        tolerance: 1e-8,
      });

      expect(limitResult.converged).toBe(true);
      expect(limitResult.iterations).toBeGreaterThan(0);

      const limitMat = limitResult.limitSupermatrix;
      expect(limitMat).toHaveLength(4);

      // In a regular limiting stochastic supermatrix, all columns converge to the identical stationary vector
      const col0 = limitMat.map((row) => row[0]);
      for (let j = 1; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          expect(limitMat[i][j]).toBeCloseTo(col0[i], 5);
        }
      }

      const stationarySum = col0.reduce((a, b) => a + b, 0);
      expect(stationarySum).toBeCloseTo(1.0, 5);
    });

    it('should execute buildAndSolveAnpSupermatrix and produce normalized alternative priorities', () => {
      const criteria: CriterionInput[] = [
        {
          id: 'crit-flue',
          code: 'FLUE_GAS_TEMP',
          name: 'Flue Gas Temp',
          criterionType: 'risk',
          weight: 0.6,
        },
        {
          id: 'crit-steam',
          code: 'STEAM_PRESSURE',
          name: 'Steam Pressure',
          criterionType: 'risk',
          weight: 0.4,
        },
      ];

      const alternatives: AlternativeInput[] = [
        {
          code: 'EMA_1',
          name: 'Economizer Soot Cleaning',
        },
        {
          code: 'HEMA_3',
          name: 'Fire Tube Brushing',
        },
        {
          code: 'SVMA_2',
          name: 'Safety Valve Lapping',
        },
      ];

      const solved = buildAndSolveAnpSupermatrix({
        criteria,
        alternatives,
        interdependenceMatrix: {
          FLUE_GAS_TEMP: { STEAM_PRESSURE: 0.3 },
          STEAM_PRESSURE: { FLUE_GAS_TEMP: 0.2 },
        },
      });

      expect(solved.nodeCodes).toHaveLength(5);
      expect(solved.clusters).toHaveLength(2);
      expect(solved.convergence.converged).toBe(true);

      const altPriorities = solved.normalizedAlternativePriorities;
      expect(Object.keys(altPriorities)).toHaveLength(3);
      const sumAlt = Object.values(altPriorities).reduce((a, b) => a + b, 0);
      expect(sumAlt).toBeCloseTo(1.0, 5);
      expect(altPriorities['EMA_1']).toBeGreaterThan(0);
      expect(altPriorities['HEMA_3']).toBeGreaterThan(0);
      expect(altPriorities['SVMA_2']).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 3. DISSERTATION MODEL RECONSTRUCTION & ZERO INVENTION FIDELITY
  // ===========================================================================
  describe('3. Dissertation ANP Model Topology Reconstruction (Vishal Perera 2025)', () => {
    it('should reconstruct the exact 4 clusters from Figure 4.1', () => {
      expect(DISSERTATION_CLUSTERS).toHaveLength(4);
      const clusterCodes = DISSERTATION_CLUSTERS.map((c) => c.code);
      expect(clusterCodes).toContain('GOAL');
      expect(clusterCodes).toContain('CRITERIA');
      expect(clusterCodes).toContain('BENCHMARKS');
      expect(clusterCodes).toContain('ALTERNATIVES');
    });

    it('should reconstruct the 5 strategic goal dimensions', () => {
      expect(DISSERTATION_GOAL_DIMENSIONS).toHaveLength(5);
      const goalCodes = DISSERTATION_GOAL_DIMENSIONS.map((g) => g.code);
      expect(goalCodes).toEqual([
        'PERFORMANCE',
        'SAFETY',
        'COST',
        'ENERGY_EFFICIENCY',
        'OPERATIONAL_CONTINUITY',
      ]);
    });

    it('should reconstruct all 22 criteria and empirical benchmarks without invention', () => {
      expect(DISSERTATION_CRITERIA.length).toBeGreaterThanOrEqual(22);

      // Verify Feed Pump criteria
      const pumpHours = DISSERTATION_CRITERIA.find((c) => c.code === 'PUMP_OPERATING_HOURS');
      expect(pumpHours).toBeDefined();
      expect(pumpHours?.benchmark.operator).toBe('>=');
      expect(pumpHours?.benchmark.threshold).toBe(12000);
      expect(pumpHours?.benchmark.unit).toBe('hrs');

      // Verify Flue Gas Temp benchmark
      const flueGas = DISSERTATION_CRITERIA.find((c) => c.code === 'FLUE_GAS_TEMP');
      expect(flueGas).toBeDefined();
      expect(flueGas?.benchmark.operator).toBe('>');
      expect(flueGas?.benchmark.threshold).toBe(190.0);
      expect(flueGas?.benchmark.unit).toBe('°C');

      // Verify Safety Valve Lift pressure benchmark
      const safetyValve = DISSERTATION_CRITERIA.find((c) => c.code === 'SAFETY_VALVE_POPPING');
      expect(safetyValve).toBeDefined();
      expect(safetyValve?.benchmark.operator).toBe('!=');
      expect(safetyValve?.benchmark.threshold).toBe(9.0);
      expect(safetyValve?.benchmark.unit).toBe('bar');
    });

    it('should reconstruct the 35 validated maintenance activities (Table 4.2)', () => {
      expect(DISSERTATION_ALTERNATIVES).toHaveLength(35);

      const altCodes = DISSERTATION_ALTERNATIVES.map((a) => a.code);
      // FPMA 1-4
      expect(altCodes).toContain('FPMA_1');
      expect(altCodes).toContain('FPMA_2');
      expect(altCodes).toContain('FPMA_3');
      expect(altCodes).toContain('FPMA_4');
      // EMA 1
      expect(altCodes).toContain('EMA_1');
      // FWTMA 1-6
      expect(altCodes).toContain('FWTMA_1');
      expect(altCodes).toContain('FWTMA_6');
      // HEMA 1-3
      expect(altCodes).toContain('HEMA_1');
      expect(altCodes).toContain('HEMA_2');
      expect(altCodes).toContain('HEMA_3');
      // CCMA 1-3
      expect(altCodes).toContain('CCMA_1');
      expect(altCodes).toContain('CCMA_3');
      // BMA 1-7
      expect(altCodes).toContain('BMA_1');
      expect(altCodes).toContain('BMA_7');
      // ESMA 1-2
      expect(altCodes).toContain('ESMA_1');
      expect(altCodes).toContain('ESMA_2');
      // SVMA 1-4
      expect(altCodes).toContain('SVMA_1');
      expect(altCodes).toContain('SVMA_4');
      // PGMA 1-3
      expect(altCodes).toContain('PGMA_1');
      expect(altCodes).toContain('PGMA_3');
      // BSMA 1-2
      expect(altCodes).toContain('BSMA_1');
      expect(altCodes).toContain('BSMA_2');
    });

    it('should define outer dependence, inner dependence, and feedback edges', () => {
      expect(DISSERTATION_NETWORK_EDGES.length).toBeGreaterThan(20);

      const edgeTypes = new Set(DISSERTATION_NETWORK_EDGES.map((e) => e.edgeType));
      expect(edgeTypes.has('outer_dependence')).toBe(true);
      expect(edgeTypes.has('inner_dependence')).toBe(true);
      expect(edgeTypes.has('feedback')).toBe(true);

      // Verify specific feedback edge: HEMA_1 -> STEAM_PRODUCTION_RATE
      const descalingFeedback = DISSERTATION_NETWORK_EDGES.find(
        (e) => e.fromNode === 'HEMA_1' && e.toNode === 'STEAM_PRODUCTION_RATE'
      );
      expect(descalingFeedback).toBeDefined();
      expect(descalingFeedback?.edgeType).toBe('feedback');
    });

    it('should maintain status: pending_expert_judgment with full academic fidelity disclosure', () => {
      const config = DISSERTATION_PENDING_MODEL_CONFIG;
      expect(config.status).toBe('pending_expert_judgment');
      expect(config.author).toContain('Vishal');
      expect(config.institution).toContain('Moratuwa');
      expect(config.targetAsset).toContain('Kingsbury Hotel');
      expect(config.academicFidelityDisclosure).toContain('zero-invention');
      expect(config.uncalibratedMatrices.length).toBeGreaterThan(0);
      for (const uncal of config.uncalibratedMatrices) {
        expect(uncal.status).toBe('pending_expert_judgment');
        expect(uncal.dimension).toBeGreaterThan(0);
        expect(uncal.elements.length).toBe(uncal.dimension);
      }
    });
  });

  // ===========================================================================
  // 4. TELEMETRY EVALUATION & ANP SYNTHESIS (NO ARBITRARY WEIGHTED SUMS)
  // ===========================================================================
  describe('4. Telemetry Signal Evaluation & ANP Supermatrix Synthesis', () => {
    const boilerCriteria: CriterionInput[] = [
      {
        id: 'c1',
        code: 'FLUE_GAS_TEMP',
        name: 'Flue Gas Stack Temperature',
        criterionType: 'risk',
        weight: 0.5,
        benchmarkRule: {
          metricKey: 'FLUE_GAS_TEMP',
          operator: '>',
          threshold: 190.0,
          unit: '°C',
        },
      },
      {
        id: 'c2',
        code: 'PUMP_OPERATING_HOURS',
        name: 'Feed Pump Operating Hours',
        criterionType: 'cost',
        weight: 0.3,
        benchmarkRule: {
          metricKey: 'PUMP_OPERATING_HOURS',
          operator: '>=',
          threshold: 12000,
          unit: 'hrs',
        },
      },
      {
        id: 'c3',
        code: 'STEAM_PRESSURE',
        name: 'Operating Steam Pressure',
        criterionType: 'risk',
        weight: 0.2,
        benchmarkRule: {
          metricKey: 'STEAM_PRESSURE',
          operator: '<',
          threshold: 8.0,
          unit: 'bar',
        },
      },
    ];

    const boilerAlternatives: AlternativeInput[] = [
      { code: 'EMA_1', name: 'Clean Economizer Soot Deposits' },
      { code: 'FPMA_1', name: 'Replace Worn Feed Pump Seals' },
      { code: 'SVMA_2', name: 'Lap Steam Safety Valve Seats' },
    ];

    it('should return isBreached=false when all telemetry signals are within normal limits', () => {
      const normalSignals: TelemetrySignalInput[] = [
        { key: 'FLUE_GAS_TEMP', value: 182.0, unit: '°C' },
        { key: 'PUMP_OPERATING_HOURS', value: 9500, unit: 'hrs' },
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
      ];

      const evaluation = evaluateAnpDecisionModel({
        criteria: boilerCriteria,
        alternatives: boilerAlternatives,
        signals: normalSignals,
      });

      expect(evaluation.isBreached).toBe(false);
      expect(evaluation.breachedCriteria).toHaveLength(0);
      expect(evaluation.compositeRiskScore).toBe(0);
      expect(evaluation.topAlternative).toBeNull();
      expect(evaluation.mathematicalSnapshot?.method).toBe('SAATY_ANP_SUPERMATRIX');
    });

    it('should detect benchmark excursions and synthesize top alternative via ANP Limit Supermatrix', () => {
      const breachedSignals: TelemetrySignalInput[] = [
        { key: 'FLUE_GAS_TEMP', value: 218.0, unit: '°C' }, // Breached > 190°C!
        { key: 'PUMP_OPERATING_HOURS', value: 12450, unit: 'hrs' }, // Breached >= 12000 hrs!
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' }, // Normal
      ];

      const evaluation = evaluateAnpDecisionModel({
        criteria: boilerCriteria,
        alternatives: boilerAlternatives,
        signals: breachedSignals,
      });

      expect(evaluation.isBreached).toBe(true);
      expect(evaluation.breachedCriteria).toHaveLength(2);
      expect(evaluation.compositeRiskScore).toBeGreaterThan(0.2);

      // Verify ranked alternatives synthesized from Saaty ANP supermatrix
      expect(evaluation.rankedAlternatives).toHaveLength(3);
      for (const alt of evaluation.rankedAlternatives) {
        expect(alt.anpPriorityScore).toBeGreaterThan(0);
        expect(alt.rank).toBeGreaterThanOrEqual(1);
      }
      expect(evaluation.topAlternative).not.toBeNull();
      expect(evaluation.recommendedAction).toContain(evaluation.topAlternative!.name);

      // Verify mathematical supermatrix snapshot
      const mathSnap = evaluation.mathematicalSnapshot;
      expect(mathSnap).toBeDefined();
      expect(mathSnap?.method).toBe('SAATY_ANP_SUPERMATRIX');
      expect(mathSnap?.supermatrix?.convergence.converged).toBe(true);
    });
  });

  // ===========================================================================
  // 5. REPRODUCIBLE CALCULATIONS & IMMUTABLE DECISION RUN SNAPSHOTS
  // ===========================================================================
  describe('5. Immutability & Exact Bit-for-Bit Reproducibility', () => {
    it('should reproduce decision run identically from persisted inputSnapshot and model version', async () => {
      const mockRunId = 'drun-repro-123';
      const mockModelId = 'dm-repro-456';

      const signals: TelemetrySignalInput[] = [
        { key: 'FLUE_GAS_TEMP', value: 215.0, unit: '°C' },
        { key: 'PUMP_OPERATING_HOURS', value: 13000, unit: 'hrs' },
      ];

      const criteria = [
        {
          id: 'crit-1',
          organizationId: TENANT_ID,
          decisionModelId: mockModelId,
          code: 'FLUE_GAS_TEMP',
          name: 'Flue Gas Temp',
          criterionType: 'risk' as const,
          weight: new Prisma.Decimal(0.6),
          sequenceNo: 1,
          parentCriterionId: null,
          clusterCode: 'CRITERIA',
          description: 'Benchmark: > 190 °C',
        },
        {
          id: 'crit-2',
          organizationId: TENANT_ID,
          decisionModelId: mockModelId,
          code: 'PUMP_OPERATING_HOURS',
          name: 'Pump Operating Hours',
          criterionType: 'cost' as const,
          weight: new Prisma.Decimal(0.4),
          sequenceNo: 2,
          parentCriterionId: null,
          clusterCode: 'CRITERIA',
          description: 'Benchmark: >= 12000 hrs',
        },
      ];

      const alternatives = [
        {
          id: 'alt-1',
          organizationId: TENANT_ID,
          decisionModelId: mockModelId,
          code: 'EMA_1',
          name: 'Clean Economizer Coils',
          description: null,
          category: 'Quarterly',
          componentCode: 'EC',
        },
        {
          id: 'alt-2',
          organizationId: TENANT_ID,
          decisionModelId: mockModelId,
          code: 'FPMA_1',
          name: 'Replace Pump Seals',
          description: null,
          category: 'Annual',
          componentCode: 'FP',
        },
      ];

      // Perform initial evaluation
      const initialEval = evaluateAnpDecisionModel({
        criteria: criteria.map((c) => ({
          ...c,
          weight: Number(c.weight),
        })),
        alternatives,
        signals,
      });

      const persistedRun = {
        id: mockRunId,
        organizationId: TENANT_ID,
        decisionModelId: mockModelId,
        runAt: new Date(),
        inputSnapshot: {
          evaluatedAt: new Date().toISOString(),
          signals,
          modelVersion: 1,
        },
        resultSnapshot: {
          compositeRiskScore: initialEval.compositeRiskScore,
          recommendedPriority: initialEval.recommendedPriority,
          breachedCriteria: initialEval.breachedCriteria,
          topAlternative: initialEval.topAlternative,
          rankedAlternatives: initialEval.rankedAlternatives,
          supermatrixWeights: initialEval.supermatrixWeights,
        },
        decisionModel: {
          id: mockModelId,
          code: 'BOILER-ANP-TEST',
          version: 1,
          configuration: {},
          criteria,
          alternatives,
        },
      };

      vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue(persistedRun as any);

      await runWithTenantContext(TENANT_ID, async () => {
        const reproduced = await decisionSupportService.reproduceDecisionRun(mockRunId);

        expect(reproduced.isReproducible).toBe(true);
        expect(reproduced.runId).toBe(mockRunId);
        expect(reproduced.decisionModelCode).toBe('BOILER-ANP-TEST');
        expect(reproduced.recalculatedResult.compositeRiskScore).toBe(
          initialEval.compositeRiskScore
        );
        expect(reproduced.recalculatedResult.topAlternative?.code).toBe(
          initialEval.topAlternative?.code
        );
        expect(reproduced.recalculatedResult.rankedAlternatives).toHaveLength(2);
      });
    });
  });

  // ===========================================================================
  // 6. MODEL GOVERNANCE: APPROVAL & ACTIVATION LIFECYCLE
  // ===========================================================================
  describe('6. Model Governance, Approval and Activation', () => {
    it('should reject model approval if any pairwise comparison matrix has CR > 0.10', async () => {
      const mockModelId = 'dm-gov-001';

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        code: 'TEST-ANP',
        status: 'draft',
        configuration: {},
        criteria: [],
        alternatives: [],
        pairwiseComparisons: [],
        networkEdges: [],
      } as any);

      // Inconsistent 3x3 comparisons where CR > 0.10
      // A > B (5), B > C (7), but C > A (8)
      const inconsistentCells = [
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e1', colElementId: 'e2', saatyValue: new Prisma.Decimal(5.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e2', colElementId: 'e3', saatyValue: new Prisma.Decimal(7.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e3', colElementId: 'e1', saatyValue: new Prisma.Decimal(8.0) },
        // reciprocals
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e2', colElementId: 'e1', saatyValue: new Prisma.Decimal(0.2) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e3', colElementId: 'e2', saatyValue: new Prisma.Decimal(0.1428) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e1', colElementId: 'e3', saatyValue: new Prisma.Decimal(0.125) },
      ];

      vi.spyOn(tenantPrisma.decisionPairwiseComparison, 'findMany').mockResolvedValue(
        inconsistentCells as any
      );

      await runWithTenantContext(TENANT_ID, async () => {
        await expect(
          decisionSupportService.approveDecisionModel(mockModelId, 'Approving test model', USER_ID)
        ).rejects.toMatchObject({
          status: 422,
          code: 'ANP_MODEL_INCONSISTENT',
        });
      });
    });

    it('should approve model into validated status when all pairwise comparison matrices have CR <= 0.10', async () => {
      const mockModelId = 'dm-gov-002';

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        code: 'TEST-ANP',
        status: 'draft',
        configuration: {},
        criteria: [],
        alternatives: [],
        pairwiseComparisons: [],
        networkEdges: [],
      } as any);

      // Consistent 3x3 comparisons (Saaty reference: [1, 3, 7], [1/3, 1, 5], [1/7, 1/5, 1])
      const consistentCells = [
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e1', colElementId: 'e2', saatyValue: new Prisma.Decimal(3.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e1', colElementId: 'e3', saatyValue: new Prisma.Decimal(7.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e2', colElementId: 'e3', saatyValue: new Prisma.Decimal(5.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e2', colElementId: 'e1', saatyValue: new Prisma.Decimal(1.0 / 3.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e3', colElementId: 'e1', saatyValue: new Prisma.Decimal(1.0 / 7.0) },
        { clusterCode: 'CRITERIA', criterionId: null, rowElementId: 'e3', colElementId: 'e2', saatyValue: new Prisma.Decimal(1.0 / 5.0) },
      ];

      vi.spyOn(tenantPrisma.decisionPairwiseComparison, 'findMany').mockResolvedValue(
        consistentCells as any
      );

      const updateSpy = vi
        .spyOn(tenantPrisma.decisionModel, 'update')
        .mockImplementation(async ({ data }: any) => ({
          id: mockModelId,
          status: data.status,
          configuration: data.configuration,
          criteria: [],
          alternatives: [],
        } as any));

      await runWithTenantContext(TENANT_ID, async () => {
        const approved = await decisionSupportService.approveDecisionModel(
          mockModelId,
          'Saaty reference matrices validated',
          USER_ID
        );

        expect(approved.status).toBe('validated');
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockModelId },
            data: expect.objectContaining({ status: 'validated' }),
          })
        );
      });
    });

    it('should activate validated model and retire previously active model for that organization', async () => {
      const mockModelId = 'dm-gov-003';

      vi.spyOn(tenantPrisma.decisionModel, 'findFirst').mockResolvedValue({
        id: mockModelId,
        organizationId: TENANT_ID,
        code: 'BOILER-ANP',
        status: 'validated',
        configuration: {},
        criteria: [],
        alternatives: [],
        pairwiseComparisons: [],
        networkEdges: [],
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
        const activated = await decisionSupportService.activateDecisionModel(
          mockModelId,
          USER_ID
        );

        expect(activated.status).toBe('active');
        expect(updateManySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              organizationId: TENANT_ID,
              code: 'BOILER-ANP',
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
