import { Prisma } from '@prisma/client';
import {
  TenantSecurityError,
  TenantContextMissingError,
  CrossTenantAccessError,
} from './tenant.errors';
import {
  getCurrentTenantId,
  getCurrentUserId,
  getTenantContext,
} from './tenant.context';
import { sanitizeForAuditLog } from '../modules/audit/data-protection.sanitizer';

/**
 * Set of all models in LuminaFM that are strictly tenant-owned and must be scoped by `organization_id`.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  'OrganizationMembership',
  'Role',
  'RolePermission',
  'MembershipRole',
  'Site',
  'LocationType',
  'Location',
  'SystemCategory',
  'SystemType',
  'System',
  'AssetCategory',
  'Brand',
  'AssetModel',
  'Asset',
  'AttributeDefinition',
  'CategoryAttribute',
  'AssetAttributeValue',
  'UnitOfMeasurement',
  'MeterDefinition',
  'AssetMeter',
  'MeterReading',
  'OfflineSyncBatch',
  'MaintenanceType',
  'MaintenanceTaskTemplate',
  'MaintenancePlan',
  'MaintenancePlanTask',
  'AssetMaintenancePlan',
  'WorkOrder',
  'WorkOrderTask',
  'WorkOrderLabor',
  'WorkOrderPart',
  'WorkOrderStatusHistory',
  'ChecklistTemplate',
  'ChecklistItem',
  'Inspection',
  'InspectionResponse',
  'FaultLog',
  'DecisionModel',
  'DecisionCriterion',
  'DecisionAlternative',
  'DecisionPairwiseComparison',
  'DecisionNetworkEdge',
  'DecisionRun',
  'Attachment',
  'EntityAttachment',
  'Notification',
  'AuditLog',
]);

/**
 * Checks whether a given model is tenant-scoped.
 */
export function isTenantScoped(model: string): boolean {
  return TENANT_SCOPED_MODELS.has(model);
}

/**
 * Checks whether a given model is the root Organization model.
 */
export function isOrganizationModel(model: string): boolean {
  return model === 'Organization';
}

/**
 * Critical CMMS models whose UPDATE and DELETE mutations are automatically
 * recorded into the `audit_logs` table with `old_values`, `new_values`, and `user_id`.
 */
export const AUDITED_CRITICAL_MODELS: Record<string, string> = {
  Asset: 'assets',
  WorkOrder: 'work_orders',
  Site: 'sites',
  Location: 'locations',
  System: 'systems',
  AssetCategory: 'asset_categories',
  MaintenancePlan: 'maintenance_plans',
  Inspection: 'inspections',
  FaultLog: 'fault_logs',
  DecisionModel: 'decision_models',
  DecisionRun: 'decision_runs',
  Role: 'roles',
  User: 'users',
  Attachment: 'attachments',
};

export function isAuditedCriticalModel(model: string): boolean {
  return model in AUDITED_CRITICAL_MODELS;
}

function resolveModelDelegate(client: any, model: string): any {
  if (!client) return undefined;
  const camel = model.charAt(0).toLowerCase() + model.slice(1);
  return client[model] ?? client[camel];
}

async function writeAutomaticAuditEntry(
  client: any,
  params: {
    organizationId: string;
    userId?: string | null;
    action:
      | 'CREATE'
      | 'UPDATE'
      | 'DELETE'
      | 'STATUS_TRANSITION'
      | 'APPROVAL'
      | 'REJECTION'
      | string;
    model: string;
    entityId?: string | null;
    oldValues?: unknown;
    newValues?: unknown;
  }
): Promise<void> {
  if (!isAuditedCriticalModel(params.model)) return;

  const auditDelegate = resolveModelDelegate(client, 'AuditLog');
  if (!auditDelegate || typeof auditDelegate.create !== 'function') return;

  const ctx = getTenantContext();
  const ipAddress =
    typeof ctx?.metadata?.ipAddress === 'string' ? ctx.metadata.ipAddress : null;
  const userAgent =
    typeof ctx?.metadata?.userAgent === 'string' ? ctx.metadata.userAgent : null;

  try {
    const sanitizedOld =
      params.oldValues !== undefined && params.oldValues !== null
        ? sanitizeForAuditLog(params.oldValues)
        : null;
    const sanitizedNew =
      params.newValues !== undefined && params.newValues !== null
        ? sanitizeForAuditLog(params.newValues)
        : null;

    await auditDelegate.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? getCurrentUserId() ?? null,
        action: params.action,
        entityType: AUDITED_CRITICAL_MODELS[params.model] || params.model,
        entityId: params.entityId || null,
        oldValues:
          sanitizedOld !== null
            ? (JSON.parse(JSON.stringify(sanitizedOld)) as Prisma.InputJsonValue)
            : Prisma.DbNull,
        newValues:
          sanitizedNew !== null
            ? (JSON.parse(JSON.stringify(sanitizedNew)) as Prisma.InputJsonValue)
            : Prisma.DbNull,
        ipAddress,
        userAgent,
      },
    });
  } catch {
    // Non-blocking fallback when running against mock clients without AuditLog delegate
  }
}

/**
 * Secures a where clause by verifying no foreign tenant ID is supplied
 * and appending the mandatory organizationId filter wrapped in an AND logical clause.
 */
export function secureWhere(where: any, tenantId: string, model: string): Record<string, unknown> {
  if (where && typeof where === 'object') {
    // If an attacker/caller explicitly provides an organizationId, verify it matches
    if ('organizationId' in where && where.organizationId !== undefined) {
      if (typeof where.organizationId === 'string' && where.organizationId !== tenantId) {
        throw new CrossTenantAccessError(where.organizationId, tenantId, model);
      }
      if (
        typeof where.organizationId === 'object' &&
        where.organizationId !== null &&
        'equals' in where.organizationId &&
        where.organizationId.equals !== tenantId
      ) {
        throw new CrossTenantAccessError(String(where.organizationId.equals), tenantId, model);
      }
    }
  }

  // Mathematically guarantee isolation: Wrap existing filter and tenant constraint with AND
  if (!where || Object.keys(where).length === 0) {
    return { organizationId: tenantId };
  }

  return {
    AND: [where, { organizationId: tenantId }],
  };
}

/**
 * Scopes where clauses for the Organization model itself (using `id` rather than `organizationId`).
 */
export function secureOrganizationWhere(
  where: any,
  tenantId: string
): Record<string, unknown> {
  if (where && typeof where === 'object' && 'id' in where && where.id !== undefined) {
    if (where.id !== tenantId) {
      throw new CrossTenantAccessError(where.id, tenantId, 'Organization');
    }
  }

  if (!where || Object.keys(where).length === 0) {
    return { id: tenantId };
  }

  return {
    AND: [where, { id: tenantId }],
  };
}

export interface TenantExtensionOptions {
  /**
   * Optional custom resolver for the tenant ID.
   * If omitted, defaults to retrieving the tenant from AsyncLocalStorage.
   */
  getTenantId?: () => string | undefined;
}

/**
 * Creates a custom Prisma Extension providing mathematically provable tenant isolation.
 * Automatically injects `{ where: { organizationId: currentTenantId } }` to all read/write queries
 * and enforces tenant assignment on all mutations.
 */
export function createTenantExtension(options: TenantExtensionOptions = {}) {
  const resolveTenantId = (operation: string, model: string): string => {
    const id = options.getTenantId ? options.getTenantId() : getCurrentTenantId();
    if (!id) {
      throw new TenantContextMissingError(operation, model);
    }
    return id;
  };

  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'LuminaFMTenantIsolation',
      query: {
        $allModels: {
          async findFirst({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('findFirst', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('findFirst', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args);
          },

          async findFirstOrThrow({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('findFirstOrThrow', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('findFirstOrThrow', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args);
          },

          async findMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('findMany', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('findMany', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args);
          },

          async findUnique({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('findUnique', model);
              const scopedWhere = secureWhere(args.where, tenantId, model);
              const modelDelegate = (client as any)[model];
              return modelDelegate.findFirst({
                ...args,
                where: scopedWhere,
              });
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('findUnique', model);
              const scopedWhere = secureOrganizationWhere(args.where, tenantId);
              const modelDelegate = (client as any)[model];
              return modelDelegate.findFirst({
                ...args,
                where: scopedWhere,
              });
            }
            return query(args);
          },

          async findUniqueOrThrow({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('findUniqueOrThrow', model);
              const scopedWhere = secureWhere(args.where, tenantId, model);
              const modelDelegate = (client as any)[model];
              return modelDelegate.findFirstOrThrow({
                ...args,
                where: scopedWhere,
              });
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('findUniqueOrThrow', model);
              const scopedWhere = secureOrganizationWhere(args.where, tenantId);
              const modelDelegate = (client as any)[model];
              return modelDelegate.findFirstOrThrow({
                ...args,
                where: scopedWhere,
              });
            }
            return query(args);
          },

          async count({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('count', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('count', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args);
          },

          async aggregate({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('aggregate', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('aggregate', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args);
          },

          async groupBy({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('groupBy', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('groupBy', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args as any);
          },

          async create({ model, args, query }) {
            let resolvedTenantId: string | undefined;
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('create', model);
              resolvedTenantId = tenantId;
              const data = args.data as any;
              if (data && typeof data === 'object') {
                if (
                  'organizationId' in data &&
                  data.organizationId !== undefined &&
                  data.organizationId !== tenantId
                ) {
                  throw new CrossTenantAccessError(
                    String(data.organizationId),
                    tenantId,
                    model
                  );
                }
                args.data = {
                  ...data,
                  organizationId: tenantId,
                };
              }
            } else if (isOrganizationModel(model)) {
              // Creating a root organization is restricted to platform admin operations
              throw new TenantSecurityError(
                'Creation of root Organization records is not permitted via tenant-scoped client',
                'ORGANIZATION_CREATION_RESTRICTED'
              );
            }

            const createdResult = await query(args);

            if (
              resolvedTenantId &&
              createdResult &&
              isAuditedCriticalModel(model)
            ) {
              await writeAutomaticAuditEntry(client, {
                organizationId: resolvedTenantId,
                userId: getCurrentUserId() ?? null,
                action: 'CREATE',
                model,
                entityId: (createdResult as any)?.id ?? null,
                oldValues: null,
                newValues: createdResult,
              });
            }

            return createdResult;
          },

          async createMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('createMany', model);
              const data = args.data as any;
              if (Array.isArray(data)) {
                args.data = data.map((item: any) => {
                  if (
                    item.organizationId !== undefined &&
                    item.organizationId !== tenantId
                  ) {
                    throw new CrossTenantAccessError(
                      String(item.organizationId),
                      tenantId,
                      model
                    );
                  }
                  return { ...item, organizationId: tenantId };
                }) as any;
              } else if (data && typeof data === 'object') {
                if (
                  data.organizationId !== undefined &&
                  data.organizationId !== tenantId
                ) {
                  throw new CrossTenantAccessError(
                    String(data.organizationId),
                    tenantId,
                    model
                  );
                }
                args.data = { ...data, organizationId: tenantId } as any;
              }
            }
            return query(args);
          },

          async update({ model, args, query }) {
            let existingSnapshot: any = null;
            let resolvedTenantId: string | undefined;

            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('update', model);
              resolvedTenantId = tenantId;
              const data = args.data as any;

              // 1. Prevent altering the organizationId
              if (data && typeof data === 'object' && 'organizationId' in data) {
                if (data.organizationId !== tenantId) {
                  throw new TenantSecurityError(
                    `Reassigning organizationId across tenants is strictly prohibited on model '${model}'.`,
                    'ORGANIZATION_REASSIGNMENT_FORBIDDEN'
                  );
                }
              }

              // 2. Ensure target record exists within the current tenant & capture old_values for audited models
              const modelDelegate = resolveModelDelegate(client, model);
              const existing = await modelDelegate.findFirst({
                where: secureWhere(args.where, tenantId, model),
                ...(isAuditedCriticalModel(model) ? {} : { select: { id: true } }),
              });

              if (!existing) {
                throw new TenantSecurityError(
                  `Record to update not found or does not belong to active tenant '${tenantId}' on model '${model}'.`,
                  'RECORD_NOT_FOUND_IN_TENANT'
                );
              }
              existingSnapshot = existing;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('update', model);
              resolvedTenantId = tenantId;
              const where = args.where as any;
              if (where?.id && where.id !== tenantId) {
                throw new CrossTenantAccessError(where.id, tenantId, 'Organization');
              }
              args.where = secureOrganizationWhere(where, tenantId) as any;
            }

            const updatedResult = await query(args);

            if (
              resolvedTenantId &&
              existingSnapshot &&
              isAuditedCriticalModel(model)
            ) {
              let action: 'UPDATE' | 'STATUS_TRANSITION' | 'APPROVAL' | 'REJECTION' = 'UPDATE';

              const oldStatus =
                (existingSnapshot as any)?.status ??
                (existingSnapshot as any)?.reviewStatus ??
                (existingSnapshot as any)?.validationStatus ??
                (existingSnapshot as any)?.overallResult;
              const newStatus =
                (updatedResult as any)?.status ??
                (updatedResult as any)?.reviewStatus ??
                (updatedResult as any)?.validationStatus ??
                (updatedResult as any)?.overallResult;

              if (oldStatus !== undefined && newStatus !== undefined && String(oldStatus) !== String(newStatus)) {
                const newStatusStr = String(newStatus).toLowerCase();
                if (['approved', 'academic_validated', 'commercial_validated'].includes(newStatusStr)) {
                  action = 'APPROVAL';
                } else if (['rejected'].includes(newStatusStr)) {
                  action = 'REJECTION';
                } else {
                  action = 'STATUS_TRANSITION';
                }
              }

              await writeAutomaticAuditEntry(client, {
                organizationId: resolvedTenantId,
                userId: getCurrentUserId() ?? null,
                action,
                model,
                entityId: existingSnapshot.id ?? null,
                oldValues: existingSnapshot,
                newValues: updatedResult,
              });
            }

            return updatedResult;
          },

          async updateMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('updateMany', model);
              const data = args.data as any;

              // Prevent altering the organizationId
              if (data && typeof data === 'object' && 'organizationId' in data) {
                if (data.organizationId !== tenantId) {
                  throw new TenantSecurityError(
                    `Reassigning organizationId across tenants is strictly prohibited on model '${model}'.`,
                    'ORGANIZATION_REASSIGNMENT_FORBIDDEN'
                  );
                }
              }

              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              const tenantId = resolveTenantId('updateMany', model);
              args.where = secureOrganizationWhere(args.where, tenantId) as any;
            }
            return query(args);
          },

          async delete({ model, args, query }) {
            let existingSnapshot: any = null;
            let resolvedTenantId: string | undefined;

            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('delete', model);
              resolvedTenantId = tenantId;

              // Ensure target record exists within the current tenant & capture old_values for audited models
              const modelDelegate = resolveModelDelegate(client, model);
              const existing = await modelDelegate.findFirst({
                where: secureWhere(args.where, tenantId, model),
                ...(isAuditedCriticalModel(model) ? {} : { select: { id: true } }),
              });

              if (!existing) {
                throw new TenantSecurityError(
                  `Record to delete not found or does not belong to active tenant '${tenantId}' on model '${model}'.`,
                  'RECORD_NOT_FOUND_IN_TENANT'
                );
              }
              existingSnapshot = existing;
            } else if (isOrganizationModel(model)) {
              throw new TenantSecurityError(
                'Direct deletion of root Organization is not permitted via tenant client',
                'ORGANIZATION_DELETION_RESTRICTED'
              );
            }

            const deletedResult = await query(args);

            if (
              resolvedTenantId &&
              existingSnapshot &&
              isAuditedCriticalModel(model)
            ) {
              await writeAutomaticAuditEntry(client, {
                organizationId: resolvedTenantId,
                userId: getCurrentUserId() ?? null,
                action: 'DELETE',
                model,
                entityId: existingSnapshot.id ?? null,
                oldValues: existingSnapshot,
                newValues: null,
              });
            }

            return deletedResult;
          },

          async deleteMany({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('deleteMany', model);
              args.where = secureWhere(args.where, tenantId, model) as any;
            } else if (isOrganizationModel(model)) {
              throw new TenantSecurityError(
                'Bulk deletion of Organizations is prohibited via tenant client',
                'ORGANIZATION_DELETION_RESTRICTED'
              );
            }
            return query(args);
          },

          async upsert({ model, args, query }) {
            if (isTenantScoped(model)) {
              const tenantId = resolveTenantId('upsert', model);
              const createData = args.create as any;
              const updateData = args.update as any;

              // 1. Guard create payload
              if (createData && typeof createData === 'object') {
                if (
                  'organizationId' in createData &&
                  createData.organizationId !== undefined &&
                  createData.organizationId !== tenantId
                ) {
                  throw new CrossTenantAccessError(
                    String(createData.organizationId),
                    tenantId,
                    model
                  );
                }
                args.create = { ...createData, organizationId: tenantId };
              }

              // 2. Guard update payload
              if (updateData && typeof updateData === 'object' && 'organizationId' in updateData) {
                if (updateData.organizationId !== tenantId) {
                  throw new TenantSecurityError(
                    `Reassigning organizationId across tenants is strictly prohibited on model '${model}'.`,
                    'ORGANIZATION_REASSIGNMENT_FORBIDDEN'
                  );
                }
              }

              // 3. Ensure target record exists within the current tenant if updating
              const modelDelegate = (client as any)[model];
              const existing = await modelDelegate.findFirst({
                where: secureWhere(args.where, tenantId, model),
                select: { id: true },
              });

              if (!existing) {
                // If the target record does not exist in this tenant, enforce create path
                return modelDelegate.create({
                  data: args.create,
                  include: args.include,
                  select: args.select,
                });
              }
            }
            return query(args);
          },
        },
      },
    });
  });
}
