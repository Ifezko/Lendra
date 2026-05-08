import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  ExternalLink,
  Rocket,
  Share2,
} from 'lucide-react';
import { usePoolWaitlist } from '../hooks/usePoolWaitlist';
import { useNotifications } from '../hooks/useNotifications';

const LENDRA_X_URL = 'https://x.com/lendrafinance';

export default function PoolWaitlistCTA({
  simulationData,
  telegramConnected = false,
  xConnected = false,
  xUsername = '',
}) {
  const { isOnWaitlist, joinWaitlist, updateEntry, entry } = usePoolWaitlist();
  const { addNotification, telegram } = useNotifications();
  const [joined, setJoined] = useState(isOnWaitlist);
  const [followedX, setFollowedX] = useState(false);
  const [contactMethod, setContactMethod] = useState('x');
  const [xHandle, setXHandle] = useState(xUsername || '');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [handleError, setHandleError] = useState('');

  const isTelegramActive = telegramConnected || telegram?.connected;

  const cleanHandle = (val) => val.replace(/^@/, '').trim();

  const hasValidContact = () => {
    if (contactMethod === 'x') return cleanHandle(xHandle).length >= 1;
    if (contactMethod === 'telegram') return cleanHandle(telegramHandle).length >= 1;
    return false;
  };

  const handleJoin = () => {
    if (!simulationData) return;

    if (!hasValidContact()) {
      setHandleError(
        contactMethod === 'x'
          ? 'Enter your X handle so Lendra can notify you.'
          : 'Enter your Telegram username so Lendra can notify you.'
      );
      return;
    }
    setHandleError('');

    const cleanX = cleanHandle(xHandle);
    const cleanTg = cleanHandle(telegramHandle);

    joinWaitlist({
      amount: simulationData.amount,
      borrowAsset: simulationData.borrowAsset,
      bondAmount: simulationData.bondAmount,
      loanLevel: simulationData.loanLevel,
      levelName: simulationData.levelName,
      purposeText: simulationData.purposeText,
      purposeTags: simulationData.purposeTags,
      score: simulationData.score,
      eligible: simulationData.eligible,
      telegramConnected: isTelegramActive || (contactMethod === 'telegram' && !!cleanTg),
      xConnected: xConnected || (contactMethod === 'x' && !!cleanX),
      xUsername: cleanX || xUsername,
      telegramUsername: cleanTg,
      notifyVia: contactMethod,
      wantsTelegram: contactMethod === 'telegram' || isTelegramActive,
    });

    addNotification({
      event_type: 'pool_waitlist_joined',
      title: 'Pool Launch List',
      message: `You joined the Lendra Credit Pool launch list for a ${simulationData.amount} ${simulationData.borrowAsset} loan simulation.`,
      cta_label: 'View Alerts',
      cta_route: '/alerts',
    });

    setJoined(true);
  };

  const handleFollowX = () => {
    window.open(LENDRA_X_URL, '_blank', 'noopener,noreferrer');
    setFollowedX(true);
    if (entry) {
      updateEntry({ followed_lendra_x: true });
    }
  };

  if (!simulationData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-6"
    >
      <div className="bg-brand-card rounded-2xl border border-brand-accent/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-bold text-white">
            Want this loan when the Lendra Credit Pool goes live?
          </h3>
        </div>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">
          Your simulation is ready. Join the pool launch list and get notified
          when borrowing becomes available.
        </p>

        {/* Simulation summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="bg-brand-bg/50 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Amount</p>
            <p className="text-xs font-bold text-white">
              ${simulationData.amount} {simulationData.borrowAsset}
            </p>
          </div>
          <div className="bg-brand-bg/50 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Bond</p>
            <p className="text-xs font-bold text-yellow-400">
              ${simulationData.bondAmount}
            </p>
          </div>
          <div className="bg-brand-bg/50 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Level</p>
            <p className="text-xs font-bold text-brand-accent">
              {simulationData.levelName || 'N/A'}
            </p>
          </div>
          <div className="bg-brand-bg/50 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Score</p>
            <p className="text-xs font-bold text-white">
              {simulationData.score}/1000
            </p>
          </div>
        </div>

        {/* Notification contact — shown before joining */}
        {!joined && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-white mb-2.5">
              How should Lendra notify you?
            </p>

            {/* Channel toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setContactMethod('x'); setHandleError(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  contactMethod === 'x'
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'bg-brand-bg/50 border border-brand-border text-brand-muted hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X (Twitter)
              </button>
              <button
                onClick={() => { setContactMethod('telegram'); setHandleError(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  contactMethod === 'telegram'
                    ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                    : 'bg-brand-bg/50 border border-brand-border text-brand-muted hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Telegram
              </button>
            </div>

            {/* Handle input */}
            {contactMethod === 'x' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">@</span>
                <input
                  type="text"
                  value={xHandle}
                  onChange={(e) => { setXHandle(e.target.value); setHandleError(''); }}
                  placeholder="your_x_handle"
                  maxLength={50}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-brand-muted/40 focus:outline-none focus:border-brand-accent/50 transition-colors"
                />
              </div>
            )}
            {contactMethod === 'telegram' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">@</span>
                <input
                  type="text"
                  value={telegramHandle}
                  onChange={(e) => { setTelegramHandle(e.target.value); setHandleError(''); }}
                  placeholder="your_telegram_username"
                  maxLength={50}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-brand-muted/40 focus:outline-none focus:border-brand-accent/50 transition-colors"
                />
              </div>
            )}
            {handleError && (
              <p className="text-[11px] text-red-400 mt-1.5">{handleError}</p>
            )}
            <p className="text-[10px] text-brand-muted/60 mt-1.5">
              Lendra will use this to reach you when the Credit Pool launches.
            </p>
          </div>
        )}

        {/* Primary CTA */}
        {!joined ? (
          <button
            onClick={handleJoin}
            className="w-full py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-bold text-sm hover:opacity-90 transition-opacity mb-4"
          >
            Join Pool Launch List
          </button>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-300 font-medium">
                You're on the pool launch list. We'll notify you when borrowing
                goes live.
              </p>
            </div>
            {contactMethod === 'x' && xHandle && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-bg/50 border border-brand-border">
                <svg className="w-3.5 h-3.5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-[11px] text-brand-muted">
                  Notifications via <span className="text-white font-medium">@{cleanHandle(xHandle)}</span>
                </span>
              </div>
            )}
            {contactMethod === 'telegram' && telegramHandle && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-bg/50 border border-brand-border">
                <Bell className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                <span className="text-[11px] text-brand-muted">
                  Notifications via Telegram <span className="text-white font-medium">@{cleanHandle(telegramHandle)}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Follow Lendra on X */}
        <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-xs font-semibold text-white">Follow Lendra for updates</span>
            </div>
            <button
              onClick={handleFollowX}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-semibold hover:bg-white/10 transition-colors"
            >
              {followedX ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Following
                </>
              ) : (
                <>
                  Follow @lendrafinance
                  <ExternalLink className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Share CTA */}
        <Link
          to="/share"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-brand-accent/20 text-brand-accent text-xs font-semibold hover:bg-brand-accent/5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share your Lendra Score on X
        </Link>

        {/* Disclaimer */}
        <p className="text-[9px] text-brand-muted/60 mt-4 text-center leading-relaxed">
          Joining the pool launch list does not guarantee loan approval. Final
          eligibility is checked again when borrowing goes live.
        </p>
      </div>
    </motion.div>
  );
}
