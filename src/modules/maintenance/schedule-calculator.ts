/**
 * LuminaFM Maintenance Schedule & Due Date Calculator
 *
 * Implements deterministic, timezone-safe calculations for:
 * 1. Calendar-based recurring schedules (days, weeks, months, years)
 * 2. Operating-hour / Usage-meter-based schedules (usage accumulation, daily rate projection)
 * 3. Inspection & condition-based triggers
 * 4. Lead-time warnings, overdue tracking, and urgency scoring
 */

export type ScheduleDueStatus =
  | 'OVERDUE'
  | 'DUE'
  | 'UPCOMING'
  | 'ON_SCHEDULE'
  | 'INACTIVE';

export interface CalendarInterval {
  value: number;
  unit: 'days' | 'weeks' | 'months' | 'years' | 'hours' | string;
}

export interface MeterDueCalculationInput {
  intervalValue: number;
  currentReading: number;
  lastReadingAtMaintenance?: number | null;
  dailyAverageUtilizationRate?: number | null;
  referenceDate?: Date;
}

export interface MeterDueCalculationResult {
  currentReading: number;
  lastReadingAtMaintenance: number;
  usageSinceLastMaintenance: number;
  targetDueReading: number;
  usageRemaining: number;
  percentConsumed: number;
  isDue: boolean;
  meterUnitsOverdue: number;
  projectedNextDueAt: Date | null;
}

export interface DueEvaluationResult {
  status: ScheduleDueStatus;
  isDue: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
  nextDueAt: Date | null;
  daysOverdue: number;
  hoursOverdue: number;
  daysUntilDue: number;
  leadTimeDays: number;
  urgencyScore: number;
}

/**
 * Adds a typed interval to a date in a timezone-safe manner.
 * Preserves UTC time-of-day across month and year boundaries.
 */
export function addIntervalToDate(
  baseDate: Date,
  value: number,
  unit: string
): Date {
  const result = new Date(baseDate.getTime());
  const normalizedUnit = unit.toLowerCase().trim();

  switch (normalizedUnit) {
    case 'hours':
    case 'hour':
    case 'hr':
    case 'hrs':
      result.setTime(result.getTime() + value * 60 * 60 * 1000);
      break;

    case 'days':
    case 'day':
    case 'd':
      result.setUTCDate(result.getUTCDate() + value);
      break;

    case 'weeks':
    case 'week':
    case 'w':
    case 'wks':
      result.setUTCDate(result.getUTCDate() + value * 7);
      break;

    case 'months':
    case 'month':
    case 'm':
    case 'mon': {
      const currentMonth = result.getUTCMonth();
      const currentDay = result.getUTCDate();
      result.setUTCMonth(currentMonth + value);
      // Handle month rollover (e.g. Jan 31 -> Feb 28/29)
      if (result.getUTCDate() < currentDay) {
        result.setUTCDate(0); // set to last day of previous month
      }
      break;
    }

    case 'years':
    case 'year':
    case 'y':
    case 'yr': {
      const currentYear = result.getUTCFullYear();
      result.setUTCFullYear(currentYear + value);
      break;
    }

    default:
      // Default to days if unit is unknown or missing
      result.setUTCDate(result.getUTCDate() + value);
      break;
  }

  return result;
}

/**
 * Calculates the next calendar due date for a recurring maintenance plan.
 *
 * @param intervalValue Interval quantity (e.g. 30)
 * @param intervalUnit Interval unit (e.g. 'days', 'months')
 * @param lastCompletedAt Timestamp of last completed work order
 * @param startDate Plan start date
 * @param referenceDate Reference evaluation date (defaults to now)
 */
export function calculateNextCalendarDueDate(
  intervalValue: number,
  intervalUnit: string,
  lastCompletedAt?: Date | null,
  startDate?: Date | null,
  referenceDate: Date = new Date()
): Date {
  if (lastCompletedAt) {
    // If completed previously, next due is anchored strictly to last completed date + interval
    return addIntervalToDate(lastCompletedAt, intervalValue, intervalUnit);
  }

  // If never completed, start date is the baseline
  const base = startDate ? new Date(startDate.getTime()) : new Date(referenceDate.getTime());
  return addIntervalToDate(base, intervalValue, intervalUnit);
}

/**
 * Evaluates usage/meter-based maintenance status (e.g. Every 500 operating hours).
 */
export function calculateMeterDueStatus(
  input: MeterDueCalculationInput
): MeterDueCalculationResult {
  const {
    intervalValue,
    currentReading,
    lastReadingAtMaintenance = 0,
    dailyAverageUtilizationRate,
    referenceDate = new Date(),
  } = input;

  const lastReading = lastReadingAtMaintenance !== null && lastReadingAtMaintenance !== undefined
    ? Number(lastReadingAtMaintenance)
    : 0;
  const current = Number(currentReading);
  const interval = Number(intervalValue);

  const usageSinceLastMaintenance = Math.max(0, current - lastReading);
  const targetDueReading = lastReading + interval;
  const usageRemaining = targetDueReading - current;
  const percentConsumed = interval > 0 ? (usageSinceLastMaintenance / interval) * 100 : 100;
  const isDue = usageRemaining <= 0;
  const meterUnitsOverdue = isDue ? Math.abs(usageRemaining) : 0;

  let projectedNextDueAt: Date | null = null;
  if (isDue) {
    projectedNextDueAt = referenceDate;
  } else if (dailyAverageUtilizationRate && dailyAverageUtilizationRate > 0) {
    const daysRemaining = usageRemaining / dailyAverageUtilizationRate;
    projectedNextDueAt = new Date(referenceDate.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
  }

  return {
    currentReading: current,
    lastReadingAtMaintenance: lastReading,
    usageSinceLastMaintenance,
    targetDueReading,
    usageRemaining,
    percentConsumed: Math.min(100, Math.max(0, percentConsumed)),
    isDue,
    meterUnitsOverdue,
    projectedNextDueAt,
  };
}

/**
 * Evaluates due date vs reference date, returning status classification,
 * overdue hours/days, and an engineering urgency score.
 *
 * @param nextDueAt Scheduled due date/time
 * @param leadTimeDays Advance notice period before due date
 * @param priority Priority level ('low', 'medium', 'high', 'urgent')
 * @param isActive Whether assignment is active
 * @param referenceDate Point in time for comparison (defaults to now)
 */
export function evaluateScheduleDueStatus(
  nextDueAt: Date | null,
  leadTimeDays: number = 0,
  priority: string = 'medium',
  isActive: boolean = true,
  referenceDate: Date = new Date()
): DueEvaluationResult {
  if (!isActive) {
    return {
      status: 'INACTIVE',
      isDue: false,
      isOverdue: false,
      isUpcoming: false,
      nextDueAt,
      daysOverdue: 0,
      hoursOverdue: 0,
      daysUntilDue: 0,
      leadTimeDays,
      urgencyScore: 0,
    };
  }

  if (!nextDueAt) {
    return {
      status: 'ON_SCHEDULE',
      isDue: false,
      isOverdue: false,
      isUpcoming: false,
      nextDueAt: null,
      daysOverdue: 0,
      hoursOverdue: 0,
      daysUntilDue: 9999,
      leadTimeDays,
      urgencyScore: 0,
    };
  }

  const nowMs = referenceDate.getTime();
  const dueMs = nextDueAt.getTime();
  const diffMs = dueMs - nowMs;
  const leadTimeMs = leadTimeDays * 24 * 60 * 60 * 1000;

  const isOverdue = diffMs < 0;
  const daysOverdue = isOverdue ? Math.abs(diffMs) / (24 * 60 * 60 * 1000) : 0;
  const hoursOverdue = isOverdue ? Math.abs(diffMs) / (60 * 60 * 1000) : 0;
  const daysUntilDue = !isOverdue ? diffMs / (24 * 60 * 60 * 1000) : 0;

  // Determine categorical status
  let status: ScheduleDueStatus;
  if (isOverdue) {
    status = 'OVERDUE';
  } else if (diffMs <= 24 * 60 * 60 * 1000) {
    // Due within 24 hours
    status = 'DUE';
  } else if (diffMs <= leadTimeMs) {
    // Within lead time advance window
    status = 'UPCOMING';
  } else {
    status = 'ON_SCHEDULE';
  }

  // Calculate Urgency Score: (Priority Multiplier) * (Base + Overdue Factor)
  let priorityWeight = 1.0;
  switch (priority.toLowerCase()) {
    case 'urgent':
      priorityWeight = 4.0;
      break;
    case 'high':
      priorityWeight = 2.5;
      break;
    case 'medium':
      priorityWeight = 1.5;
      break;
    case 'low':
    default:
      priorityWeight = 1.0;
      break;
  }

  let urgencyScore = 0;
  if (isOverdue) {
    urgencyScore = (100 + daysOverdue * 10) * priorityWeight;
  } else if (status === 'DUE') {
    urgencyScore = 80 * priorityWeight;
  } else if (status === 'UPCOMING') {
    const fractionIntoLeadTime = leadTimeMs > 0 ? (leadTimeMs - diffMs) / leadTimeMs : 1.0;
    urgencyScore = (40 + fractionIntoLeadTime * 30) * priorityWeight;
  } else {
    urgencyScore = 10 * priorityWeight;
  }

  return {
    status,
    isDue: isOverdue || status === 'DUE',
    isOverdue,
    isUpcoming: status === 'UPCOMING',
    nextDueAt,
    daysOverdue: Math.round(daysOverdue * 100) / 100,
    hoursOverdue: Math.round(hoursOverdue * 10) / 10,
    daysUntilDue: Math.round(daysUntilDue * 100) / 100,
    leadTimeDays,
    urgencyScore: Math.round(urgencyScore * 10) / 10,
  };
}
