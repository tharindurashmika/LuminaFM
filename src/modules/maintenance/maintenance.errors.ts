/**
 * Maintenance Planning Domain Error Classes
 */

export class MaintenancePlanNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'MAINTENANCE_PLAN_NOT_FOUND';

  constructor(idOrCode: string) {
    super(`Maintenance Plan '${idOrCode}' was not found in the active organization.`);
    this.name = 'MaintenancePlanNotFoundError';
  }
}

export class TaskTemplateNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'TASK_TEMPLATE_NOT_FOUND';

  constructor(idOrCode: string) {
    super(`Maintenance Task Template '${idOrCode}' was not found in the active organization.`);
    this.name = 'TaskTemplateNotFoundError';
  }
}

export class AssetPlanNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'ASSET_MAINTENANCE_PLAN_NOT_FOUND';

  constructor(id: string) {
    super(`Asset Maintenance Plan assignment '${id}' was not found in the active organization.`);
    this.name = 'AssetPlanNotFoundError';
  }
}

export class MaintenanceTypeNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'MAINTENANCE_TYPE_NOT_FOUND';

  constructor(idOrCode: string) {
    super(`Maintenance Type '${idOrCode}' was not found in the active organization.`);
    this.name = 'MaintenanceTypeNotFoundError';
  }
}

export class DuplicateWorkOrderError extends Error {
  readonly status = 409;
  readonly code = 'DUPLICATE_WORK_ORDER';

  constructor(assetId: string, maintenancePlanId: string, activeWorkOrderId: string) {
    super(
      `An active work order ('${activeWorkOrderId}') already exists for asset '${assetId}' and maintenance plan '${maintenancePlanId}'. Duplicate generation blocked.`
    );
    this.name = 'DuplicateWorkOrderError';
  }
}

export class InvalidScheduleIntervalError extends Error {
  readonly status = 400;
  readonly code = 'INVALID_SCHEDULE_INTERVAL';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidScheduleIntervalError';
  }
}

export class AnpRecommendationNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'ANP_RECOMMENDATION_NOT_FOUND';

  constructor(decisionRunId: string) {
    super(`Decision run '${decisionRunId}' or its approved ANP recommendation was not found.`);
    this.name = 'AnpRecommendationNotFoundError';
  }
}
