import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from './useAdminAuth';
import {
  LayoutDashboard, BarChart3, Wallet, ArrowDownToLine, Shield,
  DollarSign, Users, Brain, Bell, CreditCard, BadgeCheck, UserCog,
  Settings, X, LogOut, Key, Rocket,
} from 'lucide-react';

const SLUG = '/ops-okw-7qv3';

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '', label: 'Overview', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'analyst', 'viewer'] },
      { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['super_admin', 'admin', 'analyst'] },
      { to: '/wallets', label: 'Wallets', icon: Wallet, roles: ['super_admin', 'admin', 'analyst'] },
    ],
  },
  {
    label: 'Lending',
    items: [
      { to: '/loans', label: 'Loans', icon: ArrowDownToLine, roles: ['super_admin', 'admin', 'analyst'] },
      { to: '/bonds', label: 'Bonds', icon: Shield, roles: ['super_admin', 'admin', 'analyst'] },
      { to: '/revenue', label: 'Revenue', icon: DollarSign, roles: ['super_admin', 'admin'] },
      { to: '/pool-waitlist', label: 'Pool Waitlist', icon: Rocket, roles: ['super_admin', 'admin', 'analyst'] },
    ],
  },
  {
    label: 'Ecosystem',
    items: [
      { to: '/partners', label: 'Partners', icon: Users, roles: ['super_admin', 'admin', 'analyst'] },
      { to: '/qvac', label: 'QVAC', icon: Brain, roles: ['super_admin', 'admin', 'analyst'] },
      { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['super_admin', 'admin'] },
      { to: '/social-cards', label: 'Social Cards', icon: CreditCard, roles: ['super_admin', 'admin', 'analyst'] },
      { to: '/x-verification', label: 'X Verification', icon: BadgeCheck, roles: ['super_admin', 'admin', 'analyst'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admins', label: 'Admins', icon: UserCog, roles: ['super_admin'] },
      { to: '/settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] },
      { to: '/settings/secrets', label: 'Secrets', icon: Key, roles: ['super_admin'] },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { admin, logout } = useAdminAuth();
  const role = admin?.role || 'viewer';

  const sidebar = (
    <div className="flex flex-col h-full w-64 bg-[#0A0A12] border-r border-[#1E1E2A]">
      <div className="flex items-center justify-between px-5 h-16 border-b border-[#1E1E2A] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`} alt="Lendra" className="w-7 h-7 rounded-lg" />
          <div>
            <span className="text-sm font-bold text-white tracking-tight">Lendra Ops</span>
            <span className="block text-[9px] text-[#EC81FF]/60 font-medium uppercase tracking-wider">Internal</span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-slate-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{section.label}</p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const fullPath = `${SLUG}${item.to}`;
                  const isActive = location.pathname === fullPath || (item.to === '' && location.pathname === SLUG);
                  return (
                    <Link
                      key={item.to}
                      to={fullPath}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-[#EC81FF]/10 text-[#EC81FF] border border-[#EC81FF]/20'
                          : 'text-slate-400 hover:text-white hover:bg-[#1E1E2A]/60 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#EC81FF]' : ''}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[#1E1E2A] px-3 py-3">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[#EC81FF]/10 flex items-center justify-center text-[11px] font-bold text-[#EC81FF]">
            {admin?.display_name?.[0]?.toUpperCase() || admin?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{admin?.display_name || admin?.email}</p>
            <p className="text-[10px] text-slate-500 capitalize">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-30">{sidebar}</div>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
