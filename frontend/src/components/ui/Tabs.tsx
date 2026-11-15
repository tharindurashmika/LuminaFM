import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 bg-midnight-950/80 border border-slate-800/80 rounded-2xl overflow-x-auto scrollbar-none ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 whitespace-nowrap transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? 'bg-indigo-950/90 text-gold-300 border border-gold-500/40 shadow-glow-gold/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-midnight-900/60'
            }`}
          >
            {tab.icon && (
              <span className={`shrink-0 ${isActive ? 'text-gold-400' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                  isActive
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                    : 'bg-midnight-800 text-slate-400 border border-slate-700/60'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
