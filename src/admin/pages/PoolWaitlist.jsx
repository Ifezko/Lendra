import React, { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '../useAdminAuth';
import {
  Rocket,
  Users,
  DollarSign,
  TrendingUp,
  Bell,
  BadgeCheck,
  Filter,
  Loader2,
  Send,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const STORAGE_KEY = 'lendra_pool_waitlist';

function getAllWaitlistEntries() {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return Object.values(all).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } catch {
    return [];
  }
}

function StatCard({ icon: Icon, label, value, sub, color = '#EC81FF' }) {
  return (
    <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function PoolWaitlist() {
  const { admin } = useAdminAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterEligible, setFilterEligible] = useState('all');
  const [filterTelegram, setFilterTelegram] = useState('all');
  const [filterX, setFilterX] = useState('all');
  const [notifyConfirm, setNotifyConfirm] = useState(false);

  useEffect(() => {
    const data = getAllWaitlistEntries();
    setEntries(data);
    setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterLevel !== 'all' && e.level_name !== filterLevel) return false;
      if (filterEligible !== 'all') {
        const isEligible = filterEligible === 'yes';
        if (e.eligible !== isEligible) return false;
      }
      if (filterTelegram !== 'all') {
        const hasTg = filterTelegram === 'yes';
        if (e.telegram_connected !== hasTg) return false;
      }
      if (filterX !== 'all') {
        const hasX = filterX === 'yes';
        if (e.x_connected !== hasX) return false;
      }
      return true;
    });
  }, [entries, filterStatus, filterLevel, filterEligible, filterTelegram, filterX]);

  const stats = useMemo(() => {
    const total = entries.length;
    const totalDemand = entries.reduce(
      (s, e) => s + (e.simulated_loan_amount || 0),
      0
    );
    const avgLoan =
      total > 0
        ? (totalDemand / total).toFixed(2)
        : '0';
    const levels = {};
    entries.forEach((e) => {
      const ln = e.level_name || 'Unknown';
      levels[ln] = (levels[ln] || 0) + 1;
    });
    const mostLevel = Object.entries(levels).sort((a, b) => b[1] - a[1])[0];
    const tgCount = entries.filter((e) => e.telegram_connected).length;
    const tgRate = total > 0 ? ((tgCount / total) * 100).toFixed(1) : '0';
    const xCount = entries.filter((e) => e.x_connected).length;
    const xFollows = entries.filter((e) => e.followed_lendra_x).length;

    return {
      total,
      totalDemand: totalDemand.toFixed(2),
      avgLoan,
      mostLevel: mostLevel ? mostLevel[0] : 'N/A',
      tgRate,
      xCount,
      xFollows,
    };
  }, [entries]);

  const uniqueLevels = useMemo(() => {
    const set = new Set(entries.map((e) => e.level_name).filter(Boolean));
    return [...set];
  }, [entries]);

  const handleNotifyWaitlist = () => {
    if (admin?.role !== 'super_admin') return;
    const updated = entries.map((e) => {
      if (e.status === 'waiting') {
        return { ...e, status: 'notified', notified_at: new Date().toISOString() };
      }
      return e;
    });
    const all = {};
    updated.forEach((e) => {
      all[e.wallet_address] = e;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setEntries(updated);
    setNotifyConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pool Launch Waitlist</h1>
          <p className="text-xs text-slate-500 mt-1">
            Users who simulated borrowing and joined the launch list
          </p>
        </div>
        {admin?.role === 'super_admin' && entries.some((e) => e.status === 'waiting') && (
          <div>
            {!notifyConfirm ? (
              <button
                onClick={() => setNotifyConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EC81FF]/10 border border-[#EC81FF]/20 text-[#EC81FF] text-xs font-semibold hover:bg-[#EC81FF]/20 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Notify Waitlist
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400">Confirm notify all waiting users?</span>
                <button
                  onClick={handleNotifyWaitlist}
                  className="px-3 py-1.5 rounded-lg bg-[#EC81FF] text-[#0A0A0F] text-xs font-bold"
                >
                  Yes, notify
                </button>
                <button
                  onClick={() => setNotifyConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E1E2A] text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#EC81FF] animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={Users} label="Waitlist Signups" value={stats.total} color="#EC81FF" />
            <StatCard
              icon={DollarSign}
              label="Total Demand"
              value={`$${stats.totalDemand}`}
              color="#4ade80"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Loan"
              value={`$${stats.avgLoan}`}
              color="#60a5fa"
            />
            <StatCard
              icon={Rocket}
              label="Most Requested"
              value={stats.mostLevel}
              color="#a78bfa"
            />
            <StatCard
              icon={Bell}
              label="Telegram Rate"
              value={`${stats.tgRate}%`}
              color="#38bdf8"
            />
            <StatCard
              icon={BadgeCheck}
              label="X Connected"
              value={stats.xCount}
              color="#f59e0b"
            />
            <StatCard
              icon={BadgeCheck}
              label="X Follow Clicks"
              value={stats.xFollows}
              color="#f97316"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-[#12121E] border border-[#1E1E2A] rounded-xl p-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1E1E2A] text-xs text-white border border-[#2A2A3A] rounded-lg px-2 py-1.5"
            >
              <option value="all">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="notified">Notified</option>
              <option value="converted">Converted</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-[#1E1E2A] text-xs text-white border border-[#2A2A3A] rounded-lg px-2 py-1.5"
            >
              <option value="all">All Levels</option>
              {uniqueLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={filterEligible}
              onChange={(e) => setFilterEligible(e.target.value)}
              className="bg-[#1E1E2A] text-xs text-white border border-[#2A2A3A] rounded-lg px-2 py-1.5"
            >
              <option value="all">Eligible</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <select
              value={filterTelegram}
              onChange={(e) => setFilterTelegram(e.target.value)}
              className="bg-[#1E1E2A] text-xs text-white border border-[#2A2A3A] rounded-lg px-2 py-1.5"
            >
              <option value="all">Telegram</option>
              <option value="yes">Connected</option>
              <option value="no">Not connected</option>
            </select>
            <select
              value={filterX}
              onChange={(e) => setFilterX(e.target.value)}
              className="bg-[#1E1E2A] text-xs text-white border border-[#2A2A3A] rounded-lg px-2 py-1.5"
            >
              <option value="all">X Status</option>
              <option value="yes">Connected</option>
              <option value="no">Not connected</option>
            </select>
            <span className="text-[11px] text-slate-500 ml-auto">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl p-10 text-center">
              <Rocket className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No waitlist entries yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                Users will appear here after completing a borrow simulation.
              </p>
            </div>
          ) : (
            <div className="bg-[#12121E] border border-[#1E1E2A] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1E1E2A]">
                      {[
                        'Date',
                        'Wallet',
                        'Amount',
                        'Asset',
                        'Bond',
                        'Level',
                        'Score',
                        'Eligible',
                        'TG',
                        'X',
                        'Status',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-3 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr
                        key={e.id || e.wallet_address}
                        className="border-b border-[#1E1E2A]/50 hover:bg-[#1E1E2A]/30 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-[11px] text-slate-400">
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-white font-mono">
                          {e.wallet_address
                            ? `${e.wallet_address.slice(0, 4)}...${e.wallet_address.slice(-4)}`
                            : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-white font-semibold">
                          ${e.simulated_loan_amount || 0}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-400">
                          {e.borrow_asset || 'USDC'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-yellow-400">
                          ${e.bond_amount || 0}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-[#EC81FF]">
                          {e.level_name || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-white">
                          {e.score || 0}
                        </td>
                        <td className="px-3 py-2.5">
                          {e.eligible ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {e.telegram_connected ? (
                            <span className="text-[10px] text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {e.x_connected ? (
                            <span className="text-[10px] text-amber-400">
                              @{e.x_username || 'linked'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              e.status === 'waiting'
                                ? 'text-amber-400 bg-amber-400/10'
                                : e.status === 'notified'
                                ? 'text-blue-400 bg-blue-400/10'
                                : e.status === 'converted'
                                ? 'text-green-400 bg-green-400/10'
                                : 'text-slate-500 bg-slate-500/10'
                            }`}
                          >
                            {e.status || 'waiting'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
