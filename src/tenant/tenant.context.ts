import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantSecurityError, TenantContextMissingError } from './tenant.errors';

export interface TenantContextPayload {
  organizationId: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  isPlatformAdmin?: boolean;
  metadata?: Record<string, unknown>;
}

// Global AsyncLocalStorage store for tenant context
const tenantStorage = new AsyncLocalStorage<TenantContextPayload>();

/**
 * Runs a given callback within the execution context of a specific tenant.
 * All queries executed within this callback asynchronously inherit the tenant ID and security metadata.
 *
 * @param context Tenant context containing organizationId, userId, permissions, etc.
 * @param callback The async routine to execute
 */
export async function runWithTenantContext<T>(
  context: TenantContextPayload | string,
  callback: () => Promise<T>
): Promise<T> {
  const payload: TenantContextPayload =
    typeof context === 'string' ? { organizationId: context } : context;

  if (!payload.organizationId || typeof payload.organizationId !== 'string') {
    throw new TenantSecurityError('Cannot initialize tenant context without a valid organizationId');
  }

  return tenantStorage.run(payload, callback);
}

/**
 * Returns the active tenant context, or undefined if outside a tenant scope.
 */
export function getTenantContext(): TenantContextPayload | undefined {
  return tenantStorage.getStore();
}

/**
 * Returns the active organizationId, or undefined if outside a tenant scope.
 */
export function getCurrentTenantId(): string | undefined {
  return tenantStorage.getStore()?.organizationId;
}

/**
 * Returns the active userId from AsyncLocalStorage, or undefined if not set.
 */
export function getCurrentUserId(): string | undefined {
  return tenantStorage.getStore()?.userId;
}

/**
 * Returns the active user roles from AsyncLocalStorage, or empty array if not set.
 */
export function getCurrentRoles(): string[] {
  return tenantStorage.getStore()?.roles ?? [];
}

/**
 * Returns the active user permissions from AsyncLocalStorage, or empty array if not set.
 */
export function getCurrentPermissions(): string[] {
  return tenantStorage.getStore()?.permissions ?? [];
}

/**
 * Checks whether the current tenant context possesses a specific permission.
 */
export function hasPermission(permissionKey: string): boolean {
  const ctx = tenantStorage.getStore();
  if (ctx?.isPlatformAdmin) return true;
  return ctx?.permissions?.includes(permissionKey) ?? false;
}

/**
 * Checks whether the current tenant context possesses a specific role.
 */
export function hasRole(roleName: string): boolean {
  const ctx = tenantStorage.getStore();
  if (ctx?.isPlatformAdmin) return true;
  return ctx?.roles?.includes(roleName) ?? false;
}

/**
 * Asserts and returns the active organizationId. Throws TenantSecurityError if missing.
 */
export function requireCurrentTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new TenantContextMissingError('context_resolution', 'TenantContext');
  }
  return tenantId;
}
