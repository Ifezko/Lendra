import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import {
  Bell, AlertTriangle, CheckCircle, Info, Clock, ArrowRight,
  TrendingUp, Shield, Zap, RefreshCw, Settings, Check,
  ChevronDown, BellOff, Send, Loader2, XCircle,
} from 'lucide-react';
import { useAppContext } from '../App';
import { useNotifications } from '../hooks/useNotifications';
import { useTelegram } from '../hooks/useTelegram';

const EVENT_CONFIG = {
  trust_score_dropped: { icon: TrendingUp, iconColor: 'text-red-400', iconBg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  borrowing_level_dropped: { icon: Shield, iconColor: 'text-red-400', iconBg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  borrowing_locked: { icon: Shield, iconColor: 'text-red-400', iconBg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  repayment_score_penalized: { icon: AlertTriangle, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
  loan_due_soon: { icon: Clock, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
  loan_overdue: { icon: AlertTriangle, iconColor: 'text-red-400', iconBg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  repayment_confirmed: { icon: CheckCircle, iconColor: 'text-green-400', iconBg: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  bond_deposited: { icon: Shield, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  bond_returned: { icon: CheckCircle, iconColor: 'text-green-400', iconBg: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  bond_liquidated: { icon: AlertTriangle, iconColor: 'text-red-400', iconBg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  score_increased: { icon: TrendingUp, iconColor: 'text-green-400', iconBg: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  level_unlocked: { icon: Zap, iconColor: 'text-brand-accent', iconBg: 'bg-brand-accent/10', borderColor: 'border-brand-accent/20' },
  telegram_connected: { icon: Send, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  wallet_activity_updated: { icon: RefreshCw, iconColor: 'text-brand-accent', iconBg: 'bg-brand-accent/10', borderColor: 'border-brand-border' },
};
const DEFAULT_CONFIG = { icon: Info, iconColor: 'text-brand-accent', iconBg: 'bg-brand-accent/10', borderColor: 'border-brand-border' };

function formatRelativeTime(dateStr) {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'score', label: 'Score' },
  { id: 'loans', label: 'Loans' },
  { id: 'unread', label: 'Unread' },
];

function NotificationCard({ notification, onMarkRead, delay = 0 }) {
  const cfg = EVENT_CONFIG[notification.event_type] || DEFAULT_CONFIG;
  const Icon = cfg.icon;
  const isRead = notification.read;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay }}
      layout
      className={`relative bg-brand-card rounded-2xl border ${cfg.borderColor} p-5 hover:border-brand-accent/20 transition-all group ${
        !isRead ? 'ring-1 ring-brand-accent/10' : 'opacity-80'
      }`}
    >
      {!isRead && (
        <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse" />
      )}
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={`text-sm font-bold ${isRead ? 'text-brand-muted' : 'text-white'}`}>
              {notification.title}
            </p>
            <span className="text-[10px] text-brand-muted flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(notification.created_at)}
            </span>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">{notification.message}</p>
          <div className="flex items-center gap-3 mt-3">
            {notification.cta_label && notification.cta_route && (
              <Link
                to={notification.cta_route}
                className="inline-flex items-center gap-1.5 text-xs text-brand-accent font-semibold hover:gap-2.5 transition-all"
              >
                {notification.cta_label} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {!isRead && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-white transition-colors"
              >
                <Check className="w-3 h-3" /> Mark read
              </button>
            )}
          </div>
        </div>
      </div>
      {notification.delivery_channel === 'both' && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[10px] text-blue-400">
          <Send className="w-2.5 h-2.5" /> Also sent via Telegram
        </div>
      )}
    </motion.div>
  );
}

function TelegramCard({ tg }) {
  const [showLinkHelp, setShowLinkHelp] = useState(false);

  const handleEnable = async () => {
    const result = await tg.startLink();
    if (result?.telegramUrl) {
      setShowLinkHelp(true);
      // Start polling for connection
      tg.pollConnection();
    }
  };

  if (tg.loading) {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-5 animate-pulse mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-border" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-brand-border rounded w-1/3" />
            <div className="h-3 bg-brand-border rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  if (tg.connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-blue-500/30 p-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Telegram Alerts</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Connected</span>
                {tg.username && <span className="text-xs text-brand-muted ml-1">@{tg.username}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={tg.sendTest}
            disabled={tg.testing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            {tg.testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send Test Alert
          </button>
        </div>

        {tg.testResult === 'success' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-3">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-300">Test alert sent. Check your Telegram.</p>
          </div>
        )}
        {tg.testResult === 'error' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">Test alert failed. Check Telegram connection.</p>
          </div>
        )}

        {/* Preference toggles */}
        <div className="space-y-0">
          <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Alert Preferences</p>
          {[
            { key: 'all', label: 'All Telegram alerts' },
            { key: 'score', label: 'Score changes' },
            { key: 'loan', label: 'Loan status updates' },
            { key: 'bond', label: 'Bond events' },
            { key: 'repayment', label: 'Repayment reminders' },
            { key: 'level', label: 'Level unlocks' },
            { key: 'pool_launch', label: 'Pool launch notifications' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => tg.savePrefs({ ...tg.prefs, [item.key]: !tg.prefs[item.key] })}
              className="flex items-center justify-between w-full py-2.5 border-b border-brand-border/50 last:border-0"
            >
              <span className="text-xs text-brand-muted">{item.label}</span>
              <div className={`w-8 h-5 rounded-full transition-colors flex items-center ${
                tg.prefs[item.key] ? 'bg-blue-500 justify-end' : 'bg-brand-border justify-start'
              }`}>
                <div className={`w-3.5 h-3.5 rounded-full mx-0.5 transition-colors ${
                  tg.prefs[item.key] ? 'bg-white' : 'bg-brand-muted'
                }`} />
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  // Not connected state
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-brand-border p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Send className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Telegram Alerts</p>
          <p className="text-xs text-brand-muted leading-relaxed mt-1">
            Get real-time alerts when your score, loan status, repayment status, bond status, or pool launch status changes.
          </p>
        </div>
      </div>

      {tg.error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{tg.error}</p>
        </div>
      )}

      {showLinkHelp && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-300">Telegram will open. Tap <strong>Start</strong> to finish connecting alerts.</p>
        </div>
      )}

      <button
        onClick={handleEnable}
        disabled={tg.linking}
        className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {tg.linking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Enable Telegram Alerts
          </>
        )}
      </button>
    </motion.div>
  );
}

function SettingsPanel({ prefs, savePrefs }) {
  const [open, setOpen] = useState(false);
  const togglePref = (key) => savePrefs({ ...prefs, [key]: !prefs[key] });

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white hover:border-brand-accent/20 transition-all"
      >
        <Settings className="w-4 h-4" />
        <span>In-App Alert Settings</span>
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-brand-card rounded-2xl border border-brand-border p-5">
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">In-App Notification Types</p>
              {[
                { key: 'scoreDropAlerts', label: 'Score drops and level changes' },
                { key: 'loanAlerts', label: 'Loan due dates and overdue warnings' },
                { key: 'bondAlerts', label: 'Bond deposits, returns, and liquidations' },
                { key: 'repaymentReminders', label: 'Repayment confirmations' },
                { key: 'levelAlerts', label: 'Level unlock celebrations' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => togglePref(item.key)}
                  className="flex items-center justify-between w-full py-2.5 border-b border-brand-border last:border-0"
                >
                  <span className="text-xs text-brand-muted">{item.label}</span>
                  <div className={`w-8 h-5 rounded-full transition-colors flex items-center ${
                    prefs[item.key] ? 'bg-brand-accent justify-end' : 'bg-brand-border justify-start'
                  }`}>
                    <div className={`w-3.5 h-3.5 rounded-full mx-0.5 transition-colors ${
                      prefs[item.key] ? 'bg-[#0A0A0F]' : 'bg-brand-muted'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AlertsPage() {
  const { connected } = useWallet();
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const loan = ctx?.loan;
  const {
    notifications, loading, unreadCount, prefs, savePrefs,
    markAsRead, addNotification,
  } = useNotifications();
  const tg = useTelegram();
  const [filter, setFilter] = useState('all');
  const [seeded, setSeeded] = useState(false);

  // Auto-generate contextual notifications based on user state
  useEffect(() => {
    if (!connected || !scoreData || seeded) return;
    setSeeded(true);
    if (notifications.length > 0) return;

    const seeds = [];

    if (loan?.activeLoan) {
      const dueDate = new Date(loan.activeLoan.dueDate);
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)));
      if (daysLeft <= 3 && daysLeft > 0) {
        seeds.push({
          event_type: 'loan_due_soon',
          title: `Loan due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          message: `Your active loan of ${loan.activeLoan.amount} SOL is due ${dueDate.toLocaleDateString()}. Repay on time to boost your credit score by +25 pts.`,
          cta_label: 'Repay now',
          cta_route: '/repay',
        });
      } else if (daysLeft === 0) {
        seeds.push({
          event_type: 'loan_overdue',
          title: 'Loan due today',
          message: `Your loan of ${loan.activeLoan.amount} SOL is due today. Late repayment will reduce your credit score.`,
          cta_label: 'Repay now',
          cta_route: '/repay',
        });
      }
    }

    if (scoreData) {
      const breakdown = scoreData.breakdown || {};
      if (!scoreData.solDomain) {
        seeds.push({
          event_type: 'wallet_activity_updated',
          title: 'Link a .sol domain for +20 pts',
          message: 'Claiming a .sol domain via SNS.id adds an identity signal to your trust profile, boosting your credit score.',
          cta_label: 'View trust profile',
          cta_route: '/trust-score',
        });
      }
      if ((breakdown.crossChain || 0) === 0) {
        seeds.push({
          event_type: 'wallet_activity_updated',
          title: 'Import cross-chain credit for up to +90 pts',
          message: 'Connect your ETH or BTC wallet via Ika dWallet MPC to import external wallet reputation into your Lendra score.',
          cta_label: 'Connect external wallet',
          cta_route: '/trust-score/cross-chain',
        });
      }
      if (scoreData.score >= 400 && scoreData.loanLevel?.level > 0) {
        seeds.push({
          event_type: 'level_unlocked',
          title: `Level ${scoreData.loanLevel.level} unlocked`,
          message: `You are at Loan Level ${scoreData.loanLevel.level} (${scoreData.loanLevel.label}). Keep building your score to unlock higher borrowing limits.`,
          cta_label: 'View dashboard',
          cta_route: '/dashboard',
        });
      }
      if (scoreData.score < 400 && !loan?.activeLoan) {
        seeds.push({
          event_type: 'wallet_activity_updated',
          title: 'Start building credit history',
          message: 'Take your first Lendra loan and repay on time to start climbing the credit ladder. Each clean repayment adds +25 pts.',
          cta_label: 'Borrow now',
          cta_route: '/borrow',
        });
      }
    }

    if (loan?.history?.length > 0) {
      const latest = loan.history[0];
      if (latest.status === 'repaid') {
        seeds.push({
          event_type: 'repayment_confirmed',
          title: 'Loan repaid successfully',
          message: `Your ${latest.amount} SOL loan was repaid on time. Your credit score received a boost.`,
        });
      }
    }

    if (seeds.length === 0) {
      seeds.push({
        event_type: 'wallet_activity_updated',
        title: 'Welcome to Lendra',
        message: 'Your wallet is your credit score. Explore your dashboard, build trust signals, and start borrowing. All alerts and recommendations will appear here.',
        cta_label: 'Go to dashboard',
        cta_route: '/dashboard',
      });
    }

    seeds.forEach((seed) => addNotification(seed));
  }, [connected, scoreData, loan, seeded, notifications.length, addNotification]);

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-brand-border p-8">
          <Bell className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Alerts</h2>
          <p className="text-sm text-brand-muted">Connect your wallet to see personalized alerts and recommendations.</p>
        </motion.div>
      </div>
    );
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'score') return ['trust_score_dropped', 'score_increased', 'level_unlocked', 'borrowing_level_dropped', 'borrowing_locked'].includes(n.event_type);
    if (filter === 'loans') return ['loan_due_soon', 'loan_overdue', 'repayment_confirmed', 'bond_deposited', 'bond_returned', 'bond_liquidated', 'repayment_score_penalized'].includes(n.event_type);
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-brand-accent" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-accent text-[10px] font-bold text-[#0A0A0F] flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Alerts</h1>
              <p className="text-sm text-brand-muted">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <TelegramCard tg={tg} />

      <SettingsPanel prefs={prefs} savePrefs={savePrefs} />

      <div className="flex items-center gap-1 p-1 bg-brand-card rounded-xl border border-brand-border mb-6 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 min-w-[70px] px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'bg-brand-accent text-[#0A0A0F]'
                : 'text-brand-muted hover:text-white hover:bg-brand-cardHover'
            }`}
          >
            {tab.label}
            {tab.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-brand-card rounded-2xl border border-brand-border p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-border" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-brand-border rounded w-2/3" />
                  <div className="h-3 bg-brand-border rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card rounded-2xl border border-brand-border p-8 text-center"
        >
          <BellOff className="w-10 h-10 text-brand-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">
            {filter === 'unread' ? 'No unread alerts' : 'No alerts in this category'}
          </p>
          <p className="text-xs text-brand-muted">
            {filter === 'unread'
              ? 'You have read all your notifications.'
              : 'Alerts will appear here as your credit profile changes.'}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((n, i) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onMarkRead={markAsRead}
                delay={Math.min(0.08 * i, 0.4)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-[10px] text-brand-muted">
          Alerts are generated based on your wallet activity, loan status, and trust profile. Enable Telegram above for real-time delivery.
        </p>
      </motion.div>
    </div>
  );
}
