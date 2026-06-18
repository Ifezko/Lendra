import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  Shield,
  Zap,
  Lock,
  Eye,
  Wallet,
  Search,
  BarChart3,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  Globe,
  ShieldCheck,
  Server,
} from 'lucide-react';

// ─── Animated Hero Score Card ─────────────────────────────────────────

function HeroScoreCard() {
  const [score, setScore] = useState(300);
  const targetScore = 782;

  useEffect(() => {
    const duration = 2200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScore(Math.floor(300 + (targetScore - 300) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => requestAnimationFrame(tick), 800);
    return () => clearTimeout(timer);
  }, []);

  const pct = (score / 1000) * 100;
  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4, duration: 0.8 }}
    >
      <div className="bg-brand-card/80 backdrop-blur-xl border border-brand-border rounded-3xl p-6 shadow-2xl shadow-brand-accent/5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`}
              alt="Lendra"
              className="w-6 h-6 rounded-md"
            />
            <span className="text-xs font-bold text-white tracking-tight">Lendra</span>
          </div>
          <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            Mainnet
          </span>
        </div>

        <div className="flex justify-center mb-5">
          <div className="relative">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              <circle cx="90" cy="90" r={R} fill="none" stroke="#1E1E2A" strokeWidth="10" strokeLinecap="round" />
              <motion.circle
                cx="90" cy="90" r={R}
                fill="none"
                stroke="url(#heroGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: offset }}
                transition={{ delay: 0.8, duration: 2.2, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ filter: 'drop-shadow(0 0 10px rgba(236, 129, 255, 0.4))' }}
              />
              <defs>
                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EC81FF" />
                  <stop offset="100%" stopColor="#B84FCC" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white tabular-nums">{score}</span>
              <span className="text-xs font-semibold text-brand-accent mt-0.5">Excellent</span>
              <span className="text-[10px] text-brand-muted">out of 1000</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <p className="text-[10px] text-brand-muted uppercase tracking-wider">Wallet</p>
            <p className="text-xs font-mono text-white">7xKp...v4Qm</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-brand-muted uppercase tracking-wider">Loan Level</p>
            <p className="text-xs font-semibold text-brand-accent">Level 6 — Diamond</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-brand-bg/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Spend Gate</p>
            <p className="text-xs font-bold text-green-400">Passed</p>
          </div>
          <div className="bg-brand-bg/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Eligible</p>
            <p className="text-xs font-bold text-white">$400 USDC</p>
          </div>
          <div className="bg-brand-bg/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-brand-muted">Chains</p>
            <p className="text-xs font-bold text-teal-400">SOL + ETH</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-center gap-3">
          <span className="text-[9px] text-brand-muted">Your wallet is your credit score</span>

        </div>
      </div>
      <div className="absolute -inset-4 bg-gradient-to-br from-brand-accent/10 via-transparent to-brand-accentDark/10 rounded-3xl blur-3xl -z-10" />
    </motion.div>
  );
}

// ─── FAQ Accordion ────────────────────────────────────────────────────

const FAQ_DATA = [
  { q: 'What is Lendra?', a: 'Lendra is a Solana-native credit layer that turns wallet activity into borrowing power. It scans your wallet history, builds a credit profile, and shows what you may be eligible to borrow based on real onchain behavior.' },
  { q: 'How does Lendra calculate my credit score?', a: 'Lendra looks at signals like wallet age, transaction activity, protocol usage, portfolio behavior, recent onchain spend, repayment history, and identity signals such as .sol domains. These signals help estimate how active and reliable a wallet is.' },
  { q: 'Do I need collateral to borrow on Lendra?', a: 'Lendra is designed to reduce dependence on overcollateralization. Instead of requiring users to lock more assets than they borrow, Lendra uses wallet behavior, eligibility gates, and small risk bonds to determine borrowing access.' },
  { q: 'What is an onchain credit score?', a: 'An onchain credit score is a credit profile built from blockchain activity. Instead of using bank records or traditional credit bureaus, it uses wallet behavior such as transactions, protocol usage, asset history, repayment behavior, and identity signals.' },
  { q: 'Who is Lendra for?', a: 'Lendra is built for active Solana users, crypto-native freelancers, emerging-market DeFi users, lenders, protocols, and institutions that need better credit signals.' },
  { q: 'Can institutions use Lendra?', a: "Yes. Lendra's long-term direction includes private credit infrastructure for institutions. With privacy tools like Encrypt, institutional borrowers and lenders can explore onchain credit without exposing sensitive loan data, positions, or strategy details publicly." },
  { q: 'What does private borrowing mean?', a: 'Private borrowing means users or institutions can access credit while keeping sensitive financial data hidden. This can include credit score, loan size, repayment details, or lender position data.' },
  { q: 'How does Lendra AI work?', a: "Lendra AI is a local credit assistant that explains your score, suggests improvements, and translates explanations into different languages. It runs locally on your device without sending sensitive financial data to external cloud AI providers." },
  { q: 'Does Lendra send my wallet data to a cloud AI service?', a: "No. Lendra AI runs locally on your device, so credit explanations happen without sending sensitive financial data to a centralized cloud AI provider." },
  { q: 'Is Lendra a bank?', a: 'No. Lendra is not a bank. Lendra provides wallet-based credit scoring and DeFi access infrastructure. Loan availability may depend on partner protocols, jurisdiction, eligibility checks, and risk rules.' },
];

function FAQItem({ item, isOpen, onToggle }) {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div className="border border-brand-border rounded-xl overflow-hidden bg-brand-card/50 hover:border-brand-accent/15 transition-colors">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left" aria-expanded={isOpen}>
        <span className="text-sm font-semibold text-white pr-4">{item.q}</span>
        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-bg flex items-center justify-center border border-brand-border">
          {isOpen ? <Minus className="w-3.5 h-3.5 text-brand-accent" /> : <Plus className="w-3.5 h-3.5 text-brand-muted" />}
        </span>
      </button>
      <div style={{ height, transition: 'height 0.3s ease' }} className="overflow-hidden">
        <div ref={contentRef} className="px-5 pb-4">
          <p className="text-xs text-brand-muted leading-relaxed">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────

function Footer() {
  const footerLinks = {
    Product: [
      { label: 'Scan Wallet', href: '#' }, { label: 'Credit Score', href: '#' },
      { label: 'Borrow', href: '#' }, { label: 'Repay', href: '#' },
      { label: 'Private Mode', href: '#' }, { label: 'Cross-chain Credit', href: '#' },
    ],
    Resources: [
      { label: 'Docs', href: '#' }, { label: 'GitHub', href: '#' },
      { label: 'Blog', href: 'blog' }, { label: 'FAQ', href: '#faq' },
    ],
    Company: [
      { label: 'About', href: '#' }, { label: 'Contact', href: '#' },
      { label: 'Partnerships', href: '#' }, { label: 'Careers', href: '#' }, { label: 'Press', href: '#' },
    ],
  };

  const socials = [
		{ label: 'LinkedIn', href: 'https://www.linkedin.com/company/lendrafinance', d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    { label: 'X', href: 'https://x.com/lendrafinance', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    { label: 'Discord', href: '#', d: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z' },
    { label: 'Telegram', href: '#', d: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' },
    
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '#' }, { label: 'Terms of Service', href: '#' },
    { label: 'Risk Disclosure', href: '#' }, { label: 'Cookie Policy', href: '#' }, { label: 'Disclaimers', href: '#' },
  ];

  return (
    <footer className="border-t border-brand-border bg-brand-bg">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`} alt="Lendra" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-bold text-white tracking-tight">Lendra</span>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed mb-4 max-w-xs">
              Your wallet is your credit score. Lendra turns wallet activity into borrowing power on Solana.
            </p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} className="w-8 h-8 rounded-lg bg-brand-card border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent hover:border-brand-accent/30 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
                </a>
              ))}
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-brand-muted hover:text-brand-accent transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-brand-border pt-6 mb-6">
          <p className="text-[10px] text-brand-muted/70 leading-relaxed max-w-3xl">
            Lendra provides wallet-based credit scoring and DeFi access infrastructure. Lendra is not a bank.
            Loan availability may depend on partner protocols, jurisdiction, eligibility, and risk checks.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-brand-muted/60">&copy; 2026 LENDRA. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            {legalLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-[10px] text-brand-muted/60 hover:text-brand-accent transition-colors">{link.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(-1);

  const scrollToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  const FEATURES = [
    { icon: Shield, title: 'Wallet-Based Credit', desc: 'Your onchain activity becomes your credit history. No long forms, no bank paperwork.' },
    { icon: Zap, title: 'Instant Scoring', desc: 'Connect your wallet and get a real-time credit profile built from your Solana activity.' },
    { icon: Lock, title: 'Undercollateralized Loans', desc: 'Access borrowing power based on wallet behavior, not excess collateral.' },
    { icon: Eye, title: 'Transparent Algorithm', desc: 'See how your score is built: age, activity, consistency, diversity, and portfolio signals.' },
  ];

  const STEPS = [
    { icon: Wallet, title: 'Connect wallet', desc: 'Wallet-first onboarding.' },
    { icon: Search, title: 'Scan activity', desc: 'Lendra reads wallet history, recent spend, and transaction behavior.' },
    { icon: BarChart3, title: 'Get credit profile', desc: 'Lendra calculates score, level, and borrowing eligibility.' },
    { icon: TrendingUp, title: 'Borrow and improve', desc: 'Clean repayments help unlock higher limits over time.' },
  ];

  const PRIVATE_CARDS = [
    { icon: Lock, title: 'Private Borrowing', desc: 'Borrow without exposing sensitive loan size, repayment terms, or credit profile publicly.' },
    { icon: ShieldCheck, title: 'Encrypted Lender Vaults', desc: 'Lenders can allocate capital into private credit strategies without revealing positions.' },
    { icon: Server, title: 'Lendra Credit API', desc: 'Protocols and lenders can query wallet risk, repayment behavior, and eligibility.' },
    { icon: Globe, title: 'Cross-chain Credit Identity', desc: 'Lendra extends borrower reputation across chains without relying on bridges or wrapped assets.' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                <span className="text-[11px] font-semibold text-brand-accent tracking-wide uppercase">Live on Solana Mainnet</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.1] mb-5">
                Turn wallet activity<br />into{' '}
                <span className="bg-gradient-to-r from-brand-accent to-brand-accentDark bg-clip-text text-transparent">borrowing power.</span>
              </h1>
              <p className="text-base md:text-lg text-brand-muted max-w-lg mb-8 leading-relaxed">
                Lendra scans your Solana wallet, builds a credit profile, and shows what you can borrow based on real onchain behavior.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <WalletMultiButton className="!rounded-xl !font-bold !text-sm !h-12 !px-8 !bg-brand-accent !text-[#0A0A0F]">Scan Wallet</WalletMultiButton>
                <button onClick={scrollToHow} className="flex items-center gap-2 px-5 h-12 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted hover:text-white hover:border-brand-accent/30 transition-colors">
                  See how it works <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-6 text-brand-muted">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-accent/60" />
                  <span className="text-[11px]">No bank paperwork</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-brand-accent/60" />
                  <span className="text-[11px]">Results in minutes</span>
                </div>
              </div>
            </motion.div>
            <div className="flex justify-center lg:justify-end">
              <HeroScoreCard />
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-accent/[0.03] rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ── WHY LENDRA ────────────────────────────────────── */}
      <section className="py-20 border-t border-brand-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Why Lendra</h2>
            <p className="text-sm text-brand-muted max-w-md mx-auto">A credit system built around wallet behavior, not bank paperwork.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div key={feat.title} className="flex items-start gap-4 p-5 rounded-2xl border border-brand-border bg-brand-card/50 hover:border-brand-accent/20 transition-colors" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}>
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{feat.title}</p>
                    <p className="text-xs text-brand-muted leading-relaxed">{feat.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-t border-brand-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">How Lendra works</h2>
            <p className="text-sm text-brand-muted max-w-md mx-auto">From wallet activity to borrowing eligibility in minutes.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.title} className="relative p-5 rounded-2xl border border-brand-border bg-brand-card/50" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-brand-accent" />
                    </div>
                    <span className="text-[10px] font-bold text-brand-accent/60 uppercase tracking-wider">Step {i + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">{step.title}</p>
                  <p className="text-xs text-brand-muted leading-relaxed">{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-5 h-5 text-brand-border" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          <motion.div className="hidden lg:flex items-center justify-center gap-2 mt-8 text-brand-muted" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
            {['Wallet activity', 'Credit score', 'Loan level', 'Repayment history', 'Higher limits'].map((label, i) => (
              <React.Fragment key={label}>
                <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-brand-card border border-brand-border">{label}</span>
                {i < 4 && <ArrowRight className="w-3.5 h-3.5 text-brand-border" />}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRIVATE CREDIT ────────────────────────────────── */}
      <section className="py-20 border-t border-brand-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Built for private credit at scale.</h2>
            <p className="text-sm text-brand-muted max-w-lg mx-auto">
              Lendra starts with wallet-based credit scoring for active users, but the long-term vision is a private onchain credit infrastructure for institutions, lenders, and protocols.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRIVATE_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.title} className="flex items-start gap-4 p-5 rounded-2xl border border-brand-border bg-brand-card/50 hover:border-brand-accent/20 transition-colors" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}>
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{card.title}</p>
                    <p className="text-xs text-brand-muted leading-relaxed">{card.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="py-20 border-t border-brand-border/50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Frequently Asked Questions</h2>
            <p className="text-sm text-brand-muted max-w-lg mx-auto">
              Everything you need to know about wallet-based credit, private borrowing, and how Lendra works.
            </p>
          </div>
          <div className="space-y-3">
            {FAQ_DATA.map((item, i) => (
              <FAQItem key={i} item={item} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="py-20 border-t border-brand-border/50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">See what your wallet can unlock.</h2>
            <p className="text-sm text-brand-muted mb-8 max-w-md mx-auto">Start with your wallet history. Get a credit profile in minutes.</p>
            <WalletMultiButton className="!rounded-xl !font-bold !text-sm !h-12 !px-8 !mx-auto !bg-brand-accent !text-[#0A0A0F]">Scan Wallet</WalletMultiButton>
            <p className="text-xs text-brand-muted mt-4">Built on Solana. Designed for active wallets.</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
