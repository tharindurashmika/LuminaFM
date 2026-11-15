import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col">
      <TopNavbar
        onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
      />
      <div className="flex flex-1">
        <Sidebar
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 overflow-y-auto max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
