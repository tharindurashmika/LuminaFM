import { AttributeDataType } from '@prisma/client';
import { AttributeTypeValidationError } from './attributes.errors';

export type SupportedAttributeType = AttributeDataType | 'json';

export interface TypedAttributeColumnResult {
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueDatetime: Date | null;
  valueJson: any | null;
}

export interface AttributeValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  step?: number;
  customErrorMessage?: string;
}

export interface AttributeDefinitionLike {
  id: string;
  code: string;
  name: string;
  dataType: SupportedAttributeType;
  options?: any;
  validationRules?: AttributeValidationRules;
}

/**
 * Validates an incoming raw value against an AttributeDefinition's data_type and validation rules,
 * returning a typed column mapping where exactly ONE column is populated.
 * Rejects invalid types or range violations by throwing AttributeTypeValidationError (HTTP 400).
 */
export function validateAndMapAttributeValue(
  definition: AttributeDefinitionLike,
  rawValue: unknown
): TypedAttributeColumnResult {
  const { code, dataType, options, validationRules } = definition;

  if (rawValue === null || rawValue === undefined) {
    throw new AttributeTypeValidationError(
      code,
      dataType,
      rawValue,
      `Attribute value for '${code}' cannot be null or undefined.`
    );
  }

  const result: TypedAttributeColumnResult = {
    valueText: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
    valueDatetime: null,
    valueJson: null,
  };

  switch (dataType) {
    case 'text': {
      if (typeof rawValue !== 'string') {
        throw new AttributeTypeValidationError(code, 'text', rawValue);
      }
      if (validationRules?.pattern) {
        const regex = new RegExp(validationRules.pattern);
        if (!regex.test(rawValue)) {
          throw new AttributeTypeValidationError(
            code,
            'text',
            rawValue,
            validationRules.customErrorMessage ||
              `Value '${rawValue}' does not match required pattern '${validationRules.pattern}' for '${code}'.`
          );
        }
      }
      result.valueText = rawValue;
      break;
    }

    case 'number': {
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
        throw new AttributeTypeValidationError(code, 'number', rawValue);
      }
      if (validationRules?.min !== undefined && rawValue < validationRules.min) {
        throw new AttributeTypeValidationError(
          code,
          'number',
          rawValue,
          validationRules.customErrorMessage ||
            `Value ${rawValue} is below minimum allowed value of ${validationRules.min} for '${code}'.`
        );
      }
      if (validationRules?.max !== undefined && rawValue > validationRules.max) {
        throw new AttributeTypeValidationError(
          code,
          'number',
          rawValue,
          validationRules.customErrorMessage ||
            `Value ${rawValue} exceeds maximum allowed value of ${validationRules.max} for '${code}'.`
        );
      }
      result.valueNumber = rawValue;
      break;
    }

    case 'boolean': {
      if (typeof rawValue !== 'boolean') {
        throw new AttributeTypeValidationError(code, 'boolean', rawValue);
      }
      result.valueBoolean = rawValue;
      break;
    }

    case 'date': {
      if (typeof rawValue !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
        throw new AttributeTypeValidationError(
          code,
          'date',
          rawValue,
          `Attribute '${code}' expects a valid date string formatted as YYYY-MM-DD.`
        );
      }
      const parsedDate = new Date(rawValue);
      if (isNaN(parsedDate.getTime())) {
        throw new AttributeTypeValidationError(
          code,
          'date',
          rawValue,
          `Attribute '${code}' contains an invalid calendar date.`
        );
      }
      result.valueDate = parsedDate;
      break;
    }

    case 'datetime': {
      if (typeof rawValue !== 'string') {
        throw new AttributeTypeValidationError(code, 'datetime', rawValue);
      }
      const parsedDateTime = new Date(rawValue);
      if (isNaN(parsedDateTime.getTime())) {
        throw new AttributeTypeValidationError(
          code,
          'datetime',
          rawValue,
          `Attribute '${code}' contains an invalid ISO datetime.`
        );
      }
      result.valueDatetime = parsedDateTime;
      break;
    }

    case 'select': {
      if (typeof rawValue !== 'string') {
        throw new AttributeTypeValidationError(code, 'select', rawValue);
      }

      // If allowed options are configured, validate membership
      const allowedOptions: string[] = Array.isArray(options) ? options : [];
      if (allowedOptions.length > 0 && !allowedOptions.includes(rawValue)) {
        throw new AttributeTypeValidationError(
          code,
          'select',
          rawValue,
          `Value '${rawValue}' for attribute '${code}' is invalid. Allowed options: [${allowedOptions.join(
            ', '
          )}].`
        );
      }

      result.valueText = rawValue;
      break;
    }

    case 'multi_select': {
      if (!Array.isArray(rawValue) || !rawValue.every((item) => typeof item === 'string')) {
        throw new AttributeTypeValidationError(
          code,
          'multi_select',
          rawValue,
          `Attribute '${code}' expects an array of strings.`
        );
      }

      const allowedOptions: string[] = Array.isArray(options) ? options : [];
      if (allowedOptions.length > 0) {
        for (const item of rawValue) {
          if (!allowedOptions.includes(item)) {
            throw new AttributeTypeValidationError(
              code,
              'multi_select',
              item,
              `Option '${item}' is invalid for attribute '${code}'. Allowed options: [${allowedOptions.join(
                ', '
              )}].`
            );
          }
        }
      }

      result.valueJson = rawValue;
      break;
    }

    case 'json': {
      if (typeof rawValue !== 'object' || rawValue === null) {
        throw new AttributeTypeValidationError(
          code,
          'json',
          rawValue,
          `Attribute '${code}' expects a valid JSON object or array.`
        );
      }
      result.valueJson = rawValue;
      break;
    }

    default: {
      if (typeof rawValue === 'object') {
        result.valueJson = rawValue;
      } else {
        result.valueText = String(rawValue);
      }
      break;
    }
  }

  return result;
}
