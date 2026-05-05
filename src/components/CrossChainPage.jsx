import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Link2, Globe, Shield, ChevronRight, Loader2, CheckCircle,
  AlertTriangle, ExternalLink, Trash2, Zap, Clock, Activity, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';

const SUPPORTED_CHAINS = [
  { id: 'ETH', name: 'Ethereum', color: '#627EEA', placeholder: '0x742d35Cc6634C0532925a3b844...' },
  { id: 'BTC', name: 'Bitcoin', color: '#F7931A', placeholder: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkf...' },
];

export default function CrossChainPage() {
  const { connected, publicKey } = useWallet();
  const ctx = useAppContext();
  const ika = ctx?.ika;

  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0]);
  const [externalAddress, setExternalAddress] = useState('');
  const [result, setResult] = useState(null);

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-card rounded-2xl border border-brand-border p-8">
          <Link2 className="w-12 h-12 text-brand-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Cross-Chain Credit Identity</h2>
          <p className="text-sm text-brand-muted">Connect your Solana wallet to link external wallets and boost your credit score.</p>
        </motion.div>
      </div>
    );
  }

  const handleConnect = async () => {
    if (!externalAddress.trim() || !ika) return;
    const res = await ika.connectExternalWallet(externalAddress.trim(), selectedChain.id);
    if (res) { setResult(res); setExternalAddress(''); }
  };

  const totalBoost = ika?.totalCrossChainBoost || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/trust-score" className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-accent transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Trust Profile
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cross-Chain Credit</h1>
            <p className="text-sm text-brand-muted">Connect external wallet activity through Ika to strengthen your Lendra profile. Free during beta.</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
        <span className="text-[10px] font-semibold text-yellow-400">Devnet Preview</span>
      </div>

      {totalBoost > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-teal-400" />
              <div>
                <p className="text-sm font-semibold text-white">Cross-Chain Boost Active</p>
                <p className="text-xs text-brand-muted">Score includes activity from {ika.connectedChains.length} external wallet{ika.connectedChains.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <span className="text-lg font-bold text-teal-400">+{totalBoost} pts</span>
          </div>
        </motion.div>
      )}

      {ika?.connectedChains?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Connected Wallets</h3>
          {ika.connectedChains.map((chain, i) => (
            <motion.div key={`${chain.chain}-${chain.address}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="bg-brand-card rounded-xl border border-brand-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: chain.chain === 'ETH' ? '#627EEA20' : '#F7931A20' }}>
                    <span style={{ color: chain.chain === 'ETH' ? '#627EEA' : '#F7931A' }}>{chain.chain}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{chain.chain} Wallet</p>
                    <p className="text-xs text-brand-muted font-mono">{chain.address.slice(0, 8)}...{chain.address.slice(-6)}</p>
                  </div>
                </div>
                <button onClick={() => ika.disconnectChain(chain.address, chain.chain)} className="p-1.5 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-brand-bg/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3 h-3 text-brand-accent" /><span className="text-[10px] text-brand-muted">Wallet Age</span></div>
                  <p className="text-sm font-bold text-white">{chain.ageDays}d</p>
                  <p className="text-[10px] text-teal-400">+{chain.ageBoost} pts</p>
                </div>
                <div className="bg-brand-bg/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3 h-3 text-brand-accent" /><span className="text-[10px] text-brand-muted">Tx Volume</span></div>
                  <p className="text-sm font-bold text-white">{chain.txVolume}</p>
                  <p className="text-[10px] text-teal-400">+{chain.volumeBoost} pts</p>
                </div>
                <div className="bg-brand-bg/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1"><Zap className="w-3 h-3 text-teal-400" /><span className="text-[10px] text-brand-muted">Total Boost</span></div>
                  <p className="text-sm font-bold text-teal-400">+{chain.totalBoost}</p>
                  <p className="text-[10px] text-brand-muted">of 50 max</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 bg-brand-card rounded-2xl border border-green-500/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-sm font-semibold text-white">Identity Bound Successfully</p>
            </div>
            <p className="text-xs text-brand-muted mb-3">Your {result.chain} wallet has been linked via Ika dWallet MPC. Score boost: +{result.totalBoost} pts.</p>
            {result.txSignature && (
              <a href={`https://solscan.io/tx/${result.txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-accent hover:underline">
                View binding transaction on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button onClick={() => setResult(null)} className="block mt-2 text-xs text-brand-muted hover:text-white transition-colors">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 bg-brand-card rounded-2xl border border-brand-border p-6">
        <h3 className="text-base font-bold text-white mb-1">Add External Wallet</h3>
        <p className="text-xs text-brand-muted mb-5">Connect an ETH or BTC wallet via Ika's MPC signing infrastructure. Lendra reads its transaction history and includes it in your credit score.</p>
        <div className="flex gap-2 mb-4">
          {SUPPORTED_CHAINS.map((chain) => (
            <button key={chain.id} onClick={() => setSelectedChain(chain)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedChain.id === chain.id ? 'bg-brand-accent/10 border border-brand-accent/30 text-white' : 'bg-brand-bg border border-brand-border text-brand-muted hover:text-white'}`}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${chain.color}20`, color: chain.color }}>{chain.id[0]}</div>
              {chain.name}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label className="block text-xs text-brand-muted mb-2">{selectedChain.name} Wallet Address</label>
          <input type="text" value={externalAddress} onChange={(e) => setExternalAddress(e.target.value)} placeholder={selectedChain.placeholder}
            className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-brand-muted/40 focus:outline-none focus:border-brand-accent/40 transition-colors font-mono" />
        </div>
        {ika?.bindError && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-400"><AlertTriangle className="w-3.5 h-3.5" />{ika.bindError}</div>
        )}
        <button onClick={handleConnect} disabled={!externalAddress.trim() || ika?.isBinding}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {ika?.isBinding ? (<><Loader2 className="w-4 h-4 animate-spin" />Binding identity via Ika MPC...</>) : (<><Link2 className="w-4 h-4" />Connect {selectedChain.name} Wallet</>)}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 bg-brand-card rounded-2xl border border-brand-border p-6">
        <h3 className="text-base font-bold text-white mb-4">How Cross-Chain Credit Works</h3>
        <div className="space-y-4">
          {[
            { icon: Shield, title: 'MPC Key Generation', desc: 'Ika creates a dWallet key pair via 2PC-MPC distributed key generation. No private keys leave your device.' },
            { icon: Link2, title: 'Identity Binding', desc: 'Your external wallet is cryptographically bound to your Solana address. Verified on-chain, no bridges needed.' },
            { icon: Activity, title: 'Activity Analysis', desc: 'Lendra reads the external wallet history: age, volume, and behavior. Up to +90 bonus points.' },
            { icon: Zap, title: 'Score Boost', desc: 'External wallet activity adds to your Lendra score. Max cross-chain boost: +90 pts.' },
          ].map((step) => (
            <div key={step.title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <step.icon className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="text-xs text-brand-muted leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
