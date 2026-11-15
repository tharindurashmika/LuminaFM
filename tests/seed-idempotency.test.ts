import { describe, it, expect } from 'vitest';
import { seedLuminaFmDatabase } from '../prisma/seed';
import { evaluateAnpDecisionModel } from '../src/modules/decision-support/anp.engine';

/**
 * Builds an in-memory stateful Prisma mock to verify that running
 * `seedLuminaFmDatabase(mockPrisma)` multiple times is 100% idempotent
 * (zero duplicate records created on subsequent executions).
 */
function createInMemorySeedPrismaMock() {
  let idCounter = 1;
  const nextUuid = () =>
    `00000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`;

  const store: Record<string, any[]> = {
    organizations: [],
    permissions: [],
    roles: [],
    rolePermissions: [],
    users: [],
    organizationMemberships: [],
    membershipRoles: [],
    sites: [],
    locationTypes: [],
    locations: [],
    systemCategories: [],
    systemTypes: [],
    systems: [],
    assetCategories: [],
    brands: [],
    assetModels: [],
    assets: [],
    attributeDefinitions: [],
    categoryAttributes: [],
    assetAttributeValues: [],
    unitsOfMeasurement: [],
    meterDefinitions: [],
    assetMeters: [],
    checklistTemplates: [],
    checklistItems: [],
    maintenanceTypes: [],
    maintenanceTaskTemplates: [],
    maintenancePlans: [],
    maintenancePlanTasks: [],
    assetMaintenancePlans: [],
    decisionModels: [],
    decisionCriteria: [],
    decisionAlternatives: [],
  };

  function makeUpsert(
    collection: any[],
    matchFn: (item: any, where: any) => boolean,
    withId = true
  ) {
    return async ({ where, update, create }: any) => {
      const existing = collection.find((item) => matchFn(item, where));
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const record = {
        ...(withId ? { id: nextUuid() } : {}),
        ...create,
      };
      collection.push(record);
      return record;
    };
  }

  const mockPrisma: any = {
    store,
    organization: {
      upsert: makeUpsert(
        store.organizations,
        (item, where) => item.code === where.code
      ),
    },
    permission: {
      upsert: makeUpsert(
        store.permissions,
        (item, where) => item.permissionKey === where.permissionKey
      ),
    },
    role: {
      upsert: makeUpsert(
        store.roles,
        (item, where) =>
          item.organizationId === where.organizationId_name.organizationId &&
          item.name === where.organizationId_name.name
      ),
    },
    rolePermission: {
      upsert: makeUpsert(
        store.rolePermissions,
        (item, where) =>
          item.organizationId ===
            where.organizationId_roleId_permissionId.organizationId &&
          item.roleId === where.organizationId_roleId_permissionId.roleId &&
          item.permissionId ===
            where.organizationId_roleId_permissionId.permissionId,
        false
      ),
    },
    user: {
      upsert: makeUpsert(
        store.users,
        (item, where) => item.email === where.email
      ),
    },
    organizationMembership: {
      upsert: makeUpsert(
        store.organizationMemberships,
        (item, where) =>
          item.organizationId === where.organizationId_userId.organizationId &&
          item.userId === where.organizationId_userId.userId
      ),
    },
    membershipRole: {
      upsert: makeUpsert(
        store.membershipRoles,
        (item, where) =>
          item.organizationId ===
            where.organizationId_membershipId_roleId.organizationId &&
          item.membershipId ===
            where.organizationId_membershipId_roleId.membershipId &&
          item.roleId === where.organizationId_membershipId_roleId.roleId,
        false
      ),
    },
    site: {
      upsert: makeUpsert(
        store.sites,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    locationType: {
      upsert: makeUpsert(
        store.locationTypes,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    location: {
      upsert: makeUpsert(
        store.locations,
        (item, where) =>
          item.organizationId ===
            where.organizationId_siteId_code.organizationId &&
          item.siteId === where.organizationId_siteId_code.siteId &&
          item.code === where.organizationId_siteId_code.code
      ),
    },
    systemCategory: {
      upsert: makeUpsert(
        store.systemCategories,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    systemType: {
      upsert: makeUpsert(
        store.systemTypes,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    system: {
      upsert: makeUpsert(
        store.systems,
        (item, where) =>
          item.organizationId ===
            where.organizationId_siteId_code.organizationId &&
          item.siteId === where.organizationId_siteId_code.siteId &&
          item.code === where.organizationId_siteId_code.code
      ),
    },
    assetCategory: {
      upsert: makeUpsert(
        store.assetCategories,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    brand: {
      upsert: makeUpsert(
        store.brands,
        (item, where) =>
          item.organizationId === where.organizationId_name.organizationId &&
          item.name === where.organizationId_name.name
      ),
    },
    assetModel: {
      upsert: makeUpsert(
        store.assetModels,
        (item, where) =>
          item.organizationId ===
            where.organizationId_brandId_modelNumber.organizationId &&
          item.brandId === where.organizationId_brandId_modelNumber.brandId &&
          item.modelNumber ===
            where.organizationId_brandId_modelNumber.modelNumber
      ),
    },
    asset: {
      upsert: makeUpsert(
        store.assets,
        (item, where) =>
          item.organizationId ===
            where.organizationId_assetCode.organizationId &&
          item.assetCode === where.organizationId_assetCode.assetCode
      ),
    },
    attributeDefinition: {
      upsert: makeUpsert(
        store.attributeDefinitions,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    categoryAttribute: {
      upsert: makeUpsert(
        store.categoryAttributes,
        (item, where) =>
          item.organizationId ===
            where.organizationId_assetCategoryId_attributeDefinitionId
              .organizationId &&
          item.assetCategoryId ===
            where.organizationId_assetCategoryId_attributeDefinitionId
              .assetCategoryId &&
          item.attributeDefinitionId ===
            where.organizationId_assetCategoryId_attributeDefinitionId
              .attributeDefinitionId,
        false
      ),
    },
    assetAttributeValue: {
      upsert: makeUpsert(
        store.assetAttributeValues,
        (item, where) =>
          item.organizationId ===
            where.organizationId_assetId_attributeDefinitionId.organizationId &&
          item.assetId ===
            where.organizationId_assetId_attributeDefinitionId.assetId &&
          item.attributeDefinitionId ===
            where.organizationId_assetId_attributeDefinitionId
              .attributeDefinitionId
      ),
    },
    unitOfMeasurement: {
      upsert: makeUpsert(
        store.unitsOfMeasurement,
        (item, where) =>
          item.organizationId ===
            where.organizationId_unitCode.organizationId &&
          item.unitCode === where.organizationId_unitCode.unitCode
      ),
    },
    meterDefinition: {
      upsert: makeUpsert(
        store.meterDefinitions,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    assetMeter: {
      findFirst: async ({ where }: any) =>
        store.assetMeters.find(
          (item) =>
            item.organizationId === where.organizationId &&
            item.assetId === where.assetId &&
            item.meterDefinitionId === where.meterDefinitionId
        ) || null,
      create: async ({ data }: any) => {
        const rec = { id: nextUuid(), ...data };
        store.assetMeters.push(rec);
        return rec;
      },
    },
    checklistTemplate: {
      upsert: makeUpsert(
        store.checklistTemplates,
        (item, where) =>
          item.organizationId ===
            where.organizationId_code_version.organizationId &&
          item.code === where.organizationId_code_version.code &&
          item.version === where.organizationId_code_version.version
      ),
    },
    checklistItem: {
      findFirst: async ({ where }: any) =>
        store.checklistItems.find(
          (item) =>
            item.organizationId === where.organizationId &&
            item.checklistTemplateId === where.checklistTemplateId &&
            item.itemCode === where.itemCode
        ) || null,
      update: async ({ where, data }: any) => {
        const existing = store.checklistItems.find((i) => i.id === where.id);
        Object.assign(existing, data);
        return existing;
      },
      create: async ({ data }: any) => {
        const rec = { id: nextUuid(), ...data };
        store.checklistItems.push(rec);
        return rec;
      },
    },
    maintenanceType: {
      upsert: makeUpsert(
        store.maintenanceTypes,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    maintenanceTaskTemplate: {
      upsert: makeUpsert(
        store.maintenanceTaskTemplates,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    maintenancePlan: {
      upsert: makeUpsert(
        store.maintenancePlans,
        (item, where) =>
          item.organizationId === where.organizationId_code.organizationId &&
          item.code === where.organizationId_code.code
      ),
    },
    maintenancePlanTask: {
      upsert: makeUpsert(
        store.maintenancePlanTasks,
        (item, where) =>
          item.organizationId ===
            where.organizationId_maintenancePlanId_taskTemplateId
              .organizationId &&
          item.maintenancePlanId ===
            where.organizationId_maintenancePlanId_taskTemplateId
              .maintenancePlanId &&
          item.taskTemplateId ===
            where.organizationId_maintenancePlanId_taskTemplateId
              .taskTemplateId,
        false
      ),
    },
    assetMaintenancePlan: {
      findFirst: async ({ where }: any) =>
        store.assetMaintenancePlans.find(
          (item) =>
            item.organizationId === where.organizationId &&
            item.assetId === where.assetId &&
            item.maintenancePlanId === where.maintenancePlanId
        ) || null,
      create: async ({ data }: any) => {
        const rec = { id: nextUuid(), ...data };
        store.assetMaintenancePlans.push(rec);
        return rec;
      },
    },
    decisionModel: {
      upsert: makeUpsert(
        store.decisionModels,
        (item, where) =>
          item.organizationId ===
            where.organizationId_code_version.organizationId &&
          item.code === where.organizationId_code_version.code &&
          item.version === where.organizationId_code_version.version
      ),
    },
    decisionCriterion: {
      findFirst: async ({ where }: any) =>
        store.decisionCriteria.find(
          (item) =>
            item.organizationId === where.organizationId &&
            item.decisionModelId === where.decisionModelId &&
            item.code === where.code
        ) || null,
      update: async ({ where, data }: any) => {
        const existing = store.decisionCriteria.find((c) => c.id === where.id);
        Object.assign(existing, data);
        return existing;
      },
      create: async ({ data }: any) => {
        const rec = { id: nextUuid(), ...data };
        store.decisionCriteria.push(rec);
        return rec;
      },
    },
    decisionAlternative: {
      upsert: makeUpsert(
        store.decisionAlternatives,
        (item, where) =>
          item.organizationId ===
            where.organizationId_decisionModelId_code.organizationId &&
          item.decisionModelId ===
            where.organizationId_decisionModelId_code.decisionModelId &&
          item.code === where.organizationId_decisionModelId_code.code
      ),
    },
  };

  return mockPrisma;
}

describe('LuminaFM Comprehensive Database Seed (' + 'Kingsbury Hotel' + ')', () => {
  it('should seed Kingsbury Hotel, Admin User, Roles, Boiler Category, Dynamic Attributes, Boiler Asset, Maintenance Plans, and ANP Criteria idempotently', async () => {
    const mockPrisma = createInMemorySeedPrismaMock();

    // First run
    const firstRun = await seedLuminaFmDatabase(mockPrisma);

    expect(firstRun.organization.name).toBe('Kingsbury Hotel');
    expect(firstRun.organization.code).toBe('KINGSBURY_CMB');
    expect(firstRun.adminUser.email).toBe('admin@kingsburyhotel.com');
    expect(firstRun.roles).toEqual([
      'Organization Admin',
      'Chief Reliability Engineer',
      'Boiler Plant Operator',
      'Maintenance Technician',
    ]);
    expect(firstRun.boilerCategory.name).toBe('Boiler');
    expect(firstRun.attributeDefinitionsCount).toBe(7);
    expect(firstRun.boilerAsset.assetCode).toBe('KHB-BLR-001');
    expect(firstRun.maintenancePlansCount).toBe(3);
    expect(firstRun.decisionModel.criteriaCount).toBe(5);
    expect(firstRun.decisionModel.alternativesCount).toBe(3);

    // Snapshot collection lengths after run #1
    const countsAfterFirstRun = Object.fromEntries(
      Object.entries(mockPrisma.store).map(([k, arr]) => [k, arr.length])
    );

    // Second run (Idempotency verification)
    const secondRun = await seedLuminaFmDatabase(mockPrisma);

    const countsAfterSecondRun = Object.fromEntries(
      Object.entries(mockPrisma.store).map(([k, arr]) => [k, arr.length])
    );

    expect(secondRun).toEqual(firstRun);
    expect(countsAfterSecondRun).toEqual(countsAfterFirstRun);
  });

  it('should seamlessly evaluate the seeded Kingsbury Hotel ANP decision_criteria when Flue Gas Temp > 190°C', async () => {
    const mockPrisma = createInMemorySeedPrismaMock();
    await seedLuminaFmDatabase(mockPrisma);

    const seededModel = mockPrisma.store.decisionModels[0];
    const seededCriteria = mockPrisma.store.decisionCriteria.map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      criterionType: c.criterionType,
      weight: Number(c.weight),
      sequenceNo: c.sequenceNo,
    }));
    const seededAlternatives = mockPrisma.store.decisionAlternatives;

    const anpResult = evaluateAnpDecisionModel({
      criteria: seededCriteria,
      alternatives: seededAlternatives,
      signals: [
        { key: 'OPERATING_TEMP', value: 180, unit: '°C' },
        { key: 'FLUE_GAS_TEMP', value: 196.5, unit: '°C' }, // Breaches > 190°C
        { key: 'STEAM_PRESSURE', value: 10.6, unit: 'bar' },
      ],
      modelConfiguration: seededModel.configuration,
    });

    expect(anpResult.isBreached).toBe(true);
    expect(anpResult.breachedCriteria).toHaveLength(1);
    expect(anpResult.breachedCriteria[0].criterionCode).toBe('FLUE_GAS_TEMP');
    expect(anpResult.breachedCriteria[0].observedValue).toBe(196.5);
    expect(anpResult.recommendedAction).toContain('sootblowing');
  });
});

