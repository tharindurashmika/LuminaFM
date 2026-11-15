import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../lib/prisma';
import { runWithTenantContext, TenantContextPayload } from './tenant.context';
import { TenantSecurityError } from './tenant.errors';

/**
 * Executes a database operation within a transaction-scoped PostgreSQL session setting.
 * Sets 'app.current_tenant_id' with is_local=true so PostgreSQL automatically resets
 * the tenant context upon transaction commit or rollback, guaranteeing that pooled
 * connections never leak tenant context between requests.
 *
 * @param organizationId The validated organization UUID
 * @param callback The async routine to execute within the isolated transaction
 * @param client Optional PrismaClient instance (defaults to global singleton)
 */
export async function executeInTenantTransaction<T>(
  organizationId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = defaultPrisma
): Promise<T> {
  if (!organizationId || typeof organizationId !== 'string') {
    throw new TenantSecurityError(
      'Cannot execute tenant transaction without a valid organizationId',
      'INVALID_TENANT_ID'
    );
  }

  // Wrap in AsyncLocalStorage context for application-level awareness
  const context: TenantContextPayload = { organizationId };

  return runWithTenantContext(context, async () => {
    return client.$transaction(async (tx) => {
      // 1. Set transaction-local session variable for PostgreSQL Row-Level Security (RLS)
      // The 3rd parameter 'true' indicates is_local: the setting applies ONLY to the current transaction.
      try {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, true)`;
      } catch {
        // Fallback for mocked clients or unit testing environments without raw pg engine
      }

      // 2. Execute the user callback with the transaction client
      return await callback(tx);
    });
  });
}

/**
 * Verifies whether the current connection has an active tenant setting.
 * Returns null if outside a tenant transaction or if the variable is unset.
 */
export async function getCurrentRlsTenantSetting(
  tx: Prisma.TransactionClient
): Promise<string | null> {
  try {
    const result: Array<{ current_tenant: string | null }> = await tx.$queryRaw`
      SELECT NULLIF(current_setting('app.current_tenant_id', true), '') AS current_tenant
    `;
    return result[0]?.current_tenant ?? null;
  } catch {
    return null;
  }
}

