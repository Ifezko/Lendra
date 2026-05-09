import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, Calendar, Layers, Wallet, Activity, Lock } from 'lucide-react';
import { useAppContext } from '../App';

export default function WalletStats({ scoreData }) {
  const ctx = useAppContext();
  const isPrivate = ctx?.privateMode?.isPrivate;

  const stats = [
    { icon: Clock, label: 'Wallet Age', value: `${scoreData.walletAgeDays} days`, color: '#EC81FF' },
    { icon: Zap, label: 'Transactions', value: scoreData.txCount.toLocaleString(), color: '#81D4FF' },
    { icon: Calendar, label: 'Active Months', value: `${scoreData.monthlyActivity}`, color: '#7CFF81' },
    { icon: Layers, label: 'Protocols Used', value: `${scoreData.protocolCount}`, color: '#FFD881' },
    { icon: Wallet, label: 'Portfolio', value: `$${scoreData.balanceUsd.toFixed(2)}`, color: '#FF8181', sensitive: true },
    { icon: Activity, label: '90d Spend', value: `$${scoreData.spend90d.toFixed(2)}`, color: '#81FFD4', sensitive: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        const masked = isPrivate && stat.sensitive;
        return (
          <motion.div
            key={stat.label}
            className={`bg-brand-card rounded-xl border p-4 transition-colors ${
              isPrivate ? 'border-purple-500/15 hover:border-purple-500/30' : 'border-brand-border hover:border-brand-accent/20'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.5, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5" style={{ color: isPrivate ? '#A855F7' : stat.color }} />
              <span className="text-xs text-brand-muted">{stat.label}</span>
              {masked && <Lock className="w-2.5 h-2.5 text-purple-400/60" />}
            </div>
            <p className="text-lg font-bold text-white">
              {masked ? '***' : stat.value}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
