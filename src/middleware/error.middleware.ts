import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { TenantSecurityError, CrossTenantAccessError } from '../tenant/tenant.errors';
import { HierarchyCycleError, ForeignKeyViolationError } from '../modules/assets/hierarchy.validator';
import {
  AttributeTypeValidationError,
  AttributeNotFoundError,
  RequiredAttributeMissingError,
} from '../modules/attributes/attributes.errors';
import { InvalidWorkOrderStatusTransitionError } from '../modules/work-orders/work-order.state-machine';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Work Order State Machine Transition Violations (400 Bad Request)
  if (err instanceof InvalidWorkOrderStatusTransitionError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        current_status: err.currentStatus,
        attempted_status: err.attemptedStatus,
        allowed_transitions: err.allowedTransitions,
        message: err.message,
      },
    });
    return;
  }

  // Attribute Type Validation Violations (Strictly 400 Bad Request)
  if (err instanceof AttributeTypeValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        attribute: err.attributeCode,
        expected_type: err.expectedType,
        received_value: err.receivedValue,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof AttributeNotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: err.code,
        attribute: err.attributeIdentifier,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof RequiredAttributeMissingError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        attribute: err.attributeCode,
        message: err.message,
      },
    });
    return;
  }

  // Hierarchy Circular Reference Violations
  if (err instanceof HierarchyCycleError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        entity: err.entityName,
        target_id: err.targetId,
        attempted_parent_id: err.attemptedParentId,
        message: err.message,
      },
    });
    return;
  }

  // Structured Foreign Key & Entity Reference Violations
  if (err instanceof ForeignKeyViolationError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        field: err.field,
        referenced_id: err.referencedId,
        message: err.message,
      },
    });
    return;
  }

  // Tenant Security Violations
  if (err instanceof CrossTenantAccessError) {
    res.status(403).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof TenantSecurityError) {
    res.status(403).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Multer Upload Errors
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Custom Multer File Filter Error
  if (err.message && err.message.startsWith('Unsupported file type')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: err.message,
      },
    });
    return;
  }

  // Prisma Database Known Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with unique field(s) '${target.join(', ')}' already exists.`,
          details: err.meta,
        },
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
        },
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Database foreign key constraint violation. Referenced entity does not exist.',
          details: err.meta,
        },
      });
      return;
    }
  }

  console.error('[LuminaFM Error]', err);

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    },
  });
}
