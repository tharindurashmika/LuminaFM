/**
 * Error thrown when a tenant security rule or isolation constraint is violated.
 */
export class TenantSecurityError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'TENANT_SECURITY_VIOLATION') {
    super(`[LuminaFM Security] ${message}`);
    this.name = 'TenantSecurityError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a database operation is attempted without an active tenant context.
 */
export class TenantContextMissingError extends TenantSecurityError {
  constructor(operation: string, model: string) {
    super(
      `Tenant context missing during '${operation}' on model '${model}'. Operations on multi-tenant tables require an active organization context.`,
      'TENANT_CONTEXT_MISSING'
    );
    this.name = 'TenantContextMissingError';
  }
}

/**
 * Error thrown when an operation attempts to access or mutate records belonging to a different tenant.
 */
export class CrossTenantAccessError extends TenantSecurityError {
  constructor(attemptedTenantId: string, currentTenantId: string, model: string) {
    super(
      `Cross-tenant access prohibited on model '${model}'. Attempted access for tenant '${attemptedTenantId}', but current context is bound to '${currentTenantId}'.`,
      'CROSS_TENANT_ACCESS_DENIED'
    );
    this.name = 'CrossTenantAccessError';
  }
}

