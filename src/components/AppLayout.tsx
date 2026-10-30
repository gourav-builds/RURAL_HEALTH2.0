import { Outlet } from 'react-router-dom';

import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile, shown on md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <StorageWarningBanner />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
          aria-label="Main content"
        >
          <div className="max-w-5xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
