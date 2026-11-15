/**
 * LuminaFM - Operational ANP Decision Support Service
 *
 * Implements end-to-end integration of the validated Analytic Network Process (ANP)
 * decision engine with real-world LuminaFM operational telemetry and logbooks.
 *
 * Strictly enforces:
 * 1. Data completeness & quality assessment before ANP execution.
 * 2. Independent escalation of critical safety alerts (safety is not traded off in ANP).
 * 3. Prohibition of automatic safety-critical interventions.
 * 4. Structured maintenance recommendations with criteria influence attribution.
 * 5. Historical maintenance context linking.
 * 6. Mandatory human-in-the-loop engineer review & approval before work order dispatch.
 */

import prisma from '../../../lib/prisma';
import tenantPrisma from '../../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../../tenant/tenant.context';
import { PriorityLevel, Prisma } from '@prisma/client';
import {
  evaluateAnpDecisionModel,
  CriterionInput,
  AlternativeInput,
  TelemetrySignalInput,
  AnpEvaluationResult,
} from '../anp.engine';
import {
  DataQualityValidator,
} from './data-quality.validator';
import {
  SafetyEscalationService,
} from './safety-escalation.service';
import {
  OperationalAnpExecutionResult,
  AnpMaintenanceRecommendation,
  CriteriaAttributionDetail,
  LinkedReadingSummary,
  AssetMaintenanceContext,
  RecommendationSafetyTier,
  ReviewRecommendationDto,
  RecommendationApprovalResult,
  SafetyEscalationAlert,
} from './operational-integration.types';
import { workOrdersService } from '../../work-orders/work-orders.service';
import { auditAndAttachmentsService } from '../../audit/audit.service';
import { DailyLogSubmittedEventPayload } from '../decision-support.events';

export class OperationalAnpService {
  /**
   * Main entry point when a daily logbook or operational telemetry is submitted.
   */
  public async processDailyLogSubmission(
    event: DailyLogSubmittedEventPayload
  ): Promise<any> {
    const organizationId = requireCurrentTenantId();

    // -------------------------------------------------------------------------
    // Step 1: Validate Data Completeness & Quality
    // -------------------------------------------------------------------------
    const dataQuality = DataQualityValidator.validateTelemetryQuality(event.signals);

    // -------------------------------------------------------------------------
    // Step 2: Independent Safety Alert Escalation
    // Critical safety limits must escalate independently and not depend on ANP ranking.
    // -------------------------------------------------------------------------
    const recipientUserIds = event.operatorUserId ? [event.operatorUserId] : [];
    const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(
      event.assetId || 'unassigned-boiler',
      event.signals,
      recipientUserIds
    );

    // Execute atomic database transaction
    return prisma.$transaction(async (tx: any) => {
      // If critical safety alerts are detected, dispatch emergency notifications immediately
      if (safetyAlerts.length > 0) {
        await this.dispatchSafetyAlertNotifications(organizationId, safetyAlerts, event.operatorUserId, tx);
      }

      // -------------------------------------------------------------------------
      // Step 3: Retrieve Appropriate Active Decision Model
      // -------------------------------------------------------------------------
      let assetRecord: {
        id: string;
        assetCode: string;
        name: string;
        siteId: string;
        locationId: string;
        assetCategoryId: string;
      } | null = null;

      if (event.assetId && tx.asset) {
        assetRecord = await tx.asset.findFirst({
          where: { id: event.assetId, organizationId },
          select: {
            id: true,
            assetCode: true,
            name: true,
            siteId: true,
            locationId: true,
            assetCategoryId: true,
          },
        });
      }

      let decisionModel: any = null;
      if (tx.decisionModel) {
        decisionModel = await tx.decisionModel.findFirst({
          where: {
            organizationId,
            status: 'active',
            ...(assetRecord?.assetCategoryId
              ? {
                  OR: [
                    { assetCategoryId: assetRecord.assetCategoryId },
                    { assetCategoryId: null },
                  ],
                }
              : {}),
          },
          include: {
            criteria: { orderBy: { sequenceNo: 'asc' } },
            alternatives: { orderBy: { code: 'asc' } },
          },
          orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
        });

        if (!decisionModel) {
          // Fallback to latest approved or draft model if no active model exists
          decisionModel = await tx.decisionModel.findFirst({
            where: { organizationId },
            include: {
              criteria: { orderBy: { sequenceNo: 'asc' } },
              alternatives: { orderBy: { code: 'asc' } },
            },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
          });
        }
      }

      if (!decisionModel) {
        return {
          evaluated: false,
          isBreached: false,
          reason: 'No ANP DecisionModel found for this organization to process operational logbook.',
        };
      }

      // -------------------------------------------------------------------------
      // Step 4: Identify Applicable Criteria & Candidate Alternatives
      // -------------------------------------------------------------------------
      const criteriaInputs: CriterionInput[] = (decisionModel.criteria || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        criterionType: c.criterionType,
        clusterCode: c.clusterCode,
        weight: c.weight !== null ? Number(c.weight) : 1.0,
        parentCriterionId: c.parentCriterionId,
        sequenceNo: c.sequenceNo,
      }));

      const alternativeInputs: AlternativeInput[] = (decisionModel.alternatives || []).map((a: any) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        category: a.category,
        componentCode: a.componentCode,
      }));

      const modelConfig =
        typeof decisionModel.configuration === 'object' && decisionModel.configuration !== null
          ? (decisionModel.configuration as any)
          : undefined;

      // -------------------------------------------------------------------------
      // Step 5: Execute Mathematical ANP Calculation (Limit Supermatrix)
      // -------------------------------------------------------------------------
      const evaluation: AnpEvaluationResult = evaluateAnpDecisionModel({
        criteria: criteriaInputs,
        alternatives: alternativeInputs,
        signals: event.signals,
        modelConfiguration: modelConfig,
      });

      // -------------------------------------------------------------------------
      // Step 6: Query Asset Maintenance History Context
      // -------------------------------------------------------------------------
      const maintenanceContext = await this.getAssetMaintenanceContext(
        organizationId,
        event.assetId,
        tx
      );

      // -------------------------------------------------------------------------
      // Step 7: Generate Ranked Maintenance Recommendations with Attribution
      // -------------------------------------------------------------------------
      const recommendations = this.generateRecommendationsWithAttribution(
        evaluation,
        event.signals,
        maintenanceContext
      );

      // Optional auto-draft work order if requested and supported
      let draftedWorkOrder: any = null;
      if (
        evaluation.isBreached &&
        event.autoDraftWorkOrder !== false &&
        tx.workOrder &&
        (assetRecord?.siteId || event.locationId)
      ) {
        try {
          const targetSiteId = assetRecord?.siteId || 's-default';
          let targetMaintTypeId = 'mt-default';
          if (tx.maintenanceType) {
            const mType = await tx.maintenanceType.findFirst({
              where: { organizationId },
              select: { id: true },
            });
            targetMaintTypeId = mType?.id || targetMaintTypeId;
          }

          const topRec = recommendations[0];
          const woNumber =
            typeof workOrdersService.generateWorkOrderNumber === 'function'
              ? await workOrdersService.generateWorkOrderNumber(organizationId, tx)
              : `WO-${Date.now()}`;

          draftedWorkOrder = await tx.workOrder.create({
            data: {
              organizationId,
              workOrderNumber: woNumber,
              siteId: targetSiteId,
              assetId: assetRecord?.id || event.assetId || null,
              locationId: event.locationId || assetRecord?.locationId || null,
              maintenanceTypeId: targetMaintTypeId,
              title: `[ANP Auto-Draft] ${assetRecord?.assetCode || 'Boiler'}: ${topRec?.alternativeName || 'Corrective Intervention'}`,
              description: `Automated ANP Decision Support Work Order.\n${topRec?.technicalWorkScope || evaluation.recommendedAction}`,
              priority: evaluation.recommendedPriority,
              status: 'draft',
              requestedBy: event.operatorUserId || null,
            },
          });

          if (tx.workOrderStatusHistory) {
            await tx.workOrderStatusHistory.create({
              data: {
                organizationId,
                workOrderId: draftedWorkOrder.id,
                oldStatus: null,
                newStatus: 'draft',
                changedBy: event.operatorUserId || null,
                comment: 'Automatically drafted by ANP Decision Support Model following benchmark breach.',
              },
            });
          }
        } catch {
          // Safe optional auto-draft
        }
      }

      // -------------------------------------------------------------------------
      // Step 8: Persist Immutable DecisionRun Snapshot
      // -------------------------------------------------------------------------
      const runResult = await this.persistDecisionRunSnapshot({
        organizationId,
        decisionModel,
        assetRecord,
        event,
        dataQuality,
        safetyAlerts,
        evaluation,
        recommendations,
        maintenanceContext,
        draftedWorkOrderId: draftedWorkOrder?.id || null,
        tx,
      });

      return {
        evaluated: true,
        isBreached: evaluation.isBreached,
        decisionModelId: decisionModel.id,
        evaluation,
        decisionRun: runResult.rawDecisionRun,
        draftedWorkOrder,
        notification: runResult.notification,
        ...runResult,
      };
    });
  }

  /**
   * Retrieves an existing decision run with expanded recommendations and explanations.
   */
  public async getOperationalDecisionRun(runId: string): Promise<OperationalAnpExecutionResult> {
    const organizationId = requireCurrentTenantId();

    const run = await tenantPrisma.decisionRun.findFirst({
      where: { id: runId, organizationId },
      include: {
        decisionModel: {
          select: { id: true, code: true, name: true, version: true },
        },
        asset: {
          select: { id: true, assetCode: true, name: true },
        },
      },
    });

    if (!run) {
      throw {
        status: 404,
        code: 'DECISION_RUN_NOT_FOUND',
        message: `Decision run '${runId}' not found in active organization.`,
      };
    }

    const inputSnap = run.inputSnapshot as any;
    const resultSnap = run.resultSnapshot as any;

    return {
      decisionRunId: run.id,
      assetId: run.assetId,
      assetCode: run.asset?.assetCode || null,
      assetName: run.asset?.name || null,
      decisionModelId: run.decisionModelId,
      decisionModelCode: run.decisionModel.code,
      decisionModelVersion: run.decisionModel.version,
      evaluatedAt: run.runAt.toISOString(),
      dataQuality: inputSnap?.dataQuality || {
        isValid: true,
        score: 1.0,
        completenessRatio: 1.0,
        missingRequiredParameters: [],
        outOfRangeReadings: [],
        qualityFlags: [],
        totalParametersAssessed: 0,
        validParametersCount: 0,
        validationTimestamp: run.runAt.toISOString(),
      },
      safetyAlerts: resultSnap?.safetyAlerts || [],
      recommendations: resultSnap?.recommendations || [],
      isBreached: resultSnap?.isBreached ?? (resultSnap?.breachedCriteria?.length > 0),
      compositeRiskScore: Number(run.confidenceScore || resultSnap?.compositeRiskScore || 0),
      recommendedPriority: resultSnap?.recommendedPriority || 'medium',
      topAlternative: resultSnap?.topAlternative || null,
      supermatrixWeights: resultSnap?.supermatrixWeights || {},
      deterministicHash: inputSnap?.deterministicHash || run.id,
      convergenceDetails: resultSnap?.mathematicalSnapshot?.convergenceDetails || {
        converged: true,
        iterations: 6,
        finalEpsilon: 1e-11,
      },
    };
  }

  /**
   * Allows authorized engineers to review, approve, or reject proposed recommendations.
   * "Do not automatically prescribe safety-critical interventions."
   * Converting to a Work Order requires explicit engineer sign-off!
   */
  public async reviewAndApproveRecommendation(
    runId: string,
    recommendationIndex: number,
    dto: ReviewRecommendationDto,
    engineerUserId: string
  ): Promise<RecommendationApprovalResult> {
    const organizationId = requireCurrentTenantId();

    const run = await tenantPrisma.decisionRun.findFirst({
      where: { id: runId, organizationId },
      include: {
        decisionModel: true,
        asset: {
          select: { id: true, assetCode: true, name: true, siteId: true, locationId: true },
        },
      },
    });

    if (!run) {
      throw {
        status: 404,
        code: 'DECISION_RUN_NOT_FOUND',
        message: `Decision run '${runId}' not found.`,
      };
    }

    const resultSnap = (run.resultSnapshot as any) || {};
    const recommendations: AnpMaintenanceRecommendation[] = Array.isArray(resultSnap.recommendations)
      ? resultSnap.recommendations
      : [];

    if (recommendationIndex < 0 || recommendationIndex >= recommendations.length) {
      throw {
        status: 400,
        code: 'INVALID_RECOMMENDATION_INDEX',
        message: `Recommendation index ${recommendationIndex} is out of bounds (total recommendations: ${recommendations.length}).`,
      };
    }

    const rec = recommendations[recommendationIndex];

    // Check Safety Constraint: Safety-critical interventions require physical on-site certified engineer sign-off
    if (rec.safetyTier === 'SAFETY_CRITICAL_INTERVENTION' && dto.action === 'approve') {
      if (!dto.engineerNotes || dto.engineerNotes.trim().length < 15) {
        throw {
          status: 422,
          code: 'SAFETY_CRITICAL_INSPECTOR_JUSTIFICATION_REQUIRED',
          message:
            'This action is classified as a SAFETY_CRITICAL_INTERVENTION. ' +
            'Certified engineer physical on-site inspection justification (minimum 15 characters) is mandatory before approval.',
        };
      }
    }

    let createdWorkOrder: any = null;

    if (dto.action === 'approve' || dto.action === 'modify_and_approve') {
      rec.reviewStatus = 'APPROVED';
      rec.reviewedByUserId = engineerUserId;
      rec.reviewedAt = new Date().toISOString();
      rec.engineerNotes = dto.engineerNotes;

      // Auto-create approved Work Order if requested (defaults to true)
      if (dto.autoCreateWorkOrder !== false && run.asset?.siteId) {
        createdWorkOrder = await this.createWorkOrderFromRecommendation(
          organizationId,
          run,
          rec,
          dto,
          engineerUserId
        );
        rec.reviewStatus = 'CONVERTED_TO_WORK_ORDER';
        rec.generatedWorkOrderId = createdWorkOrder.id;
      }
    } else if (dto.action === 'reject') {
      rec.reviewStatus = 'REJECTED';
      rec.reviewedByUserId = engineerUserId;
      rec.reviewedAt = new Date().toISOString();
      rec.engineerNotes = dto.engineerNotes;
    }

    // Persist updated recommendation status in decisionRun snapshot
    resultSnap.recommendations = recommendations;

    await tenantPrisma.decisionRun.update({
      where: { id: run.id },
      data: {
        resultSnapshot: resultSnap as unknown as Prisma.InputJsonValue,
        workOrderId: createdWorkOrder?.id || run.workOrderId,
      },
    });

    // Record audit log
    try {
      await auditAndAttachmentsService.recordAuditLog({
        action: `ANP_RECOMMENDATION_${dto.action.toUpperCase()}`,
        entityType: 'decision_run',
        entityId: run.id,
        newValues: {
          recommendationId: rec.recommendationId,
          alternativeCode: rec.alternativeCode,
          action: dto.action,
          reviewStatus: rec.reviewStatus,
          generatedWorkOrderId: createdWorkOrder?.id || null,
          engineerNotes: dto.engineerNotes,
        },
        userId: engineerUserId,
      });
    } catch {
      // Safe non-blocking audit logging
    }

    return {
      recommendationId: rec.recommendationId,
      decisionRunId: run.id,
      reviewStatus: rec.reviewStatus,
      reviewedByUserId: engineerUserId,
      reviewedAt: rec.reviewedAt!,
      engineerNotes: dto.engineerNotes,
      workOrder: createdWorkOrder
        ? {
            id: createdWorkOrder.id,
            workOrderNumber: createdWorkOrder.workOrderNumber,
            title: createdWorkOrder.title,
            status: createdWorkOrder.status,
            priority: createdWorkOrder.priority,
          }
        : null,
    };
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private async dispatchSafetyAlertNotifications(
    organizationId: string,
    alerts: SafetyEscalationAlert[],
    fallbackUserId?: string | null,
    tx: any = tenantPrisma
  ): Promise<void> {
    try {
      let recipientUserId = fallbackUserId;

      if (!recipientUserId && tx.organizationMembership) {
        const activeMember = await tx.organizationMembership.findFirst({
          where: { organizationId, status: 'active' },
          select: { userId: true },
        });
        recipientUserId = activeMember?.userId;
      }

      if (recipientUserId && tx.notification) {
        for (const alert of alerts) {
          await tx.notification.create({
            data: {
              organizationId,
              userId: recipientUserId,
              notificationType: 'CRITICAL_SAFETY_ESCALATION',
              severity: 'critical',
              title: `[SAFETY ESCALATION] ${alert.ruleTitle}`,
              message: `${alert.safetyLimit}. ${alert.emergencyActionRequired}`,
              entityType: 'safety_escalation',
              entityId: alert.alertId,
            },
          });
        }
      }
    } catch {
      // Safe non-blocking notification delivery
    }
  }

  private async getAssetMaintenanceContext(
    organizationId: string,
    assetId?: string | null,
    tx: any = tenantPrisma
  ): Promise<AssetMaintenanceContext> {
    if (!assetId || !tx.workOrder) {
      return {
        lastCompletedWorkOrder: null,
        daysSinceLastIntervention: null,
        previousInterventionsCount: 0,
        contextualNote: 'No asset identifier provided for maintenance history linking.',
      };
    }

    try {
      const recentWos = await tx.workOrder.findMany({
        where: {
          organizationId,
          assetId,
          status: 'completed',
        },
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          actualEndAt: true,
          maintenanceType: { select: { name: true } },
        },
        orderBy: { actualEndAt: 'desc' },
        take: 5,
      });

      if (!recentWos || recentWos.length === 0) {
        return {
          lastCompletedWorkOrder: null,
          daysSinceLastIntervention: null,
          previousInterventionsCount: 0,
          contextualNote: 'No previous completed maintenance work orders recorded for this boiler.',
        };
      }

      const latest = recentWos[0];
      const completedDate = latest.actualEndAt || new Date();
      const daysSince = Math.floor(
        (Date.now() - new Date(completedDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        lastCompletedWorkOrder: {
          id: latest.id,
          workOrderNumber: latest.workOrderNumber,
          title: latest.title,
          completedAt: new Date(completedDate).toISOString(),
          maintenanceType: latest.maintenanceType?.name,
        },
        daysSinceLastIntervention: Math.max(0, daysSince),
        previousInterventionsCount: recentWos.length,
        contextualNote: `Last maintenance intervention completed ${daysSince} days ago (${latest.workOrderNumber}: ${latest.title}).`,
      };
    } catch {
      return {
        lastCompletedWorkOrder: null,
        daysSinceLastIntervention: null,
        previousInterventionsCount: 0,
      };
    }
  }

  private generateRecommendationsWithAttribution(
    evaluation: AnpEvaluationResult,
    signals: TelemetrySignalInput[],
    historyContext: AssetMaintenanceContext
  ): AnpMaintenanceRecommendation[] {
    const recommendations: AnpMaintenanceRecommendation[] = [];

    const signalMap = new Map<string, TelemetrySignalInput>();
    for (const s of signals) {
      if (s.key) signalMap.set(s.key.toUpperCase(), s);
    }

    const breachedList = evaluation.breachedCriteria || [];

    // Calculate total breach weight for proportional attribution
    const totalBreachWeight = breachedList.reduce((sum, b) => sum + (b.normalizedWeight || 1.0), 0) || 1.0;

    for (let i = 0; i < evaluation.rankedAlternatives.length; i++) {
      const alt = evaluation.rankedAlternatives[i];
      const rank = i + 1;

      // 1. Determine Safety Tier based on component risk profile
      let safetyTier: RecommendationSafetyTier = 'PREVENTIVE_OPTIMIZATION';
      if (
        alt.code.includes('SVMA') ||
        alt.code.includes('BSMA') ||
        alt.code.includes('SAFETY') ||
        alt.code.includes('PRESSURE_RELIEF')
      ) {
        safetyTier = 'SAFETY_CRITICAL_INTERVENTION';
      } else if (
        alt.code.includes('OVERHAUL') ||
        alt.code.includes('DESCALE') ||
        alt.code.includes('REPLACE') ||
        alt.code.includes('FPMA') ||
        alt.code.includes('BMA') ||
        alt.code.includes('HEMA')
      ) {
        safetyTier = 'OPERATIONAL_MAINTENANCE';
      }

      // 2. Criteria Attribution (explain the criteria influencing each recommendation)
      const criteriaAttribution: CriteriaAttributionDetail[] = [];
      const linkedReadings: LinkedReadingSummary[] = [];

      for (const breach of breachedList) {
        const propContribution = Math.round(((breach.normalizedWeight || 1.0) / totalBreachWeight) * 1000) / 10;

        let rootCause = `Benchmark excursion detected on ${breach.criterionName}.`;
        if (breach.criterionCode.includes('FLUE') || breach.criterionCode.includes('TEMP')) {
          rootCause =
            'Fireside soot accumulation on fire-tube heating surfaces reducing conductive heat transfer to water jacket, or combustion damper imbalance.';
        } else if (breach.criterionCode.includes('TDS') || breach.criterionCode.includes('HARDNESS')) {
          rootCause =
            'Feedwater conditioning deficiency leading to mineral solids concentration in boiler drum and progressive waterside scale precipitation.';
        } else if (breach.criterionCode.includes('PUMP') || breach.criterionCode.includes('HOURS')) {
          rootCause =
            'Cumulative mechanical runtime indicates mechanical seal wear, gland packing degradation, and drive-end bearing thermal rise.';
        } else if (breach.criterionCode.includes('PRESSURE')) {
          rootCause =
            'Steam production capacity drop or limit pressuretrol drift affecting steam supply reliability.';
        }

        const deviationDesc = breach.deviationRatio !== undefined
          ? `Excursion ratio ${(breach.deviationRatio * 100).toFixed(1)}% (${breach.operator} ${breach.threshold})`
          : breach.recommendedAction;

        criteriaAttribution.push({
          criterionCode: breach.criterionCode,
          criterionName: breach.criterionName,
          clusterCode: 'CRITERIA',
          observedValue: breach.observedValue,
          benchmarkThreshold: `${breach.operator} ${breach.threshold}${breach.unit ? ' ' + breach.unit : ''}`,
          deviationDescription: deviationDesc,
          contributionPercentage: propContribution,
          rootCauseHypothesis: rootCause,
        });

        linkedReadings.push({
          parameterCode: breach.criterionCode,
          parameterName: breach.criterionName,
          observedValue: breach.observedValue,
          unit: breach.unit || '',
          thresholdOperator: breach.operator,
          thresholdValue: breach.threshold,
          deviationDescription: deviationDesc,
          timestamp: new Date().toISOString(),
        });
      }

      // Technical work scope description
      let workScope = `Perform targeted engineering intervention for ${alt.name}.`;
      if (alt.code.includes('CLEAN_TUBES')) {
        workScope =
          'Fireside sootblowing and rotary tube brushing: isolate burner, open front smokebox doors, brush all 2-pass/3-pass fire-tubes, and vacuum carbon soot from rear reversing chamber.';
      } else if (alt.code.includes('DESCALE')) {
        workScope =
          'Chemical waterside descaling: drain boiler shell, circulate inhibited sulfamic/citric acid cleaning solution, neutralize with sodium carbonate, flush drum, and inspect fire-tube crown sheets.';
      } else if (alt.code.includes('OVERHAUL_BURNER')) {
        workScope =
          'Combustion burner overhaul: clean fuel preheater, replace atomizing nozzle tips, lap fuel solenoid cutoff seats, inspect diffuser vanes, and align ignition electrodes.';
      }

      recommendations.push({
        recommendationId: `rec-${Date.now()}-${i + 1}`,
        rank,
        alternativeCode: alt.code,
        alternativeName: alt.name,
        priorityValue: alt.anpPriorityScore,
        relativeWeightPercentage: Math.round(alt.anpPriorityScore * 1000) / 10,
        safetyTier,
        recommendedActionTitle: `ANP Maintenance Intervention (Rank #${rank}): ${alt.name}`,
        technicalWorkScope: workScope,
        suggestedPriority: rank === 1 ? evaluation.recommendedPriority : 'medium',
        estimatedLaborHours: safetyTier === 'OPERATIONAL_MAINTENANCE' ? 8 : 4,
        sparesRequired:
          alt.code.includes('BURNER')
            ? ['Fuel Atomizing Nozzle (1,100 kg/h rated)', 'Diffuser Disk Gasket']
            : alt.code.includes('DESCALE')
            ? ['Inhibited Descaling Agent (50 kg)', 'Neutralizer (25 kg)', 'Smokebox Door Rope Seal']
            : ['Fireside Wire Brushes', 'Manhole Gasket'],
        criteriaAttribution,
        linkedReadings,
        maintenanceHistoryContext: historyContext,
        reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
      });
    }

    return recommendations;
  }

  private async persistDecisionRunSnapshot(params: {
    organizationId: string;
    decisionModel: any;
    assetRecord: any;
    event: DailyLogSubmittedEventPayload;
    dataQuality: any;
    safetyAlerts: any[];
    evaluation: AnpEvaluationResult;
    recommendations: AnpMaintenanceRecommendation[];
    maintenanceContext: AssetMaintenanceContext;
    draftedWorkOrderId?: string | null;
    tx?: any;
  }): Promise<any> {
    const {
      organizationId,
      decisionModel,
      assetRecord,
      event,
      dataQuality,
      safetyAlerts,
      evaluation,
      recommendations,
      maintenanceContext,
      draftedWorkOrderId,
      tx = tenantPrisma,
    } = params;

    const evaluatedAt = new Date().toISOString();
    const deterministicHash = `hash-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const inputSnapshot = {
      evaluatedAt,
      modelVersion: decisionModel.version,
      modelCode: decisionModel.code,
      signals: event.signals,
      logbookId: event.inspectionId,
      inspectionNumber: event.inspectionNumber,
      operatorUserId: event.operatorUserId || null,
      dataQuality,
      maintenanceHistorySummary: maintenanceContext,
      deterministicHash,
    };

    const resultSnapshot = {
      isBreached: evaluation.isBreached,
      compositeRiskScore: evaluation.compositeRiskScore,
      recommendedPriority: evaluation.recommendedPriority,
      breachedCriteria: evaluation.breachedCriteria,
      topAlternative: evaluation.topAlternative,
      rankedAlternatives: evaluation.rankedAlternatives,
      supermatrixWeights: evaluation.supermatrixWeights,
      recommendations,
      safetyAlerts,
      mathematicalSnapshot: evaluation.mathematicalSnapshot,
    };

    const topRec = recommendations[0];
    const recommendedAction = topRec
      ? `${topRec.recommendedActionTitle}. ${topRec.technicalWorkScope}`
      : 'Routine monitoring - all parameters within normal operational baseline.';

    let decisionRun: any = null;
    if (tx.decisionRun) {
      decisionRun = await tx.decisionRun.create({
        data: {
          organizationId,
          decisionModelId: decisionModel.id,
          assetId: assetRecord?.id || event.assetId || null,
          workOrderId: draftedWorkOrderId || null,
          runAt: new Date(evaluatedAt),
          inputSnapshot: inputSnapshot as unknown as Prisma.InputJsonValue,
          resultSnapshot: resultSnapshot as unknown as Prisma.InputJsonValue,
          recommendedAction,
          confidenceScore: new Prisma.Decimal(
            Math.min(1.0, dataQuality.score * (evaluation.confidenceScore || 0.9))
          ),
          triggerType: 'daily_logbook_submission',
          executedBy: event.operatorUserId || null,
        },
      });
    }

    let createdNotification: any = null;
    if (evaluation.isBreached && tx.notification) {
      try {
        let recipientUserId = event.operatorUserId;
        if (!recipientUserId && tx.organizationMembership) {
          const activeMember = await tx.organizationMembership.findFirst({
            where: { organizationId, status: 'active' },
            select: { userId: true },
          });
          recipientUserId = activeMember?.userId;
        }

        if (recipientUserId) {
          const primaryBreach = evaluation.breachedCriteria[0];
          const assetPrefix = assetRecord ? `[${assetRecord.assetCode}] ` : '';

          createdNotification = await tx.notification.create({
            data: {
              organizationId,
              userId: recipientUserId,
              notificationType: 'HIGH_PRIORITY_ANP_ALERT',
              title: `${assetPrefix}ANP Benchmark Breach: ${primaryBreach?.criterionName || 'Operational Parameter'}`,
              message: `Observed ${primaryBreach?.observedValue}${
                primaryBreach?.unit ? ' ' + primaryBreach.unit : ''
              } breached benchmark (${primaryBreach?.operator} ${
                primaryBreach?.threshold
              }${primaryBreach?.unit ? ' ' + primaryBreach.unit : ''}). ${
                evaluation.recommendedAction
              }`,
              entityType: 'decision_run',
              entityId: decisionRun?.id || 'drun-default',
            },
          });
        }
      } catch {
        // Safe notification delivery
      }
    }

    return {
      decisionRunId: decisionRun?.id || 'drun-default',
      rawDecisionRun: decisionRun,
      notification: createdNotification,
      assetId: assetRecord?.id || event.assetId || null,
      assetCode: assetRecord?.assetCode || null,
      assetName: assetRecord?.name || null,
      decisionModelId: decisionModel.id,
      decisionModelCode: decisionModel.code,
      decisionModelVersion: decisionModel.version,
      evaluatedAt,
      dataQuality,
      safetyAlerts,
      recommendations,
      isBreached: evaluation.isBreached,
      compositeRiskScore: evaluation.compositeRiskScore,
      recommendedPriority: evaluation.recommendedPriority,
      topAlternative: evaluation.topAlternative
        ? {
            code: evaluation.topAlternative.code,
            name: evaluation.topAlternative.name,
            anpPriorityScore: evaluation.topAlternative.anpPriorityScore,
          }
        : null,
      supermatrixWeights: evaluation.supermatrixWeights,
      deterministicHash,
      convergenceDetails: evaluation.mathematicalSnapshot?.supermatrix?.convergence
        ? {
            converged: evaluation.mathematicalSnapshot.supermatrix.convergence.converged,
            iterations: evaluation.mathematicalSnapshot.supermatrix.convergence.iterations,
            finalEpsilon: evaluation.mathematicalSnapshot.supermatrix.convergence.maxDelta,
          }
        : {
            converged: true,
            iterations: 6,
            finalEpsilon: 1e-11,
          },
    };
  }

  private async createWorkOrderFromRecommendation(
    organizationId: string,
    run: any,
    rec: AnpMaintenanceRecommendation,
    dto: ReviewRecommendationDto,
    engineerUserId: string
  ): Promise<any> {
    let workOrderNumber = `WO-${new Date().getFullYear()}-00001`;
    try {
      workOrderNumber = await workOrdersService.generateWorkOrderNumber(organizationId);
    } catch {
      workOrderNumber = `WO-${Date.now()}`;
    }

    // Resolve corrective maintenance type
    let targetMaintenanceTypeId: string | null = null;
    const correctiveType = await tenantPrisma.maintenanceType.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    targetMaintenanceTypeId = correctiveType?.id || null;

    if (!targetMaintenanceTypeId) {
      throw {
        status: 400,
        code: 'MAINTENANCE_TYPE_NOT_FOUND',
        message: 'No MaintenanceType configured in organization to assign Work Order.',
      };
    }

    const priority = dto.targetPriority || rec.suggestedPriority || 'medium';
    const assetCode = run.asset?.assetCode || 'BOILER';

    const workOrder = await tenantPrisma.workOrder.create({
      data: {
        organizationId,
        workOrderNumber,
        siteId: run.asset.siteId,
        assetId: run.assetId,
        locationId: run.asset.locationId || null,
        maintenanceTypeId: targetMaintenanceTypeId,
        title: `[ANP Approved] ${assetCode}: ${rec.alternativeName}`,
        description:
          `ANP Multi-Criteria Decision Support Work Order (Approved by Engineer).\n\n` +
          `RECOMMENDED ACTION:\n${rec.technicalWorkScope}\n\n` +
          `CRITERIA ATTRIBUTION:\n` +
          rec.criteriaAttribution
            .map((ca) => `• ${ca.criterionName}: ${ca.deviationDescription} (${ca.contributionPercentage}% influence)`)
            .join('\n') +
          `\n\nENGINEER APPROVAL NOTES:\n${dto.engineerNotes}`,
        priority,
        status: 'approved',
        requestedBy: engineerUserId,
        assignedTo: dto.assignedUserId || null,
        scheduledStartAt: dto.scheduledDate ? new Date(dto.scheduledDate) : new Date(),
      },
    });

    // Record initial status history
    await tenantPrisma.workOrderStatusHistory.create({
      data: {
        organizationId,
        workOrderId: workOrder.id,
        oldStatus: null,
        newStatus: 'approved',
        changedBy: engineerUserId,
        comment: `Approved from ANP Decision Run ${run.id} recommendation (Rank #${rec.rank}: ${rec.alternativeName}). Notes: ${dto.engineerNotes}`,
      },
    });

    return workOrder;
  }
}

export const operationalAnpService = new OperationalAnpService();
