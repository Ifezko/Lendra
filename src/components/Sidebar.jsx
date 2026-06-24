import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine,
  Briefcase, ShieldCheck, History, Brain, FileText, HelpCircle, X, Bell, Activity,
  Lock, Loader2,
} from 'lucide-react';
import { useAppContext } from '../App';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trust-score', label: 'Trust Score', icon: ShieldCheck },
  { to: '/wallet-intelligence', label: 'Wallet Intelligence', icon: Activity },
  { to: '/borrow', label: 'Borrow', icon: ArrowDownToLine },
  { to: '/repay', label: 'Repay', icon: ArrowUpFromLine },
  { to: '/position', label: 'Position', icon: Briefcase },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/history', label: 'History', icon: History },
];

const BOTTOM_ITEMS = [
  { href: '#', label: 'Docs', icon: FileText },
  { href: '#', label: 'Support', icon: HelpCircle },
];

export default function Sidebar({ isOpen, onClose, onOpenAi }) {
  const location = useLocation();
  const { connected } = useWallet();
  const ctx = useAppContext();
  const privateMode = ctx?.privateMode;

  const sidebar = (
    <div className="sidebar-container flex flex-col h-screen w-60 bg-brand-bg border-r border-brand-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-brand-border flex-shrink-0">
        <img
          src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`}
          alt="Lendra"
          className="w-8 h-8 rounded-lg"
        />
        <span className="text-lg font-bold text-white tracking-tight">Lendra</span>
        <span className="text-[10px] text-brand-muted px-1.5 py-0.5 rounded border border-brand-border ml-auto hidden lg:inline">
          beta
        </span>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="lg:hidden ml-auto p-1 rounded-lg text-brand-muted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile-only account controls — kept at the top of the drawer so they're
          the first thing users see (desktop shows these in the header). */}
      <div className="lg:hidden border-b border-brand-border px-3 py-3 space-y-2 flex-shrink-0">
        <div className="sidebar-wallet">
          <WalletMultiButton />
        </div>
        {connected && privateMode && (
          <button
            onClick={() => privateMode.togglePrivateMode()}
            disabled={privateMode.isEncrypting}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              privateMode.isPrivate
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'bg-brand-card text-brand-muted border-brand-border hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              {privateMode.isEncrypting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Private mode
            </span>
            <span className={`w-8 h-4 rounded-full transition-colors relative ${privateMode.isPrivate ? 'bg-purple-500' : 'bg-brand-border'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${privateMode.isPrivate ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-0.5 sidebar-scroll">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to === '/dashboard' && location.pathname === '/') ||
            (item.to === '/trust-score' && location.pathname.startsWith('/trust-score'));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                  : 'text-brand-muted hover:text-white hover:bg-brand-cardHover border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-accent' : ''}`} />
              {item.label}
            </Link>
          );
        })}

        {/* Lendra AI */}
        <button
          onClick={() => { onOpenAi?.(); onClose?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-muted hover:text-white hover:bg-brand-cardHover border border-transparent transition-all"
        >
          <Brain className="w-4 h-4" />
          Lendra AI
        </button>
      </nav>

      {/* Bottom Links */}
      <div className="border-t border-brand-border px-3 py-3 space-y-0.5 flex-shrink-0">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-brand-muted hover:text-white hover:bg-brand-cardHover transition-all"
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-30">
        {sidebar}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
