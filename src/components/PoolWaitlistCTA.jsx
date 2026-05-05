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

const LENDRA_X_URL = 'https://x.com/lendra_finance';

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

  const isTelegramActive = telegramConnected || telegram?.connected;

  const handleJoin = () => {
    if (!simulationData) return;

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
      telegramConnected: isTelegramActive,
      xConnected: xConnected,
      xUsername: xUsername,
      wantsTelegram: isTelegramActive,
    });

    addNotification({
      event_type: 'pool_waitlist_joined',
      title: 'Pool Launch List',
      message: `You joined the Lendra Credit Pool launch list for a $${simulationData.amount} ${simulationData.borrowAsset} loan simulation.`,
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

        {/* Primary CTA */}
        {!joined ? (
          <button
            onClick={handleJoin}
            className="w-full py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-bold text-sm hover:opacity-90 transition-opacity mb-4"
          >
            Join Pool Launch List
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-300 font-medium">
              You're on the pool launch list. We'll notify you when borrowing
              goes live.
            </p>
          </div>
        )}

        {/* Secondary CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Telegram */}
          <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-white">
                Telegram Alerts
              </span>
            </div>
            {isTelegramActive ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-[11px] text-green-300">
                  Telegram alerts enabled
                </span>
              </div>
            ) : (
              <Link
                to="/alerts"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-semibold hover:bg-sky-500/20 transition-colors"
              >
                Enable Telegram Alerts
              </Link>
            )}
          </div>

          {/* X */}
          <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-xs font-semibold text-white">
                X Updates
              </span>
            </div>
            {xConnected && xUsername ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-[11px] text-green-300">
                    @{xUsername} connected
                  </span>
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
                      Follow Lendra on X
                      <ExternalLink className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-brand-muted">
                  Connect X to link your social identity and follow launch
                  updates.
                </p>
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
                      Follow Lendra on X
                      <ExternalLink className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            )}
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
