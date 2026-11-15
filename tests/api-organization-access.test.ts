import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt.utils';
import { authService } from '../src/modules/auth/auth.service';
import { organizationService } from '../src/modules/organization/organization.service';
import { usersService } from '../src/modules/users/users.service';
import { rolesService } from '../src/modules/roles/roles.service';

describe('Organization & Access REST API Endpoints', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';
  const USER_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const validTokenTenantA = signToken({
    userId: USER_A_ID,
    email: 'admin@luminafm.com',
    organizationId: TENANT_A_ID,
    isPlatformAdmin: false,
  });

  const validTokenTenantB = signToken({
    userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'admin@clientb.com',
    organizationId: TENANT_B_ID,
    isPlatformAdmin: false,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('2. Authentication Endpoints (POST /api/auth/login & register)', () => {
    it('POST /api/auth/login should return 400 when missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/login should return user_id, organization_id, and logo_uri on success', async () => {
      vi.spyOn(authService, 'login').mockResolvedValueOnce({
        accessToken: 'mock-jwt-token',
        userId: USER_A_ID,
        organizationId: TENANT_A_ID,
        logoUri: '/uploads/logos/custom-client-logo.png',
        user: {
          id: USER_A_ID,
          email: 'admin@luminafm.com',
          fullName: 'Jane Doe',
          jobTitle: 'Head of Facilities',
        },
        organization: {
          id: TENANT_A_ID,
          code: 'CLIENT-A',
          name: 'Client A Group',
          logoUri: '/uploads/logos/custom-client-logo.png',
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@luminafm.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.access_token).toBe('mock-jwt-token');
      expect(res.body.data.user_id).toBe(USER_A_ID);
      expect(res.body.data.organization_id).toBe(TENANT_A_ID);
      expect(res.body.data.logo_uri).toBe('/uploads/logos/custom-client-logo.png');
    });

    it('POST /api/auth/register should create tenant and return initial auth payload', async () => {
      vi.spyOn(authService, 'registerTenant').mockResolvedValueOnce({
        accessToken: 'mock-jwt-token-new',
        userId: USER_A_ID,
        organizationId: TENANT_A_ID,
        logoUri: null,
        user: {
          id: USER_A_ID,
          email: 'founder@hotelgroup.com',
          fullName: 'Robert Paulson',
        },
        organization: {
          id: TENANT_A_ID,
          code: 'HOTEL-GRP',
          name: 'Hotel Group Holdings',
          logoUri: null,
        },
      });

      const res = await request(app).post('/api/auth/register').send({
        organizationCode: 'HOTEL-GRP',
        organizationName: 'Hotel Group Holdings',
        email: 'founder@hotelgroup.com',
        password: 'SecurePassword123!',
        fullName: 'Robert Paulson',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user_id).toBe(USER_A_ID);
      expect(res.body.data.organization_id).toBe(TENANT_A_ID);
    });
  });

  describe('3. Organization Settings & White-Label Logo Upload (PATCH /api/organization/settings)', () => {
    it('should reject requests without authorization token with 401', async () => {
      const res = await request(app).patch('/api/organization/settings').send({ name: 'Hacked Org' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/organization/settings should retrieve settings for the active tenant', async () => {
      vi.spyOn(organizationService, 'getSettings').mockResolvedValueOnce({
        id: TENANT_A_ID,
        code: 'CLIENT-A',
        name: 'Client A Group',
        legalName: 'Client A Group Ltd.',
        logoUri: '/uploads/logos/logo.png',
        timezone: 'Asia/Colombo',
        baseCurrency: 'LKR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/organization/settings')
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(TENANT_A_ID);
      expect(res.body.data.logoUri).toBe('/uploads/logos/logo.png');
    });

    it('PATCH /api/organization/settings should update organization text settings', async () => {
      vi.spyOn(organizationService, 'updateSettings').mockResolvedValueOnce({
        id: TENANT_A_ID,
        code: 'CLIENT-A',
        name: 'Client A Luxury Resorts',
        legalName: 'Client A Luxury Resorts PLC',
        logoUri: '/uploads/logos/existing-logo.png',
        timezone: 'Asia/Colombo',
        baseCurrency: 'USD',
        isActive: true,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/organization/settings')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          name: 'Client A Luxury Resorts',
          baseCurrency: 'USD',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Client A Luxury Resorts');
      expect(res.body.data.baseCurrency).toBe('USD');
    });

    it('PATCH /api/organization/settings should handle Multer file upload to replace logo_uri', async () => {
      vi.spyOn(organizationService, 'updateSettings').mockImplementation(async (dto) => {
        expect(dto.logoUri).toMatch(/^\/uploads\/logos\/logo-/);
        return {
          id: TENANT_A_ID,
          code: 'CLIENT-A',
          name: 'Client A Luxury Resorts',
          legalName: 'Client A Luxury Resorts PLC',
          logoUri: dto.logoUri || null,
          timezone: 'Asia/Colombo',
          baseCurrency: 'USD',
          isActive: true,
          updatedAt: new Date(),
        };
      });

      // Send a dummy PNG image buffer
      const dummyPngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

      const res = await request(app)
        .patch('/api/organization/settings')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .field('name', 'Client A Luxury Resorts')
        .attach('logo', dummyPngBuffer, 'company-brand.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logoUri).toContain('/uploads/logos/logo-');
    });
  });

  describe('4. User Management Endpoints (CRUD /api/users)', () => {
    it('GET /api/users should list users within active tenant', async () => {
      vi.spyOn(usersService, 'listUsers').mockResolvedValueOnce([
        {
          membershipId: 'mem-1',
          organizationId: TENANT_A_ID,
          status: 'active',
          employeeCode: 'EMP-001',
          jobTitle: 'Maintenance Engineer',
          joinedAt: new Date(),
          user: {
            id: USER_A_ID,
            email: 'john@hotel.com',
            fullName: 'John Smith',
            phone: '+94771234567',
            isActive: true,
            lastLoginAt: null,
            createdAt: new Date(),
          },
          roles: [{ id: 'role-1', name: 'Technician', isSystemRole: false }],
        },
      ]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].organizationId).toBe(TENANT_A_ID);
    });

    it('POST /api/users should add a new user to the organization', async () => {
      vi.spyOn(usersService, 'createUser').mockResolvedValueOnce({
        membershipId: 'mem-2',
        organizationId: TENANT_A_ID,
        status: 'active',
        employeeCode: 'EMP-002',
        jobTitle: 'Boiler Specialist',
        joinedAt: new Date(),
        user: {
          id: 'user-2',
          email: 'alex@hotel.com',
          fullName: 'Alex Vance',
          phone: null,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        },
        roles: [],
      });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          email: 'alex@hotel.com',
          fullName: 'Alex Vance',
          jobTitle: 'Boiler Specialist',
          employeeCode: 'EMP-002',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alex@hotel.com');
    });

    it('GET /api/users/:id should return details for user in tenant', async () => {
      vi.spyOn(usersService, 'getUserById').mockResolvedValueOnce({
        membershipId: 'mem-1',
        organizationId: TENANT_A_ID,
        status: 'active',
        employeeCode: 'EMP-001',
        jobTitle: 'Technician',
        joinedAt: new Date(),
        user: {
          id: USER_A_ID,
          email: 'john@hotel.com',
          fullName: 'John Smith',
          phone: null,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
        },
        roles: [],
      });

      const res = await request(app)
        .get(`/api/users/${USER_A_ID}`)
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(USER_A_ID);
    });

    it('DELETE /api/users/:id should remove user membership from tenant', async () => {
      vi.spyOn(usersService, 'deleteUser').mockResolvedValueOnce({
        success: true,
        message: 'User has been removed from the organization.',
      });

      const res = await request(app)
        .delete(`/api/users/${USER_A_ID}`)
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Role Management Endpoints (CRUD /api/roles)', () => {
    it('GET /api/roles should list roles in active tenant', async () => {
      vi.spyOn(rolesService, 'listRoles').mockResolvedValueOnce([
        {
          id: 'role-admin',
          organizationId: TENANT_A_ID,
          name: 'Administrator',
          description: 'Full access',
          isSystemRole: true,
          createdAt: new Date(),
          permissions: [],
        },
      ]);

      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Administrator');
    });

    it('POST /api/roles should create a new custom role', async () => {
      vi.spyOn(rolesService, 'createRole').mockResolvedValueOnce({
        id: 'role-hvac',
        organizationId: TENANT_A_ID,
        name: 'HVAC Specialist',
        description: 'Chillers and Boilers',
        isSystemRole: false,
        createdAt: new Date(),
        permissions: [],
      });

      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({
          name: 'HVAC Specialist',
          description: 'Chillers and Boilers',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('HVAC Specialist');
    });

    it('DELETE /api/roles/:id should delete custom role', async () => {
      vi.spyOn(rolesService, 'deleteRole').mockResolvedValueOnce({
        success: true,
        message: 'Role deleted.',
      });

      const res = await request(app)
        .delete('/api/roles/role-hvac')
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/roles/permissions/catalog should list permissions catalog', async () => {
      vi.spyOn(rolesService, 'listPermissionsCatalog').mockResolvedValueOnce([
        { id: 'perm-1', permissionKey: 'assets.manage', description: 'Manage assets' },
      ]);

      const res = await request(app)
        .get('/api/roles/permissions/catalog')
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].permissionKey).toBe('assets.manage');
    });
  });
});

