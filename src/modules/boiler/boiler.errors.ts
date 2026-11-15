/**
 * Specialized Boiler Maintenance Domain Errors
 */

export class BoilerCapacityOutOfRangeError extends Error {
  readonly status = 400;
  readonly code = 'BOILER_CAPACITY_OUT_OF_RANGE';

  constructor(capacityKgPerHour: number) {
    super(
      `Boiler capacity ${capacityKgPerHour} kg/h is outside the validated research scope (1,000 kg/h to 1,800 kg/h for oil-fired fire-tube steam boilers).`
    );
    this.name = 'BoilerCapacityOutOfRangeError';
  }
}

export class BoilerParameterRangeViolationError extends Error {
  readonly status = 400;
  readonly code = 'BOILER_PARAMETER_RANGE_VIOLATION';

  constructor(parameterCode: string, value: number, min: number, max: number, unit: string) {
    super(
      `Observed reading ${value} ${unit} for '${parameterCode}' violates the physical instrument range [${min} - ${max} ${unit}].`
    );
    this.name = 'BoilerParameterRangeViolationError';
  }
}

export class BoilerAssetNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'BOILER_ASSET_NOT_FOUND';

  constructor(idOrCode: string) {
    super(`Boiler equipment '${idOrCode}' was not found in the active organization.`);
    this.name = 'BoilerAssetNotFoundError';
  }
}

export class RequiredMeasurementMissingError extends Error {
  readonly status = 400;
  readonly code = 'REQUIRED_MEASUREMENT_MISSING';
  readonly missingParameters: string[];

  constructor(missingParameters: string[]) {
    super(
      `Submission rejected: The following required boiler operational measurements are missing: ${missingParameters.join(
        ', '
      )}.`
    );
    this.name = 'RequiredMeasurementMissingError';
    this.missingParameters = missingParameters;
  }
}

export class LogbookAlreadySubmittedError extends Error {
  readonly status = 400;
  readonly code = 'LOGBOOK_ALREADY_SUBMITTED';

  constructor(logNumber: string) {
    super(
      `Daily logbook '${logNumber}' has already been submitted and completed. Modifications must be recorded as traceable amendments.`
    );
    this.name = 'LogbookAlreadySubmittedError';
  }
}

export class LogbookNotFoundError extends Error {
  readonly status = 404;
  readonly code = 'LOGBOOK_NOT_FOUND';

  constructor(id: string) {
    super(`Daily logbook '${id}' was not found in the active organization.`);
    this.name = 'LogbookNotFoundError';
  }
}

export class AmendmentReasonRequiredError extends Error {
  readonly status = 400;
  readonly code = 'AMENDMENT_REASON_REQUIRED';

  constructor() {
    super(
      'An explicit non-empty justification reason is strictly required when amending recorded operational readings.'
    );
    this.name = 'AmendmentReasonRequiredError';
  }
}

export class OperationalSyncConflictError extends Error {
  readonly status = 409;
  readonly code = 'OPERATIONAL_SYNC_CONFLICT';
  readonly serverRecord: any;
  readonly clientSubmissionId?: string;

  constructor(message: string, serverRecord: any, clientSubmissionId?: string) {
    super(message);
    this.name = 'OperationalSyncConflictError';
    this.serverRecord = serverRecord;
    this.clientSubmissionId = clientSubmissionId;
  }
}

