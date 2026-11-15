/**
 * LuminaFM - Independent Safety Escalation Service
 *
 * Implements strict, hard-constraint safety interlock rules that execute
 * INDEPENDENTLY of the Analytic Network Process (ANP) ranking engine.
 *
 * Grounded in ASME BPVC Section VII (Recommended Guidelines for the Care of Power Boilers)
 * and BS EN 12953 requirements.
 *
 * CORE SAFETY MANDATES:
 * 1. Critical safety alerts must have independent escalation rules and MUST NOT depend on ANP ranking.
 * 2. Safety limits are non-negotiable physical constraints; they are never traded off in a supermatrix.
 * 3. Software must NEVER automatically prescribe or execute safety-critical interventions (e.g. bypassing
 *    safety interlocks, automatic reset of low-water fuel cutoffs, or remote safety valve resets).
 *    All safety-critical interventions require on-site certified engineer physical inspection.
 */

import { TelemetrySignalInput } from '../anp.engine';
import { SafetyEscalationAlert } from './operational-integration.types';

export interface SafetyInterlockRule {
  ruleCode: string;
  ruleTitle: string;
  parameterCode: string;
  severity: 'CRITICAL_EMERGENCY' | 'SAFETY_WARNING';
  isBreached: (val: number | boolean | string) => boolean;
  safetyLimitDescription: string;
  emergencyActionRequired: string;
}

export const BOILER_SAFETY_INTERLOCK_RULES: SafetyInterlockRule[] = [
  {
    ruleCode: 'LWCO_TRIP_CRITICAL',
    ruleTitle: 'Low-Water Fuel Cutoff (LWCO) Trip / Loss of Water Inventory',
    parameterCode: 'WATER_LEVEL_OK',
    severity: 'CRITICAL_EMERGENCY',
    isBreached: (val) => val === false || val === 'false' || val === 0,
    safetyLimitDescription: 'Water Level OK == true (Normal drum sight-glass water level maintained)',
    emergencyActionRequired:
      'IMMEDIATE EMERGENCY INTERVENTION (ASME BPVC Sec VII C2.300): Confirm automatic burner fuel shut-off. ' +
      'DO NOT add cold feedwater to an overheated boiler drum (catastrophic steam flash explosion hazard). ' +
      'Perform manual blowdown of float chamber and inspect primary/secondary LWCO probes before certified restart.',
  },
  {
    ruleCode: 'LWCO_LEVEL_LOW',
    ruleTitle: 'Low Boiler Drum Water Level Sensor Active',
    parameterCode: 'WATER_LEVEL_LOW',
    severity: 'CRITICAL_EMERGENCY',
    isBreached: (val) => val === true || val === 'true' || val === 1,
    safetyLimitDescription: 'Water Level Low == false',
    emergencyActionRequired:
      'IMMEDIATE EMERGENCY SHUTDOWN: Low water level confirmed. Verify fuel solenoid shut-off, ' +
      'isolate feedwater feed, and conduct physical inspection of level gauge glass by qualified operator.',
  },
  {
    ruleCode: 'OVERPRESSURE_SAFETY_LIMIT',
    ruleTitle: 'Steam Pressure Exceeds High-Limit Safety Cutoff Threshold',
    parameterCode: 'STEAM_PRESSURE',
    severity: 'CRITICAL_EMERGENCY',
    isBreached: (val) => typeof val === 'number' && val >= 10.5,
    safetyLimitDescription: 'Steam Pressure < 10.5 bar (Design safety pop threshold: 10.5 bar)',
    emergencyActionRequired:
      'OVERPRESSURE EMERGENCY: Operating steam pressure at or exceeding ASME safety relief valve pop limit. ' +
      'Cease firing immediately, verify safety valve lift and discharge pipe venting, and recalibrate pressuretrol cutout.',
  },
  {
    ruleCode: 'STACK_FIRE_HAZARD',
    ruleTitle: 'Extreme Flue Gas Overheat / Fireside Soot Fire Hazard',
    parameterCode: 'FLUE_GAS_TEMP',
    severity: 'CRITICAL_EMERGENCY',
    isBreached: (val) => typeof val === 'number' && val >= 260.0,
    safetyLimitDescription: 'Flue Gas Stack Temperature < 260.0 °C',
    emergencyActionRequired:
      'FIRESIDE FIRE HAZARD: Stack temperature exceeding 260 °C indicates active fireside soot combustion ' +
      'in smoke passes or economizer. Shut down fuel atomization immediately, close draft dampers, and notify emergency response.',
  },
  {
    ruleCode: 'FEEDWATER_ACIDIC_CORROSION_CRITICAL',
    ruleTitle: 'Severe Feedwater Acidic Intrusion Hazard',
    parameterCode: 'FEEDWATER_PH',
    severity: 'SAFETY_WARNING',
    isBreached: (val) => typeof val === 'number' && val < 6.5,
    safetyLimitDescription: 'Feedwater pH >= 6.5 (Standard ASME/BS alkaline range: 8.5 - 9.5)',
    emergencyActionRequired:
      'CORROSION HAZARD: Acidic condensate contamination. Isolate process return lines, test deaerator dosing, and neutralise immediately.',
  },
];

export class SafetyEscalationService {
  /**
   * Synchronously evaluates signals against hard safety limits.
   * Completely independent of ANP ranking or supermatrix trade-offs.
   */
  public static evaluateSafetyInterlocks(
    assetId: string,
    signals: TelemetrySignalInput[],
    recipientUserIds: string[] = []
  ): SafetyEscalationAlert[] {
    const alerts: SafetyEscalationAlert[] = [];
    const signalMap = new Map<string, number | boolean | string>();

    for (const sig of signals) {
      if (sig.key) {
        signalMap.set(sig.key.toUpperCase(), sig.value);
      }
    }

    for (const rule of BOILER_SAFETY_INTERLOCK_RULES) {
      const observed = signalMap.get(rule.parameterCode);
      if (observed !== undefined && rule.isBreached(observed)) {
        alerts.push({
          alertId: `safety-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          assetId,
          severity: rule.severity,
          ruleCode: rule.ruleCode,
          ruleTitle: rule.ruleTitle,
          parameterCode: rule.parameterCode,
          observedValue: observed,
          safetyLimit: rule.safetyLimitDescription,
          emergencyActionRequired: rule.emergencyActionRequired,
          independentOfAnp: true,
          requiresCertifiedInspectorSignoff: true,
          escalatedAt: new Date().toISOString(),
          notifiedUserIds: recipientUserIds,
        });
      }
    }

    return alerts;
  }
}
