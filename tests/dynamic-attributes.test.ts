import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt.utils';
import { validateAndMapAttributeValue } from '../src/modules/attributes/attributes.validator';
import { AttributeTypeValidationError, AttributeNotFoundError } from '../src/modules/attributes/attributes.errors';
import { attributesService } from '../src/modules/attributes/attributes.service';

describe('Dynamic Equipment Attributes Domain', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const ASSET_ID = '99999999-9999-9999-9999-999999999999';

  const validTokenTenantA = signToken({
    userId: USER_ID,
    email: 'engineer@hotelgroup.com',
    organizationId: TENANT_A_ID,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Attribute Data Type Validator (validateAndMapAttributeValue)', () => {
    it('should validate and map text data_type into valueText only', () => {
      const def = { id: '1', code: 'serial_prefix', name: 'Serial Prefix', dataType: 'text' as const };
      const result = validateAndMapAttributeValue(def, 'BLR-SEC-A');

      expect(result.valueText).toBe('BLR-SEC-A');
      expect(result.valueNumber).toBeNull();
      expect(result.valueBoolean).toBeNull();
      expect(result.valueDate).toBeNull();
      expect(result.valueDatetime).toBeNull();
      expect(result.valueJson).toBeNull();
    });

    it('should reject non-string values for text data_type with 400 validation error', () => {
      const def = { id: '1', code: 'serial_prefix', name: 'Serial Prefix', dataType: 'text' as const };

      expect(() => validateAndMapAttributeValue(def, 12345)).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, true)).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, { custom: 'object' })).toThrow(
        AttributeTypeValidationError
      );
    });

    it('should validate and map number data_type into valueNumber only', () => {
      const def = { id: '2', code: 'operating_pressure_bar', name: 'Operating Pressure', dataType: 'number' as const };
      const result = validateAndMapAttributeValue(def, 16.5);

      expect(result.valueNumber).toBe(16.5);
      expect(result.valueText).toBeNull();
      expect(result.valueBoolean).toBeNull();
      expect(result.valueDate).toBeNull();
      expect(result.valueDatetime).toBeNull();
      expect(result.valueJson).toBeNull();
    });

    it('should reject non-number and non-finite values for number data_type with 400 validation error', () => {
      const def = { id: '2', code: 'operating_pressure_bar', name: 'Operating Pressure', dataType: 'number' as const };

      expect(() => validateAndMapAttributeValue(def, '16.5')).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, true)).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, NaN)).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, Infinity)).toThrow(AttributeTypeValidationError);
    });

    it('should validate and map boolean data_type into valueBoolean only', () => {
      const def = { id: '3', code: 'has_economizer', name: 'Has Economizer', dataType: 'boolean' as const };
      const result = validateAndMapAttributeValue(def, true);

      expect(result.valueBoolean).toBe(true);
      expect(result.valueText).toBeNull();
      expect(result.valueNumber).toBeNull();
      expect(result.valueDate).toBeNull();
      expect(result.valueDatetime).toBeNull();
      expect(result.valueJson).toBeNull();
    });

    it('should reject non-boolean types (e.g. "true" or 1) for boolean data_type', () => {
      const def = { id: '3', code: 'has_economizer', name: 'Has Economizer', dataType: 'boolean' as const };

      expect(() => validateAndMapAttributeValue(def, 'true')).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, 1)).toThrow(AttributeTypeValidationError);
    });

    it('should validate and map valid YYYY-MM-DD date data_type into valueDate only', () => {
      const def = { id: '4', code: 'last_hydro_test_date', name: 'Last Hydro Test Date', dataType: 'date' as const };
      const result = validateAndMapAttributeValue(def, '2026-05-10');

      expect(result.valueDate).toBeInstanceOf(Date);
      expect(result.valueDate?.toISOString().startsWith('2026-05-10')).toBe(true);
      expect(result.valueText).toBeNull();
      expect(result.valueNumber).toBeNull();
      expect(result.valueBoolean).toBeNull();
      expect(result.valueDatetime).toBeNull();
      expect(result.valueJson).toBeNull();
    });

    it('should reject invalid date strings for date data_type', () => {
      const def = { id: '4', code: 'last_hydro_test_date', name: 'Last Hydro Test Date', dataType: 'date' as const };

      expect(() => validateAndMapAttributeValue(def, 'not-a-date')).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, 1715300000000)).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, '2026-99-99')).toThrow(AttributeTypeValidationError);
    });

    it('should validate and map select data_type against allowed options into valueText', () => {
      const def = {
        id: '5',
        code: 'fuel_type',
        name: 'Fuel Type',
        dataType: 'select' as const,
        options: ['Diesel', 'LPG', 'Natural Gas', 'Heavy Fuel Oil'],
      };

      const result = validateAndMapAttributeValue(def, 'Heavy Fuel Oil');
      expect(result.valueText).toBe('Heavy Fuel Oil');
      expect(result.valueNumber).toBeNull();
    });

    it('should reject select values not present in allowed options', () => {
      const def = {
        id: '5',
        code: 'fuel_type',
        name: 'Fuel Type',
        dataType: 'select' as const,
        options: ['Diesel', 'LPG', 'Natural Gas', 'Heavy Fuel Oil'],
      };

      expect(() => validateAndMapAttributeValue(def, 'Nuclear')).toThrow(AttributeTypeValidationError);
    });

    it('should validate and map multi_select data_type into valueJson', () => {
      const def = {
        id: '6',
        code: 'safety_valves',
        name: 'Safety Valves',
        dataType: 'multi_select' as const,
        options: ['Spring Loaded', 'Dead Weight', 'High Lift', 'Full Bore'],
      };

      const result = validateAndMapAttributeValue(def, ['Spring Loaded', 'High Lift']);
      expect(result.valueJson).toEqual(['Spring Loaded', 'High Lift']);
      expect(result.valueText).toBeNull();
    });

    it('should reject multi_select if not an array of allowed strings', () => {
      const def = {
        id: '6',
        code: 'safety_valves',
        name: 'Safety Valves',
        dataType: 'multi_select' as const,
        options: ['Spring Loaded', 'Dead Weight'],
      };

      expect(() => validateAndMapAttributeValue(def, 'Spring Loaded')).toThrow(AttributeTypeValidationError);
      expect(() => validateAndMapAttributeValue(def, ['Spring Loaded', 'Alien Valve'])).toThrow(
        AttributeTypeValidationError
      );
    });
  });

  describe('2. Asset Attribute Values API Endpoints (POST /api/assets/:id/attributes)', () => {
    it('should successfully update and map dynamic attributes for an asset', async () => {
      vi.spyOn(attributesService, 'setAssetAttributeValues').mockResolvedValueOnce({
        assetId: ASSET_ID,
        assetCode: 'BLR-001',
        name: 'Industrial Steam Boiler',
        attributes: [
          {
            id: 'val-1',
            attributeDefinitionId: 'def-1',
            code: 'operating_pressure_bar',
            name: 'Operating Pressure',
            dataType: 'number',
            unitCode: 'bar',
            value: 16.5,
            updatedAt: new Date(),
          },
          {
            id: 'val-2',
            attributeDefinitionId: 'def-2',
            code: 'has_economizer',
            name: 'Has Economizer',
            dataType: 'boolean',
            unitCode: null,
            value: true,
            updatedAt: new Date(),
          },
        ],
      });

      const res = await request(app)
        .post(`/api/assets/${ASSET_ID}/attributes`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          attributes: [
            { code: 'operating_pressure_bar', value: 16.5 },
            { code: 'has_economizer', value: true },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attributes).toHaveLength(2);
      expect(res.body.data.attributes[0].value).toBe(16.5);
      expect(res.body.data.attributes[1].value).toBe(true);
    });

    it('should reject invalid attribute data types with 400 Bad Request and structured error', async () => {
      vi.spyOn(attributesService, 'setAssetAttributeValues').mockRejectedValueOnce(
        new AttributeTypeValidationError(
          'operating_pressure_bar',
          'number',
          'sixteen_point_five',
          "Attribute 'operating_pressure_bar' expects data_type 'number', but received string (\"sixteen_point_five\")."
        )
      );

      const res = await request(app)
        .post(`/api/assets/${ASSET_ID}/attributes`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          attributes: [
            { code: 'operating_pressure_bar', value: 'sixteen_point_five' }, // Malformed string passed for number
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_ATTRIBUTE_TYPE');
      expect(res.body.error.attribute).toBe('operating_pressure_bar');
      expect(res.body.error.expected_type).toBe('number');
      expect(res.body.error.received_value).toBe('sixteen_point_five');
      expect(res.body.error.message).toContain("expects data_type 'number'");
    });

    it('should return 404 when attribute definition does not exist', async () => {
      vi.spyOn(attributesService, 'setAssetAttributeValues').mockRejectedValueOnce(
        new AttributeNotFoundError('non_existent_attribute_code')
      );

      const res = await request(app)
        .post(`/api/assets/${ASSET_ID}/attributes`)
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          attributes: [{ code: 'non_existent_attribute_code', value: 42 }],
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ATTRIBUTE_NOT_FOUND');
    });

    it('GET /api/assets/:id/attributes should return all populated dynamic attributes', async () => {
      vi.spyOn(attributesService, 'getAssetAttributeValues').mockResolvedValueOnce({
        assetId: ASSET_ID,
        assetCode: 'BLR-001',
        name: 'Industrial Steam Boiler',
        attributes: [
          {
            id: 'val-1',
            attributeDefinitionId: 'def-1',
            code: 'operating_pressure_bar',
            name: 'Operating Pressure',
            dataType: 'number',
            unitCode: 'bar',
            value: 16.5,
            updatedAt: new Date(),
          },
        ],
      });

      const res = await request(app)
        .get(`/api/assets/${ASSET_ID}/attributes`)
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attributes[0].code).toBe('operating_pressure_bar');
      expect(res.body.data.attributes[0].value).toBe(16.5);
    });
  });

  describe('3. Attribute Definitions & Category Linking API', () => {
    it('POST /api/attributes/definitions should define a new attribute', async () => {
      vi.spyOn(attributesService, 'createAttributeDefinition').mockResolvedValueOnce({
        id: 'def-steam-cap',
        organizationId: TENANT_A_ID,
        code: 'steam_capacity_kg_h',
        name: 'Steam Capacity',
        dataType: 'number',
        unitCode: 'kg/h',
        description: 'Rated steam output capacity per hour',
        options: [],
        isActive: true,
      });

      const res = await request(app)
        .post('/api/attributes/definitions')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          code: 'steam_capacity_kg_h',
          name: 'Steam Capacity',
          dataType: 'number',
          unitCode: 'kg/h',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('steam_capacity_kg_h');
    });

    it('POST /api/attributes/category-link should link attribute to an equipment category', async () => {
      vi.spyOn(attributesService, 'linkCategoryAttribute').mockResolvedValueOnce({
        organizationId: TENANT_A_ID,
        assetCategoryId: 'cat-boilers',
        attributeDefinitionId: 'def-steam-cap',
        isRequired: true,
        displayOrder: 1,
        defaultValue: null,
        validationRules: {},
        attributeDefinition: {
          id: 'def-steam-cap',
          code: 'steam_capacity_kg_h',
          name: 'Steam Capacity',
          dataType: 'number',
          unitCode: 'kg/h',
        },
      } as any);

      const res = await request(app)
        .post('/api/attributes/category-link')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          assetCategoryId: 'cat-boilers',
          attributeDefinitionId: 'def-steam-cap',
          isRequired: true,
          displayOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRequired).toBe(true);
    });
  });
});

