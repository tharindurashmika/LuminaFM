/**
 * Error thrown when a hierarchy relationship would create a cycle.
 */
export class HierarchyCycleError extends Error {
  public readonly code = 'HIERARCHY_CYCLE_DETECTED';
  public readonly entityName: string;
  public readonly targetId: string;
  public readonly attemptedParentId: string;

  constructor(entityName: string, targetId: string, attemptedParentId: string) {
    super(
      `Circular hierarchy reference detected in ${entityName}. Item '${targetId}' cannot have descendant '${attemptedParentId}' as its parent.`
    );
    this.name = 'HierarchyCycleError';
    this.entityName = entityName;
    this.targetId = targetId;
    this.attemptedParentId = attemptedParentId;
  }
}

export class ForeignKeyViolationError extends Error {
  public readonly code = 'FOREIGN_KEY_VIOLATION';
  public readonly field: string;
  public readonly referencedId: string;

  constructor(field: string, referencedId: string, message: string) {
    super(`[Foreign Key Violation] ${message}`);
    this.name = 'ForeignKeyViolationError';
    this.field = field;
    this.referencedId = referencedId;
  }
}

/**
 * Validates that assigning `newParentId` to `targetId` does not create a circular reference.
 * Traverses upwards through the parent hierarchy chain to ensure `targetId` is never an ancestor of `newParentId`.
 *
 * @param entityName Display name of the entity for error messaging (e.g., 'Location', 'System', 'Asset')
 * @param targetId The ID of the item being created or updated
 * @param newParentId The proposed parent ID (null or undefined skips validation)
 * @param fetchParentId Async function returning the parent ID of a given node
 */
export async function validateNoHierarchyCycle(
  entityName: string,
  targetId: string,
  newParentId: string | null | undefined,
  fetchParentId: (id: string) => Promise<string | null | undefined>
): Promise<void> {
  if (!newParentId) {
    return;
  }

  // 1. Direct cycle: Node cannot be its own parent
  if (targetId === newParentId) {
    throw new HierarchyCycleError(entityName, targetId, newParentId);
  }

  // 2. Indirect cycle: Traverse upwards from newParentId to root
  let currentId: string | null | undefined = newParentId;
  const visited = new Set<string>();
  const MAX_DEPTH = 100; // Protection against runaway loops in corrupted external data
  let depth = 0;

  while (currentId) {
    if (depth++ > MAX_DEPTH) {
      throw new Error(`Maximum hierarchy depth of ${MAX_DEPTH} exceeded for ${entityName}.`);
    }

    if (currentId === targetId) {
      throw new HierarchyCycleError(entityName, targetId, newParentId);
    }

    if (visited.has(currentId)) {
      // Loop already existed in historical data
      break;
    }
    visited.add(currentId);

    currentId = await fetchParentId(currentId);
  }
}

