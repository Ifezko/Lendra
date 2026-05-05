import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Copy, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../App';

function CreditCard({ scoreData }) {
  const { score, tier, loanLevel, canBorrow } = scoreData;
  const walletShort = scoreData.walletAddress
    ? `${scoreData.walletAddress.slice(0, 4)}...${scoreData.walletAddress.slice(-4)}`
    : 'Connected';
  const identity = scoreData.solDomain || walletShort;
  const eligible = canBorrow && loanLevel.level > 0;
  const eligibleText = eligible ? `Up to ${loanLevel.amount} USDC` : 'Upgrade Score';

  return (
    <div
      className="relative overflow-hidden rounded-3xl w-full max-w-md aspect-[600/315]"
      style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1025 50%, #0A0A0F 100%)' }}
    >
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(236, 129, 255, 0.08)' }} />
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(184, 79, 204, 0.06)' }} />

      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`} alt="Lendra" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-bold text-white tracking-tight">Lendra</span>
          </div>
          <span className="text-[10px] font-medium text-[#EC81FF] bg-[#EC81FF]/10 px-2 py-0.5 rounded-full border border-[#EC81FF]/20">
            {tier.label}
          </span>
        </div>

        {/* Center */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-[#6B6B80] uppercase tracking-wider mb-1">Credit Score</p>
            <p className="text-4xl font-extrabold text-white tabular-nums leading-none">{score}</p>
            <p className="text-[10px] text-[#6B6B80] mt-1">out of 1000</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[#6B6B80] uppercase tracking-wider mb-1">Level</p>
            <p className="text-2xl font-bold text-[#EC81FF] leading-none">{loanLevel.level > 0 ? loanLevel.level : '\u2014'}</p>
            <p className="text-[10px] text-[#6B6B80] mt-1">{loanLevel.label}</p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[8px] text-[#6B6B80] uppercase tracking-wider">Identity</p>
            <p className="text-xs font-semibold text-white mt-0.5">{identity}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-[#6B6B80] uppercase tracking-wider">Borrowing Power</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${eligible ? 'text-[#4ade80]' : 'text-[#6B6B80]'}`}>{eligibleText}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-[#6B6B80]">Your wallet is your credit score.</p>
            <p className="text-[9px] text-[#EC81FF] font-medium mt-0.5">lendra.finance</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 rounded-3xl border border-[#EC81FF]/15 pointer-events-none" />
    </div>
  );
}

export default function SocialCreditCard() {
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const privateMode = ctx?.privateMode;
  const [copied, setCopied] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
              className="px-6 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm"
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
    `My Lendra Credit Score: ${scoreData.score}/1000 (${scoreData.tier.label})\n\nLevel ${scoreData.loanLevel.level > 0 ? scoreData.loanLevel.level : '—'} — ${scoreData.loanLevel.label}\n\nYour wallet is your credit score.\nCheck yours at lendra.finance`
  );
  const shareUrl = 'https://lendra.finance';

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
    setDownloading(true);
    try {
      const eligible = scoreData.canBorrow && scoreData.loanLevel.level > 0;
      const eligibleText = eligible ? `Up to ${scoreData.loanLevel.amount} USDC` : 'Upgrade Score';

      const W = 1200;
      const H = 630;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext('2d');

      // Background gradient
      const grad = c.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#0A0A0F');
      grad.addColorStop(0.5, '#1A1025');
      grad.addColorStop(1, '#0A0A0F');
      c.fillStyle = grad;
      c.beginPath();
      c.roundRect(0, 0, W, H, 40);
      c.fill();

      // Glow effects
      const g1 = c.createRadialGradient(W - 100, 80, 0, W - 100, 80, 200);
      g1.addColorStop(0, 'rgba(236, 129, 255, 0.12)');
      g1.addColorStop(1, 'rgba(236, 129, 255, 0)');
      c.fillStyle = g1;
      c.fillRect(W - 300, 0, 300, 300);

      // Border
      c.strokeStyle = 'rgba(236, 129, 255, 0.15)';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(1, 1, W - 2, H - 2, 40);
      c.stroke();

      // Try loading logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = `${import.meta.env.BASE_URL}assets/lender-logo5x.png`;
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          setTimeout(reject, 3000);
        });
        c.drawImage(logoImg, 50, 40, 48, 48);
      } catch {
        c.fillStyle = 'rgba(236, 129, 255, 0.2)';
        c.beginPath();
        c.arc(74, 64, 24, 0, Math.PI * 2);
        c.fill();
      }

      // ─ Top row ─
      c.fillStyle = '#FFFFFF';
      c.font = 'bold 28px Inter, system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillText('Lendra', 108, 72);

      // Tier badge
      const tierText = scoreData.tier.label;
      c.font = '600 18px Inter, system-ui, sans-serif';
      const tierW = c.measureText(tierText).width + 24;
      c.fillStyle = 'rgba(236, 129, 255, 0.1)';
      c.beginPath();
      c.roundRect(W - 50 - tierW, 44, tierW, 32, 16);
      c.fill();
      c.strokeStyle = 'rgba(236, 129, 255, 0.2)';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(W - 50 - tierW, 44, tierW, 32, 16);
      c.stroke();
      c.fillStyle = '#EC81FF';
      c.fillText(tierText, W - 50 - tierW + 12, 66);

      // ─ Center row ─
      const centerY = 250;
      c.textAlign = 'left';
      c.fillStyle = '#6B6B80';
      c.font = '500 16px Inter, system-ui, sans-serif';
      c.fillText('CREDIT SCORE', 50, centerY - 50);

      c.fillStyle = '#FFFFFF';
      c.font = 'bold 88px Inter, system-ui, sans-serif';
      c.fillText(String(scoreData.score), 50, centerY + 30);

      c.fillStyle = '#6B6B80';
      c.font = '500 18px Inter, system-ui, sans-serif';
      c.fillText('out of 1000', 50, centerY + 60);

      // Level (right aligned)
      c.textAlign = 'right';
      c.fillStyle = '#6B6B80';
      c.font = '500 16px Inter, system-ui, sans-serif';
      c.fillText('LEVEL', W - 50, centerY - 50);

      c.fillStyle = '#EC81FF';
      c.font = 'bold 64px Inter, system-ui, sans-serif';
      c.fillText(scoreData.loanLevel.level > 0 ? String(scoreData.loanLevel.level) : '\u2014', W - 50, centerY + 20);

      c.fillStyle = '#6B6B80';
      c.font = '500 18px Inter, system-ui, sans-serif';
      c.fillText(scoreData.loanLevel.label, W - 50, centerY + 50);

      // ─ Bottom row ─
      const bottomY = H - 60;
      c.textAlign = 'left';

      c.fillStyle = '#6B6B80';
      c.font = '500 14px Inter, system-ui, sans-serif';
      c.fillText('IDENTITY', 50, bottomY - 22);
      c.fillStyle = '#FFFFFF';
      c.font = '600 20px Inter, system-ui, sans-serif';
      c.fillText(identity, 50, bottomY + 4);

      // Borrowing power (center)
      c.textAlign = 'center';
      c.fillStyle = '#6B6B80';
      c.font = '500 14px Inter, system-ui, sans-serif';
      c.fillText('BORROWING POWER', W / 2, bottomY - 22);
      c.fillStyle = eligible ? '#4ade80' : '#6B6B80';
      c.font = '600 18px Inter, system-ui, sans-serif';
      c.fillText(eligibleText, W / 2, bottomY + 4);

      // lendra.finance (right)
      c.textAlign = 'right';
      c.fillStyle = '#6B6B80';
      c.font = '400 14px Inter, system-ui, sans-serif';
      c.fillText('Your wallet is your credit score.', W - 50, bottomY - 22);
      c.fillStyle = '#EC81FF';
      c.font = '600 16px Inter, system-ui, sans-serif';
      c.fillText('lendra.finance', W - 50, bottomY + 4);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `lendra-credit-card-${scoreData.score}.png`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-6">Share Credit Card</h1>

        <CreditCard scoreData={scoreData} />

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-card border border-brand-border text-white text-sm font-semibold hover:bg-brand-cardHover transition-colors"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Exporting...' : 'Download'}
          </button>
          <button
            onClick={handleShareX}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] text-sm font-semibold hover:opacity-90 transition-opacity"
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
