/**
 * Error thrown when an incoming attribute value does not conform to the data_type
 * specified in attribute_definitions.
 */
export class AttributeTypeValidationError extends Error {
  public readonly code = 'INVALID_ATTRIBUTE_TYPE';
  public readonly attributeCode: string;
  public readonly expectedType: string;
  public readonly receivedValue: any;

  constructor(attributeCode: string, expectedType: string, receivedValue: any, details?: string) {
    super(
      details ||
        `Attribute '${attributeCode}' expects data_type '${expectedType}', but received ${typeof receivedValue} (${JSON.stringify(
          receivedValue
        )}).`
    );
    this.name = 'AttributeTypeValidationError';
    this.attributeCode = attributeCode;
    this.expectedType = expectedType;
    this.receivedValue = receivedValue;
  }
}

/**
 * Error thrown when an attribute definition does not exist in the tenant.
 */
export class AttributeNotFoundError extends Error {
  public readonly code = 'ATTRIBUTE_NOT_FOUND';
  public readonly attributeIdentifier: string;

  constructor(identifier: string) {
    super(`AttributeDefinition '${identifier}' not found in active organization.`);
    this.name = 'AttributeNotFoundError';
    this.attributeIdentifier = identifier;
  }
}

/**
 * Error thrown when a category-mandated required attribute is missing.
 */
export class RequiredAttributeMissingError extends Error {
  public readonly code = 'REQUIRED_ATTRIBUTE_MISSING';
  public readonly attributeCode: string;

  constructor(attributeCode: string) {
    super(`Mandatory attribute '${attributeCode}' is required for this equipment category.`);
    this.name = 'RequiredAttributeMissingError';
    this.attributeCode = attributeCode;
  }
}

