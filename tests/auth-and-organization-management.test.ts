import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { authService } from '../src/modules/auth/auth.service';
import { tokenService } from '../src/modules/auth/token.service';
import { organizationService } from '../src/modules/organization/organization.service';
import {
  LUMINA_FALLBACK_BRANDING,
  resolveEffectiveBranding,
} from '../src/modules/organization/branding.constants';
import { LocalObjectStorageService } from '../src/services/storage.service';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import { hashPassword, comparePassword } from '../src/utils/password.utils';
import { signAccessToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt.utils';
import prisma from '../src/lib/prisma';

// Test Constants & Tenant IDs
const ORG_A_ID = '11111111-1111-4111-8111-111111111111'; // Kingsbury Hotel
const ORG_B_ID = '22222222-2222-4222-8222-222222222222'; // Hilton Colombo
const USER_1_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // Multi-tenant user (member of both A & B)
const USER_2_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; // Single-tenant user (member of A only)

describe('LuminaFM Authentication, Organization & Branding Management', () => {
  let tempStorageDir: string;
  let testStorageService: LocalObjectStorageService;

  beforeEach(() => {
    vi.restoreAllMocks();
    tokenService.resetStores();

    // Isolated temporary directory for Object Storage tests
    tempStorageDir = path.resolve(process.cwd(), 'uploads', 'test-storage');
    if (!fs.existsSync(tempStorageDir)) {
      fs.mkdirSync(tempStorageDir, { recursive: true });
    }
    testStorageService = new LocalObjectStorageService(tempStorageDir);
  });

  afterEach(() => {
    tokenService.resetStores();
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  // ===========================================================================
  // 1. SECURE LOGIN & MULTI-ORGANIZATION SELECTION
  // ===========================================================================
  describe('1. Secure Login & Multi-Organization Selection', () => {
    it('should successfully authenticate user, return tokens, and include available organizations', async () => {
      const passwordHash = await hashPassword('SecurePass123!');

      const mockUser: any = {
        id: USER_1_ID,
        email: 'engineer@hotelgroup.com',
        fullName: 'Jane Doe',
        passwordHash,
        isActive: true,
        isPlatformAdmin: false,
        memberships: [
          {
            id: 'mem-1',
            organizationId: ORG_A_ID,
            jobTitle: 'Chief Boiler Engineer',
            status: 'active',
            organization: {
              id: ORG_A_ID,
              code: 'KINGSBURY',
              name: 'The Kingsbury Hotel',
              logoUri: '/uploads/logos/kingsbury-logo.png',
              timezone: 'Asia/Colombo',
              baseCurrency: 'LKR',
              branding: { primaryColor: '#1e3a8a' },
            },
            membershipRoles: [
              {
                role: {
                  name: 'ChiefEngineer',
                  rolePermissions: [
                    { permission: { permissionKey: 'operations:read' } },
                    { permission: { permissionKey: 'operations:create' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'mem-2',
            organizationId: ORG_B_ID,
            jobTitle: 'Consulting Engineer',
            status: 'active',
            organization: {
              id: ORG_B_ID,
              code: 'HILTON',
              name: 'Hilton Colombo',
              logoUri: null,
              timezone: 'Asia/Colombo',
              baseCurrency: 'LKR',
              branding: {},
            },
            membershipRoles: [
              {
                role: {
                  name: 'Consultant',
                  rolePermissions: [{ permission: { permissionKey: 'operations:read' } }],
                },
              },
            ],
          },
        ],
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValueOnce(mockUser);

      // User logs in without specifying organization -> defaults to first, lists both
      const response = await authService.login({
        email: 'engineer@hotelgroup.com',
        password: 'SecurePass123!',
      });

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.userId).toBe(USER_1_ID);
      expect(response.organizationId).toBe(ORG_A_ID);
      expect(response.organization.name).toBe('The Kingsbury Hotel');
      expect(response.availableOrganizations).toHaveLength(2);
      expect(response.availableOrganizations![0].code).toBe('KINGSBURY');
      expect(response.availableOrganizations![1].code).toBe('HILTON');
      expect(response.permissions).toContain('operations:create');

      // Verify access token is valid JWT
      const verified = verifyAccessToken(response.accessToken);
      expect(verified.userId).toBe(USER_1_ID);
      expect(verified.organizationId).toBe(ORG_A_ID);
    });

    it('should allow user to explicitly select an organization by code upon login', async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      const mockUser: any = {
        id: USER_1_ID,
        email: 'engineer@hotelgroup.com',
        passwordHash,
        isActive: true,
        memberships: [
          {
            id: 'mem-1',
            organizationId: ORG_A_ID,
            organization: { id: ORG_A_ID, code: 'KINGSBURY', name: 'The Kingsbury Hotel' },
            membershipRoles: [],
          },
          {
            id: 'mem-2',
            organizationId: ORG_B_ID,
            organization: { id: ORG_B_ID, code: 'HILTON', name: 'Hilton Colombo' },
            membershipRoles: [],
          },
        ],
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValueOnce(mockUser);

      const response = await authService.login({
        email: 'engineer@hotelgroup.com',
        password: 'SecurePass123!',
        organizationCode: 'HILTON',
      });

      expect(response.organizationId).toBe(ORG_B_ID);
      expect(response.organization.code).toBe('HILTON');
    });

    it('should REJECT login with 401 when password is invalid', async () => {
      const passwordHash = await hashPassword('CorrectPassword123!');
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: USER_1_ID,
        email: 'test@lumina.io',
        passwordHash,
        isActive: true,
        memberships: [],
      } as any);

      await expect(
        authService.login({ email: 'test@lumina.io', password: 'WrongPassword!' })
      ).rejects.toMatchObject({
        status: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should REJECT login with 403 when user has no active memberships', async () => {
      const passwordHash = await hashPassword('CorrectPassword123!');
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: USER_1_ID,
        email: 'orphaned@lumina.io',
        passwordHash,
        isActive: true,
        memberships: [], // No active memberships
      } as any);

      await expect(
        authService.login({ email: 'orphaned@lumina.io', password: 'CorrectPassword123!' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NO_ACTIVE_MEMBERSHIP',
      });
    });

    it('should REJECT login when user specifies an organization they do NOT belong to', async () => {
      const passwordHash = await hashPassword('CorrectPassword123!');
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: USER_1_ID,
        email: 'user@hotel.com',
        passwordHash,
        isActive: true,
        memberships: [
          {
            organizationId: ORG_A_ID,
            organization: { id: ORG_A_ID, code: 'KINGSBURY' },
            membershipRoles: [],
          },
        ],
      } as any);

      await expect(
        authService.login({
          email: 'user@hotel.com',
          password: 'CorrectPassword123!',
          organizationCode: 'UNAUTHORIZED_HOTEL',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'MEMBERSHIP_NOT_FOUND',
      });
    });
  });

  // ===========================================================================
  // 2. TOKEN RENEWAL, ROTATION & REVOCATION (REFRESH TOKENS & LOGOUT)
  // ===========================================================================
  describe('2. Token Renewal, Refresh Rotation & Logout Revocation', () => {
    it('should renew access token and rotate refresh token', async () => {
      // Setup initial session
      const userPayload = {
        userId: USER_1_ID,
        email: 'operator@kingsbury.lk',
        organizationId: ORG_A_ID,
        roles: ['Operator'],
        permissions: ['operations:read'],
      };

      const initialTokens = await tokenService.generateTokenPair(userPayload);

      // Mock resolveUserPayload during rotation
      vi.spyOn(authService, 'resolveUserPayload').mockResolvedValueOnce(userPayload);

      const renewed = await authService.renewToken(initialTokens.refreshToken);

      expect(renewed.accessToken).toBeDefined();
      expect(renewed.refreshToken).toBeDefined();
      expect(renewed.refreshToken).not.toBe(initialTokens.refreshToken); // Rotated!
      expect(renewed.userId).toBe(USER_1_ID);
      expect(renewed.organizationId).toBe(ORG_A_ID);

      // Verify old refresh token can NO LONGER be used (replay attack defense)
      await expect(authService.renewToken(initialTokens.refreshToken)).rejects.toMatchObject({
        status: 401,
        code: 'REVOKED_REFRESH_TOKEN',
      });
    });

    it('should immediately revoke refresh token upon logout', async () => {
      const userPayload = {
        userId: USER_1_ID,
        email: 'operator@kingsbury.lk',
        organizationId: ORG_A_ID,
      };

      const tokens = await tokenService.generateTokenPair(userPayload);

      // Logout
      const logoutResult = await authService.logout(tokens.refreshToken);
      expect(logoutResult.success).toBe(true);

      // Attempting to refresh with the logged-out token must fail
      await expect(authService.renewToken(tokens.refreshToken)).rejects.toMatchObject({
        status: 401,
        code: 'REVOKED_REFRESH_TOKEN',
      });
    });
  });

  // ===========================================================================
  // 3. PASSWORD RECOVERY WORKFLOW
  // ===========================================================================
  describe('3. Password Recovery (Forgot Password & Reset)', () => {
    it('should execute full password recovery: generate reset token, update password, revoke old sessions', async () => {
      const oldPasswordHash = await hashPassword('OldPassword123!');
      const mockUser: any = {
        id: USER_2_ID,
        email: 'reset.user@kingsbury.lk',
        passwordHash: oldPasswordHash,
        isActive: true,
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      let updatedPasswordHash: string | undefined;
      vi.spyOn(prisma.user, 'update').mockImplementation(async ({ data }: any) => {
        updatedPasswordHash = data.passwordHash;
        return { ...mockUser, passwordHash: data.passwordHash };
      });

      // 1. Request password reset
      const forgotRes = await authService.forgotPassword('reset.user@kingsbury.lk');
      expect(forgotRes.success).toBe(true);
      expect(forgotRes.resetToken).toBeDefined();

      const resetToken = forgotRes.resetToken!;

      // 2. Reset password
      const resetRes = await authService.resetPassword(resetToken, 'NewSecurePassword2026!');
      expect(resetRes.success).toBe(true);
      expect(updatedPasswordHash).toBeDefined();
      expect(await comparePassword('NewSecurePassword2026!', updatedPasswordHash!)).toBe(true);

      // 3. Reusing the reset token must be REJECTED
      await expect(
        authService.resetPassword(resetToken, 'AnotherPassword123!')
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_RESET_TOKEN',
      });
    });

    it('should reject password reset when password is too short (< 8 chars)', async () => {
      await expect(authService.resetPassword('some-token', 'short')).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    });
  });

  // ===========================================================================
  // 4. USER INVITATION & ACCEPTANCE WORKFLOW
  // ===========================================================================
  describe('4. User Invitation & Acceptance Workflow', () => {
    it('should generate an invitation, allow acceptance, set password, and activate membership', async () => {
      const newEmail = 'new.hire@kingsbury.lk';

      // 1. Admin invites new hire
      vi.spyOn(prisma.organizationMembership, 'findFirst').mockResolvedValueOnce(null); // not active yet
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValueOnce({
        id: 'new-user-id',
        email: newEmail,
        fullName: 'new.hire',
      } as any);
      vi.spyOn(prisma.organizationMembership, 'upsert').mockResolvedValueOnce({
        id: 'new-mem-id',
        status: 'invited',
      } as any);

      const inviteResult = await authService.inviteUser(
        {
          email: newEmail,
          jobTitle: 'Assistant Boiler Operator',
          roleIds: ['role-operator-id'],
        },
        ORG_A_ID,
        USER_1_ID
      );

      expect(inviteResult.success).toBe(true);
      expect(inviteResult.invitation.inviteToken).toBeDefined();

      const inviteToken = inviteResult.invitation.inviteToken;

      // 2. Invitee accepts invitation
      vi.spyOn(prisma.user, 'upsert').mockResolvedValueOnce({
        id: 'new-user-id',
        email: newEmail,
        fullName: 'Alice Walker',
      } as any);
      vi.spyOn(prisma.organizationMembership, 'upsert').mockResolvedValueOnce({
        id: 'new-mem-id',
        organizationId: ORG_A_ID,
        userId: 'new-user-id',
        status: 'active',
        jobTitle: 'Assistant Boiler Operator',
      } as any);
      vi.spyOn(prisma.membershipRole, 'upsert').mockResolvedValueOnce({} as any);
      vi.spyOn(prisma.organization, 'findUnique').mockResolvedValueOnce({
        id: ORG_A_ID,
        code: 'KINGSBURY',
        name: 'The Kingsbury Hotel',
      } as any);

      const acceptResult = await authService.acceptInvite({
        token: inviteToken,
        fullName: 'Alice Walker',
        password: 'PasswordAlice2026!',
      });

      expect(acceptResult.accessToken).toBeDefined();
      expect(acceptResult.refreshToken).toBeDefined();
      expect(acceptResult.user.fullName).toBe('Alice Walker');
      expect(acceptResult.organization.id).toBe(ORG_A_ID);

      // 3. Invitation token cannot be reused
      await expect(
        authService.acceptInvite({
          token: inviteToken,
          fullName: 'Alice Walker',
          password: 'PasswordAlice2026!',
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_INVITATION',
      });
    });

    it('should REJECT invitation if user is already an active member of the organization', async () => {
      vi.spyOn(prisma.organizationMembership, 'findFirst').mockResolvedValueOnce({
        id: 'existing-mem',
        status: 'active',
      } as any);

      await expect(
        authService.inviteUser({ email: 'existing@kingsbury.lk' }, ORG_A_ID)
      ).rejects.toMatchObject({
        status: 409,
        code: 'MEMBERSHIP_EXISTS',
      });
    });
  });

  // ===========================================================================
  // 5. MULTI-ORGANIZATION LISTING & SWITCHING
  // ===========================================================================
  describe('5. Multi-Organization Listing & Active Context Switching', () => {
    it('should list all organizations for a multi-tenant user and indicate the active organization', async () => {
      vi.spyOn(prisma.organizationMembership, 'findMany').mockResolvedValueOnce([
        {
          organizationId: ORG_A_ID,
          jobTitle: 'Lead Engineer',
          employeeCode: 'EMP-001',
          joinedAt: new Date('2025-01-01'),
          organization: {
            id: ORG_A_ID,
            code: 'KINGSBURY',
            name: 'The Kingsbury Hotel',
            legalName: 'Kingsbury PLC',
            logoUri: '/uploads/logos/kingsbury.png',
            timezone: 'Asia/Colombo',
            baseCurrency: 'LKR',
            deploymentMode: 'saas_multitenant',
            branding: {},
          },
          membershipRoles: [{ role: { name: 'Admin' } }],
        },
        {
          organizationId: ORG_B_ID,
          jobTitle: 'Consultant',
          employeeCode: null,
          joinedAt: new Date('2025-06-01'),
          organization: {
            id: ORG_B_ID,
            code: 'HILTON',
            name: 'Hilton Colombo',
            legalName: 'Hilton International',
            logoUri: null,
            timezone: 'Asia/Colombo',
            baseCurrency: 'LKR',
            deploymentMode: 'saas_multitenant',
            branding: {},
          },
          membershipRoles: [{ role: { name: 'Viewer' } }],
        },
      ] as any);

      const orgs = await authService.getUserOrganizations(USER_1_ID, ORG_A_ID);

      expect(orgs).toHaveLength(2);
      expect(orgs[0].code).toBe('KINGSBURY');
      expect(orgs[0].isCurrent).toBe(true); // Active
      expect(orgs[1].code).toBe('HILTON');
      expect(orgs[1].isCurrent).toBe(false);
    });

    it('should switch active organization and issue new tokens bound to target tenant', async () => {
      vi.spyOn(authService, 'getUserOrganizations').mockResolvedValueOnce([
        {
          organizationId: ORG_A_ID,
          code: 'KINGSBURY',
          name: 'Kingsbury',
          jobTitle: 'Engineer',
          roles: ['Admin'],
          isCurrent: true,
          branding: {},
        } as any,
        {
          organizationId: ORG_B_ID,
          code: 'HILTON',
          name: 'Hilton Colombo',
          jobTitle: 'Consultant',
          roles: ['Consultant'],
          isCurrent: false,
          branding: {},
        } as any,
      ]);

      vi.spyOn(authService, 'resolveUserPayload').mockResolvedValueOnce({
        userId: USER_1_ID,
        email: 'engineer@hotelgroup.com',
        organizationId: ORG_B_ID,
        roles: ['Consultant'],
        permissions: ['operations:read'],
      });

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: USER_1_ID,
        email: 'engineer@hotelgroup.com',
        fullName: 'Jane Doe',
      } as any);

      const switchResult = await authService.switchOrganization(USER_1_ID, {
        organizationCode: 'HILTON',
      });

      expect(switchResult.organizationId).toBe(ORG_B_ID);
      expect(switchResult.accessToken).toBeDefined();

      const verified = verifyAccessToken(switchResult.accessToken);
      expect(verified.organizationId).toBe(ORG_B_ID);
      expect(verified.roles).toContain('Consultant');
    });

    it('should REJECT switching to an unauthorized organization', async () => {
      vi.spyOn(authService, 'getUserOrganizations').mockResolvedValueOnce([
        { organizationId: ORG_A_ID, code: 'KINGSBURY' } as any,
      ]);

      await expect(
        authService.switchOrganization(USER_1_ID, { organizationCode: 'UNAUTHORIZED_ORG' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_TENANT_ACCESS',
      });
    });
  });

  // ===========================================================================
  // 6. DISTINCT PLATFORM BRANDING & FALLBACK SYSTEM
  // ===========================================================================
  describe('6. Distinct Platform Identity & Administrator Fallback Branding', () => {
    it('should return complete LUMINA_FALLBACK_BRANDING when organization has no custom branding', () => {
      const emptyOrg = {
        name: 'Generic Facilities Ltd',
        logoUri: null,
        branding: null,
      };

      const resolved = resolveEffectiveBranding(emptyOrg);

      expect(resolved.platformName).toBe('LuminaFM');
      expect(resolved.platformLogoUri).toBe('/static/lumina-logo.svg');
      expect(resolved.primaryColor).toBe('#0F172A'); // Midnight Slate
      expect(resolved.accentColor).toBe('#F59E0B'); // Industrial Gold
      expect(resolved.backgroundColor).toBe('#0B1120'); // Deep Midnight
      expect(resolved.theme).toBe('dark');
      expect(resolved.timezone).toBe('Asia/Colombo');
      expect(resolved.baseCurrency).toBe('LKR');
      expect(resolved.dateFormat).toBe('YYYY-MM-DD');
      expect(resolved.timeFormat).toBe('24h');
      expect(resolved.numberFormat.decimalSeparator).toBe('.');
      expect(resolved.preferences.defaultWorkOrderPriority).toBe('medium');
    });

    it('should merge client customizations onto fallback defaults without discarding unconfigured settings', () => {
      const customOrg = {
        name: 'Kingsbury Luxury Hotel',
        logoUri: '/uploads/logos/kingsbury-crest.png',
        timezone: 'Asia/Colombo',
        baseCurrency: 'USD',
        branding: {
          primaryColor: '#003366', // Custom Navy
          accentColor: '#D4AF37', // Custom Royal Gold
          theme: 'light',
          dateFormat: 'DD/MM/YYYY',
          preferences: {
            maintenanceLeadDays: 14,
          },
        },
      };

      const resolved = resolveEffectiveBranding(customOrg);

      // Custom overrides applied
      expect(resolved.clientName).toBe('Kingsbury Luxury Hotel');
      expect(resolved.logoUri).toBe('/uploads/logos/kingsbury-crest.png');
      expect(resolved.primaryColor).toBe('#003366');
      expect(resolved.accentColor).toBe('#D4AF37');
      expect(resolved.theme).toBe('light');
      expect(resolved.dateFormat).toBe('DD/MM/YYYY');
      expect(resolved.baseCurrency).toBe('USD');
      expect(resolved.preferences.maintenanceLeadDays).toBe(14);

      // Unconfigured fields fallback to platform defaults gracefully
      expect(resolved.platformName).toBe('LuminaFM');
      expect(resolved.timeFormat).toBe('24h');
      expect(resolved.numberFormat.decimalSeparator).toBe('.');
      expect(resolved.preferences.defaultWorkOrderPriority).toBe('medium');
      expect(resolved.isCustomBrandingActive).toBe(true);
    });

    it('should provide public branding without requiring authentication', async () => {
      vi.spyOn(prisma.organization, 'findFirst').mockResolvedValueOnce({
        id: ORG_A_ID,
        code: 'KINGSBURY',
        name: 'The Kingsbury Hotel',
        logoUri: '/uploads/logos/kingsbury.png',
        branding: { primaryColor: '#1e3a8a' },
        isActive: true,
      } as any);

      const branding = await organizationService.getPublicBranding('KINGSBURY');

      expect(branding.clientName).toBe('The Kingsbury Hotel');
      expect(branding.primaryColor).toBe('#1e3a8a');
      expect(branding.platformName).toBe('LuminaFM');
    });
  });

  // ===========================================================================
  // 7. SECURE OBJECT STORAGE FOR LOGOS & REPLACEMENT CLEANUP
  // ===========================================================================
  describe('7. Secure Object Storage for Uploaded Logos', () => {
    it('should securely store a valid logo, generate a collision-resistant filename, and return public URI', async () => {
      const dummyPng = Buffer.from('fake-png-binary-content');

      const result = await testStorageService.uploadFile(
        dummyPng,
        'hotel-logo.png',
        'image/png',
        'logos',
        ORG_A_ID
      );

      expect(result.uri).toMatch(/^\/uploads\/logos\/logo-11111111-1111-4111-8111-111111111111-\d+-[a-f0-9]+\.png$/);
      expect(fs.existsSync(result.absolutePath)).toBe(true);
      expect(result.fileSizeBytes).toBe(dummyPng.length);
    });

    it('should REJECT unsupported file MIME types (e.g. executable or html script)', async () => {
      const scriptBuffer = Buffer.from('<script>alert("xss")</script>');

      await expect(
        testStorageService.uploadFile(scriptBuffer, 'xss.html', 'text/html', 'logos', ORG_A_ID)
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_MIME_TYPE',
      });
    });

    it('should REJECT directory traversal attempts in subfolder or filename', async () => {
      const dummyPng = Buffer.from('fake-png');

      // The service sanitizes subfolder to prevent escaping upload root
      const result = await testStorageService.uploadFile(
        dummyPng,
        'test.png',
        'image/png',
        '../../etc',
        ORG_A_ID
      );

      // Traversal stripped, resolved safely within uploads root
      expect(result.absolutePath.toLowerCase()).toContain(tempStorageDir.toLowerCase());
    });

    it('should safely delete previous logo when replaced', async () => {
      const file1 = await testStorageService.uploadFile(
        Buffer.from('logo1'),
        'logo1.png',
        'image/png',
        'logos',
        ORG_A_ID
      );
      expect(fs.existsSync(file1.absolutePath)).toBe(true);

      // Delete file
      const deleted = await testStorageService.deleteFile(file1.uri);
      expect(deleted).toBe(true);
      expect(fs.existsSync(file1.absolutePath)).toBe(false);
    });
  });

  // ===========================================================================
  // 8. ORGANIZATION SETTINGS & REGIONAL CONFIGURATION
  // ===========================================================================
  describe('8. Organization Settings & Regional Preferences', () => {
    it('should update organization details, timezone, formatting, brand colors, and deployment mode', async () => {
      vi.spyOn(prisma.organization, 'findUnique').mockResolvedValueOnce({
        id: ORG_A_ID,
        code: 'KINGSBURY',
        name: 'Old Hotel Name',
        legalName: null,
        timezone: 'Asia/Colombo',
        baseCurrency: 'LKR',
        branding: {},
        deploymentMode: 'saas_multitenant',
        deploymentSettings: {},
      } as any);

      let savedData: any;
      vi.spyOn(prisma.organization, 'update').mockImplementation(async ({ data }: any) => {
        savedData = data;
        return {
          id: ORG_A_ID,
          code: 'KINGSBURY',
          name: data.name,
          legalName: data.legalName,
          timezone: data.timezone,
          baseCurrency: data.baseCurrency,
          branding: data.branding,
          deploymentMode: data.deploymentMode,
          deploymentSettings: data.deploymentSettings,
        };
      });

      await runWithTenantContext({ organizationId: ORG_A_ID }, async () => {
        const updated = await organizationService.updateSettings({
          name: 'The Kingsbury Grand Hotel',
          legalName: 'Kingsbury Hospitality PLC',
          timezone: 'Asia/Colombo',
          baseCurrency: 'LKR',
          locale: 'en-LK',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          primaryColor: '#0F2027',
          accentColor: '#F7B733',
          theme: 'dark',
          preferences: {
            defaultWorkOrderPriority: 'high',
            maintenanceLeadDays: 10,
            boilerOperatingShiftHours: 12,
          },
          deploymentMode: 'dedicated_instance',
          deploymentSettings: {
            dedicatedHost: 'kingsbury.luminafm.com',
            isolatedDatabase: true,
          },
        });

        expect(updated.clientName).toBe('The Kingsbury Grand Hotel');
        expect(updated.primaryColor).toBe('#0F2027');
        expect(updated.accentColor).toBe('#F7B733');
        expect(updated.dateFormat).toBe('DD/MM/YYYY');
        expect(updated.preferences.defaultWorkOrderPriority).toBe('high');
        expect(updated.preferences.boilerOperatingShiftHours).toBe(12);
        expect(updated.deploymentMode).toBe('dedicated_instance');
        expect(savedData.deploymentSettings.dedicatedHost).toBe('kingsbury.luminafm.com');
      });
    });
  });

  // ===========================================================================
  // 9. REST CONTROLLER HANDLERS (EXPRESS INTERFACE VERIFICATION)
  // ===========================================================================
  describe('9. Express REST Controllers Integration', () => {
    it('authController.login should return 200 with tokens and branding', async () => {
      const { authController } = await import('../src/modules/auth/auth.controller');

      vi.spyOn(authService, 'login').mockResolvedValueOnce({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        userId: USER_1_ID,
        organizationId: ORG_A_ID,
        logoUri: '/uploads/logos/kingsbury.png',
        user: { id: USER_1_ID, email: 'eng@kingsbury.lk', fullName: 'Jane' },
        organization: { id: ORG_A_ID, code: 'KINGSBURY', name: 'Kingsbury Hotel', logoUri: null },
      });

      const req: any = {
        body: { email: 'eng@kingsbury.lk', password: 'Password123!' },
        headers: {},
      };
      let status = 0;
      let body: any;
      const res: any = {
        status: (s: number) => {
          status = s;
          return res;
        },
        json: (b: any) => {
          body = b;
          return res;
        },
      };
      const next = vi.fn();

      await authController.login(req, res, next);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.access_token).toBe('access-token-123');
      expect(body.data.refresh_token).toBe('refresh-token-456');
    });

    it('organizationController.getPublicBranding should return 200 with platform branding', async () => {
      const { organizationController } = await import(
        '../src/modules/organization/organization.controller'
      );

      vi.spyOn(organizationService, 'getPublicBranding').mockResolvedValueOnce({
        ...LUMINA_FALLBACK_BRANDING,
        isCustomBrandingActive: false,
        clientName: 'LuminaFM',
        logoUri: '/static/lumina-logo.svg',
        faviconUri: '/favicon.ico',
      });

      const req: any = { params: {}, query: {} };
      let status = 0;
      let body: any;
      const res: any = {
        status: (s: number) => {
          status = s;
          return res;
        },
        json: (b: any) => {
          body = b;
          return res;
        },
      };
      const next = vi.fn();

      await organizationController.getPublicBranding(req, res, next);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.platformName).toBe('LuminaFM');
      expect(body.data.primaryColor).toBe('#0F172A');
    });
  });
});

