import { WorkOrderStatus } from '@prisma/client';

/**
 * Error thrown when an invalid Work Order status transition is attempted.
 */
export class InvalidWorkOrderStatusTransitionError extends Error {
  public readonly code = 'INVALID_STATUS_TRANSITION';
  public readonly currentStatus: WorkOrderStatus;
  public readonly attemptedStatus: WorkOrderStatus;
  public readonly allowedTransitions: WorkOrderStatus[];

  constructor(
    currentStatus: WorkOrderStatus,
    attemptedStatus: WorkOrderStatus,
    allowedTransitions: WorkOrderStatus[]
  ) {
    super(
      `Invalid Work Order state transition from '${currentStatus}' to '${attemptedStatus}'. Allowed transitions from '${currentStatus}': [${allowedTransitions.join(
        ', '
      )}].`
    );
    this.name = 'InvalidWorkOrderStatusTransitionError';
    this.currentStatus = currentStatus;
    this.attemptedStatus = attemptedStatus;
    this.allowedTransitions = allowedTransitions;
  }
}

/**
 * Strict State Machine transition graph for Work Orders.
 * Core lifecycle path: draft -> open -> in_progress -> completed -> closed
 * Includes operational states: approved, assigned, on_hold, cancelled.
 */
export const WORK_ORDER_STATE_TRANSITIONS: Readonly<
  Record<WorkOrderStatus, readonly WorkOrderStatus[]>
> = {
  draft: ['open', 'approved', 'cancelled'],
  open: ['approved', 'assigned', 'in_progress', 'cancelled'],
  approved: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: ['closed', 'in_progress'],
  closed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Checks whether transitioning from `currentStatus` to `newStatus` is valid.
 */
export function isValidStatusTransition(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): boolean {
  const allowed = WORK_ORDER_STATE_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Enforces the Work Order state machine. Throws InvalidWorkOrderStatusTransitionError
 * if the transition is prohibited.
 */
export function validateStatusTransition(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): void {
  if (currentStatus === newStatus) {
    throw new InvalidWorkOrderStatusTransitionError(
      currentStatus,
      newStatus,
      [...(WORK_ORDER_STATE_TRANSITIONS[currentStatus] || [])]
    );
  }

  const allowed = WORK_ORDER_STATE_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new InvalidWorkOrderStatusTransitionError(currentStatus, newStatus, [...allowed]);
  }
}

