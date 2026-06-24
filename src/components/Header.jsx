import React from 'react';
import { Link } from 'react-router-dom';
import { WalletMultiButton, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Menu, Lock, Loader2, Hash, Brain, Bell, Wallet } from 'lucide-react';
import { useAppContext } from '../App';

export default function Header({ onMenuToggle, showMenu }) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const ctx = useAppContext();
  const privateMode = ctx?.privateMode;
  const solDomain = ctx?.scoreData?.solDomain;

  // Shared style for the compact mobile icon buttons (Kamino-style).
  const iconBtn =
    'flex items-center justify-center w-9 h-9 rounded-lg border transition-colors';

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-bg/80 border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* ── Left: logo ─────────────────────────────────────── */}
        {showMenu ? (
          // In-app: desktop shows the logo in the sidebar, so the header only
          // needs it on mobile (where the sidebar is hidden).
          <div className="lg:hidden flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`}
              alt="Lendra"
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-lg font-bold text-white tracking-tight">Lendra</span>
          </div>
        ) : (
          // Landing / not connected: logo at all sizes.
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}assets/lender-logo5x.png`}
              alt="Lendra"
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-lg font-bold text-white tracking-tight">Lendra</span>
            <span className="hidden sm:inline text-[10px] text-brand-muted px-1.5 py-0.5 rounded border border-brand-border">
              beta
            </span>
          </div>
        )}

        {/* ── Right ──────────────────────────────────────────── */}
        {/* ml-auto keeps this pinned right even on desktop, where the left
            logo element is display:none (so justify-between alone wouldn't). */}
        <div className="flex items-center gap-2 ml-auto">
          {showMenu ? (
            <>
              {/* Desktop: .sol + private + full wallet button */}
              <div className="hidden lg:flex items-center gap-2">
                {connected && solDomain && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20"
                    title={`Your verified .sol identity: ${solDomain}`}
                  >
                    <Hash className="w-3 h-3" />
                    <span>{solDomain}</span>
                  </div>
                )}
                {connected && privateMode && (
                  <button
                    onClick={() => privateMode.togglePrivateMode()}
                    disabled={privateMode.isEncrypting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      privateMode.isPrivate
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-brand-card text-brand-muted border-brand-border hover:text-white hover:border-brand-accent/20'
                    }`}
                    title={privateMode.isPrivate ? 'Private mode active' : 'Enable private mode'}
                  >
                    {privateMode.isEncrypting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    <span>Private</span>
                    <div
                      className={`w-6 h-3.5 rounded-full transition-colors relative ${
                        privateMode.isPrivate ? 'bg-purple-500' : 'bg-brand-border'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                          privateMode.isPrivate ? 'translate-x-3' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>
                )}
                <WalletMultiButton />
              </div>

              {/* Mobile: compact icon row (AI · Alerts · Wallet · Menu) */}
              <div className="lg:hidden flex items-center gap-1.5">
                <button
                  onClick={() => ctx?.openAiDrawer?.()}
                  aria-label="Lendra AI"
                  className={`${iconBtn} bg-brand-card border-brand-border text-brand-muted hover:text-white hover:border-brand-accent/30`}
                >
                  <Brain className="w-4 h-4" />
                </button>
                <Link
                  to="/alerts"
                  aria-label="Alerts"
                  className={`${iconBtn} bg-brand-card border-brand-border text-brand-muted hover:text-white hover:border-brand-accent/30`}
                >
                  <Bell className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => (connected ? onMenuToggle?.() : setVisible(true))}
                  aria-label={connected ? 'Wallet' : 'Connect wallet'}
                  className={`${iconBtn} ${
                    connected
                      ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent'
                      : 'bg-brand-card border-brand-border text-brand-muted hover:text-white hover:border-brand-accent/30'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </button>
                <button
                  onClick={onMenuToggle}
                  aria-label="Open menu"
                  className={`${iconBtn} bg-brand-card border-brand-border text-brand-muted hover:text-white hover:border-brand-accent/30`}
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            // Landing: wallet CTA at all sizes
            <WalletMultiButton>Scan Wallet</WalletMultiButton>
          )}
        </div>
      </div>
    </header>
  );
}
