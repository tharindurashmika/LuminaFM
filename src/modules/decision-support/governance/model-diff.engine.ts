/**
 * LuminaFM - Decision Model Version Comparison & Diff Engine
 *
 * Provides deep side-by-side comparison between any two decision model versions:
 * - Provenance separation (Academic Dissertation Baseline vs Commercial Client Proposal)
 * - Criteria diffing: added, removed, modified (benchmarks, weights, operators, status)
 * - Alternatives diffing: added, removed
 * - ANP Limit Supermatrix output comparison: priority deltas (Δp_a) and rank shifts
 * - Governance, literature, and evidence verification tracking
 */

import {
  ModelVersionDiffResult,
  CriteriaDiffItem,
  AlternativeDiffItem,
  PriorityShiftItem,
  ModelProvenance,
  AcademicValidationLevel,
} from './governance.types';
import {
  buildAndSolveAnpSupermatrix,
  CriterionInput,
  AlternativeInput,
} from '../anp.engine';

export interface ModelEntityForDiff {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
  configuration?: Record<string, any> | null;
  criteria: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    criterionType: string;
    weight?: any;
    benchmarkValue?: any;
    benchmarkOperator?: string | null;
    clusterCode?: string;
    sequenceNo?: number;
  }[];
  alternatives: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    category?: string | null;
    componentCode?: string | null;
  }[];
}

/**
 * Executes a comprehensive, mathematically rigorous comparison between two decision models.
 */
export function compareDecisionModelVersions(
  modelA: ModelEntityForDiff,
  modelB: ModelEntityForDiff
): ModelVersionDiffResult {
  const configA = (modelA.configuration || {}) as Record<string, any>;
  const configB = (modelB.configuration || {}) as Record<string, any>;

  const provenanceA: ModelProvenance =
    configA.modelProvenance || (configA.isAcademicBaseline ? 'dissertation_baseline' : 'commercial_client');
  const provenanceB: ModelProvenance =
    configB.modelProvenance || (configB.isAcademicBaseline ? 'dissertation_baseline' : 'commercial_client');

  const validationLevelA: AcademicValidationLevel =
    configA.academicValidationLevel ||
    (configA.isAcademicBaseline ? 'peer_reviewed_dissertation' : 'unvalidated_client_proposal');
  const validationLevelB: AcademicValidationLevel =
    configB.academicValidationLevel ||
    (configB.isAcademicBaseline ? 'peer_reviewed_dissertation' : 'unvalidated_client_proposal');

  // 1. Provenance Difference
  const isProvenanceEqual = provenanceA === provenanceB;
  let provenanceMessage = 'Both models share the same provenance classification.';
  if (!isProvenanceEqual) {
    if (provenanceA === 'dissertation_baseline') {
      provenanceMessage =
        'Model A is the authoritative Peer-Reviewed Academic Baseline (Moratuwa 2025), whereas Model B is an unvalidated Commercial Client Proposal.';
    } else {
      provenanceMessage =
        'Model A is a Commercial Client Proposal, whereas Model B is the authoritative Peer-Reviewed Academic Baseline (Moratuwa 2025).';
    }
  }

  // 2. Criteria Diff
  const criteriaMapA = new Map(modelA.criteria.map((c) => [c.code.toUpperCase(), c]));
  const criteriaMapB = new Map(modelB.criteria.map((c) => [c.code.toUpperCase(), c]));

  const addedCriteria: CriteriaDiffItem[] = [];
  const removedCriteria: CriteriaDiffItem[] = [];
  const modifiedCriteria: CriteriaDiffItem[] = [];

  for (const [code, cB] of criteriaMapB.entries()) {
    const cA = criteriaMapA.get(code);
    if (!cA) {
      addedCriteria.push({
        criterionCode: code,
        name: cB.name,
        diffType: 'added',
        changes: [],
      });
    } else {
      const changes: { field: string; valueA: unknown; valueB: unknown }[] = [];

      const weightA = cA.weight !== null && cA.weight !== undefined ? Number(cA.weight) : 1.0;
      const weightB = cB.weight !== null && cB.weight !== undefined ? Number(cB.weight) : 1.0;
      if (Math.abs(weightA - weightB) > 1e-4) {
        changes.push({ field: 'weight', valueA: weightA, valueB: weightB });
      }

      if (cA.benchmarkOperator !== cB.benchmarkOperator) {
        changes.push({
          field: 'benchmarkOperator',
          valueA: cA.benchmarkOperator,
          valueB: cB.benchmarkOperator,
        });
      }

      const valA = cA.benchmarkValue !== null ? Number(cA.benchmarkValue) : null;
      const valB = cB.benchmarkValue !== null ? Number(cB.benchmarkValue) : null;
      if (valA !== valB) {
        changes.push({ field: 'benchmarkValue', valueA: valA, valueB: valB });
      }

      if (cA.criterionType !== cB.criterionType) {
        changes.push({
          field: 'criterionType',
          valueA: cA.criterionType,
          valueB: cB.criterionType,
        });
      }

      if (changes.length > 0) {
        modifiedCriteria.push({
          criterionCode: code,
          name: cB.name,
          diffType: 'modified',
          changes,
        });
      }
    }
  }

  for (const [code, cA] of criteriaMapA.entries()) {
    if (!criteriaMapB.has(code)) {
      removedCriteria.push({
        criterionCode: code,
        name: cA.name,
        diffType: 'removed',
        changes: [],
      });
    }
  }

  // 3. Alternatives Diff
  const altMapA = new Map(modelA.alternatives.map((a) => [a.code.toUpperCase(), a]));
  const altMapB = new Map(modelB.alternatives.map((a) => [a.code.toUpperCase(), a]));

  const addedAlternatives: AlternativeDiffItem[] = [];
  const removedAlternatives: AlternativeDiffItem[] = [];

  for (const [code, aB] of altMapB.entries()) {
    if (!altMapA.has(code)) {
      addedAlternatives.push({
        alternativeCode: code,
        name: aB.name,
        diffType: 'added',
      });
    }
  }

  for (const [code, aA] of altMapA.entries()) {
    if (!altMapB.has(code)) {
      removedAlternatives.push({
        alternativeCode: code,
        name: aA.name,
        diffType: 'removed',
      });
    }
  }

  // 4. Mathematical ANP Priority Shifts & Rank Deltas
  const solvedA = solveModelForPriorities(modelA);
  const solvedB = solveModelForPriorities(modelB);

  const allAltCodes = Array.from(new Set([...Object.keys(solvedA), ...Object.keys(solvedB)])).sort();

  const sortedA = Object.entries(solvedA).sort((a, b) => b[1] - a[1]);
  const sortedB = Object.entries(solvedB).sort((a, b) => b[1] - a[1]);

  const rankMapA = new Map(sortedA.map(([code], idx) => [code, idx + 1]));
  const rankMapB = new Map(sortedB.map(([code], idx) => [code, idx + 1]));

  const priorityShifts: PriorityShiftItem[] = [];
  let maxShift = 0;
  let topPromoted: { code: string; delta: number } | null = null;
  let topDemoted: { code: string; delta: number } | null = null;

  for (const code of allAltCodes) {
    const pA = solvedA[code] ?? 0;
    const pB = solvedB[code] ?? 0;
    const delta = Number((pB - pA).toFixed(6));
    const rA = rankMapA.get(code) ?? 999;
    const rB = rankMapB.get(code) ?? 999;
    const rShift = rA - rB; // Positive means rank improved (e.g. rank 3 -> rank 1 is +2)

    const altName = altMapB.get(code)?.name || altMapA.get(code)?.name || code;

    priorityShifts.push({
      code,
      name: altName,
      priorityA: Number(pA.toFixed(6)),
      priorityB: Number(pB.toFixed(6)),
      deltaPriority: delta,
      rankA: rA,
      rankB: rB,
      rankShift: rShift,
    });

    const absDelta = Math.abs(delta);
    if (absDelta > maxShift) maxShift = absDelta;

    if (!topPromoted || delta > topPromoted.delta) {
      topPromoted = { code, delta };
    }
    if (!topDemoted || delta < topDemoted.delta) {
      topDemoted = { code, delta };
    }
  }

  priorityShifts.sort((a, b) => Math.abs(b.deltaPriority) - Math.abs(a.deltaPriority));

  // 5. Governance Diff Metrics
  const litA = Array.isArray(configA.literatureCatalog) ? configA.literatureCatalog.length : 0;
  const litB = Array.isArray(configB.literatureCatalog) ? configB.literatureCatalog.length : 0;

  const apprHX_A = Array.isArray(configA.approvalHistory) ? configA.approvalHistory.length : 0;
  const apprHX_B = Array.isArray(configB.approvalHistory) ? configB.approvalHistory.length : 0;

  return {
    modelA: {
      id: modelA.id,
      code: modelA.code,
      name: modelA.name,
      version: modelA.version,
      status: modelA.status,
      provenance: provenanceA,
      academicValidationLevel: validationLevelA,
    },
    modelB: {
      id: modelB.id,
      code: modelB.code,
      name: modelB.name,
      version: modelB.version,
      status: modelB.status,
      provenance: provenanceB,
      academicValidationLevel: validationLevelB,
    },
    provenanceDifference: {
      isProvenanceEqual,
      message: provenanceMessage,
    },
    criteriaDiff: {
      added: addedCriteria,
      removed: removedCriteria,
      modified: modifiedCriteria,
      totalChanges: addedCriteria.length + removedCriteria.length + modifiedCriteria.length,
    },
    alternativesDiff: {
      added: addedAlternatives,
      removed: removedAlternatives,
      totalChanges: addedAlternatives.length + removedAlternatives.length,
    },
    anpPriorityShifts: {
      shifts: priorityShifts,
      maxShift: Number(maxShift.toFixed(6)),
      topPromotedAlternative: topPromoted && topPromoted.delta > 0 ? topPromoted.code : null,
      topDemotedAlternative: topDemoted && topDemoted.delta < 0 ? topDemoted.code : null,
    },
    governanceDiff: {
      newLiteratureAdded: Math.max(0, litB - litA),
      newEvidenceAdded: 0,
      approvalHistoryDifference: apprHX_B - apprHX_A,
    },
  };
}

function solveModelForPriorities(model: ModelEntityForDiff): Record<string, number> {
  const criteriaInputs: CriterionInput[] = model.criteria.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    criterionType: (c.criterionType as any) || 'risk',
    weight: c.weight !== null && c.weight !== undefined ? Number(c.weight) : 1.0,
    sequenceNo: c.sequenceNo,
  }));

  const alternativeInputs: AlternativeInput[] = model.alternatives.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    description: a.description,
    category: a.category,
    componentCode: a.componentCode,
  }));

  if (criteriaInputs.length === 0 || alternativeInputs.length === 0) {
    return {};
  }

  const solved = buildAndSolveAnpSupermatrix({
    criteria: criteriaInputs,
    alternatives: alternativeInputs,
  });

  return solved.normalizedAlternativePriorities;
}
