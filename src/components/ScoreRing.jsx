import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Globe } from 'lucide-react';
import { useAppContext } from '../App';

const RADIUS = 110;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({ score, tier, animate = true }) {
  const ctx = useAppContext();
  const isPrivate = ctx?.privateMode?.isPrivate;
  const connectedChains = ctx?.scoreData?.connectedChains || [];
  const crossChainBoost = ctx?.scoreData?.crossChainBoost || 0;

  const [displayed, setDisplayed] = useState(0);
  const percentage = Math.min(100, (score / 1000) * 100);
  const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * percentage) / 100;

  useEffect(() => {
    if (!animate) {
      setDisplayed(score);
      return;
    }
    const duration = 1800;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.floor(score * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score, animate]);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="260" height="260" viewBox="0 0 260 260" className="transform -rotate-90">
        <circle cx="130" cy="130" r={RADIUS} fill="none" stroke="#1E1E2A" strokeWidth={STROKE} strokeLinecap="round" />
        <motion.circle
          cx="130" cy="130" r={RADIUS}
          fill="none"
          stroke={isPrivate ? 'url(#privateGradient)' : 'url(#scoreGradient)'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ filter: isPrivate ? 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.4))' : 'drop-shadow(0 0 12px rgba(236, 129, 255, 0.4))' }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC81FF" />
            <stop offset="100%" stopColor="#B84FCC" />
          </linearGradient>
          <linearGradient id="privateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isPrivate ? (
          <>
            <Lock className="w-8 h-8 text-purple-400 mb-1" />
            <motion.span
              className="text-sm font-semibold text-purple-400 tracking-wider uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Private
            </motion.span>
            <span className="text-[10px] text-brand-muted mt-1">Encrypted via Encrypt</span>
          </>
        ) : (
          <>
            <motion.span
              className="text-5xl font-extrabold text-white tabular-nums"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {displayed}
            </motion.span>
            <motion.span
              className="text-sm font-semibold mt-1 tracking-wider uppercase"
              style={{ color: tier?.color || '#EC81FF' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {tier?.label}
            </motion.span>
            <motion.span
              className="text-xs text-brand-muted mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              out of 1000
            </motion.span>
          </>
        )}
      </div>

      {/* Cross-chain badge */}
      {connectedChains.length > 0 && !isPrivate && (
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/30"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <Globe className="w-3 h-3 text-teal-400" />
          <span className="text-[10px] font-semibold text-teal-400">
            +{crossChainBoost} cross-chain
          </span>
        </motion.div>
      )}
    </div>
  );
}
