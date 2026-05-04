import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingState() {
  return (
    <div className="max-w-md mx-auto px-4 pt-24 text-center">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Animated rings */}
        <div className="relative w-32 h-32">
          <motion.div
            className="absolute inset-0 border-2 border-brand-accent/30 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-2 border-2 border-brand-accent/50 rounded-full"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className="absolute inset-4 border-2 border-brand-accent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ borderTopColor: 'transparent' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-brand-accentDark flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
          </div>
        </div>

        <div>
          <motion.p
            className="text-lg font-semibold text-white"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Analyzing your wallet...
          </motion.p>
          <p className="text-sm text-brand-muted mt-2">
            Scanning transactions, protocols, and on-chain activity
          </p>
        </div>

        {/* Progress steps */}
        <div className="space-y-2 w-full max-w-xs text-left">
          {['Fetching balance', 'Scanning transactions', 'Analyzing protocols', 'Computing score'].map(
            (step, i) => (
              <motion.div
                key={step}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + 0.8 * i }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-brand-accent flex items-center justify-center"
                  animate={i < 3 ? { borderColor: ['#EC81FF', '#7CFF81', '#7CFF81'] } : {}}
                  transition={{ delay: 1 + 0.8 * i, duration: 0.3 }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                    animate={i < 3 ? { backgroundColor: ['#EC81FF', '#7CFF81', '#7CFF81'] } : {}}
                    transition={{ delay: 1 + 0.8 * i, duration: 0.3 }}
                  />
                </motion.div>
                <span className="text-xs text-brand-muted">{step}</span>
              </motion.div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
