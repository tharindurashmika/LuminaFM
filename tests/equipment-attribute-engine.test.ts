import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attributesService } from '../src/modules/attributes/attributes.service';
import {
  validateAndMapAttributeValue,
  TypedAttributeColumnResult,
} from '../src/modules/attributes/attributes.validator';
import {
  AttributeTypeValidationError,
  AttributeNotFoundError,
  RequiredAttributeMissingError,
} from '../src/modules/attributes/attributes.errors';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import tenantPrisma from '../src/tenant/tenant.client';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const BOILER_ASSET_ID = 'asset-boiler-001';
const CHILLER_ASSET_ID = 'asset-chiller-001';
const PUMP_ASSET_ID = 'asset-pump-001';
const GENERATOR_ASSET_ID = 'asset-generator-001';
const AHU_ASSET_ID = 'asset-ahu-001';

describe('LuminaFM Configurable Equipment Attribute Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    attributesService.resetVersionStore();
  });

  // ===========================================================================
  // 1. DATA TYPES & TYPED STORAGE COLUMN MAPPING
  // ===========================================================================
  describe('1. Data Types & Typed Storage Column Mappings', () => {
    it('should validate and map text into valueText only', () => {
      const def = { id: '1', code: 'serial_number_prefix', name: 'Serial Prefix', dataType: 'text' as const };
      const res = validateAndMapAttributeValue(def, 'THX-BLR-2026');

      expect(res.valueText).toBe('THX-BLR-2026');
      expect(res.valueNumber).toBeNull();
      expect(res.valueBoolean).toBeNull();
      expect(res.valueDate).toBeNull();
      expect(res.valueDatetime).toBeNull();
      expect(res.valueJson).toBeNull();
    });

    it('should validate and map number into valueNumber only', () => {
      const def = { id: '2', code: 'operating_temp', name: 'Operating Temperature', dataType: 'number' as const };
      const res = validateAndMapAttributeValue(def, 185.5);

      expect(res.valueNumber).toBe(185.5);
      expect(res.valueText).toBeNull();
      expect(res.valueBoolean).toBeNull();
      expect(res.valueDate).toBeNull();
      expect(res.valueDatetime).toBeNull();
      expect(res.valueJson).toBeNull();
    });

    it('should validate and map boolean into valueBoolean only', () => {
      const def = { id: '3', code: 'vfd_installed', name: 'VFD Installed', dataType: 'boolean' as const };
      const res = validateAndMapAttributeValue(def, true);

      expect(res.valueBoolean).toBe(true);
      expect(res.valueText).toBeNull();
      expect(res.valueNumber).toBeNull();
    });

    it('should validate and map date string YYYY-MM-DD into valueDate only', () => {
      const def = { id: '4', code: 'last_overhaul_date', name: 'Last Overhaul', dataType: 'date' as const };
      const res = validateAndMapAttributeValue(def, '2026-04-15');

      expect(res.valueDate).toBeInstanceOf(Date);
      expect(res.valueDate?.toISOString().startsWith('2026-04-15')).toBe(true);
      expect(res.valueText).toBeNull();
    });

    it('should validate and map ISO datetime into valueDatetime only', () => {
      const def = { id: '5', code: 'telemetry_timestamp', name: 'Timestamp', dataType: 'datetime' as const };
      const iso = '2026-05-01T14:30:00.000Z';
      const res = validateAndMapAttributeValue(def, iso);

      expect(res.valueDatetime).toBeInstanceOf(Date);
      expect(res.valueDatetime?.toISOString()).toBe(iso);
      expect(res.valueText).toBeNull();
    });

    it('should validate and map JSON object into valueJson only', () => {
      const def = { id: '6', code: 'pid_tuning_parameters', name: 'PID Tuning', dataType: 'json' as const };
      const payload = { proportional: 1.5, integral: 0.08, derivative: 0.12, mode: 'auto' };
      const res = validateAndMapAttributeValue(def, payload);

      expect(res.valueJson).toEqual(payload);
      expect(res.valueText).toBeNull();
      expect(res.valueNumber).toBeNull();
    });

    it('should validate select options and store into valueText', () => {
      const def = {
        id: '7',
        code: 'fuel_type',
        name: 'Fuel Type',
        dataType: 'select' as const,
        options: ['Furnace Oil', 'Diesel', 'Natural Gas', 'Biomass'],
      };
      const res = validateAndMapAttributeValue(def, 'Furnace Oil');
      expect(res.valueText).toBe('Furnace Oil');
    });

    it('should validate multi_select options and store into valueJson', () => {
      const def = {
        id: '8',
        code: 'safety_interlocks',
        name: 'Safety Interlocks',
        dataType: 'multi_select' as const,
        options: ['Low Water Cutoff', 'High Pressure Trip', 'Flame Failure Detector', 'Purge Timer'],
      };
      const res = validateAndMapAttributeValue(def, ['Low Water Cutoff', 'High Pressure Trip']);
      expect(res.valueJson).toEqual(['Low Water Cutoff', 'High Pressure Trip']);
    });
  });

  // ===========================================================================
  // 2. VALIDATION RULES (MIN, MAX, REGEX PATTERN)
  // ===========================================================================
  describe('2. Validation Rules Enforcement (Min, Max, Pattern)', () => {
    it('should enforce numeric minimum boundary', () => {
      const def = {
        id: '1',
        code: 'operating_pressure',
        name: 'Operating Pressure',
        dataType: 'number' as const,
        validationRules: { min: 2.0, max: 18.0 },
      };

      // Valid value within range
      expect(validateAndMapAttributeValue(def, 10.5).valueNumber).toBe(10.5);

      // Value below minimum
      expect(() => validateAndMapAttributeValue(def, 1.5)).toThrow(AttributeTypeValidationError);
    });

    it('should enforce numeric maximum boundary', () => {
      const def = {
        id: '1',
        code: 'operating_temp',
        name: 'Operating Temperature',
        dataType: 'number' as const,
        validationRules: { min: 50, max: 250 },
      };

      // Value above maximum
      expect(() => validateAndMapAttributeValue(def, 280)).toThrow(AttributeTypeValidationError);
    });

    it('should enforce regular expression pattern on text attributes', () => {
      const def = {
        id: '2',
        code: 'asset_tag_barcode',
        name: 'Asset Tag Barcode',
        dataType: 'text' as const,
        validationRules: { pattern: '^[A-Z]{3}-\\d{4}$' }, // e.g. BLR-1001
      };

      // Valid match
      expect(validateAndMapAttributeValue(def, 'BLR-1001').valueText).toBe('BLR-1001');

      // Invalid format
      expect(() => validateAndMapAttributeValue(def, 'invalid-tag-12')).toThrow(
        AttributeTypeValidationError
      );
    });

    it('should reject select value not in allowed options', () => {
      const def = {
        id: '3',
        code: 'refrigerant_type',
        name: 'Refrigerant',
        dataType: 'select' as const,
        options: ['R134a', 'R410A', 'R1233zd'],
      };

      expect(() => validateAndMapAttributeValue(def, 'Freon-12')).toThrow(
        AttributeTypeValidationError
      );
    });
  });

  // ===========================================================================
  // 3. MANDATORY CATEGORY ATTRIBUTES (REQUIRED FIELDS)
  // ===========================================================================
  describe('3. Category-Mandated Required Fields', () => {
    it('should reject attribute submission when a mandatory category field is missing', async () => {
      // Mock asset with category defining 'steam_capacity' as isRequired: true
      vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValueOnce({
        id: BOILER_ASSET_ID,
        assetCode: 'BLR-001',
        assetCategory: {
          id: 'cat-boiler',
          categoryAttributes: [
            {
              isRequired: true,
              attributeDefinitionId: 'def-steam-cap',
              attributeDefinition: { id: 'def-steam-cap', code: 'steam_capacity', name: 'Steam Capacity' },
            },
          ],
        },
      } as any);

      // Asset currently has NO existing values for steam_capacity
      vi.spyOn(tenantPrisma.assetAttributeValue, 'findFirst').mockResolvedValueOnce(null);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        // User submits only optional attribute 'color', omitting mandatory 'steam_capacity'
        await expect(
          attributesService.setAssetAttributeValues(BOILER_ASSET_ID, [
            { code: 'color', value: 'Blue' },
          ])
        ).rejects.toThrow(RequiredAttributeMissingError);
      });
    });

    it('should accept attribute submission when all mandatory fields are provided', async () => {
      vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValueOnce({
        id: BOILER_ASSET_ID,
        assetCode: 'BLR-001',
        name: 'Steam Boiler #1',
        assetCategory: {
          id: 'cat-boiler',
          categoryAttributes: [
            {
              isRequired: true,
              attributeDefinitionId: 'def-steam-cap',
              attributeDefinition: { id: 'def-steam-cap', code: 'steam_capacity', name: 'Steam Capacity' },
              validationRules: { min: 100 },
            },
          ],
        },
      } as any);

      vi.spyOn(tenantPrisma.attributeDefinition, 'findFirst').mockResolvedValueOnce({
        id: 'def-steam-cap',
        code: 'steam_capacity',
        name: 'Steam Capacity',
        dataType: 'number',
        unitCode: 'kg/h',
      } as any);

      vi.spyOn(tenantPrisma.assetAttributeValue, 'upsert').mockResolvedValueOnce({} as any);

      vi.spyOn(attributesService, 'getAssetAttributeValues').mockResolvedValueOnce({
        assetId: BOILER_ASSET_ID,
        assetCode: 'BLR-001',
        name: 'Steam Boiler #1',
        attributes: [
          {
            id: 'val-1',
            attributeDefinitionId: 'def-steam-cap',
            code: 'steam_capacity',
            name: 'Steam Capacity',
            dataType: 'number',
            unitCode: 'kg/h',
            value: 1100,
            updatedAt: new Date(),
          },
        ],
      });

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const result = await attributesService.setAssetAttributeValues(BOILER_ASSET_ID, [
          { code: 'steam_capacity', value: 1100 },
        ]);

        expect(result.attributes).toHaveLength(1);
        expect(result.attributes[0].value).toBe(1100);
      });
    });
  });

  // ===========================================================================
  // 4. DYNAMIC FORMS & VALIDATION METADATA API
  // ===========================================================================
  describe('4. Dynamic Form Schema Generation', () => {
    it('should return complete form schema with field metadata, order, units, and validation rules', async () => {
      vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValueOnce({
        id: 'cat-chiller',
        code: 'CHILLERS',
        name: 'Water Cooled Chillers',
        categoryAttributes: [
          {
            attributeDefinitionId: 'def-cooling-cap',
            isRequired: true,
            displayOrder: 1,
            defaultValue: 500,
            validationRules: { min: 50, max: 2000 },
            attributeDefinition: {
              id: 'def-cooling-cap',
              code: 'cooling_capacity_tons',
              name: 'Cooling Capacity',
              dataType: 'number',
              unitCode: 'TR',
              description: 'Refrigeration tonnage capacity',
            },
          },
          {
            attributeDefinitionId: 'def-refrigerant',
            isRequired: true,
            displayOrder: 2,
            defaultValue: 'R134a',
            validationRules: {},
            attributeDefinition: {
              id: 'def-refrigerant',
              code: 'refrigerant_type',
              name: 'Refrigerant Type',
              dataType: 'select',
              unitCode: null,
              options: ['R134a', 'R410A', 'R1233zd'],
              description: 'Primary refrigerant blend',
            },
          },
        ],
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const formSchema = await attributesService.getCategoryFormSchema('cat-chiller');

        expect(formSchema.categoryCode).toBe('CHILLERS');
        expect(formSchema.version).toBe(1);
        expect(formSchema.fields).toHaveLength(2);

        // Field 1: Cooling Capacity
        expect(formSchema.fields[0].code).toBe('cooling_capacity_tons');
        expect(formSchema.fields[0].dataType).toBe('number');
        expect(formSchema.fields[0].unitCode).toBe('TR');
        expect(formSchema.fields[0].isRequired).toBe(true);
        expect(formSchema.fields[0].validationRules.min).toBe(50);

        // Field 2: Refrigerant Type
        expect(formSchema.fields[1].code).toBe('refrigerant_type');
        expect(formSchema.fields[1].dataType).toBe('select');
        expect(formSchema.fields[1].options).toContain('R134a');
      });
    });
  });

  // ===========================================================================
  // 5. VERSIONED CATEGORY CONFIGURATIONS (HISTORICAL DATA IMMUTABILITY)
  // ===========================================================================
  describe('5. Versioned Category Configurations & Historical Data Protection', () => {
    it('should snapshot configuration versions and preserve historical equipment data upon schema changes', async () => {
      // Version 1 configuration
      vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValue({
        id: 'cat-chiller',
        code: 'CHILLERS',
        name: 'Chillers',
        categoryAttributes: [
          {
            attributeDefinitionId: 'def-chiller-cap',
            isRequired: true,
            displayOrder: 1,
            validationRules: { min: 100 },
            attributeDefinition: {
              id: 'def-chiller-cap',
              code: 'chiller_capacity',
              name: 'Chiller Capacity',
              dataType: 'number',
              unitCode: 'TR',
            },
          },
        ],
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        // Publish Version 1
        const v1 = await attributesService.publishCategoryConfigurationVersion(
          'cat-chiller',
          'Initial V1 release for chillers'
        );
        expect(v1.version).toBe(1);
        expect(v1.attributes).toHaveLength(1);

        // Later: Administrator updates category to Version 2 with new field
        vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValue({
          id: 'cat-chiller',
          code: 'CHILLERS',
          name: 'Chillers',
          categoryAttributes: [
            {
              attributeDefinitionId: 'def-chiller-cap',
              isRequired: true,
              displayOrder: 1,
              validationRules: { min: 100 },
              attributeDefinition: {
                id: 'def-chiller-cap',
                code: 'chiller_capacity',
                name: 'Chiller Capacity',
                dataType: 'number',
                unitCode: 'TR',
              },
            },
            {
              attributeDefinitionId: 'def-vfd-equipped',
              isRequired: true,
              displayOrder: 2,
              validationRules: {},
              attributeDefinition: {
                id: 'def-vfd-equipped',
                code: 'vfd_equipped',
                name: 'VFD Equipped',
                dataType: 'boolean',
                unitCode: null,
              },
            },
          ],
        } as any);

        // Publish Version 2
        const v2 = await attributesService.publishCategoryConfigurationVersion(
          'cat-chiller',
          'V2 release: Added mandatory vfd_equipped field'
        );
        expect(v2.version).toBe(2);
        expect(v2.attributes).toHaveLength(2);

        // Verify that Version 1 snapshot is intact in history
        const history = await attributesService.getCategoryVersionHistory('cat-chiller');
        expect(history).toHaveLength(2);

        const v1Snapshot = await attributesService.getCategoryVersionSnapshot('cat-chiller', 1);
        expect(v1Snapshot.version).toBe(1);
        expect(v1Snapshot.attributes).toHaveLength(1); // Historical V1 remains unchanged!

        const v2Snapshot = await attributesService.getCategoryVersionSnapshot('cat-chiller', 2);
        expect(v2Snapshot.version).toBe(2);
        expect(v2Snapshot.attributes).toHaveLength(2);
      });
    });
  });

  // ===========================================================================
  // 6. MULTI-CATEGORY EQUIPMENT EXTENSIBILITY (BOILERS, CHILLERS, PUMPS, GENERATORS, AHUS)
  // ===========================================================================
  describe('6. Multi-Category Equipment Coverage without Core Schema Changes', () => {
    it('should configure and validate Boilers with steam, pressure, and flue gas attributes', () => {
      const boilerDefs = [
        { id: 'b1', code: 'steam_output_capacity', name: 'Steam Output', dataType: 'number' as const, validationRules: { min: 500, max: 20000 } },
        { id: 'b2', code: 'operating_pressure', name: 'Operating Pressure', dataType: 'number' as const, validationRules: { min: 5, max: 25 } },
        { id: 'b3', code: 'flue_gas_temp', name: 'Flue Gas Temperature', dataType: 'number' as const, validationRules: { min: 100, max: 350 } },
        { id: 'b4', code: 'fuel_type', name: 'Fuel Type', dataType: 'select' as const, options: ['Furnace Oil', 'Diesel', 'Natural Gas'] },
      ];

      expect(validateAndMapAttributeValue(boilerDefs[0], 1100).valueNumber).toBe(1100);
      expect(validateAndMapAttributeValue(boilerDefs[1], 10.54).valueNumber).toBe(10.54);
      expect(validateAndMapAttributeValue(boilerDefs[2], 185.0).valueNumber).toBe(185.0);
      expect(validateAndMapAttributeValue(boilerDefs[3], 'Furnace Oil').valueText).toBe('Furnace Oil');
    });

    it('should configure and validate Chillers with tonnage, refrigerant, and flow rates', () => {
      const chillerDefs = [
        { id: 'c1', code: 'cooling_tonnage', name: 'Cooling Tonnage', dataType: 'number' as const, validationRules: { min: 100, max: 3000 } },
        { id: 'c2', code: 'refrigerant', name: 'Refrigerant', dataType: 'select' as const, options: ['R134a', 'R1233zd', 'R513A'] },
        { id: 'c3', code: 'chilled_water_supply_temp', name: 'Chilled Water Supply Temp', dataType: 'number' as const, validationRules: { min: 4, max: 12 } },
      ];

      expect(validateAndMapAttributeValue(chillerDefs[0], 450).valueNumber).toBe(450);
      expect(validateAndMapAttributeValue(chillerDefs[1], 'R134a').valueText).toBe('R134a');
      expect(validateAndMapAttributeValue(chillerDefs[2], 6.5).valueNumber).toBe(6.5);
    });

    it('should configure and validate Circulation Pumps with flow rate, head, and motor power', () => {
      const pumpDefs = [
        { id: 'p1', code: 'rated_flow_rate_m3h', name: 'Rated Flow Rate', dataType: 'number' as const, validationRules: { min: 1 } },
        { id: 'p2', code: 'total_head_meters', name: 'Total Dynamic Head', dataType: 'number' as const, validationRules: { min: 1 } },
        { id: 'p3', code: 'motor_power_kw', name: 'Motor Power', dataType: 'number' as const, validationRules: { min: 0.5 } },
      ];

      expect(validateAndMapAttributeValue(pumpDefs[0], 45.0).valueNumber).toBe(45.0);
      expect(validateAndMapAttributeValue(pumpDefs[1], 32.5).valueNumber).toBe(32.5);
      expect(validateAndMapAttributeValue(pumpDefs[2], 11.0).valueNumber).toBe(11.0);
    });

    it('should configure and validate Diesel Generators with kVA rating, voltage, and fuel capacity', () => {
      const genDefs = [
        { id: 'g1', code: 'prime_power_kva', name: 'Prime Power Rating', dataType: 'number' as const, validationRules: { min: 10 } },
        { id: 'g2', code: 'rated_voltage', name: 'Rated Voltage', dataType: 'number' as const, validationRules: { min: 110, max: 600 } },
        { id: 'g3', code: 'fuel_tank_liters', name: 'Fuel Tank Capacity', dataType: 'number' as const, validationRules: { min: 50 } },
        { id: 'g4', code: 'auto_transfer_switch', name: 'ATS Equipped', dataType: 'boolean' as const },
      ];

      expect(validateAndMapAttributeValue(genDefs[0], 500).valueNumber).toBe(500);
      expect(validateAndMapAttributeValue(genDefs[1], 400).valueNumber).toBe(400);
      expect(validateAndMapAttributeValue(genDefs[2], 1200).valueNumber).toBe(1200);
      expect(validateAndMapAttributeValue(genDefs[3], true).valueBoolean).toBe(true);
    });

    it('should configure and validate Air Handling Units (AHUs) with airflow, static pressure, and filters', () => {
      const ahuDefs = [
        { id: 'a1', code: 'airflow_cfm', name: 'Airflow Capacity', dataType: 'number' as const, validationRules: { min: 500 } },
        { id: 'a2', code: 'external_static_pressure_pa', name: 'Static Pressure', dataType: 'number' as const, validationRules: { min: 50 } },
        { id: 'a3', code: 'filter_type', name: 'Filter Type', dataType: 'select' as const, options: ['Pre-Filter G4', 'Pocket Filter F7', 'HEPA H14'] },
      ];

      expect(validateAndMapAttributeValue(ahuDefs[0], 8500).valueNumber).toBe(8500);
      expect(validateAndMapAttributeValue(ahuDefs[1], 350).valueNumber).toBe(350);
      expect(validateAndMapAttributeValue(ahuDefs[2], 'HEPA H14').valueText).toBe('HEPA H14');
    });
  });
});
