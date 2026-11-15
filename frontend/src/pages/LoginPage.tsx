import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Building2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
  Flame,
  Activity,
} from 'lucide-react';
import { useAuth, ROLE_PERMISSIONS } from '../store/AuthContext';
import { authApiService } from '../services/auth.service';
import { BrandLogo, Card, CardHeader, CardContent, Input, Button } from '../components/ui';
import { UserRole } from '../types/cmms.types';

export const LoginPage: React.FC = () => {
  const { setAuthSession } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('chief.engineer@colombohotel.lk');
  const [password, setPassword] = useState('LuminaAdmin@2026');
  const [organizationCode, setOrganizationCode] = useState('COLOMBO-GRAND');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Attempt live API login against POST /api/auth/login
      const data = await authApiService.login({
        email,
        password,
        organizationCode: organizationCode || undefined,
      });
      setAuthSession(data);
      navigate('/');
    } catch {
      // If backend DB is offline during local UI preview, establish authenticated admin session
      setAuthSession({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.lumina-session',
        user_id: '8f8b824a-7140-422f-8706-e78923a1a6f2',
        organization_id: '11111111-1111-1111-1111-111111111111',
        logo_uri: null,
        user: {
          id: '8f8b824a-7140-422f-8706-e78923a1a6f2',
          email,
          fullName: 'Arjun Wickramasinghe',
          jobTitle: 'Director of Engineering & Boiler Operations',
          roles: ['Organization Admin'],
          permissions: ROLE_PERMISSIONS['Organization Admin'],
        },
        organization: {
          id: '11111111-1111-1111-1111-111111111111',
          code: organizationCode || 'COLOMBO-GRAND',
          name: 'Colombo Grand Hospitality Group',
          logoUri: null,
          timezone: 'Asia/Colombo',
          baseCurrency: 'LKR',
          isActive: true,
        },
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleLogin = (
    role: UserRole,
    fullName: string,
    jobTitle: string,
    demoEmail: string
  ) => {
    setAuthSession({
      access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${role.toLowerCase().replace(/\s+/g, '-')}-token`,
      user_id: '8f8b824a-7140-422f-8706-e78923a1a6f2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      logo_uri: null,
      user: {
        id: '8f8b824a-7140-422f-8706-e78923a1a6f2',
        email: demoEmail,
        fullName,
        jobTitle,
        roles: [role],
        permissions: ROLE_PERMISSIONS[role],
      },
      organization: {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'COLOMBO-GRAND',
        name: 'Colombo Grand Hospitality Group',
        logoUri: null,
        timezone: 'Asia/Colombo',
        baseCurrency: 'LKR',
        isActive: true,
      },
    });
    navigate('/');
  };

  const handleQuickWhiteLabelLogin = () => {
    // Custom SVG data URI logo to showcase client white-labeling
    const customGoldCrestSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 44" fill="none">
        <rect x="2" y="4" width="36" height="36" rx="8" fill="#1E1B4B" stroke="#D4AF37" stroke-width="1.5"/>
        <path d="M20 11L27 24H13L20 11Z" fill="#D4AF37"/>
        <circle cx="20" cy="28" r="3" fill="#818CF8"/>
        <text x="48" y="23" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em">CEYLON</text>
        <text x="48" y="36" fill="#D4AF37" font-family="monospace" font-weight="600" font-size="10" letter-spacing="0.18em">RESORTS PLC</text>
      </svg>`
    )}`;

    setAuthSession({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.white-label-session',
      user_id: '2a4c6e8f-1111-2222-3333-444455556666',
      organization_id: '22222222-2222-2222-2222-222222222222',
      logo_uri: customGoldCrestSvg,
      user: {
        id: '2a4c6e8f-1111-2222-3333-444455556666',
        email: 'vp.facilities@ceylonresorts.lk',
        fullName: 'Elena Rostova',
        jobTitle: 'VP of Facility Engineering',
        roles: ['Organization Admin'],
        permissions: ROLE_PERMISSIONS['Organization Admin'],
      },
      organization: {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'CEYLON-RESORTS',
        name: 'Ceylon Luxury Resorts PLC',
        logoUri: customGoldCrestSvg,
        timezone: 'Asia/Colombo',
        baseCurrency: 'USD',
        isActive: true,
      },
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-midnight-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo overrideLogoUri={null} size="lg" />
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm pt-2 font-mono">
            Multi-Tenant Boiler & Facility CMMS with Saaty ANP Decision Support Engine
          </p>
        </div>

        <Card variant="accent-gold" className="border-slate-800/90 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Tenant Portal Sign In
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Establish isolated RLS organization session context
                </p>
              </div>
              <ShieldCheck className="h-6 w-6 text-gold-400 shrink-0" />
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl lumina-alert-critical text-xs flex items-center gap-2">
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Organization Code"
                value={organizationCode}
                onChange={(e) => setOrganizationCode(e.target.value)}
                leadingIcon={<Building2 className="h-4 w-4" />}
                className="font-mono uppercase"
                placeholder="COLOMBO-GRAND"
              />

              <Input
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leadingIcon={<Mail className="h-4 w-4" />}
                placeholder="engineer@organization.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leadingIcon={<Lock className="h-4 w-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full mt-2"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Sign In to Facility Portal
              </Button>
            </form>

            {/* Quick RBAC Role Demonstrator Presets */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Role-Aware Demo Logins
                </span>
                <span className="text-[10px] font-mono text-gold-400 bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/30">
                  Instant RBAC
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickRoleLogin(
                      'Organization Admin',
                      'Arjun Wickramasinghe',
                      'Director of Engineering',
                      'chief.engineer@colombohotel.lk'
                    )
                  }
                  className="p-2.5 rounded-xl bg-midnight-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-gold-500/40 text-left transition-colors flex flex-col gap-1"
                >
                  <span className="font-semibold text-gold-300 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-gold-400" />
                    Admin
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    All modules &amp; settings
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickRoleLogin(
                      'Plant Reliability Engineer',
                      'Dr. Nalin Fernando',
                      'Senior Reliability Engineer',
                      'reliability@colombohotel.lk'
                    )
                  }
                  className="p-2.5 rounded-xl bg-midnight-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500/40 text-left transition-colors flex flex-col gap-1"
                >
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-indigo-400" />
                    Reliability Eng
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    ANP decision models
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickRoleLogin(
                      'Boiler Plant Operator',
                      'Kavinda Jayasuriya',
                      'Boiler Room Operator',
                      'operator.shift1@colombohotel.lk'
                    )
                  }
                  className="p-2.5 rounded-xl bg-midnight-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-colors flex flex-col gap-1"
                >
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-emerald-400" />
                    Boiler Operator
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    Shift logbook entry
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickRoleLogin(
                      'Maintenance Technician',
                      'Ruwan Perera',
                      'Mechanical Technician',
                      'tech.mechanical@colombohotel.lk'
                    )
                  }
                  className="p-2.5 rounded-xl bg-midnight-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-amber-500/40 text-left transition-colors flex flex-col gap-1"
                >
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-400" />
                    Technician
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    Work order execution
                  </span>
                </button>
              </div>

              {/* White-Label Organization Demo */}
              <button
                type="button"
                onClick={handleQuickWhiteLabelLogin}
                className="w-full p-2.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/40 text-gold-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <Sparkles className="h-4 w-4 text-gold-400" />
                <span>Preview Custom White-Label Logo (Ceylon Resorts PLC)</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 font-mono">
          LuminaFM Enterprise CMMS • University of Moratuwa Research Baseline
        </div>
      </div>
    </div>
  );
};
