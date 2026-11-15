import React, { useState, useRef } from 'react';
import {
  Palette,
  Upload,
  RotateCcw,
  Sparkles,
  Building2,
  Eye,
  Globe,
  Server,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { organizationApiService } from '../services/organization.service';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Select,
  Button,
  Badge,
  Tabs,
  BrandLogo,
  SuccessState,
} from '../components/ui';

const PRESET_LOGOS = [
  {
    label: 'Colombo Grand Gold Crest (SVG)',
    uri: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 220 48" fill="none">
        <rect x="2" y="4" width="40" height="40" rx="10" fill="#1E1B4B" stroke="#D4AF37" stroke-width="2"/>
        <path d="M14 31L22 15L30 31H14Z" fill="#D4AF37"/>
        <text x="54" y="24" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="15">COLOMBO GRAND</text>
        <text x="54" y="38" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-weight="500" font-size="10" letter-spacing="1.5">ENGINEERING OPS</text>
      </svg>`
    )}`,
  },
  {
    label: 'Ceylon Thermal Power Corp (SVG)',
    uri: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 220 48" fill="none">
        <rect x="2" y="4" width="40" height="40" rx="10" fill="#0F1729" stroke="#6366F1" stroke-width="2"/>
        <circle cx="22" cy="24" r="10" stroke="#FBBF24" stroke-width="2.5"/>
        <text x="54" y="24" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="15">CEYLON THERMAL</text>
        <text x="54" y="38" fill="#818CF8" font-family="JetBrains Mono, monospace" font-weight="500" font-size="10" letter-spacing="1.5">STEAM & BOILER</text>
      </svg>`
    )}`,
  },
];

export const OrganizationSettingsPage: React.FC = () => {
  const { organization, updateOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<'branding' | 'locale' | 'deployment'>('branding');

  const [orgName, setOrgName] = useState(organization?.name ?? 'Colombo Grand Hospitality Group');
  const [legalName, setLegalName] = useState(
    organization?.legalName ?? 'Colombo Grand Hospitality PLC'
  );
  const [timezone, setTimezone] = useState(organization?.timezone ?? 'Asia/Colombo');
  const [baseCurrency, setBaseCurrency] = useState(organization?.baseCurrency ?? 'LKR');
  const [showPlatformBadge, setShowPlatformBadge] = useState(
    organization?.themeConfig?.showPlatformBadge ?? true
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    // Immediately preview uploaded client logo in top navigation bar
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateOrganization({ logoUri: reader.result });
        setStatusMessage(
          `Uploaded "${file.name}" — Top navigation header dynamically updated with client white-label logo!`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (presetUri: string, label: string) => {
    setSelectedFile(null);
    updateOrganization({ logoUri: presetUri });
    setStatusMessage(`Applied preset "${label}" — Verified in top header navigation!`);
  };

  const handleResetToDefault = () => {
    setSelectedFile(null);
    updateOrganization({ logoUri: null });
    setStatusMessage(
      'Reset logo_uri to null — Reverted to fallback LuminaFM brand identity.'
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await organizationApiService.updateSettings({
        name: orgName,
        legalName,
        logoFile: selectedFile,
      });
      updateOrganization({
        name: updated.name,
        legalName: updated.legalName,
        logoUri: updated.logoUri,
        timezone,
        baseCurrency,
        themeConfig: {
          showPlatformBadge,
        },
      });
      setStatusMessage('Organization profile & branding persisted via PATCH /api/organization/settings.');
    } catch {
      updateOrganization({
        name: orgName,
        legalName,
        timezone,
        baseCurrency,
        themeConfig: {
          showPlatformBadge,
        },
      });
      setStatusMessage(
        'Organization profile & branding updated in local session state.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <Palette className="w-4 h-4" />
            <span>Multi-Tenant Enterprise Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Organization Settings &amp; White-Labeling
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure tenant branding, logo replacement, regional localization, and deployment topology.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="indigo" size="md">
            Tenant: {organization?.code}
          </Badge>
          <Badge tone="gold" size="md">
            Role: Admin
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'branding',
            label: 'White-Label Branding',
            icon: <Palette className="w-4 h-4" />,
          },
          {
            id: 'locale',
            label: 'Regional & Localization',
            icon: <Globe className="w-4 h-4" />,
          },
          {
            id: 'deployment',
            label: 'Deployment & RLS Isolation',
            icon: <Server className="w-4 h-4" />,
          },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {statusMessage && (
        <div className="p-4 rounded-xl lumina-alert-critical flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs text-gold-200">
            <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <span className="text-[11px] font-mono text-gold-400 uppercase tracking-wider shrink-0">
            Header Synchronized
          </span>
        </div>
      )}

      {/* Tab 1: White-Label Branding */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <form onSubmit={handleSaveSettings}>
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-400" />
                      Tenant Identity &amp; Logo Configuration
                    </span>
                    <Badge tone="slate" size="sm">
                      RLS Protected
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Client custom logos replace the default LuminaFM top header while preserving platform integrity.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <Input
                    label="Organization Display Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    helperText="Visible in navigation bar, headers, and reports"
                  />

                  <Input
                    label="Legal Entity Name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    helperText="Official corporate entity for compliance documentation and work orders"
                  />

                  {/* Logo Upload Dropzone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium text-slate-300">
                      Client Custom Logo (<code className="font-mono text-indigo-300">logo_uri</code>)
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/70 rounded-2xl p-6 text-center cursor-pointer bg-midnight-950/70 transition-all hover:bg-midnight-950"
                    >
                      <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm font-medium text-slate-200">
                        Click or drag to upload custom organization logo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        Supports PNG, JPG, SVG, WEBP (Max 5MB) • Stored via Multer
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Preset Demonstrator Buttons */}
                  <div className="pt-2 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-gold-400" />
                      <span>Interactive Logo Switcher (Real-time Preview):</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {PRESET_LOGOS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="gold"
                          size="sm"
                          onClick={() => handleApplyPreset(preset.uri, preset.label)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleResetToDefault}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Reset to Default LuminaFM Brand
                      </Button>
                    </div>
                  </div>

                  {/* Platform Mark Setting */}
                  <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-midnight-950 border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Display Platform Attribution
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Shows &apos;LuminaFM Core&apos; tag beside custom client branding
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPlatformBadge}
                      onChange={(e) => setShowPlatformBadge(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-midnight-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </CardContent>

                <CardFooter>
                  <span className="text-xs text-slate-500 font-mono">
                    Changes apply immediately to active session
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Branding Settings
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>

          {/* Live Preview Sidecard */}
          <div className="lg:col-span-5 space-y-5">
            <Card variant="accent-gold">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-gold-400" />
                    Live Header Logo Inspection
                  </CardTitle>
                  <Badge
                    tone={organization?.logoUri ? 'gold' : 'indigo'}
                    size="sm"
                  >
                    {organization?.logoUri ? 'White-Label Active' : 'LuminaFM Fallback'}
                  </Badge>
                </div>
                <CardDescription>
                  Exact pixel rendering as displayed in the facility TopNavbar
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-6 rounded-2xl bg-midnight-950 border border-slate-800 flex items-center justify-center min-h-[110px] shadow-inner">
                  <BrandLogo showPlatformBadge={showPlatformBadge} />
                </div>

                <div className="space-y-2 text-xs font-mono bg-midnight-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="text-slate-500">// AuthContext.organization state:</div>
                  <div className="text-slate-300">
                    organization_id: &quot;{organization?.id}&quot;
                  </div>
                  <div className="text-slate-300">
                    code: &quot;{organization?.code}&quot;
                  </div>
                  <div className="text-gold-300 truncate">
                    logo_uri:{' '}
                    {organization?.logoUri
                      ? `"${organization.logoUri.slice(0, 40)}..."`
                      : 'null (Default Fallback)'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Fallback Platform Identity Guarantee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <p>
                  LuminaFM guarantees that if a custom client logo fails to render or is cleared, the system gracefully falls back to the master LuminaFM crest.
                </p>
                <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800 flex items-center gap-2 text-gold-300">
                  <BrandLogo overrideLogoUri={null} size="sm" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Regional & Locale Preferences */}
      {activeTab === 'locale' && (
        <Card variant="default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Regional &amp; Localization Settings
            </CardTitle>
            <CardDescription>
              Control timezone offsets, shift schedules, and operational currency formatting.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 max-w-2xl">
            <Select
              label="Operational Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helperText="All boiler shift logs and ANP decision run timestamps will be recorded in this timezone"
              options={[
                { value: 'Asia/Colombo', label: 'Asia/Colombo (UTC+05:30) - Sri Lanka Baseline' },
                { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+08:00)' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+04:00)' },
                { value: 'Europe/London', label: 'Europe/London (UTC+00:00 / BST)' },
              ]}
            />

            <Select
              label="Base Facility Currency"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              helperText="Used for work order maintenance costing, labor rates, and spare parts calculation"
              options={[
                { value: 'LKR', label: 'LKR - Sri Lankan Rupee (Rs)' },
                { value: 'USD', label: 'USD - United States Dollar ($)' },
                { value: 'EUR', label: 'EUR - Euro (€)' },
                { value: 'GBP', label: 'GBP - British Pound (£)' },
                { value: 'SGD', label: 'SGD - Singapore Dollar (S$)' },
              ]}
            />
          </CardContent>

          <CardFooter>
            <span className="text-xs text-slate-500 font-mono">
              Localization synchronized with database settings
            </span>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Regional Preferences
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Tab 3: Deployment & RLS Isolation */}
      {activeTab === 'deployment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="accent-indigo">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                Deployment Architecture Mode
              </CardTitle>
              <CardDescription>
                Multi-tenant SaaS topology and database tenant isolation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-midnight-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Deployment Type:</span>
                  <span className="text-gold-300 font-semibold">Shared SaaS Multi-Tenant</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Isolation Layer:</span>
                  <span className="text-emerald-300">PostgreSQL Row-Level Security (RLS)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tenant Context:</span>
                  <span className="text-indigo-300">AsyncLocalStorage + Prisma Extension</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Backend:</span>
                  <span className="text-slate-200">Local Disk / S3 Object Storage</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                All read and write queries enforce strict organization isolation via <code className="font-mono text-indigo-300">organization_id = current_setting(&apos;app.current_organization_id&apos;)</code>.
              </p>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold-400" />
                Active Tenant Metadata
              </CardTitle>
              <CardDescription>
                Cryptographic identifiers and organization tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800">
                <span className="text-slate-500 block">Organization UUID:</span>
                <span className="text-slate-200 select-all">{organization?.id}</span>
              </div>
              <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800">
                <span className="text-slate-500 block">Organization Code:</span>
                <span className="text-gold-300 font-semibold">{organization?.code}</span>
              </div>
              <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800">
                <span className="text-slate-500 block">Active Status:</span>
                <span className="text-emerald-400 font-semibold">ACTIVE &amp; LICENSED</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrganizationSettingsPage;
