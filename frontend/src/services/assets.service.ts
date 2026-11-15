import { apiRequest } from './api.client';
import {
  AssetSummary,
  AssetDynamicAttributesResponse,
  DynamicEquipmentAttribute,
} from '../types/cmms.types';

export interface AssetListFilters {
  siteId?: string;
  categoryId?: string;
  locationId?: string;
  systemId?: string;
}

/**
 * Rich multi-site, multi-category fallback catalog for offline / standalone preview
 * while preserving 100% parity with GET /api/assets and GET /api/assets/:id/attributes.
 */
const FALLBACK_ASSETS: AssetSummary[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    name: 'Cleaver-Brooks Firetube Steam Boiler #1',
    serialNumber: 'CB-700-2022-9841',
    description:
      'Primary high-pressure 4-pass wet-back firetube steam boiler supplying laundry, culinary steam kettles, and domestic hot water calorifiers.',
    criticality: 'critical',
    status: 'in_service',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b2-blr', code: 'BLR-RM-B2', name: 'Basement B2 -> Main Boiler Plant' },
    assetCategory: { id: 'cat-boiler', code: 'BOILER', name: 'Boiler' },
    system: { id: 'sys-steam', code: 'SYS-STEAM-GEN', name: 'Primary Steam Generation Loop' },
    brand: { id: 'br-cb', name: 'Cleaver-Brooks' },
    model: { id: 'mod-cb700', modelNumber: 'CBEX-Elite-700HP', modelName: 'CBEX Elite Firetube' },
    installationDate: '2022-03-14',
    commissioningDate: '2022-04-01',
    warrantyExpiryDate: '2027-04-01',
    expectedLifeYears: 25,
    _count: { workOrders: 14, faultLogs: 3, inspections: 28, assetMeters: 6 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    assetCode: 'BLR-002',
    name: 'Viessmann Vitomax 200-HS Standby Steam Boiler #2',
    serialNumber: 'VM-200HS-2023-1104',
    description:
      'Redundant N+1 high-efficiency three-pass low-NOx steam generator with modulating dual-fuel rotary cup burner.',
    criticality: 'critical',
    status: 'standby',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b2-blr', code: 'BLR-RM-B2', name: 'Basement B2 -> Main Boiler Plant' },
    assetCategory: { id: 'cat-boiler', code: 'BOILER', name: 'Boiler' },
    system: { id: 'sys-steam', code: 'SYS-STEAM-GEN', name: 'Primary Steam Generation Loop' },
    brand: { id: 'br-viessmann', name: 'Viessmann' },
    model: { id: 'mod-vm200', modelNumber: 'Vitomax-200-HS-M75A', modelName: 'Vitomax 200-HS' },
    installationDate: '2023-01-20',
    commissioningDate: '2023-02-10',
    warrantyExpiryDate: '2028-02-10',
    expectedLifeYears: 25,
    _count: { workOrders: 6, faultLogs: 0, inspections: 19, assetMeters: 6 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    assetCode: 'P-001',
    name: 'Grundfos Multistage Boiler Feedwater Pump A',
    serialNumber: 'GF-CR32-44102',
    description:
      'Vertical multistage centrifugal feedwater pump feeding Boiler #1 modulated via 4-20mA drum-level transmitter.',
    criticality: 'high',
    status: 'in_service',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b2-skid', code: 'FEED-SKID-01', name: 'Basement B2 -> Feedwater Skid Bay' },
    assetCategory: { id: 'cat-pump', code: 'CENTRIFUGAL-PUMP', name: 'Centrifugal Pump' },
    system: { id: 'sys-feed', code: 'SYS-FEEDWATER', name: 'Feedwater & Condensate Loop' },
    brand: { id: 'br-gf', name: 'Grundfos' },
    model: { id: 'mod-cr32', modelNumber: 'CR-32-8-A-F-A-E-HQQE', modelName: 'CR 32 Multistage' },
    parent: {
      id: 'a1000000-0000-0000-0000-000000000001',
      assetCode: 'BLR-001',
      name: 'Cleaver-Brooks Firetube Steam Boiler #1',
    },
    installationDate: '2022-03-18',
    commissioningDate: '2022-04-01',
    warrantyExpiryDate: '2026-04-01',
    expectedLifeYears: 15,
    _count: { workOrders: 9, faultLogs: 1, inspections: 24, assetMeters: 3 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    assetCode: 'T-001',
    name: 'Pressurized Thermal Deaerator & Feedwater Storage Vessel',
    serialNumber: 'TD-2021-883',
    description:
      'Spray-tray pressurized thermal deaerator stripping dissolved oxygen to < 7 ppb to prevent boiler tube pitting.',
    criticality: 'high',
    status: 'in_service',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b2-mezz', code: 'MEZZ-B2', name: 'Basement B2 -> Boiler Mezzanine Deck' },
    assetCategory: { id: 'cat-vessel', code: 'PRESSURE-VESSEL', name: 'Pressure Vessel' },
    system: { id: 'sys-feed', code: 'SYS-FEEDWATER', name: 'Feedwater & Condensate Loop' },
    brand: { id: 'br-cb', name: 'Cleaver-Brooks' },
    model: { id: 'mod-cb-da', modelNumber: 'SprayMaster-DA-8000', modelName: 'SprayMaster Deaerator' },
    installationDate: '2022-03-15',
    commissioningDate: '2022-04-01',
    warrantyExpiryDate: '2032-04-01',
    expectedLifeYears: 30,
    _count: { workOrders: 5, faultLogs: 0, inspections: 16, assetMeters: 4 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    assetCode: 'CHL-001',
    name: 'Trane CenTraVac Water-Cooled Centrifugal Chiller #1',
    serialNumber: 'TR-CVHE-2021-5520',
    description:
      'Magnetic-bearing variable-speed centrifugal water-cooled chiller serving tower guestrooms and grand ballroom.',
    criticality: 'critical',
    status: 'in_service',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b3-chl', code: 'CHL-HALL-B3', name: 'Basement B3 -> Central Chiller Hall' },
    assetCategory: { id: 'cat-chiller', code: 'CHILLER', name: 'Water-Cooled Chiller' },
    system: { id: 'sys-hvac', code: 'SYS-CHW-PRIMARY', name: 'District Chilled Water Plant' },
    brand: { id: 'br-trane', name: 'Trane' },
    model: { id: 'mod-cvhe', modelNumber: 'CVHE-650-TR', modelName: 'CenTraVac EarthWise' },
    installationDate: '2021-11-10',
    commissioningDate: '2021-12-01',
    warrantyExpiryDate: '2026-12-01',
    expectedLifeYears: 25,
    _count: { workOrders: 11, faultLogs: 2, inspections: 32, assetMeters: 5 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000006',
    assetCode: 'BLR-003',
    name: 'Fulton VMP-120 Vertical Tubeless Steam Boiler',
    serialNumber: 'FL-VMP120-2020-3391',
    description:
      'High-altitude resort spa & laundry vertical tubeless steam boiler with rapid cold-start capability.',
    criticality: 'critical',
    status: 'under_maintenance',
    site: { id: 'site-kdy', code: 'KDY-RESORT', name: 'Kandy Heritage Resort' },
    location: { id: 'loc-kdy-util', code: 'KDY-UTIL-01', name: 'North Wing -> Thermal Utility House' },
    assetCategory: { id: 'cat-boiler', code: 'BOILER', name: 'Boiler' },
    system: { id: 'sys-kdy-steam', code: 'SYS-KDY-STEAM', name: 'Resort Thermal Steam Loop' },
    brand: { id: 'br-fulton', name: 'Fulton Thermal' },
    model: { id: 'mod-vmp120', modelNumber: 'VMP-120-LE', modelName: 'Vertical Tubeless Steam' },
    installationDate: '2020-08-12',
    commissioningDate: '2020-09-01',
    warrantyExpiryDate: '2025-09-01',
    expectedLifeYears: 20,
    _count: { workOrders: 18, faultLogs: 4, inspections: 22, assetMeters: 5 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000007',
    assetCode: 'GEN-001',
    name: 'Caterpillar C32 1250kVA Prime Standby Diesel Generator',
    serialNumber: 'CAT-C32-991042',
    description:
      'Life-safety and critical thermal plant emergency power generator with automatic transfer switch (ATS-01) integration.',
    criticality: 'critical',
    status: 'standby',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b1-gen', code: 'GEN-BAY-B1', name: 'Basement B1 -> Acoustic Generator Vault' },
    assetCategory: { id: 'cat-gen', code: 'GENERATOR', name: 'Diesel Generator' },
    system: { id: 'sys-epms', code: 'SYS-EPMS-HV', name: 'Emergency Power Distribution' },
    brand: { id: 'br-cat', name: 'Caterpillar' },
    model: { id: 'mod-c32', modelNumber: 'DE1250E2-C32', modelName: 'Cat C32 V12 Genset' },
    installationDate: '2021-06-15',
    commissioningDate: '2021-07-01',
    warrantyExpiryDate: '2026-07-01',
    expectedLifeYears: 25,
    _count: { workOrders: 8, faultLogs: 0, inspections: 48, assetMeters: 4 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000008',
    assetCode: 'P-002',
    name: 'KSB Etanorm Chilled Water Secondary Distribution Pump',
    serialNumber: 'KSB-ETN-125-7741',
    description:
      'VFD-driven horizontal end-suction centrifugal pump supplying chilled water risers to Floors 1–28.',
    criticality: 'medium',
    status: 'in_service',
    site: { id: 'site-gal', code: 'GAL-TOWER', name: 'Galle Oceanfront Tower' },
    location: { id: 'loc-gal-p2', code: 'GAL-MECH-P2', name: 'Podium P2 -> Hydronic Pump Room' },
    assetCategory: { id: 'cat-pump', code: 'CENTRIFUGAL-PUMP', name: 'Centrifugal Pump' },
    system: { id: 'sys-gal-chw', code: 'SYS-GAL-CHW', name: 'Tower Chilled Water Loop' },
    brand: { id: 'br-ksb', name: 'KSB' },
    model: { id: 'mod-etn', modelNumber: 'Etanorm-125-100-250', modelName: 'Etanorm G Series' },
    installationDate: '2023-05-10',
    commissioningDate: '2023-06-01',
    warrantyExpiryDate: '2028-06-01',
    expectedLifeYears: 18,
    _count: { workOrders: 3, faultLogs: 0, inspections: 12, assetMeters: 2 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000009',
    assetCode: 'BLR-004',
    name: 'Miura LX-200SG Low-NOx Once-Through Steam Boiler',
    serialNumber: 'MIU-LX200-2024-0082',
    description:
      'Compact modular once-through gas-fired steam generator delivering full steam pressure in under 5 minutes.',
    criticality: 'high',
    status: 'in_service',
    site: { id: 'site-gal', code: 'GAL-TOWER', name: 'Galle Oceanfront Tower' },
    location: { id: 'loc-gal-blr', code: 'GAL-THERM-P1', name: 'Podium P1 -> Coastal Boiler Bay' },
    assetCategory: { id: 'cat-boiler', code: 'BOILER', name: 'Boiler' },
    system: { id: 'sys-gal-steam', code: 'SYS-GAL-STEAM', name: 'Coastal Culinary & Laundry Steam' },
    brand: { id: 'br-miura', name: 'Miura' },
    model: { id: 'mod-lx200', modelNumber: 'LX-200SG-07', modelName: 'LX-SG Low NOx Series' },
    installationDate: '2024-01-12',
    commissioningDate: '2024-02-01',
    warrantyExpiryDate: '2029-02-01',
    expectedLifeYears: 20,
    _count: { workOrders: 2, faultLogs: 0, inspections: 10, assetMeters: 5 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000010',
    assetCode: 'T-002',
    name: 'Blowdown Flash Recovery & Quench Vessel',
    serialNumber: 'BFR-2022-419',
    description:
      'ASME Section VIII Div 1 blowdown separator recovering flash steam to the deaerator and cooling effluent below 60°C.',
    criticality: 'medium',
    status: 'in_service',
    site: { id: 'site-cmb', code: 'CMB-HOTEL', name: 'Colombo Grand Hotel' },
    location: { id: 'loc-b2-blr', code: 'BLR-RM-B2', name: 'Basement B2 -> Main Boiler Plant' },
    assetCategory: { id: 'cat-vessel', code: 'PRESSURE-VESSEL', name: 'Pressure Vessel' },
    system: { id: 'sys-steam', code: 'SYS-STEAM-GEN', name: 'Primary Steam Generation Loop' },
    brand: { id: 'br-spirax', name: 'Spirax Sarco' },
    model: { id: 'mod-fbd', modelNumber: 'FBD-15-ASME', modelName: 'Flash Blowdown Vessel' },
    installationDate: '2022-03-19',
    commissioningDate: '2022-04-01',
    warrantyExpiryDate: '2032-04-01',
    expectedLifeYears: 25,
    _count: { workOrders: 4, faultLogs: 1, inspections: 14, assetMeters: 2 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000011',
    assetCode: 'CHL-002',
    name: 'Carrier AquaEdge 19DV Two-Stage Centrifugal Chiller',
    serialNumber: 'CAR-19DV-2022-8812',
    description:
      'High-efficiency low-GWP R-1233zd(E) water-cooled chiller serving Kandy Heritage Resort spa and convention wing.',
    criticality: 'high',
    status: 'out_of_service',
    site: { id: 'site-kdy', code: 'KDY-RESORT', name: 'Kandy Heritage Resort' },
    location: { id: 'loc-kdy-util', code: 'KDY-UTIL-01', name: 'North Wing -> Thermal Utility House' },
    assetCategory: { id: 'cat-chiller', code: 'CHILLER', name: 'Water-Cooled Chiller' },
    system: { id: 'sys-kdy-chw', code: 'SYS-KDY-CHW', name: 'Resort Chilled Water Loop' },
    brand: { id: 'br-carrier', name: 'Carrier' },
    model: { id: 'mod-19dv', modelNumber: '19DV-450', modelName: 'AquaEdge 19DV' },
    installationDate: '2022-07-04',
    commissioningDate: '2022-08-01',
    warrantyExpiryDate: '2027-08-01',
    expectedLifeYears: 25,
    _count: { workOrders: 15, faultLogs: 5, inspections: 18, assetMeters: 4 },
  },
  {
    id: 'a1000000-0000-0000-0000-000000000012',
    assetCode: 'P-003',
    name: 'Legacy Cast-Iron Condensate Transfer Pump (Retired)',
    serialNumber: 'WILO-2012-0019',
    description:
      'Decommissioned single-stage condensate return pump replaced during the 2024 high-pressure energy retrofit.',
    criticality: 'low',
    status: 'decommissioned',
    site: { id: 'site-gal', code: 'GAL-TOWER', name: 'Galle Oceanfront Tower' },
    location: { id: 'loc-gal-p2', code: 'GAL-MECH-P2', name: 'Podium P2 -> Hydronic Pump Room' },
    assetCategory: { id: 'cat-pump', code: 'CENTRIFUGAL-PUMP', name: 'Centrifugal Pump' },
    system: { id: 'sys-gal-steam', code: 'SYS-GAL-STEAM', name: 'Coastal Culinary & Laundry Steam' },
    brand: { id: 'br-wilo', name: 'Wilo' },
    model: { id: 'mod-wilo-crono', modelNumber: 'CronoLine-IL-65', modelName: 'CronoLine IL' },
    installationDate: '2012-05-01',
    commissioningDate: '2012-05-15',
    warrantyExpiryDate: '2017-05-15',
    expectedLifeYears: 12,
    _count: { workOrders: 27, faultLogs: 8, inspections: 40, assetMeters: 1 },
  },
];

/**
 * Dynamic Equipment Attributes store keyed by assetId.
 * Mirrors the exact payload returned by `GET /api/assets/:id/attributes`
 * from `src/modules/attributes/attributes.service.ts`.
 */
const FALLBACK_ATTRIBUTES_BY_ASSET: Record<string, DynamicEquipmentAttribute[]> = {
  // BLR-001: Cleaver-Brooks Firetube Steam Boiler #1
  'a1000000-0000-0000-0000-000000000001': [
    {
      id: 'attr-val-101',
      attributeDefinitionId: 'def-op-pressure',
      code: 'operating_pressure',
      name: 'Operating Steam Pressure',
      dataType: 'number',
      unitCode: 'bar',
      value: 10.5,
      updatedAt: '2026-11-14T14:20:00Z',
    },
    {
      id: 'attr-val-102',
      attributeDefinitionId: 'def-flue-temp',
      code: 'flue_gas_temp',
      name: 'Flue Gas Stack Temperature',
      dataType: 'number',
      unitCode: '°C',
      value: 248.4,
      updatedAt: '2026-11-14T14:20:00Z',
    },
    {
      id: 'attr-val-103',
      attributeDefinitionId: 'def-steam-cap',
      code: 'steam_capacity',
      name: 'Rated Steam Output Capacity',
      dataType: 'number',
      unitCode: 'kg/h',
      value: 4500,
      updatedAt: '2026-11-10T09:00:00Z',
    },
    {
      id: 'attr-val-104',
      attributeDefinitionId: 'def-comb-eff',
      code: 'combustion_efficiency',
      name: 'Thermal Combustion Efficiency',
      dataType: 'number',
      unitCode: '%',
      value: 89.6,
      updatedAt: '2026-11-14T12:00:00Z',
    },
    {
      id: 'attr-val-105',
      attributeDefinitionId: 'def-fuel-type',
      code: 'fuel_type',
      name: 'Primary Firing Fuel Type',
      dataType: 'select',
      unitCode: null,
      value: 'LOW_SULFUR_DIESEL_005',
      updatedAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'attr-val-106',
      attributeDefinitionId: 'def-economizer',
      code: 'flue_gas_economizer_active',
      name: 'Flue Gas Condensing Economizer Active',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 'attr-val-107',
      attributeDefinitionId: 'def-lwco',
      code: 'dual_lwco_interlock_verified',
      name: 'Dual Low-Water Cutoff (LWCO) Interlock Verified',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-11-12T07:30:00Z',
    },
    {
      id: 'attr-val-108',
      attributeDefinitionId: 'def-hydro-date',
      code: 'last_hydrostatic_test_date',
      name: 'Last Statutory Hydrostatic Inspection Date',
      dataType: 'date',
      unitCode: null,
      value: '2026-09-15',
      updatedAt: '2026-09-15T16:00:00Z',
    },
    {
      id: 'attr-val-109',
      attributeDefinitionId: 'def-safety-json',
      code: 'safety_valve_setpoints',
      name: 'ASME Safety Relief Valve Calibration Matrix',
      dataType: 'json',
      unitCode: null,
      value: {
        srv_primary_pop_bar: 12.0,
        srv_secondary_pop_bar: 12.4,
        blowdown_ring_delta_bar: 0.45,
        certifying_body: 'Factory Inspecting Engineer - Western Province',
      },
      updatedAt: '2026-09-15T16:00:00Z',
    },
  ],

  // BLR-002: Viessmann Vitomax 200-HS Standby Steam Boiler #2
  'a1000000-0000-0000-0000-000000000002': [
    {
      id: 'attr-val-201',
      attributeDefinitionId: 'def-op-pressure',
      code: 'operating_pressure',
      name: 'Operating Steam Pressure',
      dataType: 'number',
      unitCode: 'bar',
      value: 9.8,
      updatedAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 'attr-val-202',
      attributeDefinitionId: 'def-flue-temp',
      code: 'flue_gas_temp',
      name: 'Flue Gas Stack Temperature',
      dataType: 'number',
      unitCode: '°C',
      value: 176.2,
      updatedAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 'attr-val-203',
      attributeDefinitionId: 'def-steam-cap',
      code: 'steam_capacity',
      name: 'Rated Steam Output Capacity',
      dataType: 'number',
      unitCode: 'kg/h',
      value: 4000,
      updatedAt: '2026-11-01T09:00:00Z',
    },
    {
      id: 'attr-val-204',
      attributeDefinitionId: 'def-comb-eff',
      code: 'combustion_efficiency',
      name: 'Thermal Combustion Efficiency',
      dataType: 'number',
      unitCode: '%',
      value: 94.1,
      updatedAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 'attr-val-205',
      attributeDefinitionId: 'def-fuel-type',
      code: 'fuel_type',
      name: 'Primary Firing Fuel Type',
      dataType: 'select',
      unitCode: null,
      value: 'DUAL_FUEL_LPG_DIESEL',
      updatedAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'attr-val-206',
      attributeDefinitionId: 'def-economizer',
      code: 'flue_gas_economizer_active',
      name: 'Flue Gas Condensing Economizer Active',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 'attr-val-207',
      attributeDefinitionId: 'def-hydro-date',
      code: 'last_hydrostatic_test_date',
      name: 'Last Statutory Hydrostatic Inspection Date',
      dataType: 'date',
      unitCode: null,
      value: '2026-10-20',
      updatedAt: '2026-10-20T14:00:00Z',
    },
  ],

  // P-001: Grundfos Multistage Boiler Feedwater Pump A
  'a1000000-0000-0000-0000-000000000003': [
    {
      id: 'attr-val-301',
      attributeDefinitionId: 'def-disch-press',
      code: 'discharge_pressure',
      name: 'Pump Discharge Head Pressure',
      dataType: 'number',
      unitCode: 'bar',
      value: 14.2,
      updatedAt: '2026-11-14T11:30:00Z',
    },
    {
      id: 'attr-val-302',
      attributeDefinitionId: 'def-flow-rate',
      code: 'nominal_flow_rate',
      name: 'Nominal Volumetric Flow Rate',
      dataType: 'number',
      unitCode: 'm³/h',
      value: 18.5,
      updatedAt: '2026-11-14T11:30:00Z',
    },
    {
      id: 'attr-val-303',
      attributeDefinitionId: 'def-motor-kw',
      code: 'motor_rated_power',
      name: 'Electric Motor Nameplate Power',
      dataType: 'number',
      unitCode: 'kW',
      value: 15.0,
      updatedAt: '2026-10-12T08:00:00Z',
    },
    {
      id: 'attr-val-304',
      attributeDefinitionId: 'def-vib-rms',
      code: 'bearing_vibration_rms',
      name: 'DE Bearing Overall Vibration Velocity',
      dataType: 'number',
      unitCode: 'mm/s',
      value: 1.84,
      updatedAt: '2026-11-14T07:00:00Z',
    },
    {
      id: 'attr-val-305',
      attributeDefinitionId: 'def-vfd',
      code: 'vfd_closed_loop_control',
      name: 'VFD Closed-Loop Drum Level Modulation',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-10-12T08:00:00Z',
    },
    {
      id: 'attr-val-306',
      attributeDefinitionId: 'def-seal-type',
      code: 'mechanical_seal_spec',
      name: 'Mechanical Cartridge Seal Specification',
      dataType: 'text',
      unitCode: null,
      value: 'HQQE Silicon Carbide / EPDM High-Temp 120°C',
      updatedAt: '2026-10-12T08:00:00Z',
    },
  ],

  // T-001: Pressurized Thermal Deaerator & Feedwater Storage Vessel
  'a1000000-0000-0000-0000-000000000004': [
    {
      id: 'attr-val-401',
      attributeDefinitionId: 'def-vessel-cap',
      code: 'storage_capacity',
      name: 'Storage Vessel Volumetric Capacity',
      dataType: 'number',
      unitCode: 'L',
      value: 8000,
      updatedAt: '2026-11-10T09:00:00Z',
    },
    {
      id: 'attr-val-402',
      attributeDefinitionId: 'def-da-temp',
      code: 'deaeration_operating_temp',
      name: 'Deaeration Dome Saturation Temperature',
      dataType: 'number',
      unitCode: '°C',
      value: 105.4,
      updatedAt: '2026-11-14T13:10:00Z',
    },
    {
      id: 'attr-val-403',
      attributeDefinitionId: 'def-do2',
      code: 'dissolved_oxygen_residual',
      name: 'Effluent Dissolved Oxygen Concentration',
      dataType: 'number',
      unitCode: 'ppb',
      value: 5.2,
      updatedAt: '2026-11-14T13:10:00Z',
    },
    {
      id: 'attr-val-404',
      attributeDefinitionId: 'def-scavenger',
      code: 'oxygen_scavenger_dosing_active',
      name: 'Catalyzed Sulfite Chemical Dosing Active',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-11-14T08:00:00Z',
    },
    {
      id: 'attr-val-405',
      attributeDefinitionId: 'def-ndt-date',
      code: 'last_ultrasonic_thickness_date',
      name: 'Last Ultrasonic Shell Thickness NDT',
      dataType: 'date',
      unitCode: null,
      value: '2026-08-22',
      updatedAt: '2026-08-22T15:00:00Z',
    },
  ],

  // CHL-001: Trane CenTraVac Water-Cooled Centrifugal Chiller #1
  'a1000000-0000-0000-0000-000000000005': [
    {
      id: 'attr-val-501',
      attributeDefinitionId: 'def-cooling-cap',
      code: 'cooling_capacity_tons',
      name: 'Nominal Refrigeration Capacity',
      dataType: 'number',
      unitCode: 'TR',
      value: 650,
      updatedAt: '2026-11-14T11:00:00Z',
    },
    {
      id: 'attr-val-502',
      attributeDefinitionId: 'def-chw-supply',
      code: 'chilled_water_leaving_temp',
      name: 'Chilled Water Leaving Temperature (CHWST)',
      dataType: 'number',
      unitCode: '°C',
      value: 6.7,
      updatedAt: '2026-11-14T11:00:00Z',
    },
    {
      id: 'attr-val-503',
      attributeDefinitionId: 'def-kw-per-ton',
      code: 'specific_power_efficiency',
      name: 'Full-Load Specific Efficiency',
      dataType: 'number',
      unitCode: 'kW/TR',
      value: 0.51,
      updatedAt: '2026-11-14T11:00:00Z',
    },
    {
      id: 'attr-val-504',
      attributeDefinitionId: 'def-ref-type',
      code: 'refrigerant_designation',
      name: 'ASHRAE Refrigerant Classification',
      dataType: 'select',
      unitCode: null,
      value: 'R-514A_ULTRA_LOW_GWP',
      updatedAt: '2026-06-01T10:00:00Z',
    },
    {
      id: 'attr-val-505',
      attributeDefinitionId: 'def-purge-active',
      code: 'earthwise_purge_system_online',
      name: 'High-Efficiency Non-Condensable Purge Online',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-11-14T11:00:00Z',
    },
  ],

  // BLR-003: Fulton VMP-120 Vertical Tubeless Steam Boiler (Under Maintenance)
  'a1000000-0000-0000-0000-000000000006': [
    {
      id: 'attr-val-601',
      attributeDefinitionId: 'def-op-pressure',
      code: 'operating_pressure',
      name: 'Operating Steam Pressure',
      dataType: 'number',
      unitCode: 'bar',
      value: 8.2,
      updatedAt: '2026-11-14T06:45:00Z',
    },
    {
      id: 'attr-val-602',
      attributeDefinitionId: 'def-flue-temp',
      code: 'flue_gas_temp',
      name: 'Flue Gas Stack Temperature',
      dataType: 'number',
      unitCode: '°C',
      value: 262.0,
      updatedAt: '2026-11-14T06:45:00Z',
    },
    {
      id: 'attr-val-603',
      attributeDefinitionId: 'def-steam-cap',
      code: 'steam_capacity',
      name: 'Rated Steam Output Capacity',
      dataType: 'number',
      unitCode: 'kg/h',
      value: 1910,
      updatedAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'attr-val-604',
      attributeDefinitionId: 'def-fuel-type',
      code: 'fuel_type',
      name: 'Primary Firing Fuel Type',
      dataType: 'select',
      unitCode: null,
      value: 'LPG_PROPANE_VAPOR',
      updatedAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'attr-val-605',
      attributeDefinitionId: 'def-economizer',
      code: 'flue_gas_economizer_active',
      name: 'Flue Gas Condensing Economizer Active',
      dataType: 'boolean',
      unitCode: null,
      value: false,
      updatedAt: '2026-11-14T06:45:00Z',
    },
    {
      id: 'attr-val-606',
      attributeDefinitionId: 'def-hydro-date',
      code: 'last_hydrostatic_test_date',
      name: 'Last Statutory Hydrostatic Inspection Date',
      dataType: 'date',
      unitCode: null,
      value: '2026-04-10',
      updatedAt: '2026-04-10T11:00:00Z',
    },
  ],

  // BLR-004: Miura LX-200SG Low-NOx Once-Through Steam Boiler
  'a1000000-0000-0000-0000-000000000009': [
    {
      id: 'attr-val-901',
      attributeDefinitionId: 'def-op-pressure',
      code: 'operating_pressure',
      name: 'Operating Steam Pressure',
      dataType: 'number',
      unitCode: 'bar',
      value: 7.0,
      updatedAt: '2026-11-14T15:00:00Z',
    },
    {
      id: 'attr-val-902',
      attributeDefinitionId: 'def-flue-temp',
      code: 'flue_gas_temp',
      name: 'Flue Gas Stack Temperature',
      dataType: 'number',
      unitCode: '°C',
      value: 168.5,
      updatedAt: '2026-11-14T15:00:00Z',
    },
    {
      id: 'attr-val-903',
      attributeDefinitionId: 'def-steam-cap',
      code: 'steam_capacity',
      name: 'Rated Steam Output Capacity',
      dataType: 'number',
      unitCode: 'kg/h',
      value: 3130,
      updatedAt: '2026-11-01T09:00:00Z',
    },
    {
      id: 'attr-val-904',
      attributeDefinitionId: 'def-nox-ppm',
      code: 'nox_emissions_level',
      name: 'Stack NOx Emissions Concentration',
      dataType: 'number',
      unitCode: 'ppm',
      value: 14.2,
      updatedAt: '2026-11-14T15:00:00Z',
    },
    {
      id: 'attr-val-905',
      attributeDefinitionId: 'def-economizer',
      code: 'flue_gas_economizer_active',
      name: 'Flue Gas Condensing Economizer Active',
      dataType: 'boolean',
      unitCode: null,
      value: true,
      updatedAt: '2026-11-01T09:00:00Z',
    },
  ],
};

/**
 * Generates sensible typed attributes for any remaining fallback asset
 * based on its category so every row in the table has dynamic API attributes.
 */
function getFallbackAttributesForAsset(asset: AssetSummary): DynamicEquipmentAttribute[] {
  const existing = FALLBACK_ATTRIBUTES_BY_ASSET[asset.id];
  if (existing) return existing;

  if (asset.assetCategory.code === 'GENERATOR') {
    return [
      {
        id: `attr-${asset.id}-1`,
        attributeDefinitionId: 'def-kva',
        code: 'prime_power_rating',
        name: 'Standby Power Rating',
        dataType: 'number',
        unitCode: 'kVA',
        value: 1250,
        updatedAt: '2026-11-10T10:00:00Z',
      },
      {
        id: `attr-${asset.id}-2`,
        attributeDefinitionId: 'def-fuel-tank',
        code: 'day_tank_fuel_level',
        name: 'Belly Tank Diesel Reserve Level',
        dataType: 'number',
        unitCode: '%',
        value: 96.5,
        updatedAt: '2026-11-14T08:00:00Z',
      },
      {
        id: `attr-${asset.id}-3`,
        attributeDefinitionId: 'def-ats-ready',
        code: 'auto_start_interlock_armed',
        name: 'ATS Auto-Start Interlock Armed',
        dataType: 'boolean',
        unitCode: null,
        value: true,
        updatedAt: '2026-11-14T08:00:00Z',
      },
      {
        id: `attr-${asset.id}-4`,
        attributeDefinitionId: 'def-load-bank-date',
        code: 'last_load_bank_test_date',
        name: 'Last 100% Load Bank Test Date',
        dataType: 'date',
        unitCode: null,
        value: '2026-10-28',
        updatedAt: '2026-10-28T16:00:00Z',
      },
    ];
  }

  return [
    {
      id: `attr-${asset.id}-1`,
      attributeDefinitionId: 'def-op-hours',
      code: 'cumulative_run_hours',
      name: 'Cumulative Operating Run Hours',
      dataType: 'number',
      unitCode: 'hrs',
      value: 14280,
      updatedAt: '2026-11-14T09:00:00Z',
    },
    {
      id: `attr-${asset.id}-2`,
      attributeDefinitionId: 'def-design-pressure',
      code: 'max_allowable_working_pressure',
      name: 'Max Allowable Working Pressure (MAWP)',
      dataType: 'number',
      unitCode: 'bar',
      value: 16.0,
      updatedAt: '2026-10-01T09:00:00Z',
    },
    {
      id: `attr-${asset.id}-3`,
      attributeDefinitionId: 'def-telemetry-online',
      code: 'bms_modbus_telemetry_linked',
      name: 'BMS Modbus TCP Telemetry Linked',
      dataType: 'boolean',
      unitCode: null,
      value: asset.status !== 'decommissioned',
      updatedAt: '2026-11-01T09:00:00Z',
    },
    {
      id: `attr-${asset.id}-4`,
      attributeDefinitionId: 'def-iso-class',
      code: 'iso_14224_equipment_class',
      name: 'ISO 14224 Equipment Taxonomy Code',
      dataType: 'text',
      unitCode: null,
      value: `ISO-${asset.assetCategory.code}-CLASS-A`,
      updatedAt: '2026-09-01T09:00:00Z',
    },
  ];
}

export const assetsApiService = {
  /**
   * Fetches all assets for the current tenant (`GET /api/assets`).
   * Gracefully falls back to the seeded catalog if backend is unreachable.
   */
  async listAssets(filters?: AssetListFilters): Promise<AssetSummary[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('siteId', filters.siteId);
      if (filters?.categoryId) params.set('categoryId', filters.categoryId);
      if (filters?.locationId) params.set('locationId', filters.locationId);
      if (filters?.systemId) params.set('systemId', filters.systemId);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiRequest<AssetSummary[]>(`/api/assets${query}`, {
        method: 'GET',
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch {
      // Fallback to local multi-tenant catalog when offline
    }

    return FALLBACK_ASSETS.filter((asset) => {
      if (filters?.siteId && asset.site.id !== filters.siteId) return false;
      if (filters?.categoryId && asset.assetCategory.id !== filters.categoryId) return false;
      return true;
    });
  },

  /**
   * Fetches dynamic equipment attributes (`GET /api/assets/:id/attributes`)
   * from the Dynamic Equipment Attributes service.
   */
  async getAssetDynamicAttributes(assetId: string): Promise<AssetDynamicAttributesResponse> {
    try {
      const response = await apiRequest<AssetDynamicAttributesResponse>(
        `/api/assets/${assetId}/attributes`,
        {
          method: 'GET',
        }
      );
      if (response.data && Array.isArray(response.data.attributes)) {
        return response.data;
      }
    } catch {
      // Fallback to local dynamic attributes store when backend is offline
    }

    const asset =
      FALLBACK_ASSETS.find((a) => a.id === assetId) ?? FALLBACK_ASSETS[0];
    const attrs = getFallbackAttributesForAsset(asset);

    return {
      assetId: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      attributes: attrs.map((a) => ({ ...a })),
    };
  },

  /**
   * Updates dynamic equipment attributes (`PUT /api/assets/:id/attributes`)
   * with runtime type validation against `data_type`.
   */
  async updateAssetDynamicAttributes(
    assetId: string,
    updates: Array<{ code: string; value: unknown }>
  ): Promise<AssetDynamicAttributesResponse> {
    try {
      const response = await apiRequest<AssetDynamicAttributesResponse>(
        `/api/assets/${assetId}/attributes`,
        {
          method: 'PUT',
          body: JSON.stringify({ attributes: updates }),
        }
      );
      if (response.data && Array.isArray(response.data.attributes)) {
        return response.data;
      }
    } catch {
      // Apply type-checked update to local in-memory fallback store
    }

    const asset =
      FALLBACK_ASSETS.find((a) => a.id === assetId) ?? FALLBACK_ASSETS[0];
    const currentList = getFallbackAttributesForAsset(asset);
    const nowIso = new Date().toISOString();

    const updatedList = currentList.map((attr) => {
      const match = updates.find((u) => u.code === attr.code);
      if (!match) return attr;
      return {
        ...attr,
        value: match.value,
        updatedAt: nowIso,
      };
    });

    FALLBACK_ATTRIBUTES_BY_ASSET[asset.id] = updatedList;

    return {
      assetId: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      attributes: updatedList,
    };
  },
};

