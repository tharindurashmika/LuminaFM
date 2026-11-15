import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

export interface BrandLogoProps {
  overrideLogoUri?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showPlatformBadge?: boolean;
}

/**
 * Dynamically renders the tenant organization's custom white-label logo (`organization.logo_uri`).
 * When `logoUri` is null or fails to load, gracefully falls back to the default 'LuminaFM' premium branding.
 * The LuminaFM platform identity remains distinct from client branding.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  overrideLogoUri,
  size = 'md',
  showPlatformBadge = true,
}) => {
  const { organization } = useAuth();
  const activeLogoUri =
    overrideLogoUri !== undefined ? overrideLogoUri : organization?.logoUri ?? null;

  const [imgError, setImgError] = useState(false);

  // Reset error flag whenever the logo URI changes
  useEffect(() => {
    setImgError(false);
  }, [activeLogoUri]);

  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-11' : 'h-9';

  // Client Organization Logo
  if (activeLogoUri && !imgError) {
    return (
      <div className="flex items-center gap-3 select-none">
        <div className="relative flex items-center justify-center rounded-xl bg-midnight-900 border border-indigo-500/30 px-3 py-1.5 shadow-glow-indigo">
          <img
            src={activeLogoUri}
            alt={organization?.name || 'Organization Brand Logo'}
            onError={() => setImgError(true)}
            className={`${heightClass} w-auto max-w-[170px] object-contain`}
          />
        </div>
        {organization?.name && (
          <div className="hidden sm:flex flex-col">
            <span className="text-xs sm:text-sm font-semibold text-slate-100 tracking-tight leading-none">
              {organization.name}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-mono text-gold-400 font-semibold uppercase tracking-widest px-1.5 py-0.2 rounded bg-gold-500/10 border border-gold-500/30">
                {organization.code}
              </span>
              {showPlatformBadge && (
                <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider">
                  • LuminaFM Core
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: Default 'LuminaFM' Platform Logo
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-900 to-midnight-950 border border-gold-500/40 shadow-glow-indigo">
        <Flame className="h-5 w-5 text-gold-400 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold tracking-tight text-white">Lumina</span>
          <span className="text-lg font-extrabold tracking-tight text-gold-400">FM</span>
        </div>
        <div className="flex items-center gap-1.5 -mt-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400/90 font-medium">
            Enterprise CMMS
          </span>
          <span className="text-[9px] font-mono text-gold-500/80 px-1 rounded bg-gold-500/10 border border-gold-500/30">
            ANP Decision Engine
          </span>
        </div>
      </div>
    </div>
  );
};
