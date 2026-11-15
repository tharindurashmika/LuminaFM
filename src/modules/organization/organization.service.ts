import prisma from '../../lib/prisma';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { objectStorageService } from '../../services/storage.service';
import {
  resolveEffectiveBranding,
  EffectiveBranding,
  NumberFormatConfig,
  OrganizationPreferences,
} from './branding.constants';

export interface UpdateOrganizationSettingsDto {
  name?: string;
  legalName?: string;
  timezone?: string;
  baseCurrency?: string;
  logoUri?: string;

  // Visual Branding
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  theme?: 'dark' | 'light' | 'system';
  fontFamily?: string;

  // Regional & Localization
  locale?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  numberFormat?: Partial<NumberFormatConfig>;

  // Organization Preferences
  preferences?: Partial<OrganizationPreferences>;

  // Deployment Profile
  deploymentMode?: 'saas_multitenant' | 'dedicated_instance';
  deploymentSettings?: Record<string, unknown>;
}

export class OrganizationService {
  /**
   * Retrieves the current tenant organization's profile and settings,
   * merged with the LuminaFM platform fallback identity.
   */
  async getSettings(): Promise<EffectiveBranding & { id: string; code: string; legalName: string | null; isActive: boolean }> {
    const organizationId = requireCurrentTenantId();

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw { status: 404, code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' };
    }

    const effective = resolveEffectiveBranding(org);

    return {
      id: org.id,
      code: org.code,
      legalName: org.legalName,
      isActive: org.isActive,
      ...effective,
    };
  }

  /**
   * Public endpoint to retrieve effective branding for login / white-label pages
   * before the user has authenticated.
   */
  async getPublicBranding(orgCodeOrId?: string): Promise<EffectiveBranding> {
    if (!orgCodeOrId) {
      return resolveEffectiveBranding(null);
    }

    const trimmed = orgCodeOrId.trim();

    const org = await prisma.organization.findFirst({
      where: {
        OR: [{ id: trimmed }, { code: trimmed }],
        isActive: true,
      },
    });

    return resolveEffectiveBranding(org);
  }

  /**
   * Updates organization settings, supporting custom branding white-labeling,
   * regional formats, timezone, and deployment configurations.
   */
  async updateSettings(dto: UpdateOrganizationSettingsDto) {
    const organizationId = requireCurrentTenantId();

    const existing = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw { status: 404, code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' };
    }

    const currentBranding =
      typeof existing.branding === 'object' && existing.branding !== null
        ? (existing.branding as Record<string, any>)
        : {};

    const updatedBranding: Record<string, any> = { ...currentBranding };

    if (dto.primaryColor !== undefined) updatedBranding.primaryColor = dto.primaryColor;
    if (dto.accentColor !== undefined) updatedBranding.accentColor = dto.accentColor;
    if (dto.backgroundColor !== undefined) updatedBranding.backgroundColor = dto.backgroundColor;
    if (dto.textColor !== undefined) updatedBranding.textColor = dto.textColor;
    if (dto.theme !== undefined) updatedBranding.theme = dto.theme;
    if (dto.fontFamily !== undefined) updatedBranding.fontFamily = dto.fontFamily;
    if (dto.locale !== undefined) updatedBranding.locale = dto.locale;
    if (dto.dateFormat !== undefined) updatedBranding.dateFormat = dto.dateFormat;
    if (dto.timeFormat !== undefined) updatedBranding.timeFormat = dto.timeFormat;

    if (dto.numberFormat) {
      updatedBranding.numberFormat = {
        ...(currentBranding.numberFormat || {}),
        ...dto.numberFormat,
      };
    }

    if (dto.preferences) {
      updatedBranding.preferences = {
        ...(currentBranding.preferences || {}),
        ...dto.preferences,
      };
    }

    const updateData: any = {
      branding: updatedBranding,
    };

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.legalName !== undefined) updateData.legalName = dto.legalName ? dto.legalName.trim() : null;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone.trim();
    if (dto.baseCurrency !== undefined) updateData.baseCurrency = dto.baseCurrency.toUpperCase().trim();
    if (dto.logoUri !== undefined) updateData.logoUri = dto.logoUri;
    if (dto.deploymentMode !== undefined) updateData.deploymentMode = dto.deploymentMode;
    if (dto.deploymentSettings !== undefined) {
      updateData.deploymentSettings = {
        ...((existing.deploymentSettings as Record<string, any>) || {}),
        ...dto.deploymentSettings,
      };
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    const effective = resolveEffectiveBranding(updatedOrg);

    return {
      id: updatedOrg.id,
      code: updatedOrg.code,
      legalName: updatedOrg.legalName,
      isActive: updatedOrg.isActive,
      ...effective,
    };
  }

  /**
   * Uploads and replaces the organization's white-label logo via Object Storage.
   * Cleans up the previous logo if present.
   */
  async uploadLogo(fileBuffer: Buffer, originalName: string, mimeType: string) {
    const organizationId = requireCurrentTenantId();

    const existing = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw { status: 404, code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' };
    }

    // Securely upload new logo
    const uploadResult = await objectStorageService.uploadFile(
      fileBuffer,
      originalName,
      mimeType,
      'logos',
      organizationId
    );

    // Clean up old logo if it exists in local storage
    if (existing.logoUri && existing.logoUri.startsWith('/uploads/logos/')) {
      await objectStorageService.deleteFile(existing.logoUri).catch(() => {});
    }

    const currentBranding =
      typeof existing.branding === 'object' && existing.branding !== null
        ? (existing.branding as Record<string, any>)
        : {};

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUri: uploadResult.uri,
        branding: {
          ...currentBranding,
          logoUri: uploadResult.uri,
        },
      },
    });

    const effective = resolveEffectiveBranding(updatedOrg);

    return {
      id: updatedOrg.id,
      code: updatedOrg.code,
      logoUri: uploadResult.uri,
      uploadDetails: uploadResult,
      effectiveBranding: effective,
    };
  }

  /**
   * Deletes the organization's custom logo, resetting to LuminaFM platform default.
   */
  async deleteLogo() {
    const organizationId = requireCurrentTenantId();

    const existing = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw { status: 404, code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' };
    }

    if (existing.logoUri && existing.logoUri.startsWith('/uploads/logos/')) {
      await objectStorageService.deleteFile(existing.logoUri).catch(() => {});
    }

    const currentBranding =
      typeof existing.branding === 'object' && existing.branding !== null
        ? (existing.branding as Record<string, any>)
        : {};

    delete currentBranding.logoUri;

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUri: null,
        branding: currentBranding,
      },
    });

    return {
      message: 'Custom logo removed. Fallback platform branding restored.',
      effectiveBranding: resolveEffectiveBranding(updatedOrg),
    };
  }
}

export const organizationService = new OrganizationService();
