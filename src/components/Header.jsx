import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Menu, Lock, Loader2, Hash } from 'lucide-react';
import { useAppContext } from '../App';

export default function Header({ onMenuToggle, showMenu }) {
  const { connected } = useWallet();
  const ctx = useAppContext();
  const privateMode = ctx?.privateMode;
  const solDomain = ctx?.scoreData?.solDomain;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-bg/80 border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          {showMenu && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-brand-muted hover:text-white hover:bg-brand-cardHover transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Show logo only when sidebar is hidden (landing / not connected) */}
          {!showMenu && (
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
        </div>

        <div className="flex items-center gap-2">
          {connected && solDomain && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20"
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
              <span className="hidden sm:inline">Private</span>
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
          {connected
            ? <WalletMultiButton />
            : <WalletMultiButton>Scan Wallet</WalletMultiButton>
          }
        </div>
      </div>
    </header>
  );
}
