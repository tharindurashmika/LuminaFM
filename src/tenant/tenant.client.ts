import prisma from '../lib/prisma';
import { createTenantExtension } from './tenant.extension';
import { getCurrentTenantId } from './tenant.context';

/**
 * Creates a Prisma client instance strictly bound to a specific tenant ID.
 * All queries executed through this client will mathematically have their
 * where and mutation clauses scoped to this organizationId.
 *
 * @param organizationId UUID of the tenant organization
 */
export function getTenantClient(organizationId: string) {
  if (!organizationId) {
    throw new Error('getTenantClient requires a valid organizationId');
  }

  return prisma.$extends(
    createTenantExtension({
      getTenantId: () => organizationId,
    })
  );
}

export type TenantPrismaClient = ReturnType<typeof getTenantClient>;

/**
 * Dynamic tenant-aware Prisma client.
 * Automatically resolves the active organization ID from the AsyncLocalStorage
 * context on every single query.
 */
export const tenantPrisma = prisma.$extends(
  createTenantExtension({
    getTenantId: () => getCurrentTenantId(),
  })
);

export default tenantPrisma;

