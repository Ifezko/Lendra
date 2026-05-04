import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Copy, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../App';
import ScoreRing from './ScoreRing';

function CreditCard({ scoreData, forExport }) {
  const { score, tier, loanLevel, solDomain } = scoreData;
  const walletShort = scoreData.walletAddress
    ? `${scoreData.walletAddress.slice(0, 4)}...${scoreData.walletAddress.slice(-4)}`
    : 'Connected';
  const identity = solDomain || walletShort;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${forExport ? 'w-[600px] h-[340px]' : 'w-full max-w-md aspect-[16/9]'}`}
      style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1025 50%, #0A0A0F 100%)' }}
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-accentDark/10 rounded-full blur-3xl" />

      <div className="relative h-full flex flex-col justify-between p-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`}
              alt="Lendra"
              className="w-7 h-7 rounded-lg"
            />
            <span className="text-base font-bold text-white tracking-tight">Lendra</span>
          </div>
          <span className="text-xs font-medium text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-full border border-brand-accent/20">
            {tier.label}
          </span>
        </div>

        {/* Center */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-brand-muted uppercase tracking-wider mb-1">Credit Score</p>
            <p className="text-5xl font-extrabold text-white tabular-nums">{score}</p>
            <p className="text-xs text-brand-muted mt-1">out of 870</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-brand-muted uppercase tracking-wider mb-1">Level</p>
            <p className="text-2xl font-bold text-brand-accent">{loanLevel.level > 0 ? loanLevel.level : '—'}</p>
            <p className="text-xs text-brand-muted mt-1">{loanLevel.label}</p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-brand-muted uppercase tracking-wider">Identity</p>
            <p className="text-sm font-semibold text-white">{identity}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-brand-muted">Your wallet is your credit score.</p>
            <p className="text-[10px] text-brand-accent font-medium">lendra.app</p>
          </div>
        </div>
      </div>

      {/* Border accent */}
      <div className="absolute inset-0 rounded-3xl border border-brand-accent/20 pointer-events-none" />
    </div>
  );
}

export default function SocialCreditCard() {
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const privateMode = ctx?.privateMode;
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);

  if (!scoreData) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="bg-brand-card rounded-2xl border border-brand-border p-8">
          <Share2 className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-sm text-brand-muted">Connect your wallet and run a scan to generate your credit card.</p>
        </div>
      </div>
    );
  }

  const isPrivateMode = privateMode?.isPrivate;
  if (isPrivateMode && !privacyConfirmed) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12">
        <div className="bg-brand-card rounded-2xl border border-purple-500/30 p-8 text-center">
          <Lock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Private Mode Active</h2>
          <p className="text-sm text-brand-muted mb-6">
            Generating a share card will display your score and tier publicly. Continue?
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setPrivacyConfirmed(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-accentDark text-white font-semibold text-sm"
            >
              Yes, generate card
            </button>
          </div>
        </div>
      </div>
    );
  }

  const identity = scoreData.solDomain || 'My wallet';
  const shareText = encodeURIComponent(
    `${identity} has a Lendra score of ${scoreData.score}.\n\nYour wallet is your credit score.\n\nScan yours on Lendra.`
  );
  const shareUrl = 'https://lendra.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, () => {});
  };

  const handleShareX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const handleDownload = async () => {
    // Use canvas-based export for the card
    if (!cardRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 680;
      const c = canvas.getContext('2d');

      // Background gradient
      const grad = c.createLinearGradient(0, 0, 1200, 680);
      grad.addColorStop(0, '#0A0A0F');
      grad.addColorStop(0.5, '#1A1025');
      grad.addColorStop(1, '#0A0A0F');
      c.fillStyle = grad;
      c.roundRect(0, 0, 1200, 680, 40);
      c.fill();

      // Border
      c.strokeStyle = 'rgba(236,129,255,0.2)';
      c.lineWidth = 2;
      c.roundRect(1, 1, 1198, 678, 40);
      c.stroke();

      // Texts
      c.fillStyle = '#FFFFFF';
      c.font = 'bold 28px Inter, system-ui, sans-serif';
      c.fillText('Lendra', 50, 70);

      c.fillStyle = '#EC81FF';
      c.font = '600 18px Inter, system-ui, sans-serif';
      c.fillText(scoreData.tier.label, 1050, 70);

      c.fillStyle = '#6B6B80';
      c.font = '500 14px Inter, system-ui, sans-serif';
      c.fillText('CREDIT SCORE', 50, 280);

      c.fillStyle = '#FFFFFF';
      c.font = 'bold 96px Inter, system-ui, sans-serif';
      c.fillText(String(scoreData.score), 50, 380);

      c.fillStyle = '#6B6B80';
      c.font = '500 16px Inter, system-ui, sans-serif';
      c.fillText('out of 870', 50, 420);

      c.fillStyle = '#6B6B80';
      c.font = '500 14px Inter, system-ui, sans-serif';
      c.fillText('LEVEL', 900, 280);

      c.fillStyle = '#EC81FF';
      c.font = 'bold 64px Inter, system-ui, sans-serif';
      c.fillText(String(scoreData.loanLevel.level || '—'), 900, 370);

      c.fillStyle = '#6B6B80';
      c.font = '500 16px Inter, system-ui, sans-serif';
      c.fillText(scoreData.loanLevel.label, 900, 410);

      c.fillStyle = '#6B6B80';
      c.font = '500 14px Inter, system-ui, sans-serif';
      c.fillText('IDENTITY', 50, 580);

      c.fillStyle = '#FFFFFF';
      c.font = '600 20px Inter, system-ui, sans-serif';
      c.fillText(identity, 50, 610);

      c.fillStyle = '#6B6B80';
      c.font = '400 13px Inter, system-ui, sans-serif';
      c.fillText('Your wallet is your credit score.', 750, 600);

      c.fillStyle = '#EC81FF';
      c.font = '600 14px Inter, system-ui, sans-serif';
      c.fillText('lendra.app', 750, 625);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `lendra-credit-card-${scoreData.score}.png`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Share Credit Card</h1>

        <div ref={cardRef}>
          <CreditCard scoreData={scoreData} />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-card border border-brand-border text-white text-sm font-semibold hover:bg-brand-cardHover transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleShareX}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-accentDark text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share to X
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-card border border-brand-border text-brand-muted text-sm font-semibold hover:text-white hover:bg-brand-cardHover transition-colors"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[10px] text-brand-muted text-center mt-4">
          Only your score, tier, and level are shared. No balances, portfolio values, or loan history included.
        </p>
      </motion.div>
    </div>
  );
}
