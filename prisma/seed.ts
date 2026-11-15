import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const defaultPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

export interface SeedExecutionSummary {
  organization: { id: string; code: string; name: string };
  adminUser: { id: string; email: string; fullName: string };
  operatorUser: { id: string; email: string; fullName: string };
  roles: string[];
  site: { id: string; code: string; name: string };
  boilerCategory: { id: string; code: string; name: string };
  attributeDefinitionsCount: number;
  boilerAsset: { id: string; assetCode: string; name: string };
  maintenancePlansCount: number;
  decisionModel: { id: string; code: string; criteriaCount: number; alternativesCount: number };
}

/**
 * Comprehensive, 100% Idempotent Database Seed for LuminaFM CMMS.
 *
 * Seeds:
 * 1. Default Organization: 'Kingsbury Hotel' (`KINGSBURY_CMB`)
 * 2. Admin & Operator Users, Permission Catalog, Roles, and Memberships
 * 3. Site, Hierarchical Locations, System Taxonomy, Brand & Asset Model
 * 4. 'Boiler' Asset Category, Dynamic `attribute_definitions`, `category_attributes`,
 *    and test Boiler Asset (`KHB-BLR-001`) with typed `asset_attribute_values`
 * 5. Engineering Units, Meter Definitions, Asset Meters, and Shift Checklist Template
 * 6. Preventive, Meter-Based & Condition-Based `maintenance_plans` + `asset_maintenance_plans`
 * 7. ANP `decision_models`, `decision_criteria` benchmarks (Flue Gas Temp > 190°C,
 *    Pump Operating Hours >= 12000 hrs, Steam Pressure > 12 bar, Operating Temp > 185°C,
 *    Water Level Low), and `decision_alternatives`
 */
export async function seedLuminaFmDatabase(
  prisma: PrismaClient = defaultPrisma
): Promise<SeedExecutionSummary> {
  // ===========================================================================
  // 1. DEFAULT ORGANIZATION ('Kingsbury Hotel')
  // ===========================================================================
  const organization = await prisma.organization.upsert({
    where: { code: 'KINGSBURY_CMB' },
    update: {
      name: 'Kingsbury Hotel',
      legalName: 'The Kingsbury PLC - Colombo Luxury Hospitality',
      logoUri: '/uploads/logos/kingsbury-hotel-gold-crest.svg',
      timezone: 'Asia/Colombo',
      baseCurrency: 'LKR',
      isActive: true,
    },
    create: {
      code: 'KINGSBURY_CMB',
      name: 'Kingsbury Hotel',
      legalName: 'The Kingsbury PLC - Colombo Luxury Hospitality',
      logoUri: '/uploads/logos/kingsbury-hotel-gold-crest.svg',
      timezone: 'Asia/Colombo',
      baseCurrency: 'LKR',
      isActive: true,
    },
  });

  const orgId = organization.id;

  // ===========================================================================
  // 2. PERMISSIONS, ROLES, ADMIN USER & ORGANIZATION MEMBERSHIPS
  // ===========================================================================
  const permissionCatalog = [
    {
      permissionKey: 'organization:manage',
      description: 'Configure organization settings, white-label branding, and sites',
    },
    {
      permissionKey: 'users:manage',
      description: 'Invite users, manage roles, and assign permissions',
    },
    {
      permissionKey: 'assets:manage',
      description: 'Create, update, and decommission assets, categories, and dynamic attributes',
    },
    {
      permissionKey: 'work_orders:manage',
      description: 'Create, transition, assign, and close maintenance work orders',
    },
    {
      permissionKey: 'operations:daily_log',
      description: 'Submit daily boiler monitoring checklists and meter readings',
    },
    {
      permissionKey: 'decision_support:manage',
      description: 'Configure ANP decision models, criteria weights, and execute evaluations',
    },
    {
      permissionKey: 'audit:view',
      description: 'Inspect enterprise audit logs and evidence attachments',
    },
  ];

  const permissionsByKey: Record<string, { id: string; permissionKey: string }> = {};
  for (const perm of permissionCatalog) {
    const record = await prisma.permission.upsert({
      where: { permissionKey: perm.permissionKey },
      update: { description: perm.description },
      create: perm,
    });
    permissionsByKey[perm.permissionKey] = record;
  }

  const roleDefinitions = [
    {
      name: 'Organization Admin',
      description: 'Full administrative control over Kingsbury Hotel CMMS operations and ANP configuration',
      isSystemRole: true,
      permissionKeys: permissionCatalog.map((p) => p.permissionKey),
    },
    {
      name: 'Chief Reliability Engineer',
      description: 'Oversees asset hierarchies, ANP decision models, and preventive maintenance plans',
      isSystemRole: true,
      permissionKeys: [
        'assets:manage',
        'work_orders:manage',
        'operations:daily_log',
        'decision_support:manage',
        'audit:view',
      ],
    },
    {
      name: 'Boiler Plant Operator',
      description: 'Executes shift boiler inspections, records manual readings, and reports faults',
      isSystemRole: false,
      permissionKeys: ['operations:daily_log', 'work_orders:manage'],
    },
    {
      name: 'Maintenance Technician',
      description: 'Executes assigned work orders, logs labor/parts, and uploads repair evidence',
      isSystemRole: false,
      permissionKeys: ['work_orders:manage', 'operations:daily_log'],
    },
  ];

  const rolesByName: Record<string, { id: string; name: string }> = {};
  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: roleDef.name,
        },
      },
      update: {
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
      },
      create: {
        organizationId: orgId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
      },
    });
    rolesByName[roleDef.name] = role;

    for (const permKey of roleDef.permissionKeys) {
      const perm = permissionsByKey[permKey];
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            organizationId_roleId_permissionId: {
              organizationId: orgId,
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            organizationId: orgId,
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  const passwordHash = await bcrypt.hash('Kingsbury@2026!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kingsburyhotel.com' },
    update: {
      fullName: 'Rohan Wijesinghe (Chief Engineer)',
      passwordHash,
      phone: '+94-11-2421221',
      isPlatformAdmin: true,
      isActive: true,
    },
    create: {
      email: 'admin@kingsburyhotel.com',
      fullName: 'Rohan Wijesinghe (Chief Engineer)',
      passwordHash,
      phone: '+94-11-2421221',
      isPlatformAdmin: true,
      isActive: true,
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@kingsburyhotel.com' },
    update: {
      fullName: 'Kasun Perera (Senior Boiler Operator)',
      passwordHash,
      phone: '+94-11-2421229',
      isPlatformAdmin: false,
      isActive: true,
    },
    create: {
      email: 'operator@kingsburyhotel.com',
      fullName: 'Kasun Perera (Senior Boiler Operator)',
      passwordHash,
      phone: '+94-11-2421229',
      isPlatformAdmin: false,
      isActive: true,
    },
  });

  const adminMembership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: adminUser.id,
      },
    },
    update: {
      employeeCode: 'KHB-ENG-001',
      jobTitle: 'Director of Engineering & Chief Reliability Officer',
      status: 'active',
    },
    create: {
      organizationId: orgId,
      userId: adminUser.id,
      employeeCode: 'KHB-ENG-001',
      jobTitle: 'Director of Engineering & Chief Reliability Officer',
      status: 'active',
      joinedAt: new Date('2025-01-01T00:00:00.000Z'),
    },
  });

  const operatorMembership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: operatorUser.id,
      },
    },
    update: {
      employeeCode: 'KHB-BLR-014',
      jobTitle: 'Lead Steam Plant Operator',
      status: 'active',
    },
    create: {
      organizationId: orgId,
      userId: operatorUser.id,
      employeeCode: 'KHB-BLR-014',
      jobTitle: 'Lead Steam Plant Operator',
      status: 'active',
      joinedAt: new Date('2025-02-15T00:00:00.000Z'),
    },
  });

  // Assign 'Organization Admin' & 'Chief Reliability Engineer' to Admin User
  for (const rName of ['Organization Admin', 'Chief Reliability Engineer']) {
    const role = rolesByName[rName];
    await prisma.membershipRole.upsert({
      where: {
        organizationId_membershipId_roleId: {
          organizationId: orgId,
          membershipId: adminMembership.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        organizationId: orgId,
        membershipId: adminMembership.id,
        roleId: role.id,
      },
    });
  }

  // Assign 'Boiler Plant Operator' to Operator User
  await prisma.membershipRole.upsert({
    where: {
      organizationId_membershipId_roleId: {
        organizationId: orgId,
        membershipId: operatorMembership.id,
        roleId: rolesByName['Boiler Plant Operator'].id,
      },
    },
    update: {},
    create: {
      organizationId: orgId,
      membershipId: operatorMembership.id,
      roleId: rolesByName['Boiler Plant Operator'].id,
    },
  });

  // ===========================================================================
  // 3. SITE, LOCATION HIERARCHY & TECHNICAL SYSTEM TREE
  // ===========================================================================
  const site = await prisma.site.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: 'KINGSBURY-COLOMBO-01',
      },
    },
    update: {
      name: 'The Kingsbury Flagship Hotel - Colombo Fort',
      siteType: 'Luxury 5-Star Hospitality Complex',
      addressLine1: '48 Janadhipathi Mawatha',
      city: 'Colombo 01',
      region: 'Western Province',
      country: 'Sri Lanka',
      timezone: 'Asia/Colombo',
      isActive: true,
    },
    create: {
      organizationId: orgId,
      code: 'KINGSBURY-COLOMBO-01',
      name: 'The Kingsbury Flagship Hotel - Colombo Fort',
      siteType: 'Luxury 5-Star Hospitality Complex',
      addressLine1: '48 Janadhipathi Mawatha',
      city: 'Colombo 01',
      region: 'Western Province',
      country: 'Sri Lanka',
      timezone: 'Asia/Colombo',
      isActive: true,
    },
  });

  const locTypeBuilding = await prisma.locationType.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: 'BUILDING',
      },
    },
    update: { name: 'Building / Wing' },
    create: {
      organizationId: orgId,
      code: 'BUILDING',
      name: 'Building / Wing',
      description: 'Primary structural wing or tower',
    },
  });

  const locTypePlantRoom = await prisma.locationType.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: 'PLANT_ROOM',
      },
    },
    update: { name: 'Mechanical & Thermal Plant Room' },
    create: {
      organizationId: orgId,
      code: 'PLANT_ROOM',
      name: 'Mechanical & Thermal Plant Room',
      description: 'Dedicated heavy-engineering utility room',
    },
  });

  const mainTowerLocation = await prisma.location.upsert({
    where: {
      organizationId_siteId_code: {
        organizationId: orgId,
        siteId: site.id,
        code: 'LOC-MAIN-TOWER',
      },
    },
    update: {
      name: 'Main Hotel Tower & Podium',
      locationTypeId: locTypeBuilding.id,
    },
    create: {
      organizationId: orgId,
      siteId: site.id,
      locationTypeId: locTypeBuilding.id,
      code: 'LOC-MAIN-TOWER',
      name: 'Main Hotel Tower & Podium',
      floorLabel: 'B2-L12',
      areaSqm: new Prisma.Decimal(28500),
    },
  });

  const boilerHouseLocation = await prisma.location.upsert({
    where: {
      organizationId_siteId_code: {
        organizationId: orgId,
        siteId: site.id,
        code: 'LOC-B2-BOILER-HOUSE',
      },
    },
    update: {
      name: 'Basement Level 2 - Central Steam Boiler House',
      parentLocationId: mainTowerLocation.id,
      locationTypeId: locTypePlantRoom.id,
      floorLabel: 'B2',
    },
    create: {
      organizationId: orgId,
      siteId: site.id,
      parentLocationId: mainTowerLocation.id,
      locationTypeId: locTypePlantRoom.id,
      code: 'LOC-B2-BOILER-HOUSE',
      name: 'Basement Level 2 - Central Steam Boiler House',
      description: 'Houses dual fire-tube steam boilers, thermal deaerator, and feedwater pumps',
      floorLabel: 'B2',
      areaSqm: new Prisma.Decimal(420),
    },
  });

  const systemCategory = await prisma.systemCategory.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: 'THERMAL_STEAM',
      },
    },
    update: { name: 'Thermal & Steam Utility Systems' },
    create: {
      organizationId: orgId,
      code: 'THERMAL_STEAM',
      name: 'Thermal & Steam Utility Systems',
      description: 'Steam generation, condensate recovery, and hot water calorifiers',
    },
  });

  const systemType = await prisma.systemType.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: 'HP_STEAM_PLANT',
      },
    },
    update: {
      name: 'High-Pressure Fire-Tube Steam Generation System',
      systemCategoryId: systemCategory.id,
    },
    create: {
      organizationId: orgId,
      systemCategoryId: systemCategory.id,
      code: 'HP_STEAM_PLANT',
      name: 'High-Pressure Fire-Tube Steam Generation System',
      description: 'Process steam supply for commercial laundry, banquet kitchens, and domestic calorifiers',
    },
  });

  const steamSystem = await prisma.system.upsert({
    where: {
      organizationId_siteId_code: {
        organizationId: orgId,
        siteId: site.id,
        code: 'SYS-KHB-STEAM-01',
      },
    },
    update: {
      name: 'Kingsbury Central Steam & Condensate Plant #1',
      systemTypeId: systemType.id,
      criticality: 'critical',
      status: 'active',
    },
    create: {
      organizationId: orgId,
      siteId: site.id,
      systemTypeId: systemType.id,
      code: 'SYS-KHB-STEAM-01',
      name: 'Kingsbury Central Steam & Condensate Plant #1',
      description: 'Primary 10.5 bar saturated steam loop serving hotel laundry and culinary operations',
      criticality: 'critical',
      status: 'active',
    },
  });

  // ===========================================================================
  // 4. 'BOILER' ASSET CATEGORY, DYNAMIC ATTRIBUTES & TEST BOILER ASSET
  // ===========================================================================
  const boilerCategory = await prisma.assetCategory.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: 'BOILER',
      },
    },
    update: {
      name: 'Boiler',
      description: 'Industrial Fire-Tube and Water-Tube Steam Boilers',
      isActive: true,
    },
    create: {
      organizationId: orgId,
      code: 'BOILER',
      name: 'Boiler',
      description: 'Industrial Fire-Tube and Water-Tube Steam Boilers',
      isActive: true,
    },
  });

  const dynamicAttributesSpec: Array<{
    code: string;
    name: string;
    dataType: 'number' | 'text' | 'boolean' | 'date' | 'select';
    unitCode: string | null;
    description: string;
    options?: string[];
    isRequired: boolean;
    displayOrder: number;
    defaultValue?: unknown;
    validationRules?: Record<string, unknown>;
    initialValue: {
      valueNumber?: Prisma.Decimal;
      valueText?: string;
      valueBoolean?: boolean;
      valueDate?: Date;
    };
  }> = [
    {
      code: 'OPERATING_TEMP',
      name: 'Operating Temp',
      dataType: 'number',
      unitCode: '°C',
      description: 'Normal saturated steam operating temperature at drum header',
      isRequired: true,
      displayOrder: 1,
      defaultValue: 178,
      validationRules: { min: 100, max: 220 },
      initialValue: { valueNumber: new Prisma.Decimal(178.5) },
    },
    {
      code: 'FLUE_GAS_TEMP',
      name: 'Flue Gas Temp',
      dataType: 'number',
      unitCode: '°C',
      description: 'Boiler stack exit flue gas temperature (ANP threshold > 190 °C indicates soot fouling)',
      isRequired: true,
      displayOrder: 2,
      defaultValue: 175,
      validationRules: { min: 80, max: 350, anpBenchmarkMax: 190 },
      initialValue: { valueNumber: new Prisma.Decimal(182.0) },
    },
    {
      code: 'STEAM_PRESSURE',
      name: 'Design Steam Pressure',
      dataType: 'number',
      unitCode: 'bar',
      description: 'Operating steam header gauge pressure',
      isRequired: true,
      displayOrder: 3,
      defaultValue: 10.5,
      validationRules: { min: 0, max: 16, anpBenchmarkMax: 12.0 },
      initialValue: { valueNumber: new Prisma.Decimal(10.5) },
    },
    {
      code: 'RATED_STEAM_CAPACITY',
      name: 'Rated Steam Capacity',
      dataType: 'number',
      unitCode: 'kg/h',
      description: 'Maximum continuous evaporation rating from and at 100 °C',
      isRequired: true,
      displayOrder: 4,
      defaultValue: 4500,
      validationRules: { min: 500, max: 25000 },
      initialValue: { valueNumber: new Prisma.Decimal(4500) },
    },
    {
      code: 'FUEL_TYPE',
      name: 'Primary Fuel Type',
      dataType: 'select',
      unitCode: null,
      description: 'Combustion burner fuel configuration',
      options: ['Low-Sulfur Auto Diesel', 'LP Gas', 'Dual-Fuel (Diesel / LPG)'],
      isRequired: true,
      displayOrder: 5,
      defaultValue: 'Low-Sulfur Auto Diesel',
      initialValue: { valueText: 'Low-Sulfur Auto Diesel' },
    },
    {
      code: 'ASME_RELIEF_CERTIFIED',
      name: 'ASME Safety Relief Valve Certified',
      dataType: 'boolean',
      unitCode: null,
      description: 'Indicates whether dual spring-loaded safety relief valves hold active certification',
      isRequired: true,
      displayOrder: 6,
      defaultValue: true,
      initialValue: { valueBoolean: true },
    },
    {
      code: 'LAST_HYDROSTATIC_TEST_DATE',
      name: 'Last Hydrostatic Test Date',
      dataType: 'date',
      unitCode: null,
      description: 'Date of most recent statutory pressure vessel hydrostatic inspection',
      isRequired: false,
      displayOrder: 7,
      initialValue: { valueDate: new Date('2026-01-15T00:00:00.000Z') },
    },
  ];

  const brand = await prisma.brand.upsert({
    where: {
      organizationId_name: {
        organizationId: orgId,
        name: 'Cleaver-Brooks',
      },
    },
    update: {
      website: 'https://cleaverbrooks.com',
      supportContact: 'support@cleaverbrooks.com',
    },
    create: {
      organizationId: orgId,
      name: 'Cleaver-Brooks',
      website: 'https://cleaverbrooks.com',
      supportContact: 'support@cleaverbrooks.com',
    },
  });

  const assetModel = await prisma.assetModel.upsert({
    where: {
      organizationId_brandId_modelNumber: {
        organizationId: orgId,
        brandId: brand.id,
        modelNumber: 'CBEX-ELITE-300BHP',
      },
    },
    update: {
      modelName: 'Cleaver-Brooks CBEX Elite 300 BHP 4-Pass Wetback Firetube Boiler',
      assetCategoryId: boilerCategory.id,
    },
    create: {
      organizationId: orgId,
      brandId: brand.id,
      assetCategoryId: boilerCategory.id,
      modelNumber: 'CBEX-ELITE-300BHP',
      modelName: 'Cleaver-Brooks CBEX Elite 300 BHP 4-Pass Wetback Firetube Boiler',
      specifications: {
        passes: 4,
        horsepower: 300,
        designPressureBar: 13.8,
        thermalEfficiencyPercent: 88.5,
      },
    },
  });

  const boilerAsset = await prisma.asset.upsert({
    where: {
      organizationId_assetCode: {
        organizationId: orgId,
        assetCode: 'KHB-BLR-001',
      },
    },
    update: {
      name: 'Primary Fire-Tube Steam Boiler #1 (Kingsbury Laundry & Culinary Plant)',
      siteId: site.id,
      locationId: boilerHouseLocation.id,
      systemId: steamSystem.id,
      assetCategoryId: boilerCategory.id,
      brandId: brand.id,
      modelId: assetModel.id,
      serialNumber: 'CB-LK-2024-90881',
      criticality: 'critical',
      status: 'in_service',
      expectedLifeYears: new Prisma.Decimal(25.0),
    },
    create: {
      organizationId: orgId,
      siteId: site.id,
      locationId: boilerHouseLocation.id,
      systemId: steamSystem.id,
      assetCategoryId: boilerCategory.id,
      brandId: brand.id,
      modelId: assetModel.id,
      assetCode: 'KHB-BLR-001',
      name: 'Primary Fire-Tube Steam Boiler #1 (Kingsbury Laundry & Culinary Plant)',
      serialNumber: 'CB-LK-2024-90881',
      description:
        'Main 300 BHP fire-tube package steam boiler supplying high-pressure steam to Kingsbury Hotel laundry presses, banquet kitchens, and domestic hot water calorifiers.',
      manufacturerDate: new Date('2023-08-10T00:00:00.000Z'),
      installationDate: new Date('2024-01-20T00:00:00.000Z'),
      commissioningDate: new Date('2024-02-01T00:00:00.000Z'),
      warrantyExpiryDate: new Date('2029-02-01T00:00:00.000Z'),
      expectedLifeYears: new Prisma.Decimal(25.0),
      criticality: 'critical',
      status: 'in_service',
      qrCodeValue: 'LUMINAFM://ASSET/KINGSBURY_CMB/KHB-BLR-001',
      notes: 'Monitored continuously by LuminaFM ANP Decision Support Engine.',
    },
  });

  for (const attr of dynamicAttributesSpec) {
    const attrDef = await prisma.attributeDefinition.upsert({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: attr.code,
        },
      },
      update: {
        name: attr.name,
        dataType: attr.dataType,
        unitCode: attr.unitCode,
        description: attr.description,
        options: (attr.options ?? []) as Prisma.InputJsonValue,
        isActive: true,
      },
      create: {
        organizationId: orgId,
        code: attr.code,
        name: attr.name,
        dataType: attr.dataType,
        unitCode: attr.unitCode,
        description: attr.description,
        options: (attr.options ?? []) as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    await prisma.categoryAttribute.upsert({
      where: {
        organizationId_assetCategoryId_attributeDefinitionId: {
          organizationId: orgId,
          assetCategoryId: boilerCategory.id,
          attributeDefinitionId: attrDef.id,
        },
      },
      update: {
        isRequired: attr.isRequired,
        displayOrder: attr.displayOrder,
        defaultValue:
          attr.defaultValue !== undefined
            ? (attr.defaultValue as Prisma.InputJsonValue)
            : Prisma.DbNull,
        validationRules: (attr.validationRules ?? {}) as Prisma.InputJsonValue,
      },
      create: {
        organizationId: orgId,
        assetCategoryId: boilerCategory.id,
        attributeDefinitionId: attrDef.id,
        isRequired: attr.isRequired,
        displayOrder: attr.displayOrder,
        defaultValue:
          attr.defaultValue !== undefined
            ? (attr.defaultValue as Prisma.InputJsonValue)
            : Prisma.DbNull,
        validationRules: (attr.validationRules ?? {}) as Prisma.InputJsonValue,
      },
    });

    await prisma.assetAttributeValue.upsert({
      where: {
        organizationId_assetId_attributeDefinitionId: {
          organizationId: orgId,
          assetId: boilerAsset.id,
          attributeDefinitionId: attrDef.id,
        },
      },
      update: {
        valueNumber: attr.initialValue.valueNumber ?? null,
        valueText: attr.initialValue.valueText ?? null,
        valueBoolean: attr.initialValue.valueBoolean ?? null,
        valueDate: attr.initialValue.valueDate ?? null,
        updatedBy: adminUser.id,
      },
      create: {
        organizationId: orgId,
        assetId: boilerAsset.id,
        attributeDefinitionId: attrDef.id,
        valueNumber: attr.initialValue.valueNumber ?? null,
        valueText: attr.initialValue.valueText ?? null,
        valueBoolean: attr.initialValue.valueBoolean ?? null,
        valueDate: attr.initialValue.valueDate ?? null,
        updatedBy: adminUser.id,
      },
    });
  }

  // ===========================================================================
  // 5. UNITS OF MEASUREMENT, METERS & DAILY BOILER CHECKLIST TEMPLATE
  // ===========================================================================
  const unitsSpec = [
    { unitCode: '°C', unitName: 'Degrees Celsius', dimension: 'Temperature' },
    { unitCode: 'bar', unitName: 'Bar (Gauge Pressure)', dimension: 'Pressure' },
    { unitCode: 'hrs', unitName: 'Operating Hours', dimension: 'Time' },
    { unitCode: 'ppb', unitName: 'Parts Per Billion', dimension: 'Concentration' },
  ];

  const unitsByCode: Record<string, { id: string; unitCode: string }> = {};
  for (const u of unitsSpec) {
    const unitRecord = await prisma.unitOfMeasurement.upsert({
      where: {
        organizationId_unitCode: {
          organizationId: orgId,
          unitCode: u.unitCode,
        },
      },
      update: { unitName: u.unitName, dimension: u.dimension },
      create: {
        organizationId: orgId,
        unitCode: u.unitCode,
        unitName: u.unitName,
        dimension: u.dimension,
      },
    });
    unitsByCode[u.unitCode] = unitRecord;
  }

  const meterDefsSpec: Array<{
    code: string;
    name: string;
    unitCode: string;
    readingType: 'instantaneous' | 'cumulative';
    description: string;
    meterCode: string;
  }> = [
    {
      code: 'FLUE_GAS_TEMP',
      name: 'Boiler Stack Flue Gas Temperature',
      unitCode: '°C',
      readingType: 'instantaneous',
      description: 'Continuous stack thermocouple sensor ahead of economizer damper',
      meterCode: 'MTR-KHB-BLR1-FLUE',
    },
    {
      code: 'PUMP_OPERATING_HOURS',
      name: 'Boiler Feedwater Pump Cumulative Run Hours',
      unitCode: 'hrs',
      readingType: 'cumulative',
      description: 'Non-resettable hour meter on multistage centrifugal feedwater pump',
      meterCode: 'MTR-KHB-BLR1-PUMP-HRS',
    },
    {
      code: 'STEAM_PRESSURE',
      name: 'Main Steam Drum Header Pressure',
      unitCode: 'bar',
      readingType: 'instantaneous',
      description: 'Primary steam header Bourdon pressure transmitter',
      meterCode: 'MTR-KHB-BLR1-PRESS',
    },
  ];

  const meterDefsByCode: Record<string, { id: string; code: string }> = {};
  for (const m of meterDefsSpec) {
    const meterDef = await prisma.meterDefinition.upsert({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: m.code,
        },
      },
      update: {
        name: m.name,
        unitId: unitsByCode[m.unitCode].id,
        readingType: m.readingType,
        description: m.description,
      },
      create: {
        organizationId: orgId,
        code: m.code,
        name: m.name,
        unitId: unitsByCode[m.unitCode].id,
        readingType: m.readingType,
        description: m.description,
      },
    });
    meterDefsByCode[m.code] = meterDef;

    // Idempotently ensure AssetMeter exists for KHB-BLR-001
    const existingAssetMeter = await prisma.assetMeter.findFirst({
      where: {
        organizationId: orgId,
        assetId: boilerAsset.id,
        meterDefinitionId: meterDef.id,
      },
    });

    if (!existingAssetMeter) {
      await prisma.assetMeter.create({
        data: {
          organizationId: orgId,
          assetId: boilerAsset.id,
          meterDefinitionId: meterDef.id,
          meterCode: m.meterCode,
          isActive: true,
          installedAt: new Date('2024-02-01T00:00:00.000Z'),
        },
      });
    }
  }

  // Seed Daily Boiler Shift Checklist Template & Items for Floor Operators
  const checklistTemplate = await prisma.checklistTemplate.upsert({
    where: {
      organizationId_code_version: {
        organizationId: orgId,
        code: 'CHK-KHB-BOILER-DAILY',
        version: 1,
      },
    },
    update: {
      name: 'Kingsbury Daily Boiler Shift Logbook',
      assetCategoryId: boilerCategory.id,
      isActive: true,
    },
    create: {
      organizationId: orgId,
      assetCategoryId: boilerCategory.id,
      code: 'CHK-KHB-BOILER-DAILY',
      name: 'Kingsbury Daily Boiler Shift Logbook',
      description:
        'Standardized 8-hour shift inspection and telemetry log for KHB-BLR-001 evaluated by the ANP Decision Engine',
      version: 1,
      isActive: true,
    },
  });

  const checklistItemsSpec: Array<{
    itemCode: string;
    question: string;
    responseType: 'number' | 'yes_no';
    unitCode: string | null;
    minValue?: number;
    maxValue?: number;
    sequenceNo: number;
  }> = [
    {
      itemCode: 'OPERATING_TEMP',
      question: 'Boiler Drum Operating Temperature (°C)',
      responseType: 'number',
      unitCode: '°C',
      minValue: 150,
      maxValue: 185,
      sequenceNo: 1,
    },
    {
      itemCode: 'FLUE_GAS_TEMP',
      question: 'Stack Exit Flue Gas Temperature (°C)',
      responseType: 'number',
      unitCode: '°C',
      minValue: 120,
      maxValue: 190,
      sequenceNo: 2,
    },
    {
      itemCode: 'STEAM_PRESSURE',
      question: 'Main Steam Header Pressure (bar)',
      responseType: 'number',
      unitCode: 'bar',
      minValue: 8.0,
      maxValue: 12.0,
      sequenceNo: 3,
    },
    {
      itemCode: 'PUMP_OPERATING_HOURS',
      question: 'Feedwater Pump Cumulative Operating Hours (hrs)',
      responseType: 'number',
      unitCode: 'hrs',
      minValue: 0,
      maxValue: 12000,
      sequenceNo: 4,
    },
    {
      itemCode: 'WATER_LEVEL_OK',
      question: 'Sight Glass Water Level Verified & LWCO Blowdown Normal?',
      responseType: 'yes_no',
      unitCode: null,
      sequenceNo: 5,
    },
  ];

  for (const item of checklistItemsSpec) {
    const existingItem = await prisma.checklistItem.findFirst({
      where: {
        organizationId: orgId,
        checklistTemplateId: checklistTemplate.id,
        itemCode: item.itemCode,
      },
    });

    if (existingItem) {
      await prisma.checklistItem.update({
        where: { id: existingItem.id },
        data: {
          question: item.question,
          responseType: item.responseType,
          unitCode: item.unitCode,
          minValue: item.minValue !== undefined ? new Prisma.Decimal(item.minValue) : null,
          maxValue: item.maxValue !== undefined ? new Prisma.Decimal(item.maxValue) : null,
          sequenceNo: item.sequenceNo,
        },
      });
    } else {
      await prisma.checklistItem.create({
        data: {
          organizationId: orgId,
          checklistTemplateId: checklistTemplate.id,
          itemCode: item.itemCode,
          question: item.question,
          responseType: item.responseType,
          isRequired: true,
          unitCode: item.unitCode,
          minValue: item.minValue !== undefined ? new Prisma.Decimal(item.minValue) : null,
          maxValue: item.maxValue !== undefined ? new Prisma.Decimal(item.maxValue) : null,
          sequenceNo: item.sequenceNo,
        },
      });
    }
  }

  // ===========================================================================
  // 6. DUMMY MAINTENANCE PLANS, TASK TEMPLATES & ASSET ASSIGNMENTS
  // ===========================================================================
  const maintTypesSpec = [
    {
      code: 'PM',
      name: 'Preventive Maintenance',
      description: 'Time-based or meter-based scheduled preventive servicing',
    },
    {
      code: 'CBM_ANP',
      name: 'Condition-Based ANP Maintenance',
      description: 'Predictive/condition-triggered maintenance generated by ANP Decision Support',
    },
    {
      code: 'CM',
      name: 'Emergency Corrective Maintenance',
      description: 'Unplanned breakdown or safety trip intervention',
    },
  ];

  const maintTypesByCode: Record<string, { id: string; code: string }> = {};
  for (const mt of maintTypesSpec) {
    const record = await prisma.maintenanceType.upsert({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: mt.code,
        },
      },
      update: { name: mt.name, description: mt.description },
      create: {
        organizationId: orgId,
        code: mt.code,
        name: mt.name,
        description: mt.description,
      },
    });
    maintTypesByCode[mt.code] = record;
  }

  const taskTemplatesSpec = [
    {
      code: 'TSK-BLR-SOOTBLOW',
      title: 'Fireside Tube Sootblowing, Economizer Fin Cleaning & Stack Damper Calibration',
      description:
        'Open front/rear doors, brush fire-tubes to remove soot accumulation, inspect refractory baffles, and calibrate air-to-fuel linkage using flue gas analyzer.',
      estimatedDurationMinutes: 240,
      safetyInstructions:
        'Apply LOTO to fuel oil supply valve and burner control panel. Allow boiler shell to cool below 50°C before opening fireside doors.',
      requiredSkills: ['Boiler Class-1 Technician', 'Combustion Analyzer Certification'],
    },
    {
      code: 'TSK-PUMP-12K-OVERHAUL',
      title: '12,000-Hour Multistage Boiler Feedwater Pump Mechanical Seal & Bearing Overhaul',
      description:
        'Isolate suction/discharge valves, replace cartridge mechanical seal, replace DE/NDE angular contact bearings, and verify laser shaft alignment.',
      estimatedDurationMinutes: 360,
      safetyInstructions:
        'Isolate hot feedwater headers (105°C), depressurize pump casing, and verify zero energy state.',
      requiredSkills: ['Senior Mechanical Millwright', 'Laser Alignment Specialist'],
    },
    {
      code: 'TSK-LWCO-SAFETY-TEST',
      title: 'ASME Safety Relief Valve Pop Test & Low-Water Fuel Cutoff (LWCO) Interlock Verification',
      description:
        'Conduct slow-drain evaporation test of primary and secondary LWCO float/probe chambers and verify safety relief valve lift pressure at 12.0 bar.',
      estimatedDurationMinutes: 120,
      safetyInstructions:
        'Wear hearing protection and high-temperature PPE during live steam safety valve lift test.',
      requiredSkills: ['Licensed Boiler Inspector', 'I&C Technician'],
    },
  ];

  const taskTemplatesByCode: Record<string, { id: string; code: string }> = {};
  for (const tt of taskTemplatesSpec) {
    const record = await prisma.maintenanceTaskTemplate.upsert({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: tt.code,
        },
      },
      update: {
        assetCategoryId: boilerCategory.id,
        title: tt.title,
        description: tt.description,
        estimatedDurationMinutes: tt.estimatedDurationMinutes,
        safetyInstructions: tt.safetyInstructions,
        requiredSkills: tt.requiredSkills,
        isActive: true,
      },
      create: {
        organizationId: orgId,
        assetCategoryId: boilerCategory.id,
        code: tt.code,
        title: tt.title,
        description: tt.description,
        estimatedDurationMinutes: tt.estimatedDurationMinutes,
        safetyInstructions: tt.safetyInstructions,
        requiredSkills: tt.requiredSkills,
        isActive: true,
      },
    });
    taskTemplatesByCode[tt.code] = record;
  }

  const maintenancePlansSpec: Array<{
    code: string;
    name: string;
    description: string;
    maintenanceTypeCode: string;
    recurrenceType: 'calendar' | 'meter' | 'condition';
    intervalValue: number | null;
    intervalUnit: string | null;
    meterDefCode?: string;
    leadTimeDays: number;
    priority: 'medium' | 'high' | 'urgent';
    taskCode: string;
  }> = [
    {
      code: 'MP-KHB-BLR-MONTHLY-PM',
      name: 'Monthly Boiler Fireside Soot Cleaning & Combustion Tuning Plan',
      description:
        'Scheduled 30-day preventive fireside inspection and burner combustion efficiency optimization for KHB-BLR-001.',
      maintenanceTypeCode: 'PM',
      recurrenceType: 'calendar',
      intervalValue: 30,
      intervalUnit: 'days',
      leadTimeDays: 5,
      priority: 'high',
      taskCode: 'TSK-BLR-SOOTBLOW',
    },
    {
      code: 'MP-KHB-PUMP-12000HR',
      name: '12,000-Hour Feedwater Pump Major Overhaul Plan',
      description:
        'Meter-triggered overhaul plan linked to cumulative feedwater pump operating hours (>= 12,000 hrs).',
      maintenanceTypeCode: 'PM',
      recurrenceType: 'meter',
      intervalValue: 12000,
      intervalUnit: 'hrs',
      meterDefCode: 'PUMP_OPERATING_HOURS',
      leadTimeDays: 14,
      priority: 'urgent',
      taskCode: 'TSK-PUMP-12K-OVERHAUL',
    },
    {
      code: 'MP-KHB-ANP-THERMAL-EXCURSION',
      name: 'ANP Condition-Based Thermal & Pressure Safety Intervention Plan',
      description:
        'Automatically triggered by the ANP Decision Support Engine when Flue Gas Temp > 190°C or Steam Pressure > 12.0 bar.',
      maintenanceTypeCode: 'CBM_ANP',
      recurrenceType: 'condition',
      intervalValue: null,
      intervalUnit: null,
      leadTimeDays: 0,
      priority: 'urgent',
      taskCode: 'TSK-LWCO-SAFETY-TEST',
    },
  ];

  for (const mp of maintenancePlansSpec) {
    const plan = await prisma.maintenancePlan.upsert({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: mp.code,
        },
      },
      update: {
        name: mp.name,
        description: mp.description,
        maintenanceTypeId: maintTypesByCode[mp.maintenanceTypeCode].id,
        recurrenceType: mp.recurrenceType,
        intervalValue:
          mp.intervalValue !== null ? new Prisma.Decimal(mp.intervalValue) : null,
        intervalUnit: mp.intervalUnit,
        meterDefinitionId: mp.meterDefCode
          ? meterDefsByCode[mp.meterDefCode].id
          : null,
        leadTimeDays: mp.leadTimeDays,
        priority: mp.priority,
        isActive: true,
      },
      create: {
        organizationId: orgId,
        code: mp.code,
        name: mp.name,
        description: mp.description,
        maintenanceTypeId: maintTypesByCode[mp.maintenanceTypeCode].id,
        recurrenceType: mp.recurrenceType,
        intervalValue:
          mp.intervalValue !== null ? new Prisma.Decimal(mp.intervalValue) : null,
        intervalUnit: mp.intervalUnit,
        meterDefinitionId: mp.meterDefCode
          ? meterDefsByCode[mp.meterDefCode].id
          : null,
        leadTimeDays: mp.leadTimeDays,
        priority: mp.priority,
        isActive: true,
      },
    });

    const taskTemplate = taskTemplatesByCode[mp.taskCode];
    await prisma.maintenancePlanTask.upsert({
      where: {
        organizationId_maintenancePlanId_taskTemplateId: {
          organizationId: orgId,
          maintenancePlanId: plan.id,
          taskTemplateId: taskTemplate.id,
        },
      },
      update: { sequenceNo: 1, isMandatory: true },
      create: {
        organizationId: orgId,
        maintenancePlanId: plan.id,
        taskTemplateId: taskTemplate.id,
        sequenceNo: 1,
        isMandatory: true,
      },
    });

    // Idempotently link MaintenancePlan to Boiler Asset `KHB-BLR-001`
    const existingAssetPlan = await prisma.assetMaintenancePlan.findFirst({
      where: {
        organizationId: orgId,
        assetId: boilerAsset.id,
        maintenancePlanId: plan.id,
      },
    });

    if (!existingAssetPlan) {
      await prisma.assetMaintenancePlan.create({
        data: {
          organizationId: orgId,
          assetId: boilerAsset.id,
          maintenancePlanId: plan.id,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          nextDueAt: new Date('2026-12-01T08:00:00.000Z'),
          isActive: true,
        },
      });
    }
  }

  // ===========================================================================
  // 7. ANP DECISION MODEL, BENCHMARK CRITERIA & ALTERNATIVES
  // ===========================================================================
  const anpModelConfig = {
    benchmarks: {
      FLUE_GAS_TEMP: {
        metricKey: 'FLUE_GAS_TEMP',
        operator: '>',
        threshold: 190,
        unit: '°C',
        recommendedActionTemplate:
          'Execute fireside boiler tube sootblowing, inspect economizer fin fouling, and recalibrate burner air-to-fuel damper linkage.',
      },
      PUMP_OPERATING_HOURS: {
        metricKey: 'PUMP_OPERATING_HOURS',
        operator: '>=',
        threshold: 12000,
        unit: 'hrs',
        recommendedActionTemplate:
          'Schedule major centrifugal pump overhaul: replace mechanical cartridge seal, DE/NDE bearings, and inspect impeller wear rings.',
      },
      STEAM_PRESSURE: {
        metricKey: 'STEAM_PRESSURE',
        operator: '>',
        threshold: 12.0,
        unit: 'bar',
        recommendedActionTemplate:
          'Verify high-pressure steam limit pressuretrol cutout and inspect ASME safety relief valve pop calibration.',
      },
      OPERATING_TEMP: {
        metricKey: 'OPERATING_TEMP',
        operator: '>',
        threshold: 185,
        unit: '°C',
        recommendedActionTemplate:
          'Inspect steam drum pressure-temperature saturation curve correlation and calibrate burner firing rate modulator.',
      },
      WATER_LEVEL_OK: {
        metricKey: 'WATER_LEVEL_OK',
        operator: '==',
        threshold: false,
        unit: null,
        recommendedActionTemplate:
          'Immediate boiler drum water level intervention: inspect feedwater pump discharge pressure, level probe electrodes, and LWCO interlock.',
      },
    },
    interdependenceMatrix: {
      FLUE_GAS_TEMP: { OPERATING_TEMP: 0.35, STEAM_PRESSURE: 0.2 },
      OPERATING_TEMP: { FLUE_GAS_TEMP: 0.3, STEAM_PRESSURE: 0.45 },
      STEAM_PRESSURE: { OPERATING_TEMP: 0.4, WATER_LEVEL_OK: 0.25 },
      PUMP_OPERATING_HOURS: { WATER_LEVEL_OK: 0.35 },
      WATER_LEVEL_OK: { PUMP_OPERATING_HOURS: 0.3, STEAM_PRESSURE: 0.25 },
    },
  };

  const decisionModel = await prisma.decisionModel.upsert({
    where: {
      organizationId_code_version: {
        organizationId: orgId,
        code: 'ANP-KHB-BOILER-CRITICALITY',
        version: 1,
      },
    },
    update: {
      name: 'Kingsbury Hotel Steam Boiler ANP Reliability & Benchmark Model',
      modelMethod: 'ANP',
      systemTypeId: systemType.id,
      assetCategoryId: boilerCategory.id,
      status: 'active',
      configuration: anpModelConfig as Prisma.InputJsonValue,
    },
    create: {
      organizationId: orgId,
      code: 'ANP-KHB-BOILER-CRITICALITY',
      name: 'Kingsbury Hotel Steam Boiler ANP Reliability & Benchmark Model',
      modelMethod: 'ANP',
      systemTypeId: systemType.id,
      assetCategoryId: boilerCategory.id,
      version: 1,
      status: 'active',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      configuration: anpModelConfig as Prisma.InputJsonValue,
    },
  });

  const decisionCriteriaSpec: Array<{
    code: string;
    name: string;
    description: string;
    criterionType: 'risk' | 'cost' | 'benefit';
    weight: number;
    sequenceNo: number;
  }> = [
    {
      code: 'FLUE_GAS_TEMP',
      name: 'Flue Gas Temp',
      description: 'Benchmark: > 190 °C indicates fireside soot fouling and thermal efficiency loss',
      criterionType: 'risk',
      weight: 0.28,
      sequenceNo: 1,
    },
    {
      code: 'PUMP_OPERATING_HOURS',
      name: 'Pump Operating Hours',
      description: 'Benchmark: >= 12000 hrs triggers feedwater pump mechanical seal & bearing overhaul',
      criterionType: 'cost',
      weight: 0.22,
      sequenceNo: 2,
    },
    {
      code: 'STEAM_PRESSURE',
      name: 'Steam Pressure',
      description: 'Benchmark: > 12.0 bar indicates high-pressure header excursion approaching safety valve pop limit',
      criterionType: 'risk',
      weight: 0.22,
      sequenceNo: 3,
    },
    {
      code: 'OPERATING_TEMP',
      name: 'Operating Temp',
      description: 'Benchmark: > 185 °C indicates superheat/over-firing condition in primary steam drum',
      criterionType: 'risk',
      weight: 0.14,
      sequenceNo: 4,
    },
    {
      code: 'WATER_LEVEL_OK',
      name: 'Water Level Interlock Status',
      description: 'Benchmark: == false triggers immediate Low-Water Fuel Cutoff (LWCO) safety intervention',
      criterionType: 'risk',
      weight: 0.14,
      sequenceNo: 5,
    },
  ];

  for (const crit of decisionCriteriaSpec) {
    const existingCriterion = await prisma.decisionCriterion.findFirst({
      where: {
        organizationId: orgId,
        decisionModelId: decisionModel.id,
        code: crit.code,
      },
    });

    if (existingCriterion) {
      await prisma.decisionCriterion.update({
        where: { id: existingCriterion.id },
        data: {
          name: crit.name,
          description: crit.description,
          criterionType: crit.criterionType,
          weight: new Prisma.Decimal(crit.weight),
          sequenceNo: crit.sequenceNo,
        },
      });
    } else {
      await prisma.decisionCriterion.create({
        data: {
          organizationId: orgId,
          decisionModelId: decisionModel.id,
          code: crit.code,
          name: crit.name,
          description: crit.description,
          criterionType: crit.criterionType,
          weight: new Prisma.Decimal(crit.weight),
          sequenceNo: crit.sequenceNo,
        },
      });
    }
  }

  const decisionAlternativesSpec = [
    {
      code: 'IMMEDIATE_CORRECTIVE_INTERVENTION',
      name: 'Immediate Corrective Maintenance & Safety Calibration',
      description:
        'Dispatch Kingsbury engineering crew immediately to remediate boiler parameter excursion and verify safety interlocks.',
    },
    {
      code: 'SCHEDULED_OVERHAUL_AND_CLEANING',
      name: 'Scheduled Preventive Overhaul & Fireside Tube Cleaning',
      description:
        'Generate planned overhaul work order for heat-transfer surface sootblowing, mechanical seal replacement, and burner tuning.',
    },
    {
      code: 'CONDITION_BASED_DIAGNOSTIC_INSPECTION',
      name: 'Condition-Based NDT & Combustion Flue Gas Analysis',
      description:
        'Perform ultrasonic tube thickness testing, combustion gas O2/CO analysis, and feedwater pump vibration diagnostics.',
    },
  ];

  for (const alt of decisionAlternativesSpec) {
    await prisma.decisionAlternative.upsert({
      where: {
        organizationId_decisionModelId_code: {
          organizationId: orgId,
          decisionModelId: decisionModel.id,
          code: alt.code,
        },
      },
      update: {
        name: alt.name,
        description: alt.description,
      },
      create: {
        organizationId: orgId,
        decisionModelId: decisionModel.id,
        code: alt.code,
        name: alt.name,
        description: alt.description,
      },
    });
  }

  return {
    organization: {
      id: organization.id,
      code: organization.code,
      name: organization.name,
    },
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.fullName,
    },
    operatorUser: {
      id: operatorUser.id,
      email: operatorUser.email,
      fullName: operatorUser.fullName,
    },
    roles: Object.keys(rolesByName),
    site: {
      id: site.id,
      code: site.code,
      name: site.name,
    },
    boilerCategory: {
      id: boilerCategory.id,
      code: boilerCategory.code,
      name: boilerCategory.name,
    },
    attributeDefinitionsCount: dynamicAttributesSpec.length,
    boilerAsset: {
      id: boilerAsset.id,
      assetCode: boilerAsset.assetCode,
      name: boilerAsset.name,
    },
    maintenancePlansCount: maintenancePlansSpec.length,
    decisionModel: {
      id: decisionModel.id,
      code: decisionModel.code,
      criteriaCount: decisionCriteriaSpec.length,
      alternativesCount: decisionAlternativesSpec.length,
    },
  };
}

// Execute automatically when run directly from CLI (`npx tsx prisma/seed.ts` or `npx prisma db seed`)
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isDirectExecution) {
  seedLuminaFmDatabase()
    .then((summary) => {
      console.log('=============================================================');
      console.log('LuminaFM Enterprise Seed Completed Successfully (Idempotent)');
      console.log('=============================================================');
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('Failed to seed LuminaFM database:', err);
      process.exit(1);
    })
    .finally(async () => {
      await defaultPrisma.$disconnect();
    });
}

