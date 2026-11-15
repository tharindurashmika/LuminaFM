import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { AttributeDataType } from '@prisma/client';
import { validateAndMapAttributeValue, AttributeValidationRules } from './attributes.validator';
import { AttributeNotFoundError, RequiredAttributeMissingError } from './attributes.errors';
import { ForeignKeyViolationError } from '../assets/hierarchy.validator';

export interface CreateAttributeDefinitionDto {
  code: string;
  name: string;
  dataType: AttributeDataType | 'json';
  unitCode?: string | null;
  description?: string | null;
  options?: string[];
}

export interface LinkCategoryAttributeDto {
  assetCategoryId: string;
  attributeDefinitionId: string;
  isRequired?: boolean;
  displayOrder?: number;
  defaultValue?: any;
  validationRules?: AttributeValidationRules;
}

export interface AssetAttributeValueInput {
  attributeDefinitionId?: string;
  code?: string;
  value: any;
}

export interface CategoryVersionSnapshot {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  version: number;
  publishedAt: Date;
  publishedBy?: string;
  changeNotes?: string;
  attributes: Array<{
    attributeDefinitionId: string;
    code: string;
    name: string;
    dataType: string;
    unitCode?: string | null;
    isRequired: boolean;
    displayOrder: number;
    defaultValue?: any;
    validationRules: AttributeValidationRules;
    options?: string[];
  }>;
}

export class AttributesService {
  // Version store for category configuration snapshots (historical data immutability)
  private categoryVersionStore: Map<string, CategoryVersionSnapshot[]> = new Map();

  /**
   * Defines a new dynamic attribute definition in the tenant catalog.
   */
  async createAttributeDefinition(dto: CreateAttributeDefinitionDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toLowerCase();

    const existing = await tenantPrisma.attributeDefinition.findFirst({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'ATTRIBUTE_EXISTS',
        message: `An attribute definition with code '${normalizedCode}' already exists in this organization.`,
      };
    }

    return tenantPrisma.attributeDefinition.create({
      data: {
        organizationId,
        code: normalizedCode,
        name: dto.name.trim(),
        dataType: dto.dataType as any,
        unitCode: dto.unitCode?.trim() || null,
        description: dto.description?.trim() || null,
        options: (dto.options || []) as any,
      },
    });
  }

  /**
   * Lists all attribute definitions configured for the tenant.
   */
  async listAttributeDefinitions() {
    return tenantPrisma.attributeDefinition.findMany({
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Gets an attribute definition by ID or code.
   */
  async getAttributeDefinition(idOrCode: string) {
    const def = await tenantPrisma.attributeDefinition.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode.toLowerCase() }],
      },
    });

    if (!def) {
      throw new AttributeNotFoundError(idOrCode);
    }

    return def;
  }

  /**
   * Links an attribute definition to an asset category (schema configuration).
   */
  async linkCategoryAttribute(dto: LinkCategoryAttributeDto) {
    const organizationId = requireCurrentTenantId();

    // 1. Verify category exists in tenant
    const category = await tenantPrisma.assetCategory.findFirst({
      where: { id: dto.assetCategoryId },
    });
    if (!category) {
      throw new ForeignKeyViolationError(
        'assetCategoryId',
        dto.assetCategoryId,
        `AssetCategory '${dto.assetCategoryId}' not found in active organization.`
      );
    }

    // 2. Verify attribute definition exists in tenant
    const definition = await tenantPrisma.attributeDefinition.findFirst({
      where: { id: dto.attributeDefinitionId },
    });
    if (!definition) {
      throw new ForeignKeyViolationError(
        'attributeDefinitionId',
        dto.attributeDefinitionId,
        `AttributeDefinition '${dto.attributeDefinitionId}' not found in active organization.`
      );
    }

    const linked = await tenantPrisma.categoryAttribute.upsert({
      where: {
        organizationId_assetCategoryId_attributeDefinitionId: {
          organizationId,
          assetCategoryId: dto.assetCategoryId,
          attributeDefinitionId: dto.attributeDefinitionId,
        },
      },
      create: {
        organizationId,
        assetCategoryId: dto.assetCategoryId,
        attributeDefinitionId: dto.attributeDefinitionId,
        isRequired: dto.isRequired || false,
        displayOrder: dto.displayOrder || 0,
        defaultValue: dto.defaultValue || null,
        validationRules: dto.validationRules || {},
      },
      update: {
        isRequired: dto.isRequired !== undefined ? dto.isRequired : false,
        displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : 0,
        defaultValue: dto.defaultValue !== undefined ? dto.defaultValue : null,
        validationRules: dto.validationRules !== undefined ? dto.validationRules : {},
      },
      include: {
        attributeDefinition: true,
      },
    });

    return linked;
  }

  /**
   * Lists all attributes configured for a specific equipment category.
   */
  async listCategoryAttributes(assetCategoryId: string) {
    return tenantPrisma.categoryAttribute.findMany({
      where: { assetCategoryId },
      include: {
        attributeDefinition: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Generates dynamic form schema and validation metadata for an equipment category.
   */
  async getCategoryFormSchema(assetCategoryId: string) {
    const category = await tenantPrisma.assetCategory.findFirst({
      where: { id: assetCategoryId },
      include: {
        categoryAttributes: {
          include: { attributeDefinition: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw {
        status: 404,
        code: 'CATEGORY_NOT_FOUND',
        message: `AssetCategory with ID '${assetCategoryId}' not found.`,
      };
    }

    const currentVersions = this.categoryVersionStore.get(assetCategoryId) || [];
    const activeVersion = currentVersions.length > 0 ? currentVersions[currentVersions.length - 1].version : 1;

    const fields = category.categoryAttributes.map((ca: any) => ({
      attributeDefinitionId: ca.attributeDefinitionId,
      code: ca.attributeDefinition.code,
      name: ca.attributeDefinition.name,
      dataType: ca.attributeDefinition.dataType,
      unitCode: ca.attributeDefinition.unitCode,
      isRequired: ca.isRequired,
      displayOrder: ca.displayOrder,
      defaultValue: ca.defaultValue,
      validationRules: ca.validationRules || {},
      options: ca.attributeDefinition.options || [],
      description: ca.attributeDefinition.description,
    }));

    return {
      categoryId: category.id,
      categoryCode: category.code,
      categoryName: category.name,
      version: activeVersion,
      fields,
    };
  }

  /**
   * Publishes an immutable versioned snapshot of the category's configuration.
   * Ensures future changes to attribute definitions do not silently corrupt historical data.
   */
  async publishCategoryConfigurationVersion(
    assetCategoryId: string,
    changeNotes?: string,
    publishedBy?: string
  ): Promise<CategoryVersionSnapshot> {
    const schema = await this.getCategoryFormSchema(assetCategoryId);
    const existingHistory = this.categoryVersionStore.get(assetCategoryId) || [];
    const newVersionNumber = existingHistory.length + 1;

    const snapshot: CategoryVersionSnapshot = {
      categoryId: schema.categoryId,
      categoryCode: schema.categoryCode,
      categoryName: schema.categoryName,
      version: newVersionNumber,
      publishedAt: new Date(),
      publishedBy,
      changeNotes: changeNotes || `Schema version ${newVersionNumber}`,
      attributes: schema.fields,
    };

    existingHistory.push(snapshot);
    this.categoryVersionStore.set(assetCategoryId, existingHistory);

    return snapshot;
  }

  /**
   * Retrieves the full version configuration history for an equipment category.
   */
  async getCategoryVersionHistory(assetCategoryId: string): Promise<CategoryVersionSnapshot[]> {
    const history = this.categoryVersionStore.get(assetCategoryId);
    if (!history || history.length === 0) {
      const initial = await this.publishCategoryConfigurationVersion(
        assetCategoryId,
        'Initial baseline schema configuration'
      );
      return [initial];
    }
    return history;
  }

  /**
   * Retrieves a specific historical version snapshot for an equipment category.
   */
  async getCategoryVersionSnapshot(
    assetCategoryId: string,
    versionNumber: number
  ): Promise<CategoryVersionSnapshot> {
    const history = await this.getCategoryVersionHistory(assetCategoryId);
    const found = history.find((h) => h.version === versionNumber);
    if (!found) {
      throw {
        status: 404,
        code: 'VERSION_NOT_FOUND',
        message: `Version ${versionNumber} not found for category '${assetCategoryId}'.`,
      };
    }
    return found;
  }

  /**
   * Sets dynamic attribute values for a specific Asset.
   * Validates mandatory category fields, data types, and min/max/pattern validation rules.
   */
  async setAssetAttributeValues(
    assetId: string,
    inputs: AssetAttributeValueInput[] | Record<string, unknown>,
    updatedByUserId?: string
  ) {
    const organizationId = requireCurrentTenantId();

    // 1. Verify target asset exists in active organization
    const asset = await tenantPrisma.asset.findFirst({
      where: { id: assetId },
      include: {
        assetCategory: {
          include: {
            categoryAttributes: {
              include: { attributeDefinition: true },
            },
          },
        },
      },
    });

    if (!asset) {
      throw {
        status: 404,
        code: 'ASSET_NOT_FOUND',
        message: `Asset with ID '${assetId}' not found in active organization.`,
      };
    }

    // 2. Normalize inputs to an array of AssetAttributeValueInput
    let items: AssetAttributeValueInput[] = [];
    if (Array.isArray(inputs)) {
      items = inputs;
    } else if (typeof inputs === 'object' && inputs !== null) {
      items = Object.entries(inputs).map(([key, value]) => ({
        code: key,
        value,
      }));
    }

    if (items.length === 0) {
      throw {
        status: 400,
        code: 'EMPTY_PAYLOAD',
        message: 'No attribute values provided in request payload.',
      };
    }

    // 3. Validate mandatory fields required by the equipment category
    const categoryRequired = asset.assetCategory.categoryAttributes.filter((ca: any) => ca.isRequired);
    if (categoryRequired.length > 0) {
      const submittedCodes = new Set(items.map((i) => i.code?.toLowerCase()));
      const submittedIds = new Set(items.map((i) => i.attributeDefinitionId));

      for (const req of categoryRequired) {
        const isProvided =
          submittedIds.has(req.attributeDefinitionId) ||
          submittedCodes.has(req.attributeDefinition.code.toLowerCase());

        if (!isProvided) {
          const alreadyExists = await tenantPrisma.assetAttributeValue.findFirst({
            where: { assetId, attributeDefinitionId: req.attributeDefinitionId },
          });
          if (!alreadyExists) {
            throw new RequiredAttributeMissingError(req.attributeDefinition.code);
          }
        }
      }
    }

    // 4. Process each attribute value: Validate type, rules, and map to typed column
    for (const item of items) {
      const identifier = item.attributeDefinitionId || item.code;
      if (!identifier) {
        throw {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Each attribute item must provide either an attributeDefinitionId or code.',
        };
      }

      // Fetch definition
      const def = await tenantPrisma.attributeDefinition.findFirst({
        where: {
          OR: [{ id: identifier }, { code: identifier.toLowerCase() }],
        },
      });

      if (!def) {
        throw new AttributeNotFoundError(identifier);
      }

      // Lookup category-level validation rules if linked
      const catAttr = asset.assetCategory.categoryAttributes.find(
        (ca: any) => ca.attributeDefinitionId === def.id || ca.attributeDefinition.code === def.code
      );
      const validationRules = catAttr?.validationRules || {};

      // Strict type and range validation
      const typedColumns = validateAndMapAttributeValue(
        {
          ...def,
          validationRules: (validationRules as unknown) as AttributeValidationRules,
        },
        item.value
      );

      // Persist / Upsert into asset_attribute_values
      await tenantPrisma.assetAttributeValue.upsert({
        where: {
          organizationId_assetId_attributeDefinitionId: {
            organizationId,
            assetId,
            attributeDefinitionId: def.id,
          },
        },
        create: {
          organizationId,
          assetId,
          attributeDefinitionId: def.id,
          valueText: typedColumns.valueText,
          valueNumber: typedColumns.valueNumber,
          valueBoolean: typedColumns.valueBoolean,
          valueDate: typedColumns.valueDate,
          valueDatetime: typedColumns.valueDatetime,
          valueJson: typedColumns.valueJson,
          updatedBy: updatedByUserId || null,
        },
        update: {
          valueText: typedColumns.valueText,
          valueNumber: typedColumns.valueNumber,
          valueBoolean: typedColumns.valueBoolean,
          valueDate: typedColumns.valueDate,
          valueDatetime: typedColumns.valueDatetime,
          valueJson: typedColumns.valueJson,
          updatedBy: updatedByUserId || null,
          updatedAt: new Date(),
        },
      });
    }

    // Return the updated attributes for this asset
    return this.getAssetAttributeValues(assetId);
  }

  /**
   * Retrieves all populated dynamic attributes for an asset,
   * resolving the single populated typed column into a clean `value` field.
   */
  async getAssetAttributeValues(assetId: string) {
    const asset = await tenantPrisma.asset.findFirst({
      where: { id: assetId },
      select: { id: true, assetCode: true, name: true, assetCategoryId: true },
    });

    if (!asset) {
      throw {
        status: 404,
        code: 'ASSET_NOT_FOUND',
        message: `Asset with ID '${assetId}' not found in active organization.`,
      };
    }

    const records = await tenantPrisma.assetAttributeValue.findMany({
      where: { assetId },
      include: {
        attributeDefinition: true,
      },
      orderBy: { attributeDefinition: { code: 'asc' } },
    });

    const formatted = records.map((r) => {
      let resolvedValue: any = null;
      if (r.valueText !== null) resolvedValue = r.valueText;
      else if (r.valueNumber !== null) resolvedValue = Number(r.valueNumber);
      else if (r.valueBoolean !== null) resolvedValue = r.valueBoolean;
      else if (r.valueDate !== null) resolvedValue = r.valueDate.toISOString().split('T')[0];
      else if (r.valueDatetime !== null) resolvedValue = r.valueDatetime.toISOString();
      else if (r.valueJson !== null) resolvedValue = r.valueJson;

      return {
        id: r.id,
        attributeDefinitionId: r.attributeDefinitionId,
        code: r.attributeDefinition.code,
        name: r.attributeDefinition.name,
        dataType: r.attributeDefinition.dataType,
        unitCode: r.attributeDefinition.unitCode,
        value: resolvedValue,
        updatedAt: r.updatedAt,
      };
    });

    return {
      assetId: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      attributes: formatted,
    };
  }

  /**
   * Resets internal version store (used in testing).
   */
  resetVersionStore(): void {
    this.categoryVersionStore.clear();
  }
}

export const attributesService = new AttributesService();
