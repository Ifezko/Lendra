import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import AdminLogin from './AdminLogin';
import AdminSidebar from './AdminSidebar';
import Overview from './pages/Overview';
import Analytics from './pages/Analytics';
import Wallets from './pages/Wallets';
import Loans from './pages/Loans';
import Bonds from './pages/Bonds';
import Revenue from './pages/Revenue';
import Partners from './pages/Partners';
import QVAC from './pages/QVAC';
import Notifications from './pages/Notifications';
import SocialCards from './pages/SocialCards';
import XVerification from './pages/XVerification';
import Admins from './pages/Admins';
import AdminSettings from './pages/AdminSettings';
import SecretsGenerator from './pages/SecretsGenerator';
import PoolWaitlist from './pages/PoolWaitlist';
import WebhooksStatus from './pages/WebhooksStatus';
import DataWiring from './pages/DataWiring';
import TelegramPage from './pages/Telegram';
import PoolPage from './pages/Pool';
import SystemSettings from './pages/SystemSettings';
import { Menu, Loader2 } from 'lucide-react';

function AdminHeader({ onMenuToggle }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0A0A12]/80 border-b border-[#1E1E2A]">
      <div className="px-4 h-12 flex items-center justify-between">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono">lendra.finance</span>
          <span className="text-[10px] text-[#EC81FF] bg-[#EC81FF]/10 px-2 py-0.5 rounded-full font-medium">Ops</span>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const { admin, loading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A12] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" />
      </div>
    );
  }

  if (!admin) return <AdminLogin />;

  const role = admin.role;

  return (
    <div className="min-h-screen bg-[#0A0A12]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 md:p-6">
          <Routes>
            <Route index element={<Overview />} />
            {['super_admin', 'admin', 'analyst'].includes(role) && (
              <>
                <Route path="analytics" element={<Analytics />} />
                <Route path="wallets" element={<Wallets />} />
                <Route path="loans" element={<Loans />} />
                <Route path="bonds" element={<Bonds />} />
                <Route path="partners" element={<Partners />} />
                <Route path="qvac" element={<QVAC />} />
                <Route path="social-cards" element={<SocialCards />} />
                <Route path="x-verification" element={<XVerification />} />
                <Route path="pool-waitlist" element={<PoolWaitlist />} />
              </>
            )}
            {['super_admin', 'admin'].includes(role) && (
              <>
                <Route path="revenue" element={<Revenue />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="telegram" element={<TelegramPage />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="settings/system" element={<SystemSettings />} />
              </>
            )}
            {role === 'super_admin' && (
              <>
                <Route path="admins" element={<Admins />} />
                <Route path="settings/secrets" element={<SecretsGenerator />} />
                <Route path="webhooks" element={<WebhooksStatus />} />
                <Route path="data-wiring" element={<DataWiring />} />
                <Route path="pool" element={<PoolPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
