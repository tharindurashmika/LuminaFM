export interface NumberFormatConfig {
  decimalSeparator: string;
  thousandsSeparator: string;
  currencyDisplay: 'symbol' | 'code' | 'name';
}

export interface OrganizationPreferences {
  defaultWorkOrderPriority: 'low' | 'medium' | 'high' | 'urgent';
  maintenanceLeadDays: number;
  boilerOperatingShiftHours: number;
  notificationChannels: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
  };
}

export interface EffectiveBranding {
  platformName: string;
  platformLogoUri: string;
  platformFaviconUri: string;
  tagline: string;
  isCustomBrandingActive: boolean;

  // Visual Styling
  clientName: string;
  logoUri: string;
  faviconUri: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  theme: 'dark' | 'light' | 'system';
  fontFamily: string;

  // Regional & Localization
  timezone: string;
  baseCurrency: string;
  locale: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: NumberFormatConfig;

  // Tenant Preferences
  preferences: OrganizationPreferences;

  // Deployment Profile
  deploymentMode: string;
  deploymentSettings: Record<string, unknown>;
}

/**
 * LuminaFM Official Core Platform Identity.
 * Serves as the fallback branding when an organization has not defined custom white-labeling,
 * and maintains the platform's distinct integrity across multi-tenant deployments.
 */
export const LUMINA_FALLBACK_BRANDING = {
  platformName: 'LuminaFM',
  platformLogoUri: '/static/lumina-logo.svg',
  platformFaviconUri: '/favicon.ico',
  tagline: 'Intelligent Facility Maintenance & Boiler Decision Support System',

  // Default Theme: Midnight Blue & Industrial Gold Minimalist System
  primaryColor: '#0F172A', // Midnight Slate
  accentColor: '#F59E0B', // Industrial Gold
  backgroundColor: '#0B1120', // Deep Midnight
  textColor: '#F8FAFC', // Off-White
  theme: 'dark' as const,
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',

  // Regional Defaults (Kingsbury Hotel Baseline)
  timezone: 'Asia/Colombo',
  baseCurrency: 'LKR',
  locale: 'en-LK',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h' as const,
  numberFormat: {
    decimalSeparator: '.',
    thousandsSeparator: ',',
    currencyDisplay: 'symbol' as const,
  },

  // Operational Preferences
  preferences: {
    defaultWorkOrderPriority: 'medium' as const,
    maintenanceLeadDays: 7,
    boilerOperatingShiftHours: 8,
    notificationChannels: {
      email: true,
      inApp: true,
      sms: false,
    },
  },

  deploymentMode: 'saas_multitenant',
  deploymentSettings: {},
};

/**
 * Merges organization-specific overrides onto the immutable LuminaFM platform defaults.
 */
export function resolveEffectiveBranding(organization: any | null): EffectiveBranding {
  if (!organization) {
    return {
      ...LUMINA_FALLBACK_BRANDING,
      isCustomBrandingActive: false,
      clientName: LUMINA_FALLBACK_BRANDING.platformName,
      logoUri: LUMINA_FALLBACK_BRANDING.platformLogoUri,
      faviconUri: LUMINA_FALLBACK_BRANDING.platformFaviconUri,
    };
  }

  const rawBranding =
    typeof organization.branding === 'object' && organization.branding !== null
      ? organization.branding
      : {};

  const rawPreferences =
    typeof rawBranding.preferences === 'object' && rawBranding.preferences !== null
      ? rawBranding.preferences
      : {};

  const rawNumberFormat =
    typeof rawBranding.numberFormat === 'object' && rawBranding.numberFormat !== null
      ? rawBranding.numberFormat
      : {};

  const hasCustomLogo = Boolean(organization.logoUri || rawBranding.logoUri);
  const effectiveLogoUri =
    organization.logoUri || rawBranding.logoUri || LUMINA_FALLBACK_BRANDING.platformLogoUri;

  const isCustom = hasCustomLogo || Boolean(rawBranding.primaryColor) || organization.name !== LUMINA_FALLBACK_BRANDING.platformName;

  return {
    platformName: LUMINA_FALLBACK_BRANDING.platformName,
    platformLogoUri: LUMINA_FALLBACK_BRANDING.platformLogoUri,
    platformFaviconUri: LUMINA_FALLBACK_BRANDING.platformFaviconUri,
    tagline: rawBranding.tagline || LUMINA_FALLBACK_BRANDING.tagline,
    isCustomBrandingActive: isCustom,

    // Client Details
    clientName: organization.name || LUMINA_FALLBACK_BRANDING.platformName,
    logoUri: effectiveLogoUri,
    faviconUri: rawBranding.faviconUri || LUMINA_FALLBACK_BRANDING.platformFaviconUri,
    primaryColor: rawBranding.primaryColor || LUMINA_FALLBACK_BRANDING.primaryColor,
    accentColor: rawBranding.accentColor || LUMINA_FALLBACK_BRANDING.accentColor,
    backgroundColor: rawBranding.backgroundColor || LUMINA_FALLBACK_BRANDING.backgroundColor,
    textColor: rawBranding.textColor || LUMINA_FALLBACK_BRANDING.textColor,
    theme: rawBranding.theme || LUMINA_FALLBACK_BRANDING.theme,
    fontFamily: rawBranding.fontFamily || LUMINA_FALLBACK_BRANDING.fontFamily,

    // Regional & Localization
    timezone: organization.timezone || LUMINA_FALLBACK_BRANDING.timezone,
    baseCurrency: organization.baseCurrency || LUMINA_FALLBACK_BRANDING.baseCurrency,
    locale: rawBranding.locale || LUMINA_FALLBACK_BRANDING.locale,
    dateFormat: rawBranding.dateFormat || LUMINA_FALLBACK_BRANDING.dateFormat,
    timeFormat: rawBranding.timeFormat || LUMINA_FALLBACK_BRANDING.timeFormat,
    numberFormat: {
      decimalSeparator:
        rawNumberFormat.decimalSeparator || LUMINA_FALLBACK_BRANDING.numberFormat.decimalSeparator,
      thousandsSeparator:
        rawNumberFormat.thousandsSeparator ||
        LUMINA_FALLBACK_BRANDING.numberFormat.thousandsSeparator,
      currencyDisplay:
        rawNumberFormat.currencyDisplay || LUMINA_FALLBACK_BRANDING.numberFormat.currencyDisplay,
    },

    // Preferences
    preferences: {
      defaultWorkOrderPriority:
        rawPreferences.defaultWorkOrderPriority ||
        LUMINA_FALLBACK_BRANDING.preferences.defaultWorkOrderPriority,
      maintenanceLeadDays:
        rawPreferences.maintenanceLeadDays ??
        LUMINA_FALLBACK_BRANDING.preferences.maintenanceLeadDays,
      boilerOperatingShiftHours:
        rawPreferences.boilerOperatingShiftHours ??
        LUMINA_FALLBACK_BRANDING.preferences.boilerOperatingShiftHours,
      notificationChannels: {
        email:
          rawPreferences.notificationChannels?.email ??
          LUMINA_FALLBACK_BRANDING.preferences.notificationChannels.email,
        inApp:
          rawPreferences.notificationChannels?.inApp ??
          LUMINA_FALLBACK_BRANDING.preferences.notificationChannels.inApp,
        sms:
          rawPreferences.notificationChannels?.sms ??
          LUMINA_FALLBACK_BRANDING.preferences.notificationChannels.sms,
      },
    },

    // Deployment
    deploymentMode: organization.deploymentMode || LUMINA_FALLBACK_BRANDING.deploymentMode,
    deploymentSettings:
      typeof organization.deploymentSettings === 'object' && organization.deploymentSettings !== null
        ? organization.deploymentSettings
        : {},
  };
}

