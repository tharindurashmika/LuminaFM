-- =============================================================================
-- LuminaFM - PostgreSQL Row-Level Security (RLS) & Application Role Setup
-- =============================================================================
-- Migration: 20261115000001_enable_rls
-- Target: PostgreSQL 15+
--
-- Defense-in-depth: Enforces tenant isolation at the database kernel level
-- using transaction-scoped session variable 'app.current_tenant_id'.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. DATABASE APPLICATION ROLE (Cannot bypass RLS)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lumina_app') THEN
    CREATE ROLE lumina_app WITH LOGIN PASSWORD 'lumina_app_secure_password_2026';
  END IF;
END
$$;

-- Explicitly ensure application role DOES NOT have SUPERUSER or BYPASSRLS
ALTER ROLE lumina_app NOSUPERUSER;
ALTER ROLE lumina_app NOBYPASSRLS;

-- Grant schema and table permissions
GRANT CONNECT ON DATABASE lumina_fm TO lumina_app;
GRANT USAGE ON SCHEMA public TO lumina_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lumina_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lumina_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lumina_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lumina_app;

-- -----------------------------------------------------------------------------
-- 2. HELPER FUNCTION: GET CURRENT TENANT ID FROM TRANSACTION CONTEXT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- -----------------------------------------------------------------------------
-- 3. ENABLE AND FORCE ROW-LEVEL SECURITY ON ALL TENANT-OWNED TABLES
-- -----------------------------------------------------------------------------

-- Macro function to enable RLS and add tenant isolation policy
DO $$
DECLARE
  tbl_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'organization_memberships',
    'roles',
    'role_permissions',
    'membership_roles',
    'sites',
    'location_types',
    'locations',
    'system_categories',
    'system_types',
    'systems',
    'asset_categories',
    'brands',
    'asset_models',
    'assets',
    'attribute_definitions',
    'category_attributes',
    'asset_attribute_values',
    'units_of_measurement',
    'meter_definitions',
    'asset_meters',
    'meter_readings',
    'offline_sync_batches',
    'maintenance_types',
    'maintenance_task_templates',
    'maintenance_plans',
    'maintenance_plan_tasks',
    'asset_maintenance_plans',
    'work_orders',
    'work_order_tasks',
    'work_order_labor',
    'work_order_parts',
    'work_order_status_history',
    'checklist_templates',
    'checklist_items',
    'inspections',
    'inspection_responses',
    'fault_logs',
    'decision_models',
    'decision_criteria',
    'decision_alternatives',
    'decision_pairwise_comparisons',
    'decision_network_edges',
    'decision_runs',
    'attachments',
    'entity_attachments',
    'notifications',
    'audit_logs'
  ];
BEGIN
  -- Enable and apply to root organizations table (policy checks id = current_tenant_id)
  EXECUTE 'ALTER TABLE organizations ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE organizations FORCE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_organizations ON organizations';
  EXECUTE 'CREATE POLICY tenant_isolation_organizations ON organizations ' ||
          'AS RESTRICTIVE ' ||
          'USING (id = get_current_tenant_id()) ' ||
          'WITH CHECK (id = get_current_tenant_id())';

  -- Enable and apply to all 47 child tenant tables (policy checks organization_id = current_tenant_id)
  FOREACH tbl_name IN ARRAY tenant_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl_name);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl_name);
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I ' ||
        'AS RESTRICTIVE ' ||
        'USING (organization_id = get_current_tenant_id()) ' ||
        'WITH CHECK (organization_id = get_current_tenant_id())',
        tbl_name
      );
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping RLS policy.', tbl_name;
    END;
  END LOOP;
END
$$;

COMMIT;

