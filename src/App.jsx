import React, { useMemo, useEffect, createContext, useContext, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import DashboardPage from './components/DashboardPage';
import BorrowPage from './components/BorrowPage';
import RepayPage from './components/RepayPage';
import TrustPage from './components/TrustPage';
import SocialCreditCard from './components/SocialCreditCard';
import LoadingState from './components/LoadingState';
import AiDrawer from './components/AiDrawer';
import { useCreditScore } from './hooks/useCreditScore';
import { useLoan } from './hooks/useLoan';
import { usePrivateMode } from './hooks/usePrivateMode';
import { useIkaCrossChain } from './hooks/useIkaCrossChain';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';
const RPC_ENDPOINT = `${API_BASE_URL}/api/solana/rpc/mainnet`;

const AppContext = createContext(null);
export function useAppContext() {
  return useContext(AppContext);
}

function useSolflareRecommended() {
  useEffect(() => {
    const STYLE_ID = 'solflare-recommended-styles';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .wallet-adapter-modal-list li.solflare-recommended {
          order: -1;
          border: 1px solid rgba(236, 129, 255, 0.4);
          border-radius: 8px;
          background: rgba(236, 129, 255, 0.08);
          position: relative;
        }
        .wallet-adapter-modal-list li.solflare-recommended .wallet-adapter-button {
          font-weight: 600;
        }
        .solflare-recommended-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #EC81FF, #B84FCC);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          margin-left: auto;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .solflare-install-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          margin-bottom: 12px;
          background: rgba(236, 129, 255, 0.06);
          border: 1px solid rgba(236, 129, 255, 0.3);
          border-radius: 8px;
        }
        .solflare-install-banner a {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #EC81FF, #B84FCC);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        .solflare-install-banner a:hover { opacity: 0.85; }
        .solflare-install-banner-text {
          flex: 1;
          font-size: 12px;
          color: #ccc;
          line-height: 1.4;
        }
        .solflare-install-banner-text strong {
          color: #fff;
          font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }

    function promoteSolflare(modalList) {
      const items = modalList.querySelectorAll('li');
      let solflareItem = null;
      items.forEach((li) => {
        const btn = li.querySelector('.wallet-adapter-button');
        if (btn && btn.textContent?.toLowerCase().includes('solflare')) {
          solflareItem = li;
        }
      });
      if (solflareItem && !solflareItem.classList.contains('solflare-recommended')) {
        modalList.prepend(solflareItem);
        solflareItem.classList.add('solflare-recommended');
        const btn = solflareItem.querySelector('.wallet-adapter-button');
        if (btn && !btn.querySelector('.solflare-recommended-badge')) {
          const badge = document.createElement('span');
          badge.className = 'solflare-recommended-badge';
          badge.textContent = 'Recommended';
          btn.appendChild(badge);
        }
      } else if (!solflareItem && !modalList.parentElement?.querySelector('.solflare-install-banner')) {
        const banner = document.createElement('div');
        banner.className = 'solflare-install-banner';
        banner.innerHTML =
          '<span class="solflare-install-banner-text"><strong>Solflare</strong> is the recommended wallet.</span>' +
          '<a href="https://solflare.com/download" target="_blank" rel="noopener noreferrer">Install</a>';
        modalList.parentElement.insertBefore(banner, modalList);
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const el = node;
            const modalList = el.classList?.contains('wallet-adapter-modal-list')
              ? el
              : el.querySelector?.('.wallet-adapter-modal-list');
            if (modalList) promoteSolflare(modalList);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const existing = document.querySelector('.wallet-adapter-modal-list');
    if (existing) promoteSolflare(existing);
    return () => observer.disconnect();
  }, []);
}

function AppContent() {
  const { publicKey, connected } = useWallet();
  const { loading, error, scoreData, computeScore } = useCreditScore();
  const loan = useLoan();
  const privateMode = usePrivateMode();
  const ika = useIkaCrossChain();
  const [scoreAdjustment, setScoreAdjustment] = useState(0);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      const wallet = publicKey.toBase58();
      computeScore(wallet);
      loan.fetchActiveLoan(wallet);
      loan.fetchHistory(wallet);
      loan.fetchScoreAdjustment(wallet).then((adj) => setScoreAdjustment(adj));
    }
  }, [connected, publicKey, computeScore]);

  const crossChainBoost = ika.totalCrossChainBoost || 0;
  const adjustedScoreData = scoreData
    ? {
        ...scoreData,
        score: Math.min(870, Math.max(200, scoreData.score + scoreAdjustment + crossChainBoost)),
        crossChainBoost,
        connectedChains: ika.connectedChains,
        walletAddress: publicKey?.toBase58() || '',
      }
    : null;

  const ctxValue = {
    scoreData: adjustedScoreData,
    loan,
    scoreAdjustment,
    privateMode,
    ika,
    openAiDrawer: () => setAiDrawerOpen(true),
    refreshScore: () => {
      if (publicKey) {
        computeScore(publicKey.toBase58());
        loan.fetchActiveLoan(publicKey.toBase58());
        loan.fetchHistory(publicKey.toBase58());
        loan.fetchScoreAdjustment(publicKey.toBase58()).then((adj) => setScoreAdjustment(adj));
      }
    },
  };

  // Loading / error state for connected wallets
  const walletLoading = connected && loading;
  const walletError = connected && error;

  const connectedContent = (
    <>
      {walletLoading && <LoadingState />}
      {walletError && (
        <div className="max-w-md mx-auto px-4 pt-24 text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <p className="text-red-400 font-semibold mb-2">Error analyzing wallet</p>
            <p className="text-sm text-brand-muted">{error}</p>
            <button
              onClick={() => computeScore(publicKey.toBase58())}
              className="mt-4 px-6 py-2 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Not connected: Landing page with no sidebar
  if (!connected) {
    return (
      <AppContext.Provider value={ctxValue}>
        <div className="min-h-screen bg-brand-bg">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenu={false} />
          <Routes>
            <Route path="*" element={<Landing />} />
          </Routes>
        </div>
      </AppContext.Provider>
    );
  }

  // Connected: sidebar layout
  return (
    <AppContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-brand-bg">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenAi={() => setAiDrawerOpen(true)}
        />
        <div className="lg:ml-60 min-h-screen flex flex-col">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenu={true} />
          <main className="flex-1 pt-2">
            {walletLoading || walletError ? connectedContent : (
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage scoreData={adjustedScoreData} />} />
                <Route path="/score" element={adjustedScoreData ? <Dashboard scoreData={adjustedScoreData} /> : <LoadingState />} />
                <Route path="/borrow" element={<BorrowPage />} />
                <Route path="/repay" element={<RepayPage />} />
                <Route path="/position" element={<RepayPage />} />
                <Route path="/trust" element={<TrustPage />} />
                <Route path="/history" element={<RepayPage />} />
                <Route path="/share" element={<SocialCreditCard />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            )}
          </main>
        </div>

        {/* AI FAB Button */}
        {adjustedScoreData && !aiDrawerOpen && (
          <button
            onClick={() => setAiDrawerOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accentDark text-white flex items-center justify-center shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 hover:scale-105 transition-all z-40"
            title="Lendra AI — Explain your score"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-1l-2 5H10l-2-5H7a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
            </svg>
          </button>
        )}

        <AiDrawer
          isOpen={aiDrawerOpen}
          onClose={() => setAiDrawerOpen(false)}
          scoreData={adjustedScoreData}
        />
      </div>
    </AppContext.Provider>
  );
}

function WalletContextProvider({ children }) {
  useSolflareRecommended();
  const wallets = useMemo(() => [], []);
  const connectionConfig = useMemo(
    () => ({
      commitment: 'confirmed',
      wsEndpoint: '',
      disableRetryOnRateLimit: false,
    }),
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function App() {
  return (
    <WalletContextProvider>
      <AppContent />
    </WalletContextProvider>
  );
}
