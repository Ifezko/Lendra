import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate, Link } from 'react-router-dom';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ArrowDownToLine,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { useAppContext } from '../App';
import { getLoanLevel, calculateBond } from '../hooks/useCreditScore';
import ScoreRing from './ScoreRing';
import PoolWaitlistCTA from './PoolWaitlistCTA';

const TERMS = [
  { days: 7, label: '7 days', apr: 12 },
  { days: 14, label: '14 days', apr: 10 },
  { days: 30, label: '30 days', apr: 8 },
];

const PURPOSE_CHIPS = [
  'DeFi opportunity',
  'NFT purchase',
  'Token swap',
  'Protocol participation',
  'Gas fees',
  'Other',
];

const BORROW_ASSETS = [
  { symbol: 'USDC', name: 'USD Coin', supported: true },
  { symbol: 'USDT', name: 'Tether', supported: false },
];

// Lendra escrow vault
const BOND_VAULT = new PublicKey('1nc1nerator11111111111111111111111111111111');

export default function BorrowPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  const ctx = useAppContext();
  const scoreData = ctx?.scoreData;
  const loan = ctx?.loan;

  const [amount, setAmount] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[1]);
  const [borrowAsset, setBorrowAsset] = useState(BORROW_ASSETS[0]);
  const [purposeText, setPurposeText] = useState('');
  const [purposeTags, setPurposeTags] = useState([]);
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState('form');
  const [txError, setTxError] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [bondTooltip, setBondTooltip] = useState(false);

  const loanLevel = useMemo(() => {
    if (!scoreData) return { level: 0, amount: 0, label: 'None' };
    return getLoanLevel(scoreData.score, scoreData.cleanRepayments || 0, (scoreData.breakdown?.xVerification || 0) > 0);
  }, [scoreData]);

  const parsedAmount = parseFloat(amount) || 0;
  const interest = parsedAmount * (selectedTerm.apr / 100 / 365) * selectedTerm.days;
  const totalRepay = parsedAmount + interest;
  const bondAmount = calculateBond(parsedAmount);
  const bondLamports = Math.ceil((bondAmount / 150) * LAMPORTS_PER_SOL);
  const dueDate = new Date(Date.now() + selectedTerm.days * 86400000);

  const purposeValid = purposeText.trim().length >= 10;
  const purposeTooLong = purposeText.length > 180;

  const canBorrow =
    connected &&
    scoreData &&
    loanLevel.level > 0 &&
    parsedAmount > 0 &&
    parsedAmount <= loanLevel.amount &&
    purposeValid &&
    !purposeTooLong &&
    consent &&
    borrowAsset.supported &&
    !loan?.activeLoan;

  const handleChipClick = (chip) => {
    if (purposeTags.includes(chip)) {
      setPurposeTags(purposeTags.filter((t) => t !== chip));
    } else {
      setPurposeTags([...purposeTags, chip]);
      if (!purposeText.trim()) {
        setPurposeText(chip);
      } else if (!purposeText.includes(chip)) {
        setPurposeText(`${purposeText}. ${chip}`);
      }
    }
  };

  const handleConfirm = () => {
    if (!canBorrow) return;
    setStep('confirm');
  };

  const handleSign = async () => {
    if (!publicKey || !signTransaction) return;
    setStep('signing');
    setTxError('');

    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: BOND_VAULT,
          lamports: bondLamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });

      let confirmed = false;
      for (let i = 0; i < 30; i++) {
        const status = await connection.getSignatureStatus(sig);
        if (
          status?.value?.confirmationStatus === 'confirmed' ||
          status?.value?.confirmationStatus === 'finalized'
        ) {
          confirmed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!confirmed) throw new Error('Transaction confirmation timed out');

      await loan.createLoan({
        wallet: publicKey.toBase58(),
        amount: parsedAmount,
        apr: selectedTerm.apr,
        termDays: selectedTerm.days,
        bondAmount,
        reason: purposeText,
        purposeTags,
        borrowAsset: borrowAsset.symbol,
        level: loanLevel.level,
        score: scoreData.score,
        txSignature: sig,
        loanSource: 'lendra_credit_pool',
        isSimulated: true,
      });

      setTxSignature(sig);
      setStep('success');
      ctx?.refreshScore();
    } catch (err) {
      console.error('Borrow transaction failed:', err);
      setTxError(err.message || 'Transaction failed');
      setStep('error');
    }
  };

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card rounded-2xl border border-brand-border p-8"
        >
          <ArrowDownToLine className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet to Borrow</h2>
          <p className="text-sm text-brand-muted">
            Connect your Solana wallet to view your loan eligibility and borrow funds.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin mx-auto mb-4" />
        <p className="text-brand-muted">Loading your credit score...</p>
      </div>
    );
  }

  if (loan?.activeLoan) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card rounded-2xl border border-brand-accent/30 p-8 text-center"
        >
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Active Loan Exists</h2>
          <p className="text-sm text-brand-muted mb-2">
            You already have an active loan of{' '}
            <span className="text-white font-semibold">
              ${loan.activeLoan.amount?.toFixed(2)}
            </span>
          </p>
          <p className="text-xs text-brand-muted mb-6">
            Due: {new Date(loan.activeLoan.dueDate).toLocaleDateString()}
          </p>
          <Link
            to="/repay"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go to Repay
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loanLevel.level === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-card rounded-2xl border border-brand-border p-8 text-center"
        >
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Not Eligible to Borrow</h2>
          <p className="text-sm text-brand-muted mb-4">
            Your credit score of{' '}
            <span className="text-white font-semibold">{scoreData.score}</span> is below the
            minimum threshold of 400.
          </p>
          <p className="text-xs text-brand-muted mb-6">
            Increase your on-chain activity to improve your score.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-cardHover text-white font-semibold text-sm hover:bg-brand-border transition-colors"
          >
            View Score Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-20">
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Borrow from Lendra Credit Pool</h1>
                <p className="text-sm text-brand-muted">Level {loanLevel.level} — {loanLevel.label} — up to ${loanLevel.amount} {borrowAsset.symbol}</p>
              </div>
              <div className="scale-50 origin-right -mr-8">
                <ScoreRing score={scoreData.score} tier={scoreData.tier} animate={false} />
              </div>
            </div>

            {/* Borrow Asset */}
            <div className="bg-brand-card rounded-2xl border border-brand-border p-6 mb-4">
              <label className="block text-sm font-semibold text-white mb-3">Borrow Asset</label>
              <div className="flex gap-2">
                {BORROW_ASSETS.map((asset) => (
                  <button key={asset.symbol} onClick={() => asset.supported && setBorrowAsset(asset)} disabled={!asset.supported}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      borrowAsset.symbol === asset.symbol && asset.supported ? 'bg-brand-accent/10 border border-brand-accent/30 text-white'
                        : asset.supported ? 'bg-brand-bg border border-brand-border text-brand-muted hover:text-white'
                        : 'bg-brand-bg/50 border border-brand-border/50 text-brand-muted/50 cursor-not-allowed'}`}>
                    {asset.symbol}
                    {!asset.supported && <span className="text-[10px] text-brand-muted/60 ml-1">Coming soon</span>}
                  </button>
                ))}
              </div>
              {borrowAsset.symbol === 'USDT' && <p className="text-xs text-brand-muted mt-2">USDT support is coming soon. Lendra currently supports USDC borrowing.</p>}
            </div>

            {/* Amount */}
            <div className="bg-brand-card rounded-2xl border border-brand-border p-6 mb-4">
              <label className="block text-sm font-semibold text-white mb-3">
                <DollarSign className="w-4 h-4 inline mr-1 text-brand-accent" />Borrow Amount ({borrowAsset.symbol})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-brand-muted">$</span>
                <input type="number" min="1" max={loanLevel.amount} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-4 text-2xl font-bold text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-accent/50 transition-colors" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {[5, 10, 25, 50, 100, loanLevel.amount].filter((v, i, a) => a.indexOf(v) === i && v <= loanLevel.amount).map((preset) => (
                  <button key={preset} onClick={() => setAmount(String(preset))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${parsedAmount === preset ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-white'}`}>
                    ${preset}
                  </button>
                ))}
                <button onClick={() => setAmount(String(loanLevel.amount))} className="px-3 py-1 rounded-lg text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/20 transition-colors ml-auto">Max</button>
              </div>
              {parsedAmount > loanLevel.amount && <p className="text-xs text-red-400 mt-2">Maximum borrow for Level {loanLevel.level} is ${loanLevel.amount}</p>}
            </div>

            {/* Term */}
            <div className="bg-brand-card rounded-2xl border border-brand-border p-6 mb-4">
              <label className="block text-sm font-semibold text-white mb-3"><Clock className="w-4 h-4 inline mr-1 text-brand-accent" />Loan Term</label>
              <div className="grid grid-cols-3 gap-3">
                {TERMS.map((term) => (
                  <button key={term.days} onClick={() => setSelectedTerm(term)}
                    className={`p-4 rounded-xl border text-center transition-all ${selectedTerm.days === term.days ? 'border-brand-accent/40 bg-brand-accent/10 shadow-lg shadow-brand-accent/5' : 'border-brand-border bg-brand-bg/30 hover:border-brand-accent/20'}`}>
                    <p className={`text-lg font-bold ${selectedTerm.days === term.days ? 'text-white' : 'text-brand-muted'}`}>{term.label}</p>
                    <p className="text-xs text-brand-muted mt-1">{term.apr}% APR</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Purpose */}
            <div className="bg-brand-card rounded-2xl border border-brand-border p-6 mb-4">
              <label className="block text-sm font-semibold text-white mb-1">Loan Purpose</label>
              <p className="text-xs text-brand-muted mb-3">Tell us why you need this loan. This helps Lendra understand borrowing intent.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {PURPOSE_CHIPS.map((chip) => (
                  <button key={chip} onClick={() => handleChipClick(chip)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${purposeTags.includes(chip) ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-white'}`}>
                    {chip}
                  </button>
                ))}
              </div>
              <textarea value={purposeText} onChange={(e) => setPurposeText(e.target.value)} maxLength={180} rows={3}
                placeholder="Example: I want to cover gas fees and participate in a Solana DeFi campaign."
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-brand-muted/40 focus:outline-none focus:border-brand-accent/40 transition-colors resize-none" />
              <div className="flex items-center justify-between mt-1.5">
                {purposeText.length > 0 && purposeText.trim().length < 10 ? (
                  <p className="text-xs text-red-400">Please describe your loan purpose before continuing.</p>
                ) : <span />}
                <span className={`text-[10px] ml-auto ${purposeTooLong ? 'text-red-400' : 'text-brand-muted'}`}>{purposeText.length}/180</span>
              </div>
            </div>

            {/* Summary */}
            {parsedAmount > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-brand-card rounded-2xl border border-brand-border p-6 mb-4">
                <h3 className="text-sm font-semibold text-white mb-4">Loan Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Loan Source</span><span className="text-white font-semibold">Lendra Credit Pool</span></div>
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Borrow Asset</span><span className="text-white font-semibold">{borrowAsset.symbol}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Loan Amount</span><span className="text-white font-semibold">${parsedAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">APR</span><span className="text-white font-semibold">{selectedTerm.apr}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Interest</span><span className="text-white font-semibold">${interest.toFixed(4)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Term</span><span className="text-white font-semibold">{selectedTerm.days} days</span></div>
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Due Date</span><span className="text-white font-semibold">{dueDate.toLocaleDateString()}</span></div>
                  <div className="h-px bg-brand-border" />
                  <div className="flex justify-between text-sm"><span className="text-brand-muted">Total Repayment</span><span className="text-brand-accent font-bold">${totalRepay.toFixed(4)}</span></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted flex items-center gap-1">Bond Required (30%)<button onClick={() => setBondTooltip(!bondTooltip)} className="text-brand-muted hover:text-brand-accent transition-colors"><HelpCircle className="w-3 h-3" /></button></span>
                    <span className="text-yellow-400 font-semibold">${bondAmount.toFixed(2)} {borrowAsset.symbol}</span>
                  </div>
                  {bondTooltip && (
                    <div className="bg-brand-bg/80 border border-brand-border rounded-xl p-3">
                      <p className="text-[10px] text-brand-muted leading-relaxed">Lendra uses a 30% bond to create borrower commitment without requiring full overcollateralization. If you repay on time, your bond is returned. If you default, your bond may be liquidated into the insurance fund.</p>
                    </div>
                  )}
                  <div className="bg-brand-bg/50 rounded-xl p-3"><p className="text-xs text-brand-muted leading-relaxed">Your bond is held in escrow and returned when you repay on time.</p></div>
                </div>
              </motion.div>
            )}

            {/* Consent */}
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-brand-border bg-brand-bg text-brand-accent focus:ring-brand-accent/40" />
              <span className="text-xs text-brand-muted leading-relaxed">I understand this loan is from the Lendra Credit Pool (beta). I agree to repay the full amount plus interest by the due date. My 30% bond will be held in escrow and returned upon timely repayment.</span>
            </label>

            <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3 mb-6">
              <p className="text-[10px] text-yellow-400/80 leading-relaxed">Lendra Credit Pool is in beta. Loan disbursement may be simulated during testing.</p>
            </div>

            <button onClick={handleConfirm} disabled={!canBorrow} className="w-full py-4 rounded-xl bg-brand-accent text-[#0A0A0F] font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
              Review & Borrow
            </button>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-lg mx-auto">
            <div className="bg-brand-card rounded-2xl border border-brand-accent/30 p-8">
              <h2 className="text-xl font-bold text-white mb-6 text-center">Confirm Your Loan</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between p-3 rounded-xl bg-brand-bg/50"><span className="text-sm text-brand-muted">Loan Source</span><span className="text-sm font-bold text-white">Lendra Credit Pool</span></div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bg/50"><span className="text-sm text-brand-muted">Borrow</span><span className="text-sm font-bold text-white">${parsedAmount.toFixed(2)} {borrowAsset.symbol}</span></div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bg/50"><span className="text-sm text-brand-muted">APR</span><span className="text-sm font-bold text-white">{selectedTerm.apr}%</span></div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bg/50"><span className="text-sm text-brand-muted">Term</span><span className="text-sm font-bold text-white">{selectedTerm.days} days</span></div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bg/50"><span className="text-sm text-brand-muted">Total Repay</span><span className="text-sm font-bold text-brand-accent">${totalRepay.toFixed(4)}</span></div>
                <div className="flex justify-between p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20"><span className="text-sm text-yellow-400">Bond (30% escrow)</span><span className="text-sm font-bold text-yellow-400">${bondAmount.toFixed(2)} {borrowAsset.symbol}</span></div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bg/50"><span className="text-sm text-brand-muted">Purpose</span><span className="text-sm text-white text-right max-w-[200px] truncate">{purposeText}</span></div>
              </div>
              <div className="bg-brand-bg/50 rounded-xl p-4 mb-6">
                <p className="text-xs text-brand-muted leading-relaxed">By proceeding, you will sign a transaction depositing ${bondAmount.toFixed(2)} as a bond into escrow. This bond is returned when you repay on time. Late repayment results in a score penalty.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl border border-brand-border text-brand-muted font-semibold text-sm hover:text-white hover:bg-brand-cardHover transition-colors">Back</button>
                <button onClick={handleSign} className="flex-1 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-bold text-sm hover:opacity-90 transition-opacity">Sign & Borrow</button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'signing' && (
          <motion.div key="signing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto pt-20 text-center">
            <Loader2 className="w-16 h-16 text-brand-accent animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Your Loan</h2>
            <p className="text-sm text-brand-muted">Sign the transaction in your wallet and wait for confirmation...</p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto pt-12">
            <div className="bg-brand-card rounded-2xl border border-green-500/30 p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Your Lendra loan has been created.</h2>
              <p className="text-sm text-brand-muted mb-4">You borrowed <span className="text-white font-semibold">${parsedAmount.toFixed(2)} {borrowAsset.symbol}</span> for {selectedTerm.days} days.</p>
              <p className="text-xs text-brand-muted mb-6">Repay <span className="text-brand-accent font-semibold">${totalRepay.toFixed(4)}</span> before {dueDate.toLocaleDateString()} to get your bond back and earn +15 score points.</p>
              {txSignature && <a href={`https://solscan.io/tx/${txSignature}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent underline hover:opacity-80 block mb-6">View transaction on Solscan</a>}
              <div className="flex gap-3">
                <Link to="/repay" className="flex-1 py-3 rounded-xl bg-brand-accent text-[#0A0A0F] font-semibold text-sm text-center hover:opacity-90 transition-opacity">Go to Repay</Link>
                <Link to="/dashboard" className="flex-1 py-3 rounded-xl border border-brand-border text-brand-muted font-semibold text-sm text-center hover:text-white transition-colors">Back to Dashboard</Link>
              </div>
            </div>
            <PoolWaitlistCTA simulationData={{
              amount: parsedAmount,
              borrowAsset: borrowAsset.symbol,
              bondAmount,
              loanLevel: loanLevel.level,
              levelName: loanLevel.label,
              purposeText,
              purposeTags,
              score: scoreData.score,
              eligible: true,
            }} />
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto pt-12">
            <div className="bg-brand-card rounded-2xl border border-red-500/30 p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Transaction Failed</h2>
              <p className="text-sm text-red-400 mb-6">{txError}</p>
              <button onClick={() => setStep('form')} className="px-8 py-3 rounded-xl border border-brand-border text-brand-muted font-semibold text-sm hover:text-white transition-colors">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
