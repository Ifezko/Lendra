import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Globe,
  BadgeCheck,
  Brain,
  Bell,
  Zap,
} from 'lucide-react';
import { useAppContext } from '../App';

const ACTIONS = [
  {
    key: 'scan',
    label: 'Scan Wallet',
    icon: Search,
    route: '/trust-score',
    color: '#EC81FF',
  },
  {
    key: 'borrow',
    label: 'Borrow',
    icon: ArrowDownToLine,
    route: '/borrow',
    color: '#60a5fa',
  },
  {
    key: 'repay',
    label: 'Repay',
    icon: ArrowUpFromLine,
    route: '/repay',
    color: '#4ade80',
  },
  {
    key: 'sol',
    label: 'Add .sol',
    icon: Globe,
    route: '/trust-score',
    color: '#a78bfa',
  },
  {
    key: 'x',
    label: 'Connect X',
    icon: BadgeCheck,
    route: '/trust-score',
    color: '#f59e0b',
  },
  {
    key: 'crosschain',
    label: 'Cross-chain',
    icon: Zap,
    route: '/trust-score/cross-chain',
    color: '#06b6d4',
  },
  {
    key: 'ai',
    label: 'Lendra AI',
    icon: Brain,
    route: null,
    action: 'ai',
    color: '#EC81FF',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: Bell,
    route: '/alerts',
    color: '#38bdf8',
  },
];

export default function QuickActions() {
  const ctx = useAppContext();
  const navigate = useNavigate();

  const handleClick = (action) => {
    if (action.action === 'ai') {
      ctx?.openAiDrawer?.();
      return;
    }
    if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="bg-brand-card rounded-2xl border border-brand-border p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-brand-accent" />
        <h3 className="text-sm font-bold text-white">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => handleClick(action)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-brand-bg/50 border border-brand-border hover:border-brand-accent/20 hover:bg-brand-accent/5 transition-all group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: action.color }} />
              </div>
              <span className="text-[10px] font-medium text-brand-muted group-hover:text-white transition-colors text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
