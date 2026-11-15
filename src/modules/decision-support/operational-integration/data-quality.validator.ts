/**
 * LuminaFM - Operational Data Completeness & Quality Validator
 *
 * Implements physical bounds checking, sensor anomaly detection, and data completeness
 * scoring for oil-fired fire-tube boilers (1,000 - 1,800 kg/h capacity).
 *
 * Grounded in ASME BPVC Section VII & BS EN 12953 standards.
 */

import { TelemetrySignalInput } from '../anp.engine';
import {
  DataQualityReport,
  OutOfRangeReadingDetail,
  QualityFlag,
} from './operational-integration.types';

export interface PhysicalParameterRule {
  parameterCode: string;
  name: string;
  isRequired: boolean;
  physicalMin: number;
  physicalMax: number;
  unit: string;
  disallowedNegative?: boolean;
}

/**
 * Physical bounds for industrial packaged fire-tube boilers
 * Values outside these bounds represent sensor failure, disconnected wiring, or corrupt input.
 */
export const BOILER_PHYSICAL_PARAMETER_RULES: Record<string, PhysicalParameterRule> = {
  STEAM_PRESSURE: {
    parameterCode: 'STEAM_PRESSURE',
    name: 'Operating Steam Pressure',
    isRequired: true,
    physicalMin: 0.0,
    physicalMax: 25.0,
    unit: 'bar',
    disallowedNegative: true,
  },
  FLUE_GAS_TEMP: {
    parameterCode: 'FLUE_GAS_TEMP',
    name: 'Flue Gas Stack Temperature',
    isRequired: true,
    physicalMin: 15.0,
    physicalMax: 450.0,
    unit: '°C',
    disallowedNegative: true,
  },
  BOILER_WATER_TDS: {
    parameterCode: 'BOILER_WATER_TDS',
    name: 'Boiler Water Total Dissolved Solids',
    isRequired: true,
    physicalMin: 10.0,
    physicalMax: 12000.0,
    unit: 'ppm',
    disallowedNegative: true,
  },
  FEEDWATER_PH: {
    parameterCode: 'FEEDWATER_PH',
    name: 'Feedwater pH',
    isRequired: false,
    physicalMin: 4.0,
    physicalMax: 13.0,
    unit: 'pH',
    disallowedNegative: true,
  },
  FEEDWATER_TEMP: {
    parameterCode: 'FEEDWATER_TEMP',
    name: 'Feedwater Tank Temperature',
    isRequired: false,
    physicalMin: 10.0,
    physicalMax: 135.0,
    unit: '°C',
    disallowedNegative: true,
  },
  AMBIENT_TEMP: {
    parameterCode: 'AMBIENT_TEMP',
    name: 'Boiler Room Ambient Temperature',
    isRequired: true,
    physicalMin: 0.0,
    physicalMax: 65.0,
    unit: '°C',
    disallowedNegative: true,
  },
  PUMP_OPERATING_HOURS: {
    parameterCode: 'PUMP_OPERATING_HOURS',
    name: 'Feed Pump Cumulative Operating Hours',
    isRequired: false,
    physicalMin: 0.0,
    physicalMax: 200000.0,
    unit: 'hrs',
    disallowedNegative: true,
  },
  BURNER_OPERATING_HOURS: {
    parameterCode: 'BURNER_OPERATING_HOURS',
    name: 'Burner Cumulative Running Hours',
    isRequired: false,
    physicalMin: 0.0,
    physicalMax: 200000.0,
    unit: 'hrs',
    disallowedNegative: true,
  },
  STEAM_PRODUCTION_RATE: {
    parameterCode: 'STEAM_PRODUCTION_RATE',
    name: 'Instantaneous Steam Generation Rate',
    isRequired: false,
    physicalMin: 0.0,
    physicalMax: 3000.0,
    unit: 'kg/h',
    disallowedNegative: true,
  },
};

export class DataQualityValidator {
  /**
   * Assesses completeness, range plausibility, and sensor integrity of operational telemetry signals.
   */
  public static validateTelemetryQuality(signals: TelemetrySignalInput[]): DataQualityReport {
    const presentKeys = new Set<string>();
    const outOfRangeReadings: OutOfRangeReadingDetail[] = [];
    const qualityFlags: QualityFlag[] = [];

    // Map signal keys
    for (const sig of signals) {
      if (sig.key) {
        presentKeys.add(sig.key.toUpperCase());
      }
    }

    // 1. Completeness of Required Parameters
    const requiredRules = Object.values(BOILER_PHYSICAL_PARAMETER_RULES).filter((r) => r.isRequired);
    const missingRequiredParameters: string[] = [];

    for (const rule of requiredRules) {
      if (!presentKeys.has(rule.parameterCode)) {
        missingRequiredParameters.push(rule.parameterCode);
      }
    }

    if (missingRequiredParameters.length > 0) {
      qualityFlags.push('MISSING_CRITICAL_PARAMETER');
    }

    // 2. Physical Range & Bound Checks
    let validCount = 0;
    for (const sig of signals) {
      const keyUpper = sig.key.toUpperCase();
      const numVal = typeof sig.value === 'number' ? sig.value : parseFloat(String(sig.value));

      if (isNaN(numVal)) {
        continue;
      }

      const rule = BOILER_PHYSICAL_PARAMETER_RULES[keyUpper];
      if (rule) {
        if (rule.disallowedNegative && numVal < 0) {
          qualityFlags.push('NEGATIVE_VALUE_PHYSICAL_IMPOSSIBILITY');
          outOfRangeReadings.push({
            parameterCode: keyUpper,
            observedValue: numVal,
            physicalMin: rule.physicalMin,
            physicalMax: rule.physicalMax,
            unit: rule.unit,
            reason: `Negative value ${numVal} ${rule.unit} is physically impossible for ${rule.name}.`,
          });
          continue;
        }

        if (numVal < rule.physicalMin || numVal > rule.physicalMax) {
          qualityFlags.push('SENSOR_OUT_OF_PHYSICAL_RANGE');
          outOfRangeReadings.push({
            parameterCode: keyUpper,
            observedValue: numVal,
            physicalMin: rule.physicalMin,
            physicalMax: rule.physicalMax,
            unit: rule.unit,
            reason: `Reading ${numVal} ${rule.unit} falls outside plausible physical operational boundary (${rule.physicalMin} - ${rule.physicalMax} ${rule.unit}). Possible thermocouple burnout or sensor loop disconnect.`,
          });
          continue;
        }
      }

      validCount++;
    }

    // 3. Completeness and Quality Scoring
    const totalRequired = requiredRules.length;
    const completenessRatio = totalRequired > 0
      ? (totalRequired - missingRequiredParameters.length) / totalRequired
      : 1.0;

    // Deduct penalties for invalid/out-of-range sensor readings
    const penaltyPerOutlier = 0.15;
    const totalPenalties = outOfRangeReadings.length * penaltyPerOutlier;
    const score = Math.max(0.0, Math.min(1.0, completenessRatio - totalPenalties));

    // A report is considered invalid if completeness is below 50% or severe physical sensor fault is present
    const hasPhysicalImpossibility = qualityFlags.includes('NEGATIVE_VALUE_PHYSICAL_IMPOSSIBILITY');
    const isValid = completenessRatio >= 0.50 && !hasPhysicalImpossibility && outOfRangeReadings.length <= 2;

    return {
      isValid,
      score: Math.round(score * 100) / 100,
      completenessRatio: Math.round(completenessRatio * 100) / 100,
      totalParametersAssessed: signals.length,
      validParametersCount: validCount,
      missingRequiredParameters,
      outOfRangeReadings,
      qualityFlags: Array.from(new Set(qualityFlags)),
      validationTimestamp: new Date().toISOString(),
    };
  }
}
