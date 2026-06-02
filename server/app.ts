import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Redis } from '@upstash/redis';
import { randomUUID, getRandomValues, createHash, scryptSync, randomBytes, timingSafeEqual } from 'crypto';

// ── Environment ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = process.env.VITE_APP_URL || 'https://lendra.finance';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || `${APP_URL}/api/auth/x/callback`;
const X_SCOPES = process.env.X_SCOPES || 'users.read tweet.read offline.access';

const QUICKNODE_WEBHOOK_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET || '';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '';

let redis: Redis;
try {
  redis = new Redis({ url: redisUrl, token: redisToken });
} catch (err: any) {
  console.error('[Redis] Init failed:', err.message);
  redis = new Redis({ url: 'https://placeholder.upstash.io', token: 'placeholder' });
}

const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ── QuickNode RPC URL resolver ───────────────────────────────────────
function getQuicknodeHttpUrl(): string | null {
  const httpUrl = process.env.QUICKNODE_HTTP_URL;
  if (httpUrl) return httpUrl;
  const wssUrl = process.env.VITE_PUBLIC_QUICKNODE_WSS;
  if (wssUrl && wssUrl.startsWith('wss://')) return wssUrl.replace('wss://', 'https://');
  return null;
}

// ── Supabase REST helpers ────────────────────────────────────────────

async function sbFetch(path: string, opts: RequestInit = {}) {
  if (!supabaseConfigured) throw new Error('Supabase not configured');
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const sbInsert = (table: string, data: any) => sbFetch(table, { method: 'POST', body: JSON.stringify(data) });
const sbUpdate = (table: string, data: any, match: string) => sbFetch(`${table}?${match}`, { method: 'PATCH', body: JSON.stringify(data) });
const sbSelect = (table: string, qs = '') => sbFetch(`${table}${qs ? '?' + qs : ''}`, { method: 'GET' });
const sbUpsert = (table: string, data: any) =>
  sbFetch(table, { method: 'POST', headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' } as any, body: JSON.stringify(data) });

// ── Telegram helper ──────────────────────────────────────────────────

async function sendTG(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Admin auth helpers ───────────────────────────────────────────────

const ADMIN_EMAIL_ENV = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD || '';
const ADMIN_PASSWORD_HASH_ENV = process.env.ADMIN_PASSWORD_HASH || '';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function checkPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    const hashBuf = Buffer.from(hash, 'hex');
    const derivedBuf = scryptSync(password, salt, 64);
    if (hashBuf.length !== derivedBuf.length) return false;
    return timingSafeEqual(hashBuf, derivedBuf);
  }
  // Support SHA-256 hex hashes (legacy format)
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const sha256 = createHash('sha256').update(password).digest('hex');
    return sha256 === stored.toLowerCase();
  }
  return false;
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function genSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  const arr = new Uint8Array(48);
  getRandomValues(arr);
  for (const b of arr) t += chars[b % chars.length];
  return t;
}

async function verifyAdmin(req: any, reply: any): Promise<{ id: string; email: string; role: string; display_name?: string } | null> {
  const ah = req.headers.authorization;
  if (!ah || !ah.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization token' });
    return null;
  }
  const token = ah.slice(7);
  const tokenHash = hashSessionToken(token);

  // Check Redis cache first (fast path)
  try {
    const cached = await redis.get<string>(`admin_session_v2:${tokenHash}`);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      if (parsed?.id && parsed?.email && parsed?.role) return parsed;
    }
  } catch {}

  // Check Supabase admin_sessions (authoritative)
  try {
    const sessions = await sbSelect('admin_sessions', `select=id,admin_user_id,revoked,expires_at&session_token_hash=eq.${tokenHash}&revoked=eq.false&limit=1`);
    const session = sessions?.[0];
    if (session) {
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        reply.code(401).send({ error: 'Session expired' });
        return null;
      }
      const admins = await sbSelect('admin_users', `select=id,email,role,display_name,status&id=eq.${session.admin_user_id}&limit=1`);
      const admin = admins?.[0];
      if (admin && admin.status === 'active') {
        const result = { id: admin.id, email: admin.email, role: admin.role, display_name: admin.display_name };
        // Cache for 1 hour
        try { await redis.set(`admin_session_v2:${tokenHash}`, JSON.stringify(result), { ex: 3600 }); } catch {}
        return result;
      }
    }
  } catch (err: any) {
    console.error('[verifyAdmin] DB check failed:', err.message);
  }

  reply.code(401).send({ error: 'Invalid or expired session' });
  return null;
}

async function auditLog(adminId: string | null, action: string, metadata: any = {}, targetAdminId?: string) {
  try {
    await sbInsert('admin_audit_logs', {
      actor_admin_id: adminId,
      action,
      target_admin_id: targetAdminId || null,
      metadata: typeof metadata === 'object' ? metadata : { detail: metadata },
    });
  } catch (err: any) {
    console.error('[auditLog] Failed:', err.message);
  }
}

// ── PKCE helpers ─────────────────────────────────────────────────────

function genCodeVerifier(): string { const a = new Uint8Array(32); getRandomValues(a); return Buffer.from(a).toString('base64url'); }
function genCodeChallenge(v: string): string { return createHash('sha256').update(v).digest('base64url'); }
function genSecureCode(len = 32): string { const a = new Uint8Array(len); getRandomValues(a); return Buffer.from(a).toString('hex').slice(0, len); }

// ── Score computation constants (server-side, mirrors useCreditScore) ─

const BASE_SCORE = 100;
const MAX_SCORE_LIMIT = 1000;

const LOAN_LEVELS_SERVER = [
  { level: 1, amount: 10, minScore: 350, repayments: 0, spendGate: 5, label: 'Starter' },
  { level: 2, amount: 25, minScore: 430, repayments: 1, spendGate: 15, label: 'Bronze' },
  { level: 3, amount: 50, minScore: 500, repayments: 2, spendGate: 15, label: 'Silver' },
  { level: 4, amount: 100, minScore: 575, repayments: 3, spendGate: 30, label: 'Gold' },
  { level: 5, amount: 200, minScore: 650, repayments: 4, spendGate: 75, label: 'Platinum', requiresX: true },
  { level: 6, amount: 400, minScore: 725, repayments: 5, spendGate: 200, label: 'Diamond', requiresX: true },
] as const;

function getTierServer(score: number): { label: string; color: string } {
  if (score >= 725) return { label: 'Diamond', color: '#EC81FF' };
  if (score >= 650) return { label: 'Platinum', color: '#C0C0E0' };
  if (score >= 575) return { label: 'Gold', color: '#FFD881' };
  if (score >= 500) return { label: 'Silver', color: '#81D4FF' };
  if (score >= 430) return { label: 'Bronze', color: '#CD7F32' };
  return { label: 'Starter', color: '#FF8181' };
}

function getLoanLevelServer(score: number, cleanRepayments: number, hasXVer: boolean) {
  let current: any = { level: 0, amount: 0, spendGate: 5, label: 'None', next: LOAN_LEVELS_SERVER[0] };
  for (let i = LOAN_LEVELS_SERVER.length - 1; i >= 0; i--) {
    const lvl = LOAN_LEVELS_SERVER[i] as any;
    if (score >= lvl.minScore && cleanRepayments >= lvl.repayments) {
      if (lvl.requiresX && !hasXVer) continue;
      current = { ...lvl, next: LOAN_LEVELS_SERVER[i + 1] || null };
      break;
    }
  }
  if (current.level === 0) current.next = LOAN_LEVELS_SERVER[0];
  return current;
}

async function serverRpc(rpcUrl: string, method: string, params: any[] = []) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || `RPC error: ${method}`);
  return data.result;
}

async function persistScanServer(wallet: string, result: any, repStats: any, prevScan: any) {
  const { score, tier, loanLevel, walletAgeDays, txCount, monthlyActivity,
    protocolCount, balanceUsd, spend90d, canBorrow, breakdown } = result;

  const scanRow: any = {
    wallet_address: wallet, score, max_score: MAX_SCORE_LIMIT,
    tier: tier.label, loan_level: loanLevel.level, level_name: loanLevel.label,
    eligible: canBorrow, eligibility_status: canBorrow ? 'eligible' : 'not_eligible',
    base_score: BASE_SCORE,
    wallet_age_points: breakdown.age, transaction_volume_points: breakdown.volume,
    monthly_consistency_points: breakdown.consistency, protocol_diversity_points: breakdown.diversity,
    portfolio_value_points: breakdown.portfolio, repayment_history_points: breakdown.repayment,
    x_verification_points: breakdown.xVerification, cross_chain_credit_points: breakdown.crossChain,
    sol_identity_points: breakdown.solIdentity, superteam_pow_points: breakdown.superteam,
    credit_maturity_points: breakdown.creditMaturity, borrow_growth_points: breakdown.borrowGrowth,
    wallet_age_days: walletAgeDays, total_transactions: txCount,
    avg_monthly_transactions: monthlyActivity > 0 ? Math.round(txCount / monthlyActivity) : 0,
    unique_protocols: protocolCount,
    recent_spend_90d: Math.round(spend90d * 100) / 100,
    portfolio_value_usd: Math.round(balanceUsd * 100) / 100,
  };

  const scanResult = await sbInsert('wallet_scans', scanRow);
  const scan = scanResult?.[0];

  if (scan) {
    try {
      await sbInsert('eligibility_checks', {
        wallet_address: wallet, scan_id: scan.id,
        score_passed: score >= 350,
        spend_gate_passed: spend90d >= (loanLevel.spendGate || 5),
        active_loan_gate_passed: true,
        repayment_requirement_passed: (repStats?.clean_repayments || 0) >= (loanLevel.repayments || 0),
        level_requirement_passed: true,
        eligible_level: loanLevel.level, eligible_level_name: loanLevel.label,
        eligible_amount: loanLevel.amount, borrow_asset: 'USDC',
      });
    } catch {}
  }

  try { await sbUpsert('wallet_profiles', { wallet_address: wallet, updated_at: new Date().toISOString() }); } catch {}

  if (prevScan && prevScan.score !== score) {
    try {
      await sbInsert('score_change_events', {
        wallet_address: wallet, previous_score: prevScan.score, new_score: score,
        score_delta: score - prevScan.score, previous_level: prevScan.loan_level,
        new_level: loanLevel.level, previous_eligible: prevScan.eligible,
        new_eligible: canBorrow, reason: 'wallet_scan', trigger_event: 'compute_score',
      });
    } catch {}
  }
}

// ══════════════════════════════════════════════════════════════════════
// BUILD APP — export for both local dev and Vercel serverless
// ══════════════════════════════════════════════════════════════════════

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  // ── HEALTH CHECK ─────────────────────────────────────────────────
  app.get('/api/health', async () => ({
    ok: true,
    service: 'lendra-api',
    appUrl: APP_URL,
    supabaseConfigured,
    redisConfigured: !!(redisUrl && redisToken),
    quicknodeDevnetConfigured: !!process.env.QUICKNODE_DEVNET_HTTP_URL,
    timestamp: new Date().toISOString(),
  }));

  // ── QUICKNODE RPC PROXY ──────────────────────────────────────────
  app.post('/api/quicknode/rpc/solana', async (req, reply) => {
    const rpcUrl = getQuicknodeHttpUrl();
    if (!rpcUrl) {
      return reply.code(500).send({
        ok: false,
        stage: 'rpc_config',
        error: 'HTTP Solana RPC endpoint is required. Set QUICKNODE_HTTP_URL or VITE_PUBLIC_QUICKNODE_WSS.',
      });
    }
    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const upstream = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '');
        return reply.code(502).send({ ok: false, stage: 'rpc_fetch', error: `Solana RPC request failed (${upstream.status})` });
      }
      const data = await upstream.json();
      return data;
    } catch (err: any) {
      return reply.code(500).send({ ok: false, stage: 'rpc_fetch', error: 'Solana RPC request failed', details: err.message });
    }
  });

  app.get('/api/quicknode/rpc/solana', async () => ({
    ok: true, service: 'quicknode-rpc-solana', message: 'Use POST with JSON-RPC body',
  }));

  // ── SCORE SCAN (full server-side wallet scoring) ─────────────────
  app.get('/api/score/scan', async () => {
    const rpcUrl = getQuicknodeHttpUrl();
    return { ok: true, service: 'score-scan', message: 'Use POST to scan wallet', configured: !!rpcUrl && supabaseConfigured };
  });

  app.post('/api/score/scan', async (req, reply) => {
    const { wallet_address } = req.body as any || {};
    if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet_address)) {
      return reply.code(400).send({ ok: false, error: 'Invalid wallet address format' });
    }
    const rpcUrl = getQuicknodeHttpUrl();
    if (!rpcUrl) {
      return reply.code(500).send({ ok: false, stage: 'quicknode_rpc_config', error: 'QuickNode Solana HTTP RPC URL is required for wallet scan.' });
    }
    if (!supabaseConfigured) {
      return reply.code(500).send({ ok: false, stage: 'supabase_config', error: 'Supabase not configured' });
    }

    try {
      // ── Fetch SOL price ───────────────────────────────────────────
      let solPrice = 0;
      try {
        const pr = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (pr.ok) { const pd = await pr.json(); solPrice = pd?.solana?.usd || 0; }
      } catch { /* non-critical */ }

      // ── RPC: getBalance ───────────────────────────────────────────
      const balanceResult = await serverRpc(rpcUrl, 'getBalance', [wallet_address, { commitment: 'confirmed' }]);
      const balanceLamports = balanceResult?.value ?? 0;
      const balanceSol = balanceLamports / 1e9;
      const balanceUsd = balanceSol * solPrice;

      // ── RPC: getSignaturesForAddress ──────────────────────────────
      const signatures = await serverRpc(rpcUrl, 'getSignaturesForAddress', [wallet_address, { limit: 1000, commitment: 'confirmed' }]);
      const txCount = signatures?.length || 0;

      const emptyBreakdown = {
        age: 0, volume: 0, consistency: 0, diversity: 0, portfolio: 0,
        repayment: 0, xVerification: 0, crossChain: 0, solIdentity: 0, superteam: 0,
        creditMaturity: 0, borrowGrowth: 0,
      };

      // Empty wallet → base score
      if (txCount === 0) {
        const tier = getTierServer(BASE_SCORE);
        const loanLevel = getLoanLevelServer(BASE_SCORE, 0, false);
        const result = {
          score: BASE_SCORE, tier, loanLevel,
          walletAgeDays: 0, txCount: 0, monthlyActivity: 0, protocolCount: 0,
          balanceUsd, spend90d: 0, canBorrow: false, cleanRepayments: 0,
          breakdown: emptyBreakdown,
        };
        persistScanServer(wallet_address, result, null, null).catch(() => {});
        return { ok: true, data: result };
      }

      // ── Wallet age ────────────────────────────────────────────────
      const oldestTx = signatures[signatures.length - 1];
      const oldestTime = oldestTx?.blockTime ? oldestTx.blockTime * 1000 : Date.now();
      const walletAgeDays = Math.floor((Date.now() - oldestTime) / (1000 * 60 * 60 * 24));

      // ── Monthly activity & recent spend ───────────────────────────
      const monthSet = new Set<string>();
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      let recentTxCount = 0;
      for (const sig of signatures) {
        if (sig.blockTime) {
          const d = new Date(sig.blockTime * 1000);
          monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
          if (sig.blockTime * 1000 >= ninetyDaysAgo) recentTxCount++;
        }
      }
      const monthlyActivity = monthSet.size;
      const spend90d = recentTxCount * 0.015 * solPrice;

      // ── Protocol diversity (sample first 20 txns) ─────────────────
      const programSet = new Set<string>();
      try {
        const sampleSigs = signatures.slice(0, 50);
        for (let i = 0; i < Math.min(20, sampleSigs.length); i++) {
          const txResult = await serverRpc(rpcUrl, 'getTransaction', [
            sampleSigs[i].signature,
            { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
          ]);
          if (txResult?.transaction?.message?.accountKeys) {
            for (const key of txResult.transaction.message.accountKeys) {
              const addr = typeof key === 'string' ? key : key?.pubkey;
              if (addr && addr !== wallet_address && addr !== '11111111111111111111111111111111') {
                programSet.add(addr);
              }
            }
          }
        }
      } catch { /* fallback */ }
      const protocolCount = Math.min(programSet.size, 50);

      // ── DB: repayment stats & previous scan ───────────────────────
      let repStats: any = null;
      try { const rs = await sbSelect('repayment_stats', `select=*&wallet_address=eq.${wallet_address}&limit=1`); repStats = rs?.[0] || null; } catch {}

      let prevScan: any = null;
      try { const ps = await sbSelect('wallet_scans', `select=*&wallet_address=eq.${wallet_address}&order=created_at.desc&limit=1`); prevScan = ps?.[0] || null; } catch {}

      // ── DB: X verification score ──────────────────────────────────
      let xVerificationScore = 0;
      try {
        const xr = await sbSelect('wallet_profiles', `select=x_verification_score,x_connected&wallet_address=eq.${wallet_address}&limit=1`);
        if (xr?.[0]?.x_connected) xVerificationScore = xr[0].x_verification_score || 0;
      } catch {}

      // ── Score computation ─────────────────────────────────────────
      const ageScore = Math.min(60, Math.floor((walletAgeDays / 365) * 60));
      const volumeScore = Math.min(60, Math.floor((txCount / 500) * 60));
      const consistencyScore = Math.min(60, Math.floor((monthlyActivity / 12) * 60));
      const diversityScore = Math.min(70, Math.floor((protocolCount / 15) * 70));
      const portfolioScore = Math.min(40, Math.floor((balanceUsd / 5000) * 40));

      const cleanRepayments = repStats?.clean_repayments || 0;
      const earlyRepayments = repStats?.early_repayments || 0;
      const lateRepayments = repStats?.late_repayments || 0;
      const hasDefault = (repStats?.defaults || 0) > 0;
      const currentLevel = repStats?.current_level || 0;
      const qualifyingReps = repStats?.qualifying_higher_borrow_repayments || 0;

      let repaymentScore = 0;
      if (!hasDefault) {
        const rpBase = Math.min(cleanRepayments * 25, 140);
        const earlyBonus = Math.min(earlyRepayments * 5, 20);
        const latePenalty = lateRepayments * 15;
        repaymentScore = Math.max(0, Math.min(140, rpBase + earlyBonus - latePenalty));
      }

      const MATURITY_BONUSES: Record<number, number> = { 3: 20, 4: 25, 5: 30, 6: 35 };
      let creditMaturityScore = 0;
      for (const [lvl, bonus] of Object.entries(MATURITY_BONUSES)) {
        if (currentLevel >= parseInt(lvl)) creditMaturityScore += bonus;
      }
      creditMaturityScore = Math.min(110, creditMaturityScore);

      const borrowGrowthScore = Math.min(100, qualifyingReps * 5);
      const crossChainScore = 0;
      const solIdentityScore = 0;
      const superteamScore = 0;

      const totalScore = Math.min(MAX_SCORE_LIMIT, BASE_SCORE +
        ageScore + volumeScore + consistencyScore + diversityScore + portfolioScore +
        repaymentScore + xVerificationScore + crossChainScore + solIdentityScore + superteamScore +
        creditMaturityScore + borrowGrowthScore
      );

      const tier = getTierServer(totalScore);
      const hasXVer = xVerificationScore > 0;
      const loanLevel = getLoanLevelServer(totalScore, cleanRepayments, hasXVer);
      const canBorrow = totalScore >= 350 && spend90d >= (loanLevel.spendGate || 5);

      const result = {
        score: totalScore, tier, loanLevel,
        walletAgeDays, txCount, monthlyActivity, protocolCount,
        balanceUsd, spend90d: Math.round(spend90d * 100) / 100, canBorrow, cleanRepayments,
        breakdown: {
          age: ageScore, volume: volumeScore, consistency: consistencyScore,
          diversity: diversityScore, portfolio: portfolioScore,
          repayment: repaymentScore, xVerification: xVerificationScore,
          crossChain: crossChainScore, solIdentity: solIdentityScore, superteam: superteamScore,
          creditMaturity: creditMaturityScore, borrowGrowth: borrowGrowthScore,
        },
      };

      // Persist to DB (non-blocking)
      persistScanServer(wallet_address, result, repStats, prevScan).catch(() => {});

      return { ok: true, data: result };
    } catch (err: any) {
      console.error('[score/scan] Error:', err.message);
      return reply.code(500).send({ ok: false, stage: 'scan_error', error: err.message });
    }
  });

  // ── BORROW APPLY (legacy standalone route) ───────────────────────
  app.post('/api/borrow/apply', async (req, reply) => {
    const { wallet_address, amount_sol, duration_days } = req.body as any || {};
    if (!wallet_address || !amount_sol) return reply.code(400).send({ ok: false, error: 'wallet_address and amount_sol required' });
    try {
      const scores = await sbSelect('credit_scores', `select=total_score&wallet_address=eq.${wallet_address}&order=created_at.desc&limit=1`);
      if (!scores?.length) return reply.code(400).send({ ok: false, error: 'Credit score required before applying' });
      const score = scores[0].total_score;
      if (score < 300) return reply.code(400).send({ ok: false, error: 'Minimum credit score of 300 required' });
      const application = { id: randomUUID(), wallet_address, amount_sol: Number(amount_sol), duration_days: Number(duration_days) || 30, credit_score_at_application: score, status: 'pending' };
      await sbInsert('borrow_applications', application);
      return { ok: true, application };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── POOL STATUS & WAITLIST ───────────────────────────────────────
  app.get('/api/pool/status', async (_req, reply) => {
    try {
      const rows = await sbSelect('credit_pool_state', 'select=pool_live,pool_paused,pool_mode,available_liquidity,updated_at&limit=1');
      const p = rows?.[0] || { pool_live: false, pool_paused: false, pool_mode: 'simulation', available_liquidity: 0, updated_at: null };
      return { ok: true, ...p };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.post('/api/pool/waitlist/join', async (req, reply) => {
    const b = req.body as any;
    if (!b?.wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    try {
      const row = { wallet_address: b.wallet_address, simulated_loan_amount: b.simulated_loan_amount || null, borrow_asset: b.borrow_asset || 'USDC', bond_amount: b.bond_amount || null, bond_percentage: b.bond_percentage || 30, loan_term_days: b.loan_term_days || 14, loan_fee_percentage: b.loan_fee_percentage || 0, loan_fee_amount: b.loan_fee_amount || 0, total_repayment: b.total_repayment || 0, loan_level: b.loan_level || null, level_name: b.level_name || null, loan_purpose_text: b.loan_purpose_text || null, loan_purpose_tags: b.loan_purpose_tags || null, score: b.score || null, max_score: 1000, eligible: b.eligible || false, telegram_connected: b.telegram_connected || false, x_connected: b.x_connected || false, x_username: b.x_username || null, wants_telegram: b.wants_telegram || false, wants_x_updates: b.wants_x_updates || false, status: 'waiting' };
      const result = await sbUpsert('pool_launch_waitlist', row);
      try { await sbInsert('partner_events', { partner: 'lendra', event_type: 'pool_waitlist_joined', wallet_address: b.wallet_address, metadata: { simulated_loan_amount: b.simulated_loan_amount, borrow_asset: b.borrow_asset } }); } catch {}
      if (b.telegram_connected && b.wants_telegram) {
        try {
          const pr = await sbSelect('wallet_profiles', `select=telegram_chat_id,private_mode_enabled&wallet_address=eq.${b.wallet_address}&limit=1`);
          const p = pr?.[0];
          if (p?.telegram_chat_id) {
            const msg = p.private_mode_enabled
              ? `Lendra Update\n\nYou're on the Lendra pool launch list.\n\nOpen Lendra to view details privately:\n${APP_URL}/dashboard`
              : `Lendra Update\n\nYou're on the pool launch list for a ${b.simulated_loan_amount || '—'} ${b.borrow_asset || 'USDC'} simulation.\n\nWe'll notify you when the Lendra Credit Pool goes live.`;
            const sent = await sendTG(p.telegram_chat_id, msg);
            await sbInsert('notification_events', { wallet_address: b.wallet_address, channel: 'telegram', event_type: 'pool_waitlist_confirmation', status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id, message: msg });
          }
        } catch {}
      }
      return { ok: true, data: result?.[0] || row };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.post('/api/pool/waitlist/notify', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ ok: false, error: 'super_admin required' });
    try {
      const wl = await sbSelect('pool_launch_waitlist', 'select=*&status=eq.waiting') || [];
      let n = 0;
      for (const e of wl) {
        if (e.telegram_connected && e.wants_telegram) {
          const pr = await sbSelect('wallet_profiles', `select=telegram_chat_id&wallet_address=eq.${e.wallet_address}&limit=1`);
          const cid = pr?.[0]?.telegram_chat_id;
          if (cid) {
            const msg = `Lendra Credit Pool is live.\n\nYou can now return to Lendra to continue your borrowing flow.\n\nOpen Lendra:\n${APP_URL}/borrow`;
            const sent = await sendTG(cid, msg);
            if (sent) n++;
            await sbInsert('notification_events', { wallet_address: e.wallet_address, channel: 'telegram', event_type: 'pool_launch_notification', status: sent ? 'sent' : 'failed', recipient: cid, message: msg });
          }
        }
        await sbUpdate('pool_launch_waitlist', { status: 'notified', notified_at: new Date().toISOString() }, `wallet_address=eq.${e.wallet_address}`);
      }
      await sbInsert('admin_audit_logs', { action: 'pool_waitlist_notified', metadata: { notified_count: n, total_waitlist: wl.length, triggered_by: admin.email } });
      return { ok: true, notified: n, total: wl.length };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── TELEGRAM ─────────────────────────────────────────────────────
  app.get('/api/telegram/webhook', async () => ({
    ok: true, service: 'telegram-webhook',
    configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET),
    webhookUrl: `${APP_URL}/api/telegram/webhook`,
  }));

  app.post('/api/telegram/link/start', async (req, reply) => {
    const { wallet_address } = req.body as any;
    if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    if (!TELEGRAM_BOT_USERNAME) return reply.code(500).send({ ok: false, error: 'Telegram bot not configured' });
    const code = genSecureCode(24);
    await redis.set(`telegram_link:${code}`, wallet_address, { ex: 600 });
    try { await sbInsert('notification_events', { wallet_address, channel: 'telegram', event_type: 'telegram_link_started', status: 'pending', metadata: { code_created: true } }); } catch {}
    return { ok: true, telegramUrl: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}` };
  });

  app.post('/api/telegram/webhook', async (req, reply) => {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) return reply.code(401).send({ ok: false, error: 'Invalid secret' });
    const msg = (req.body as any)?.message;
    if (!msg?.text || !msg?.chat?.id) return { ok: true };
    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    const username = msg.from?.username || '';
    if (text.startsWith('/start ')) {
      const code = text.split(' ')[1];
      const wa = await redis.get<string>(`telegram_link:${code}`);
      if (!wa) { await sendTG(chatId, 'This Lendra link has expired. Please return to Lendra and try again.'); return { ok: true }; }
      try { await sbUpdate('wallet_profiles', { telegram_chat_id: chatId, telegram_username: username, telegram_connected: true, telegram_connected_at: new Date().toISOString(), telegram_alerts_enabled: true, updated_at: new Date().toISOString() }, `wallet_address=eq.${wa}`); } catch {}
      await redis.del(`telegram_link:${code}`);
      try { await sbInsert('notification_events', { wallet_address: wa, channel: 'telegram', event_type: 'telegram_connected', status: 'sent', recipient: chatId, message: 'Lendra alerts are now enabled for this wallet.' }); } catch {}
      await sendTG(chatId, 'Lendra alerts are now enabled for this wallet.');
      return { ok: true };
    }
    await sendTG(chatId, 'Open Lendra and click Enable Telegram Alerts to connect this bot.');
    return { ok: true };
  });

  app.post('/api/telegram/test', async (req, reply) => {
    const { wallet_address } = req.body as any;
    if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    try {
      const rows = await sbSelect('wallet_profiles', `select=telegram_chat_id,telegram_connected&wallet_address=eq.${wallet_address}&limit=1`);
      const p = rows?.[0];
      if (!p?.telegram_connected || !p?.telegram_chat_id) return { ok: false, error: 'telegram_not_connected' };
      const sent = await sendTG(p.telegram_chat_id, 'Lendra test alert. Telegram alerts are working.');
      await sbInsert('notification_events', { wallet_address, channel: 'telegram', event_type: 'telegram_test', status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id, message: 'Lendra test alert.', error_message: sent ? null : 'Send failed', sent_at: sent ? new Date().toISOString() : null });
      return { ok: sent, status: sent ? 'sent' : 'failed' };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── NOTIFICATIONS ────────────────────────────────────────────────
  app.get('/api/notifications/preferences', async (req, reply) => {
    const wallet = (req.query as any)?.wallet || (req.query as any)?.wallet_address;
    if (!wallet) return reply.code(400).send({ ok: false, error: 'wallet required' });
    try {
      const rows = await sbSelect('wallet_profiles', `select=telegram_alerts_enabled,telegram_score_alerts_enabled,telegram_loan_alerts_enabled,telegram_bond_alerts_enabled,telegram_repayment_alerts_enabled,telegram_level_alerts_enabled&wallet_address=eq.${wallet}&limit=1`);
      return { ok: true, preferences: rows?.[0] || {} };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.post('/api/notifications/preferences', async (req, reply) => {
    const { wallet_address, ...prefs } = req.body as any;
    if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    const keys = ['telegram_alerts_enabled','telegram_score_alerts_enabled','telegram_loan_alerts_enabled','telegram_bond_alerts_enabled','telegram_repayment_alerts_enabled','telegram_level_alerts_enabled'];
    const upd: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const k of keys) if (k in prefs) upd[k] = prefs[k];
    try {
      await sbUpdate('wallet_profiles', upd, `wallet_address=eq.${wallet_address}`);
      await sbInsert('notification_events', { wallet_address, channel: 'telegram', event_type: 'notification_preferences_updated', status: 'sent', metadata: upd });
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── X (TWITTER) OAUTH ────────────────────────────────────────────
  app.get('/api/auth/x/start', async (req, reply) => {
    const wallet = (req.query as any)?.wallet || (req.query as any)?.wallet_address;
    if (!wallet) return reply.code(400).send({ ok: false, error: 'wallet required' });
    if (!X_CLIENT_ID) return reply.code(500).send({ ok: false, error: 'X OAuth not configured' });
    const state = genSecureCode(32);
    const cv = genCodeVerifier();
    const cc = genCodeChallenge(cv);
    await redis.set(`x_oauth:${state}`, JSON.stringify({ wallet_address: wallet, code_verifier: cv }), { ex: 600 });
    const params = new URLSearchParams({ response_type: 'code', client_id: X_CLIENT_ID, redirect_uri: X_REDIRECT_URI, scope: X_SCOPES, state, code_challenge: cc, code_challenge_method: 'S256' });
    return reply.redirect(`https://x.com/i/oauth2/authorize?${params}`);
  });

  app.get('/api/auth/x/callback', async (req, reply) => {
    const { code, state, error: oErr } = req.query as any;
    if (oErr || !code || !state) return reply.redirect(`${APP_URL}/trust-score?x=error`);
    const sd = await redis.get<string>(`x_oauth:${state}`);
    if (!sd) return reply.redirect(`${APP_URL}/trust-score?x=expired`);
    const parsed = typeof sd === 'string' ? JSON.parse(sd) : sd;
    const wa = parsed.wallet_address;
    const cv = parsed.code_verifier;
    try {
      const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}` },
        body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: X_REDIRECT_URI, code_verifier: cv }),
      });
      if (!tokenRes.ok) return reply.redirect(`${APP_URL}/trust-score?x=token_error`);
      const td = await tokenRes.json();
      const userRes = await fetch('https://api.x.com/2/users/me?user.fields=created_at,verified,public_metrics,profile_image_url', {
        headers: { 'Authorization': `Bearer ${td.access_token}` },
      });
      if (!userRes.ok) return reply.redirect(`${APP_URL}/trust-score?x=profile_error`);
      const u = (await userRes.json()).data;
      const ageDays = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000);
      let xScore = 15 + (u.id ? 15 : 0) + (ageDays > 730 ? 35 : 0) + ((u.public_metrics?.tweet_count || 0) >= 100 ? 35 : 0);
      try { await sbUpdate('wallet_profiles', { x_user_id: u.id, x_username: u.username, x_display_name: u.name, x_profile_image: u.profile_image_url, x_account_created_at: u.created_at, x_account_age_days: ageDays, x_posts_count: u.public_metrics?.tweet_count || 0, x_followers_count: u.public_metrics?.followers_count || 0, x_following_count: u.public_metrics?.following_count || 0, x_connected: true, x_connected_at: new Date().toISOString(), x_verification_score: xScore, updated_at: new Date().toISOString() }, `wallet_address=eq.${wa}`); } catch {}
      try { await sbInsert('x_verification_events', { wallet_address: wa, x_user_id: u.id, event_type: 'x_connected', status: 'success', points_awarded: xScore, metadata: { x_username: u.username, x_account_age_days: ageDays, x_posts_count: u.public_metrics?.tweet_count || 0, x_followers_count: u.public_metrics?.followers_count || 0 } }); } catch {}
      try { await sbInsert('partner_events', { partner: 'x', event_type: 'x_connected', wallet_address: wa, metadata: { x_user_id: u.id, x_username: u.username, x_verification_score: xScore } }); } catch {}
      await redis.del(`x_oauth:${state}`);
      return reply.redirect(`${APP_URL}/trust-score?x=connected`);
    } catch (e: any) { console.error('[X] Error:', e.message); return reply.redirect(`${APP_URL}/trust-score?x=error`); }
  });

  app.get('/api/auth/x/status', async (req, reply) => {
    const wallet = (req.query as any)?.wallet || (req.query as any)?.wallet_address;
    if (!wallet) return { ok: false, reason: 'wallet_required' };
    try {
      const rows = await sbSelect('wallet_profiles', `select=x_connected,x_username,x_user_id,x_account_age_days,x_posts_count,x_verification_score&wallet_address=eq.${wallet}&limit=1`);
      return { ok: true, ...(rows?.[0] || { x_connected: false }) };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.post('/api/auth/x/disconnect', async (req, reply) => {
    const { wallet_address } = req.body as any;
    if (!wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    try {
      await sbUpdate('wallet_profiles', { x_user_id: null, x_username: null, x_display_name: null, x_profile_image: null, x_account_created_at: null, x_account_age_days: 0, x_posts_count: 0, x_followers_count: 0, x_following_count: 0, x_connected: false, x_connected_at: null, x_verification_score: 0, updated_at: new Date().toISOString() }, `wallet_address=eq.${wallet_address}`);
      await sbInsert('x_verification_events', { wallet_address, event_type: 'x_disconnected', status: 'success', points_awarded: 0 });
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── QUICKNODE WEBHOOK ────────────────────────────────────────────
  app.get('/api/webhooks/quicknode', async () => ({
    ok: true, service: 'quicknode-webhook',
    configured: !!QUICKNODE_WEBHOOK_SECRET,
    webhookUrl: `${APP_URL}/api/webhooks/quicknode`,
  }));

  app.post('/api/webhooks/quicknode', async (req, reply) => {
    if (!QUICKNODE_WEBHOOK_SECRET) return reply.code(500).send({ ok: false, configured: false, error: 'QUICKNODE_WEBHOOK_SECRET not configured' });
    const tok = req.headers['x-qn-api-key'] || req.headers['x-quicknode-signature'] || req.headers['authorization'];
    if (tok !== QUICKNODE_WEBHOOK_SECRET && tok !== `Bearer ${QUICKNODE_WEBHOOK_SECRET}`) return reply.code(401).send({ ok: false, error: 'Invalid webhook secret' });
    const payload = req.body as any;
    try { await sbInsert('partner_events', { partner: 'quicknode', event_type: 'quicknode_webhook_event', wallet_address: payload?.wallet_address || payload?.account || null, metadata: typeof payload === 'object' ? payload : { raw: String(payload) } }); } catch {}
    const wa = payload?.wallet_address || payload?.account || null;
    const etype = payload?.event_type || payload?.type || 'unknown';
    if (wa) {
      try {
        const rows = await sbSelect('wallet_profiles', `select=telegram_chat_id,telegram_connected,telegram_alerts_enabled&wallet_address=eq.${wa}&limit=1`);
        const p = rows?.[0];
        if (p?.telegram_connected && p?.telegram_alerts_enabled && p?.telegram_chat_id) {
          const msg = `Lendra Alert\n\nOn-chain event: ${etype}\nWallet: ${wa.slice(0,6)}...${wa.slice(-4)}`;
          const sent = await sendTG(p.telegram_chat_id, msg);
          await sbInsert('notification_events', { wallet_address: wa, channel: 'telegram', event_type: 'quicknode_alert', status: sent ? 'sent' : 'failed', recipient: p.telegram_chat_id, message: msg });
        }
      } catch {}
      if (etype.includes('bond')) { try { await sbInsert('bond_events', { wallet_address: wa, event_type: etype, metadata: payload, status: etype.includes('return') ? 'returned' : etype.includes('liquidat') ? 'liquidated' : 'locked' }); } catch {} }
      if (etype.includes('repay')) { try { await sbInsert('repayments', { wallet_address: wa, amount_repaid: payload?.amount || 0, repaid_at: new Date().toISOString(), transaction_hash: payload?.tx_hash || null }); } catch {} }
    }
    return { ok: true };
  });

  // ── SOCIAL CARD ──────────────────────────────────────────────────
  app.post('/api/social-card/generate', async (req, reply) => {
    const b = req.body as any;
    if (!b?.wallet_address) return reply.code(400).send({ ok: false, error: 'wallet_address required' });
    try {
      const cardId = randomUUID();
      const card = { id: cardId, wallet_address: b.wallet_address, sol_domain: b.sol_domain || null, score: b.score || 0, max_score: 1000, tier: b.tier || null, loan_level: b.loan_level || null, level_name: b.level_name || null, eligible: b.eligible || false, eligible_amount: b.eligible_amount || 0, borrow_asset: b.borrow_asset || 'USDC', public_share_url: `${APP_URL}/share/credit-card/${cardId}`, image_url: b.image_url || null, private_mode_confirmed: b.private_mode_confirmed || false };
      const result = await sbInsert('social_credit_cards', card);
      return { ok: true, card: result?.[0] || card };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.post('/api/social-card/share', async (req, reply) => {
    const { card_id, wallet_address } = req.body as any;
    if (!card_id) return reply.code(400).send({ ok: false, error: 'card_id required' });
    try {
      const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent('Check out my Lendra credit profile')}&url=${encodeURIComponent(`${APP_URL}/share/credit-card/${card_id}`)}`;
      await sbUpdate('social_credit_cards', { shared_to_x: true, x_share_url: xUrl }, `id=eq.${card_id}`);
      if (wallet_address) await sbInsert('partner_events', { partner: 'x', event_type: 'social_card_shared', wallet_address, metadata: { card_id, x_share_url: xUrl } });
      return { ok: true, x_share_url: xUrl };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.get('/api/share/credit-card/:cardId', async (req, reply) => {
    const { cardId } = req.params as { cardId: string };
    try {
      const rows = await sbSelect('social_credit_cards', `select=wallet_address,sol_domain,score,max_score,tier,loan_level,level_name,eligible,image_url,private_mode_confirmed&id=eq.${cardId}&limit=1`);
      const c = rows?.[0];
      if (!c) return reply.code(404).send({ ok: false, error: 'Card not found' });
      const dw = c.private_mode_confirmed ? 'Private Wallet' : c.sol_domain || `${c.wallet_address?.slice(0,6)}...${c.wallet_address?.slice(-4)}`;
      return { ok: true, card: { wallet_display: dw, score: c.score, max_score: c.max_score, tier: c.tier, level_name: c.level_name, eligible: c.eligible, image_url: c.image_url }, og: { title: `${dw} — Lendra Credit Score: ${c.score}/1000`, description: `Tier: ${c.tier || 'Unknown'} | Level: ${c.level_name || 'Unknown'}`, image: c.image_url || `${APP_URL}/assets/lender-logo5x.png` } };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── BORROW SIMULATION & LOAN PRICING ─────────────────────────────
  app.get('/api/loan-pricing', async (_req, reply) => {
    try {
      const rows = await sbSelect('loan_pricing_rules', 'select=*&active=eq.true&order=loan_level.asc,term_days.asc');
      return { ok: true, rules: rows || [] };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  app.post('/api/borrow/simulate', async (req, reply) => {
    const b = req.body as any;
    if (!b?.wallet_address || !b?.loan_amount) return reply.code(400).send({ ok: false, error: 'wallet_address and loan_amount required' });
    try {
      const lv = b.loan_level || 1;
      const td = b.term_days || 14;
      const rows = await sbSelect('loan_pricing_rules', `select=fee_percentage,tier_name&loan_level=eq.${lv}&term_days=eq.${td}&active=eq.true&limit=1`);
      const fee = rows?.[0]?.fee_percentage || 3;
      const amt = Number(b.loan_amount);
      const feeAmt = amt * fee / 100;
      const totalRepay = amt + feeAmt;
      const bond = amt * 0.30;
      await sbInsert('loan_events', { wallet_address: b.wallet_address, event_type: 'simulation', borrow_asset: b.borrow_asset || 'USDC', loan_amount: amt, apr: 0, interest_amount: feeAmt, total_repayment: totalRepay, bond_amount: bond, bond_percentage: 30, loan_level: lv, level_name: rows?.[0]?.tier_name || b.level_name || null, loan_purpose_text: b.loan_purpose_text || null, loan_purpose_tags: b.loan_purpose_tags || null, status: 'simulated' });
      return { ok: true, simulation: { loan_amount: amt, fee_percentage: fee, loan_fee_amount: feeAmt, total_repayment: totalRepay, bond_amount: bond, bond_percentage: 30, term_days: td, level_name: rows?.[0]?.tier_name || null } };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── LENDRA AI / QVAC ────────────────────────────────────────────
  app.post('/api/lendra-ai/chat', async (req, reply) => {
    const b = req.body as any;
    try {
      await sbInsert('qvac_events', { wallet_address: b?.wallet_address || null, event_type: b?.event_type || 'chat', selected_language: b?.selected_language || 'English', user_question: b?.user_question || null, response_summary: b?.response_summary || null, used_voice: b?.used_voice || false, used_translation: b?.used_translation || false, used_tts: b?.used_tts || false, used_stt: b?.used_stt || false });
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── ADMIN WEBHOOKS STATUS ────────────────────────────────────────
  app.get('/api/admin/webhooks/status', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const r: Record<string, any> = {};
    r.telegram = { configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET), bot_username: TELEGRAM_BOT_USERNAME || null };
    try { r.telegram.last_connected = (await sbSelect('notification_events', 'select=id,wallet_address,status,created_at&channel=eq.telegram&event_type=eq.telegram_connected&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.telegram.last_connected = null; }
    try { r.telegram.last_send = (await sbSelect('notification_events', 'select=id,status,created_at&channel=eq.telegram&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.telegram.last_send = null; }
    r.x_oauth = { client_id_configured: !!X_CLIENT_ID, client_secret_configured: !!X_CLIENT_SECRET, redirect_uri: X_REDIRECT_URI };
    try { r.x_oauth.last_event = (await sbSelect('x_verification_events', 'select=id,wallet_address,x_user_id,event_type,status,points_awarded,created_at&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.x_oauth.last_event = null; }
    try { r.x_oauth.last_connected_profile = (await sbSelect('wallet_profiles', 'select=wallet_address,x_username,x_connected,x_connected_at&x_connected=eq.true&order=x_connected_at.desc&limit=1'))?.[0] || null; } catch { r.x_oauth.last_connected_profile = null; }
    r.quicknode = { configured: !!QUICKNODE_WEBHOOK_SECRET };
    try { r.quicknode.last_event = (await sbSelect('partner_events', 'select=id,wallet_address,event_type,created_at&partner=eq.quicknode&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.quicknode.last_event = null; }
    try { const p = await sbSelect('credit_pool_state', 'select=pool_live,pool_mode,pool_paused,available_liquidity&limit=1'); r.pool = p?.[0] || {}; } catch { r.pool = {}; }
    try { r.pool.total_waitlist = ((await sbSelect('pool_launch_waitlist', 'select=id&limit=1000')) || []).length; } catch { r.pool.total_waitlist = 0; }
    try { r.pool.last_waitlist_entry = (await sbSelect('pool_launch_waitlist', 'select=wallet_address,status,created_at&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.pool.last_waitlist_entry = null; }
    try { r.pool.last_partner_event = (await sbSelect('partner_events', 'select=id,created_at&partner=eq.lendra&event_type=eq.pool_waitlist_joined&order=created_at.desc&limit=1'))?.[0] || null; } catch { r.pool.last_partner_event = null; }
    try { r.social_card = { last_card: (await sbSelect('social_credit_cards', 'select=id,wallet_address,score,shared_to_x,created_at&order=created_at.desc&limit=1'))?.[0] || null }; } catch { r.social_card = { last_card: null }; }
    try { r.borrow_simulation = { last_sim: (await sbSelect('loan_events', 'select=id,wallet_address,loan_amount,status,created_at&event_type=eq.simulation&order=created_at.desc&limit=1'))?.[0] || null }; } catch { r.borrow_simulation = { last_sim: null }; }
    try { r.borrow_simulation.pricing_rules_count = ((await sbSelect('loan_pricing_rules', 'select=id&active=eq.true&limit=100')) || []).length; } catch { if (!r.borrow_simulation) r.borrow_simulation = {}; r.borrow_simulation.pricing_rules_count = 0; }
    try { r.lendra_ai = { last_event: (await sbSelect('qvac_events', 'select=id,wallet_address,event_type,selected_language,created_at&order=created_at.desc&limit=1'))?.[0] || null }; } catch { r.lendra_ai = { last_event: null }; }
    return { ok: true, ...r };
  });

  app.get('/api/admin/data-wiring/status', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const tables = ['wallet_profiles','wallet_scans','eligibility_checks','loan_events','pool_launch_waitlist','loan_pricing_rules','notification_events','x_verification_events','partner_events','social_credit_cards','qvac_events','admin_audit_logs','bond_events','repayments','score_change_events','secret_token_events'];
    const statuses: any[] = [];
    for (const t of tables) {
      try {
        const rows = await sbSelect(t, 'select=id,created_at&order=created_at.desc&limit=1');
        const row = rows?.[0];
        statuses.push({ table: t, status: row ? 'working' : 'no_data', last_created_at: row?.created_at || null, last_id: row?.id || null, error: null });
      } catch (e: any) { statuses.push({ table: t, status: 'error', last_created_at: null, last_id: null, error: e.message }); }
    }
    return { ok: true, tables: statuses };
  });

  app.post('/api/admin/test/:system', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ ok: false, error: 'super_admin required' });
    const { system } = req.params as { system: string };
    const meta = { test: true, triggered_by: admin.email, timestamp: new Date().toISOString() };
    try {
      let result;
      switch (system) {
        case 'telegram': result = await sbInsert('notification_events', { channel: 'telegram', event_type: 'admin_test', status: 'sent', metadata: meta }); break;
        case 'notification': result = await sbInsert('notification_events', { channel: 'system', event_type: 'admin_test_notification', status: 'sent', metadata: meta }); break;
        case 'quicknode': result = await sbInsert('partner_events', { partner: 'quicknode', event_type: 'admin_test_quicknode', metadata: meta }); break;
        case 'pool_waitlist': result = await sbInsert('partner_events', { partner: 'lendra', event_type: 'admin_test_pool_waitlist', metadata: meta }); break;
        case 'borrow_simulation': result = await sbInsert('loan_events', { wallet_address: 'test_wallet_admin', event_type: 'simulation', loan_amount: 100, status: 'simulated' }); break;
        case 'qvac': result = await sbInsert('qvac_events', { event_type: 'admin_test', selected_language: 'English', user_question: 'Admin test', response_summary: 'Test completed' }); break;
        case 'partner': result = await sbInsert('partner_events', { partner: 'lendra', event_type: 'admin_test_partner', metadata: meta }); break;
        default: return reply.code(400).send({ ok: false, error: `Unknown system: ${system}` });
      }
      return { ok: true, system, result: result?.[0] || null };
    } catch (e: any) { return reply.code(500).send({ ok: false, error: e.message }); }
  });

  // ── LOAN (Redis-backed) ──────────────────────────────────────────
  app.get('/api/loan/:wallet', async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    const loan = await redis.get<string>(`active_loan:${wallet}`);
    if (!loan) return reply.code(404).send({ error: 'No active loan' });
    return typeof loan === 'string' ? JSON.parse(loan) : loan;
  });

  app.post('/api/loan', async (req, reply) => {
    const body = req.body as { wallet: string; amount: number; apr: number; termDays: number; bondAmount: number; reason: string; level: number; score: number; txSignature: string };
    const { wallet, amount, apr, termDays, bondAmount, reason, level, score, txSignature } = body;
    if (!wallet || !amount || !apr || !termDays || !reason || !txSignature) return reply.code(400).send({ error: 'Missing required fields' });
    const existing = await redis.get(`active_loan:${wallet}`);
    if (existing) return reply.code(409).send({ error: 'Active loan already exists for this wallet' });
    const interest = amount * (apr / 100 / 365) * termDays;
    const totalRepay = amount + interest;
    const createdAt = Date.now();
    const dueDate = createdAt + termDays * 86400000;
    const loan = { wallet, amount, apr, termDays, interest: Math.round(interest * 10000) / 10000, totalRepay: Math.round(totalRepay * 10000) / 10000, bondAmount, reason, level, score, txSignature, createdAt, dueDate, status: 'active' };
    await redis.set(`active_loan:${wallet}`, JSON.stringify(loan));
    const hk = `loan_history:${wallet}`;
    const h = (await redis.get<string>(hk)) || '[]';
    const ha = typeof h === 'string' ? JSON.parse(h) : h;
    ha.push({ ...loan, action: 'borrow', timestamp: createdAt });
    await redis.set(hk, JSON.stringify(ha));
    return loan;
  });

  app.post('/api/loan/repay', async (req, reply) => {
    const { wallet, txSignature } = req.body as { wallet: string; txSignature: string };
    if (!wallet || !txSignature) return reply.code(400).send({ error: 'Missing wallet or txSignature' });
    const lr = await redis.get<string>(`active_loan:${wallet}`);
    if (!lr) return reply.code(404).send({ error: 'No active loan found' });
    const loan = typeof lr === 'string' ? JSON.parse(lr) : lr;
    loan.status = 'repaid'; loan.repaidAt = Date.now(); loan.repayTxSignature = txSignature;
    const isOnTime = Date.now() <= loan.dueDate;
    const scoreBonus = isOnTime ? 15 : -10;
    const hk = `loan_history:${wallet}`;
    const h = (await redis.get<string>(hk)) || '[]';
    const ha = typeof h === 'string' ? JSON.parse(h) : h;
    ha.push({ ...loan, action: 'repay', timestamp: Date.now(), isOnTime, scoreBonus });
    await redis.set(hk, JSON.stringify(ha));
    const ak = `score_adjust:${wallet}`;
    const ca = ((await redis.get<number>(ak)) || 0) as number;
    await redis.set(ak, ca + scoreBonus);
    await redis.del(`active_loan:${wallet}`);
    return { repaid: true, loan, isOnTime, scoreBonus, totalScoreAdjustment: ca + scoreBonus };
  });

  // ── ADMIN AUTH (Supabase-backed with bootstrap) ─────────────────

  async function createAdminSession(adminId: string, adminEmail: string, adminRole: string, adminDisplayName?: string) {
    const token = genSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await sbInsert('admin_sessions', { admin_user_id: adminId, session_token_hash: tokenHash, expires_at: expiresAt });
    const cached = { id: adminId, email: adminEmail, role: adminRole, display_name: adminDisplayName || null };
    try { await redis.set(`admin_session_v2:${tokenHash}`, JSON.stringify(cached), { ex: 86400 }); } catch {}
    return token;
  }

  app.post('/api/admin/auth/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });
    const ip = req.ip || 'unknown';
    try {
      const allAdmins = await sbSelect('admin_users', 'select=id&limit=1');
      const isBootstrap = !allAdmins || allAdmins.length === 0;

      if (isBootstrap) {
        if (!ADMIN_EMAIL_ENV) return reply.code(403).send({ error: 'ADMIN_EMAIL not configured for bootstrap' });
        if (email !== ADMIN_EMAIL_ENV) {
          try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'bootstrap_email_mismatch' }); } catch {}
          return reply.code(401).send({ error: 'Invalid credentials' });
        }
        let pwValid = false;
        // Try hash check first, then fall back to plain password comparison
        if (ADMIN_PASSWORD_HASH_ENV) { pwValid = checkPassword(password, ADMIN_PASSWORD_HASH_ENV); }
        if (!pwValid && ADMIN_PASSWORD_ENV) { pwValid = password === ADMIN_PASSWORD_ENV; }
        if (!pwValid) {
          try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'bootstrap_bad_password' }); } catch {}
          return reply.code(401).send({ error: 'Invalid credentials' });
        }
        const hashedPw = hashPassword(password);
        const result = await sbInsert('admin_users', { email, password_hash: hashedPw, role: 'super_admin', status: 'active' });
        const newAdmin = result?.[0];
        if (!newAdmin) return reply.code(500).send({ error: 'Failed to create admin' });
        await auditLog(newAdmin.id, 'super_admin_bootstrapped', { email, ip_address: ip });
        const token = await createAdminSession(newAdmin.id, newAdmin.email, 'super_admin');
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: true }); } catch {}
        return { ok: true, token, admin: { id: newAdmin.id, email: newAdmin.email, role: 'super_admin', display_name: null } };
      }

      // Normal login
      const admins = await sbSelect('admin_users', `select=id,email,password_hash,role,display_name,status&email=eq.${encodeURIComponent(email)}&limit=1`);
      const admin = admins?.[0];
      if (!admin) {
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'user_not_found' }); } catch {}
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      if (admin.status !== 'active') {
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'account_inactive' }); } catch {}
        return reply.code(403).send({ error: 'Account is not active' });
      }
      if (!checkPassword(password, admin.password_hash)) {
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'bad_password' }); } catch {}
        await auditLog(admin.id, 'admin_login_failed', { ip_address: ip, reason: 'bad_password' });
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      const token = await createAdminSession(admin.id, admin.email, admin.role, admin.display_name);
      try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: true }); } catch {}
      try { await sbUpdate('admin_users', { last_login_at: new Date().toISOString() }, `id=eq.${admin.id}`); } catch {}
      await auditLog(admin.id, 'admin_login_success', { ip_address: ip });
      return { ok: true, token, admin: { id: admin.id, email: admin.email, role: admin.role, display_name: admin.display_name } };
    } catch (err: any) {
      console.error('[admin/login] Error:', err.message);
      return reply.code(500).send({ error: 'Login failed: ' + err.message });
    }
  });

  // Legacy alias — delegates to same bootstrap + normal login logic
  app.post('/api/admin/login', async (req, reply) => {
    const { email, password } = req.body as any || {};
    if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });
    const ip = req.ip || 'unknown';
    try {
      const allAdmins = await sbSelect('admin_users', 'select=id&limit=1');
      const isBootstrap = !allAdmins || allAdmins.length === 0;

      if (isBootstrap) {
        if (!ADMIN_EMAIL_ENV) return reply.code(403).send({ error: 'ADMIN_EMAIL not configured for bootstrap' });
        if (email !== ADMIN_EMAIL_ENV) {
          try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'bootstrap_email_mismatch' }); } catch {}
          return reply.code(401).send({ error: 'Invalid credentials' });
        }
        let pwValid = false;
        // Try hash check first, then fall back to plain password comparison
        if (ADMIN_PASSWORD_HASH_ENV) { pwValid = checkPassword(password, ADMIN_PASSWORD_HASH_ENV); }
        if (!pwValid && ADMIN_PASSWORD_ENV) { pwValid = password === ADMIN_PASSWORD_ENV; }
        if (!pwValid) {
          try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'bootstrap_bad_password' }); } catch {}
          return reply.code(401).send({ error: 'Invalid credentials' });
        }
        const hashedPw = hashPassword(password);
        const result = await sbInsert('admin_users', { email, password_hash: hashedPw, role: 'super_admin', status: 'active' });
        const newAdmin = result?.[0];
        if (!newAdmin) return reply.code(500).send({ error: 'Failed to create admin' });
        await auditLog(newAdmin.id, 'super_admin_bootstrapped', { email, ip_address: ip });
        const token = await createAdminSession(newAdmin.id, newAdmin.email, 'super_admin');
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: true }); } catch {}
        return { ok: true, token, admin: { id: newAdmin.id, email: newAdmin.email, role: 'super_admin', display_name: null } };
      }

      const admins = await sbSelect('admin_users', `select=id,email,password_hash,role,display_name,status&email=eq.${encodeURIComponent(email)}&limit=1`);
      const admin = admins?.[0];
      if (!admin) {
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'user_not_found' }); } catch {}
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      if (admin.status !== 'active') {
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'account_inactive' }); } catch {}
        return reply.code(403).send({ error: 'Account is not active' });
      }
      if (!checkPassword(password, admin.password_hash)) {
        try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: false, failure_reason: 'bad_password' }); } catch {}
        await auditLog(admin.id, 'admin_login_failed', { ip_address: ip, reason: 'bad_password' });
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      const token = await createAdminSession(admin.id, admin.email, admin.role, admin.display_name);
      try { await sbInsert('admin_login_attempts', { email, ip_address: ip, success: true }); } catch {}
      try { await sbUpdate('admin_users', { last_login_at: new Date().toISOString() }, `id=eq.${admin.id}`); } catch {}
      await auditLog(admin.id, 'admin_login_success', { ip_address: ip });
      return { ok: true, token, admin: { id: admin.id, email: admin.email, role: admin.role, display_name: admin.display_name } };
    } catch (err: any) {
      console.error('[admin/login] Error:', err.message);
      return reply.code(500).send({ error: 'Login failed: ' + err.message });
    }
  });

  app.get('/api/admin/auth/me', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    return { email: admin.email, role: admin.role, display_name: admin.display_name };
  });

  app.get('/api/admin/me', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    return { email: admin.email, role: admin.role, display_name: admin.display_name };
  });

  app.post('/api/admin/auth/logout', async (req, reply) => {
    const ah = req.headers.authorization;
    if (ah?.startsWith('Bearer ')) {
      const token = ah.slice(7);
      const tokenHash = hashSessionToken(token);
      try { await sbUpdate('admin_sessions', { revoked: true, revoked_at: new Date().toISOString() }, `session_token_hash=eq.${tokenHash}`); } catch {}
      try { await redis.del(`admin_session_v2:${tokenHash}`); } catch {}
    }
    return { ok: true };
  });

  app.post('/api/admin/logout', async (req, reply) => {
    const ah = req.headers.authorization;
    if (ah?.startsWith('Bearer ')) {
      const token = ah.slice(7);
      const tokenHash = hashSessionToken(token);
      try { await sbUpdate('admin_sessions', { revoked: true, revoked_at: new Date().toISOString() }, `session_token_hash=eq.${tokenHash}`); } catch {}
      try { await redis.del(`admin_session_v2:${tokenHash}`); } catch {}
    }
    return { ok: true };
  });

  // ── ADMIN SECRETS ────────────────────────────────────────────────
  app.get('/api/admin/secrets/history', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    const raw = await redis.get<string>('secret_audit_log');
    const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    records.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return records;
  });

  app.post('/api/admin/secrets/save', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    const body = req.body as any;
    if (!body.token_name || !body.token_type || !body.environment || !body.secret_hash) return reply.code(400).send({ error: 'Missing required fields' });
    const record = { id: randomUUID(), token_name: body.token_name, token_type: body.token_type, environment: body.environment, prefix: body.prefix || '', secret_hash: body.secret_hash, suggested_env_name: body.suggested_env_name || '', generated_by_email: admin.email, created_at: new Date().toISOString() };
    const raw = await redis.get<string>('secret_audit_log');
    const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    records.push(record);
    await redis.set('secret_audit_log', JSON.stringify(records));
    return record;
  });

  app.delete('/api/admin/secrets/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    const { id } = req.params as { id: string };
    const raw = await redis.get<string>('secret_audit_log');
    const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    const filtered = records.filter((r: any) => r.id !== id);
    if (filtered.length === records.length) return reply.code(404).send({ error: 'Record not found' });
    await redis.set('secret_audit_log', JSON.stringify(filtered));
    return { deleted: true };
  });

  // ── SCORE ADJUSTMENT & LOAN HISTORY ──────────────────────────────
  app.get('/api/score-adjust/:wallet', async (req) => {
    const { wallet } = req.params as { wallet: string };
    return { wallet, adjustment: ((await redis.get<number>(`score_adjust:${wallet}`)) || 0) as number };
  });

  app.get('/api/loan-history/:wallet', async (req) => {
    const { wallet } = req.params as { wallet: string };
    const h = (await redis.get<string>(`loan_history:${wallet}`)) || '[]';
    return typeof h === 'string' ? JSON.parse(h) : h;
  });

  // ── ADMIN DATA ROUTES ──────────────────────────────────────────────

  app.get('/api/admin/stats', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('view_admin_overview_metrics', 'limit=1');
      const m = rows?.[0] || {};
      return { totalWallets: m.unique_wallets || 0, activeLoans: m.active_loans || 0, totalBonds: m.total_bond_volume || 0, totalRevenue: 0, avgScore: Math.round(m.average_score || 0), eligibleWallets: m.eligible_wallets || 0, repaymentRate: m.total_repayments > 0 ? 100 : 0, defaultRate: 0, telegramConnected: m.telegram_connected_wallets || 0, xVerified: m.x_connected_wallets || 0, solIdentities: 0, socialCards: m.credit_cards_generated || 0 };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/wallets', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const scans = await sbSelect('wallet_scans', 'select=wallet_address,score,loan_level,eligible,portfolio_value_usd,created_at&order=created_at.desc&limit=500');
      const seen = new Set<string>(); const wallets: any[] = [];
      for (const s of (scans || [])) {
        if (!seen.has(s.wallet_address)) { seen.add(s.wallet_address); wallets.push({ address: s.wallet_address, score: s.score || 0, level: s.loan_level || 0, balance: s.portfolio_value_usd != null ? Number(s.portfolio_value_usd).toFixed(2) : null, hasActiveLoan: false, firstSeen: s.created_at }); }
      }
      return wallets;
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/loans', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('loan_events', 'select=id,wallet_address,loan_amount,loan_level,level_name,status,created_at&order=created_at.desc&limit=200');
      return (rows || []).map((r: any) => ({ id: r.id, wallet: r.wallet_address, amount: r.loan_amount || 0, level: r.loan_level || 0, status: r.status || 'pending', dueDate: null, createdAt: r.created_at }));
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/analytics', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const allScans = await sbSelect('wallet_scans', 'select=score&limit=1000');
      const scores = (allScans || []).map((s: any) => s.score || 0);
      const dist = [scores.filter((s: number) => s >= 800).length, scores.filter((s: number) => s >= 600 && s < 800).length, scores.filter((s: number) => s >= 400 && s < 600).length, scores.filter((s: number) => s >= 200 && s < 400).length, scores.filter((s: number) => s < 200).length];
      return { walletGrowth: { current: scores.length, previous: 0 }, loanVolume: { current: 0, previous: 0 }, activeUsers: { current: scores.length, previous: 0 }, avgSession: { current: 0, previous: 0 }, scoreBreakdown: dist, topActions: [], dailyLoans: [], retentionRate: 0, bounceRate: 0 };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/bonds', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('bond_events', 'select=id,wallet_address,event_type,status,metadata,created_at&order=created_at.desc&limit=200');
      return (rows || []).map((r: any) => ({ id: r.id, wallet: r.wallet_address, amount: r.metadata?.amount || 0, status: r.status || 'locked', lockDays: 30, createdAt: r.created_at }));
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/revenue', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try { return { totalRevenue: 0, interestEarned: 0, bondFees: 0, partnerFees: 0, serviceFees: 0, monthly: [], projectedAnnual: 0 }; }
    catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/partners', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('partner_events', 'select=partner,event_type,created_at&order=created_at.desc&limit=200');
      const pm = new Map<string, any>();
      for (const r of (rows || [])) { if (!pm.has(r.partner)) pm.set(r.partner, { id: r.partner, name: r.partner, type: 'Integration', volume: 0, status: 'active', eventCount: 0 }); pm.get(r.partner).eventCount++; }
      return Array.from(pm.values());
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/qvac', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const overview = await sbSelect('view_admin_overview_metrics', 'limit=1');
      const m = overview?.[0] || {};
      return { totalScored: m.unique_wallets || 0, avgScore: Math.round(m.average_score || 0), lastRun: null, modelVersion: '1.0.0' };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/social-cards', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('social_credit_cards', 'select=id,wallet_address,score,shared_to_x,created_at&order=created_at.desc&limit=200');
      return (rows || []).map((r: any) => ({ id: r.id, wallet: r.wallet_address, score: r.score || 0, shared: r.shared_to_x || false, impressions: 0 }));
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/x-verifications', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('x_verification_events', 'select=id,wallet_address,x_user_id,event_type,status,points_awarded,metadata,created_at&order=created_at.desc&limit=200');
      return (rows || []).map((r: any) => ({ id: r.id, handle: r.metadata?.x_username || r.x_user_id || 'unknown', wallet: r.wallet_address, status: r.status === 'success' ? 'verified' : r.status || 'pending', scoreBoost: r.points_awarded || 0, requestedAt: r.created_at }));
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/notifications', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('notification_events', 'select=id,wallet_address,channel,event_type,status,message,created_at&order=created_at.desc&limit=200');
      return (rows || []).map((r: any) => ({ id: r.id, title: r.event_type, body: r.message || '', channel: r.channel, audience: 'individual', sentAt: r.created_at, recipientCount: 1 }));
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.post('/api/admin/notifications/send', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    if (!['super_admin', 'admin'].includes(admin.role)) return reply.code(403).send({ error: 'Insufficient permissions' });
    const { channel, audience, title, body } = req.body as any;
    try {
      const targets = await sbSelect('wallet_profiles', 'select=wallet_address,telegram_chat_id,telegram_connected&telegram_connected=eq.true&limit=500');
      let sent = 0;
      if (channel === 'telegram' || channel === 'both') {
        for (const t of (targets || [])) { if (t.telegram_chat_id) { const ok = await sendTG(t.telegram_chat_id, `${title}\n\n${body}`); if (ok) sent++; } }
      }
      await auditLog(admin.id, 'notification_sent', { channel, audience, title, sent, total: (targets || []).length });
      return { ok: true, sent, total: (targets || []).length };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/admins', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ error: 'super_admin required' });
    try {
      const rows = await sbSelect('admin_users', 'select=id,email,display_name,role,status,last_login_at,created_at&order=created_at.asc');
      return rows || [];
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.post('/api/admin/admins', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ error: 'super_admin required' });
    const { email, password, display_name, role } = req.body as any;
    if (!email || !password) return reply.code(400).send({ error: 'email and password required' });
    try {
      const existing = await sbSelect('admin_users', `select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
      if (existing?.length) return reply.code(409).send({ error: 'Admin already exists' });
      const result = await sbInsert('admin_users', { email, password_hash: hashPassword(password), display_name: display_name || null, role: role || 'viewer', status: 'active' });
      await auditLog(admin.id, 'admin_created', { email, role: role || 'viewer' }, result?.[0]?.id);
      return { ok: true, admin: result?.[0] };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.patch('/api/admin/admins/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ error: 'super_admin required' });
    const { id } = req.params as { id: string };
    const { role, status, display_name } = req.body as any;
    const upd: any = { updated_at: new Date().toISOString() };
    if (role) upd.role = role; if (status) upd.status = status; if (display_name !== undefined) upd.display_name = display_name;
    try { await sbUpdate('admin_users', upd, `id=eq.${id}`); await auditLog(admin.id, 'admin_updated', upd, id); return { ok: true }; }
    catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.delete('/api/admin/admins/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ error: 'super_admin required' });
    const { id } = req.params as { id: string };
    if (id === admin.id) return reply.code(400).send({ error: 'Cannot delete yourself' });
    try {
      await sbUpdate('admin_users', { status: 'disabled' }, `id=eq.${id}`);
      await sbUpdate('admin_sessions', { revoked: true, revoked_at: new Date().toISOString() }, `admin_user_id=eq.${id}&revoked=eq.false`);
      await auditLog(admin.id, 'admin_removed', {}, id);
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/admin/settings', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    try {
      const rows = await sbSelect('app_settings', 'select=setting_key,setting_value&limit=100');
      const settings: any = {};
      for (const r of (rows || [])) settings[r.setting_key] = r.setting_value;
      return settings;
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.put('/api/admin/settings', async (req, reply) => {
    const admin = await verifyAdmin(req, reply); if (!admin) return;
    if (!['super_admin', 'admin'].includes(admin.role)) return reply.code(403).send({ error: 'Insufficient permissions' });
    const settings = req.body as Record<string, any>;
    try {
      for (const [key, value] of Object.entries(settings)) {
        const existing = await sbSelect('app_settings', `select=id&setting_key=eq.${encodeURIComponent(key)}&limit=1`);
        if (existing?.length) { await sbUpdate('app_settings', { setting_value: value, updated_by: admin.id, updated_at: new Date().toISOString() }, `setting_key=eq.${encodeURIComponent(key)}`); }
        else { await sbInsert('app_settings', { setting_key: key, setting_value: value, updated_by: admin.id }); }
      }
      await auditLog(admin.id, 'settings_updated', { keys: Object.keys(settings) });
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── ADMIN TELEGRAM ────────────────────────────────────────────
  app.get('/api/admin/telegram', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try {
      const profiles = await sbSelect('wallet_profiles', 'select=wallet_address,telegram_username,telegram_chat_id,telegram_connected,telegram_connected_at,telegram_alerts_enabled&telegram_connected=eq.true&order=telegram_connected_at.desc&limit=200');
      const events = await sbSelect('notification_events', 'select=id,wallet_address,event_type,status,created_at&channel=eq.telegram&order=created_at.desc&limit=50');
      return { ok: true, connectedWallets: profiles || [], recentEvents: events || [] };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── ADMIN POOL ──────────────────────────────────────────────
  app.get('/api/admin/pool', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try {
      const pool = await sbSelect('credit_pool_state', 'select=*&limit=1');
      return { ok: true, pool: pool?.[0] || { pool_live: false, pool_paused: false, pool_mode: 'simulation', available_liquidity: 0 } };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.patch('/api/admin/pool', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    if (admin.role !== 'super_admin') return reply.code(403).send({ error: 'super_admin required' });
    const updates = req.body as any;
    try {
      const pool = await sbSelect('credit_pool_state', 'select=id&limit=1');
      if (pool?.[0]) { await sbUpdate('credit_pool_state', { ...updates, updated_at: new Date().toISOString() }, `id=eq.${pool[0].id}`); }
      else { await sbInsert('credit_pool_state', { ...updates, updated_at: new Date().toISOString() }); }
      await auditLog(admin.id, 'pool_state_updated', updates);
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── ADMIN SYSTEM STATUS ─────────────────────────────────────
  app.get('/api/admin/system', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const status: any = {};
    status.supabase = { configured: supabaseConfigured };
    status.service_role = { configured: !!SUPABASE_SERVICE_KEY };
    status.redis = { configured: !!(redisUrl && redisToken) };
    try { await redis.ping(); status.redis.connected = true; } catch { status.redis.connected = false; }
    status.telegram = { configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_WEBHOOK_SECRET), bot_username: TELEGRAM_BOT_USERNAME || null };
    status.x_oauth = { configured: !!(X_CLIENT_ID && X_CLIENT_SECRET) };
    status.quicknode = { configured: !!getQuicknodeHttpUrl(), webhook_configured: !!QUICKNODE_WEBHOOK_SECRET };
    return { ok: true, ...status };
  });

  // ── DEVNET RPC PROXY ──────────────────────────────────────────
  app.post('/api/quicknode/rpc/solana-devnet', async (req, reply) => {
    const devnetUrl = process.env.QUICKNODE_DEVNET_HTTP_URL;
    if (!devnetUrl) {
      return reply.code(500).send({
        ok: false,
        stage: 'rpc_config',
        error: 'Devnet HTTP Solana RPC endpoint is required. Set QUICKNODE_DEVNET_HTTP_URL.',
      });
    }
    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const upstream = await fetch(devnetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!upstream.ok) {
        await upstream.text().catch(() => '');
        return reply.code(502).send({ ok: false, stage: 'rpc_fetch', error: `Devnet RPC request failed (${upstream.status})` });
      }
      const data = await upstream.json();
      return data;
    } catch (err: any) {
      return reply.code(500).send({ ok: false, stage: 'rpc_fetch', error: 'Devnet RPC request failed', details: err.message });
    }
  });

  // ── PRIVACY / PRIVATE MODE (Encrypt) ──────────────────────────
  app.post('/api/privacy/private-mode', async (req, reply) => {
    const { wallet_address, enabled, tx_signature, memo } = req.body as any;
    if (!wallet_address) return reply.code(400).send({ error: 'wallet_address required' });
    try {
      await sbInsert('partner_events', {
        wallet_address,
        partner: 'encrypt',
        event_type: enabled ? 'private_mode_enabled' : 'private_mode_disabled',
        metadata: { txSignature: tx_signature || null, memo: memo || null, timestamp: Date.now() },
      });
      try {
        await sbUpsert('wallet_profiles', { wallet_address, encrypt_private_mode: !!enabled });
      } catch { /* profile table may not have column yet */ }
      return { ok: true, tx_signature };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── CROSS-CHAIN CONNECT (Ika) ─────────────────────────────────
  app.post('/api/cross-chain/connect', async (req, reply) => {
    const { wallet_address, chain, external_address, tx_signature, analysis } = req.body as any;
    if (!wallet_address || !chain || !external_address) {
      return reply.code(400).send({ error: 'wallet_address, chain, and external_address required' });
    }
    try {
      await sbInsert('partner_events', {
        wallet_address,
        partner: 'ika',
        event_type: 'cross_chain_bind',
        metadata: { ...(analysis || {}), chain, address: external_address, txSignature: tx_signature || null, timestamp: Date.now() },
      });
      try {
        await sbUpsert('wallet_profiles', { wallet_address, ika_connected: true });
      } catch { /* ignore */ }
      return { ok: true, tx_signature };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── ADMIN INTEGRATION METRICS ─────────────────────────────────
  app.get('/api/admin/integrations', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try {
      const encryptEvents = await sbSelect('partner_events', 'select=id,event_type,wallet_address,metadata,created_at&partner=eq.encrypt&order=created_at.desc&limit=200');
      const ikaEvents = await sbSelect('partner_events', 'select=id,event_type,wallet_address,metadata,created_at&partner=eq.ika&order=created_at.desc&limit=200');

      const encryptEnabled = (encryptEvents || []).filter((e: any) => e.event_type === 'private_mode_enabled');
      const encryptDisabled = (encryptEvents || []).filter((e: any) => e.event_type === 'private_mode_disabled');
      const encryptWallets = new Set(encryptEnabled.map((e: any) => e.wallet_address));
      const disabledWallets = new Set(encryptDisabled.map((e: any) => e.wallet_address));
      const currentlyActive = [...encryptWallets].filter((w) => !disabledWallets.has(w)).length;
      const encryptWithTx = encryptEnabled.filter((e: any) => e.metadata?.txSignature && !e.metadata.txSignature.startsWith('encrypt_'));

      const ikaBindings = (ikaEvents || []).filter((e: any) => e.event_type === 'cross_chain_bind');
      const ikaWallets = new Set(ikaBindings.map((e: any) => e.wallet_address));
      const ikaWithTx = ikaBindings.filter((e: any) => e.metadata?.txSignature && !e.metadata.txSignature.startsWith('ika_'));
      const ethBindings = ikaBindings.filter((e: any) => (e.metadata?.chain || '').toUpperCase() === 'ETH');
      const btcBindings = ikaBindings.filter((e: any) => (e.metadata?.chain || '').toUpperCase() === 'BTC');

      const allEvents = [...(encryptEvents || []), ...(ikaEvents || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        ok: true,
        encrypt: {
          totalEnabled: encryptEnabled.length,
          currentlyActive,
          uniqueWallets: encryptWallets.size,
          onChainTxCount: encryptWithTx.length,
        },
        ika: {
          totalBindings: ikaBindings.length,
          activeChains: new Set(ikaBindings.map((e: any) => e.metadata?.chain)).size,
          uniqueWallets: ikaWallets.size,
          onChainTxCount: ikaWithTx.length,
          ethCount: ethBindings.length,
          btcCount: btcBindings.length,
        },
        recentEvents: allEvents.slice(0, 50).map((e: any) => ({
          id: e.id,
          partner: (encryptEvents || []).includes(e) ? 'encrypt' : 'ika',
          event_type: e.event_type,
          wallet_address: e.wallet_address,
          metadata: e.metadata,
          created_at: e.created_at,
        })),
      };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ═══ BLOG CMS API + SSR ═══════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════

  // ── Admin Blog CRUD ──────────────────────────────────────────────────

  // List all posts (admin)
  app.get('/api/admin/blog/posts', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try {
      const posts = await sbSelect('blog_posts', 'select=*,blog_authors(name,slug),blog_categories(name,slug,color)&order=updated_at.desc');
      return { posts };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Get single post (admin)
  app.get('/api/admin/blog/posts/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    try {
      const posts = await sbSelect('blog_posts', `id=eq.${id}&select=*,blog_authors(name,slug),blog_categories(name,slug,color)`);
      if (!posts?.length) return reply.code(404).send({ error: 'Post not found' });
      const tags = await sbSelect('blog_post_tags', `post_id=eq.${id}&select=tag_id,blog_tags(id,name,slug)`);
      return { post: posts[0], tags: tags?.map((t: any) => t.blog_tags) || [] };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Create post
  app.post('/api/admin/blog/posts', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const body = req.body as any;
    try {
      const slug = body.slug || body.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const wordCount = (body.content_md || body.content_markdown || '').split(/\s+/).filter(Boolean).length;
      const readTime = Math.max(1, Math.round(wordCount / 250));
      // Author role cannot publish — force draft
      const requestedStatus = body.status || 'draft';
      const allowedStatus = (requestedStatus === 'published' && !['super_admin', 'admin'].includes(admin.role))
        ? 'draft'
        : requestedStatus;
      const postData = {
        title: body.title,
        slug,
        excerpt: body.excerpt || '',
        content_html: body.content_html || '',
        content_md: body.content_md || body.content_markdown || '',
        author_id: body.author_id || null,
        category_id: body.category_id || null,
        status: allowedStatus,
        is_featured: body.is_featured || false,
        cover_image_url: body.cover_image_url || null,
        cover_image_alt: body.cover_image_alt || null,
        cover_image_caption: body.cover_image_caption || null,
        og_image_url: body.og_image_url || null,
        og_image_alt: body.og_image_alt || null,
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
        canonical_url: body.canonical_url || null,
        quick_answer: body.quick_answer || null,
        faq_items: body.faq_items || body.faq_json || [],
        word_count: wordCount,
        read_time_minutes: readTime,
        published_at: body.status === 'published' ? (body.published_at || new Date().toISOString()) : null,
      };
      const result = await sbInsert('blog_posts', postData);
      const post = Array.isArray(result) ? result[0] : result;
      // Handle tags
      if (body.tag_ids?.length && post?.id) {
        const tagRows = body.tag_ids.map((tid: string) => ({ post_id: post.id, tag_id: tid }));
        await sbInsert('blog_post_tags', tagRows);
      }
      return { post };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Update post
  app.put('/api/admin/blog/posts/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const body = req.body as any;
    try {
      // Author role cannot publish
      if (body.status === 'published' && !['super_admin', 'admin'].includes(admin.role)) {
        body.status = 'draft';
      }
      const wordCount = (body.content_md || body.content_markdown || '').split(/\s+/).filter(Boolean).length;
      const readTime = Math.max(1, Math.round(wordCount / 250));
      const updateData: any = {
        updated_at: new Date().toISOString(),
        word_count: wordCount,
        read_time_minutes: readTime,
      };
      const fields = ['title', 'slug', 'excerpt', 'content_html', 'content_md', 'author_id', 'category_id',
        'status', 'is_featured', 'cover_image_url', 'cover_image_alt', 'cover_image_caption',
        'og_image_url', 'og_image_alt', 'meta_title', 'meta_description', 'canonical_url',
        'quick_answer', 'faq_items', 'published_at'];
      for (const f of fields) {
        if (body[f] !== undefined) updateData[f] = body[f];
      }
      if (body.status === 'published' && !updateData.published_at) {
        updateData.published_at = new Date().toISOString();
      }
      const result = await sbUpdate('blog_posts', updateData, `id=eq.${id}`);
      // Sync tags
      if (body.tag_ids !== undefined) {
        await sbFetch(`blog_post_tags?post_id=eq.${id}`, { method: 'DELETE' });
        if (body.tag_ids.length) {
          const tagRows = body.tag_ids.map((tid: string) => ({ post_id: id, tag_id: tid }));
          await sbInsert('blog_post_tags', tagRows);
        }
      }
      return { post: Array.isArray(result) ? result[0] : result };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Delete post
  app.delete('/api/admin/blog/posts/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    try {
      await sbFetch(`blog_post_tags?post_id=eq.${id}`, { method: 'DELETE' });
      await sbFetch(`blog_posts?id=eq.${id}`, { method: 'DELETE' });
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // List authors
  app.get('/api/admin/blog/authors', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try { return { authors: await sbSelect('blog_authors', 'order=name.asc') }; }
    catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // CRUD authors
  app.post('/api/admin/blog/authors', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const body = req.body as any;
    try {
      const slug = body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const result = await sbInsert('blog_authors', { ...body, slug });
      return { author: Array.isArray(result) ? result[0] : result };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // List categories
  app.get('/api/admin/blog/categories', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try { return { categories: await sbSelect('blog_categories', 'order=sort_order.asc') }; }
    catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Create category
  app.post('/api/admin/blog/categories', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const body = req.body as any;
    if (!body?.name?.trim()) return reply.code(400).send({ error: 'name is required' });
    try {
      const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const row = { name: body.name.trim(), slug, color: body.color || '#EC81FF', description: body.description || null, sort_order: body.sort_order ?? 0 };
      const result = await sbInsert('blog_categories', row);
      const category = Array.isArray(result) ? result[0] : result;
      await auditLog(admin.id, 'blog_category_create', { name: category.name });
      return { category };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Update category
  app.put('/api/admin/blog/categories/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const body = req.body as any;
    try {
      const updates: any = {};
      if (body.name) { updates.name = body.name.trim(); updates.slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
      if (body.color) updates.color = body.color;
      if (body.description !== undefined) updates.description = body.description;
      if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
      const result = await sbUpdate('blog_categories', updates, `id=eq.${id}`);
      const category = Array.isArray(result) ? result[0] : result;
      return { category };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Delete category
  app.delete('/api/admin/blog/categories/:id', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    if (!['super_admin', 'admin'].includes(admin.role)) return reply.code(403).send({ error: 'Forbidden' });
    const { id } = req.params as { id: string };
    try {
      await sbFetch(`blog_categories?id=eq.${id}`, { method: 'DELETE' });
      await auditLog(admin.id, 'blog_category_delete', { id });
      return { ok: true };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Media upload (base64 → Supabase Storage → media_assets record)
  app.post('/api/admin/blog/media/upload', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const body = req.body as any;
    const { base64, filename, bucket, mime_type, file_size_bytes, width, height, alt_text } = body || {};
    if (!base64 || !filename || !bucket) return reply.code(400).send({ error: 'base64, filename, and bucket are required' });
    if (!supabaseConfigured) return reply.code(503).send({ error: 'Supabase not configured' });

    const allowedBuckets = ['blog-covers', 'blog-og', 'blog-inline'];
    if (!allowedBuckets.includes(bucket)) return reply.code(400).send({ error: 'Invalid bucket name' });

    try {
      // Decode base64
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 8 * 1024 * 1024) return reply.code(400).send({ error: 'File too large (max 8 MB)' });

      const ext = filename.endsWith('.webp') ? '.webp' : filename.replace(/.*\./, '.');
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const storagePath = `${uniqueName}`;
      const contentType = mime_type || 'image/webp';

      // Upload to Supabase Storage
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: buffer,
      });
      if (!uploadRes.ok) {
        const errBody = await uploadRes.text().catch(() => '');
        throw new Error(`Storage upload failed (${uploadRes.status}): ${errBody}`);
      }

      // Build public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;

      // Insert into media_assets
      const assetRow = {
        filename,
        storage_path: storagePath,
        bucket,
        url: publicUrl,
        alt_text: alt_text || '',
        mime_type: contentType,
        file_size_bytes: file_size_bytes || buffer.length,
        width: width || null,
        height: height || null,
        uploaded_by: admin.email,
      };
      const inserted = await sbInsert('media_assets', assetRow);
      const asset = Array.isArray(inserted) ? inserted[0] : inserted;

      return { url: publicUrl, asset };
    } catch (e: any) {
      console.error('[blog/media/upload] Error:', e.message);
      return reply.code(500).send({ error: e.message });
    }
  });

  // List tags
  app.get('/api/admin/blog/tags', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    try { return { tags: await sbSelect('blog_tags', 'order=name.asc') }; }
    catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // Create tag
  app.post('/api/admin/blog/tags', async (req, reply) => {
    const admin = await verifyAdmin(req, reply);
    if (!admin) return;
    const body = req.body as any;
    try {
      const slug = body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const result = await sbInsert('blog_tags', { name: body.name, slug });
      return { tag: Array.isArray(result) ? result[0] : result };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── Public Blog API ──────────────────────────────────────────────────

  app.get('/api/blog/posts', async (req, reply) => {
    const qs = req.query as any;
    const limit = Math.min(parseInt(qs.limit) || 20, 100);
    const offset = parseInt(qs.offset) || 0;
    const category = qs.category || '';
    const tag = qs.tag || '';
    try {
      let query = `status=eq.published&order=published_at.desc&limit=${limit}&offset=${offset}&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,is_featured,blog_authors(name,slug),blog_categories(name,slug,color)`;
      if (category) query += `&blog_categories.slug=eq.${category}`;
      const posts = await sbSelect('blog_posts', query);
      // If tag filter, we need to join through post_tags
      if (tag) {
        const tagRows = await sbSelect('blog_tags', `slug=eq.${tag}&select=id`);
        if (tagRows?.length) {
          const postTags = await sbSelect('blog_post_tags', `tag_id=eq.${tagRows[0].id}&select=post_id`);
          const postIds = new Set(postTags?.map((pt: any) => pt.post_id) || []);
          return { posts: (posts || []).filter((p: any) => postIds.has(p.id)) };
        }
        return { posts: [] };
      }
      return { posts: posts || [] };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/blog/posts/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    try {
      const posts = await sbSelect('blog_posts', `slug=eq.${slug}&status=eq.published&select=*,blog_authors(name,slug,bio,avatar_url,x_handle),blog_categories(name,slug,color)`);
      if (!posts?.length) return reply.code(404).send({ error: 'Post not found' });
      const post = posts[0];
      const tags = await sbSelect('blog_post_tags', `post_id=eq.${post.id}&select=blog_tags(name,slug)`);
      return { post, tags: tags?.map((t: any) => t.blog_tags) || [] };
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  app.get('/api/blog/categories', async (_req, reply) => {
    try { return { categories: await sbSelect('blog_categories', 'order=sort_order.asc') }; }
    catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // ── Blog SSR (SEO-friendly server-rendered pages) ────────────────────

  function blogHtmlShell(title: string, description: string, ogImage: string, canonicalPath: string, bodyContent: string, schemaJson?: string) {
    const fullUrl = `${APP_URL}${canonicalPath}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}" />
<link rel="canonical" href="${fullUrl}" />

<!-- Open Graph -->
<meta property="og:type" content="article" />
<meta property="og:title" content="${escHtml(title)}" />
<meta property="og:description" content="${escHtml(description)}" />
<meta property="og:url" content="${fullUrl}" />
${ogImage ? `<meta property="og:image" content="${escHtml(ogImage)}" />` : ''}
<meta property="og:site_name" content="Lendra" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escHtml(title)}" />
<meta name="twitter:description" content="${escHtml(description)}" />
${ogImage ? `<meta name="twitter:image" content="${escHtml(ogImage)}" />` : ''}
<meta name="twitter:site" content="@lendrafinance" />

<link rel="icon" href="${APP_URL}/favicon.ico" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

${schemaJson ? `<script type="application/ld+json">${schemaJson}</script>` : ''}

<style>
  :root { --brand-bg: #0A0A0F; --brand-accent: #EC81FF; --brand-card: #12121A; --brand-border: #1E1E2A; --brand-text: #E0E0E8; --brand-muted: #ADADB5; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; background: var(--brand-bg); color: var(--brand-text); -webkit-font-smoothing: antialiased; }
  a { color: var(--brand-accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .blog-header { position:sticky; top:0; z-index:50; background:rgba(10,10,15,0.85); backdrop-filter:blur(12px); border-bottom:1px solid var(--brand-border); }
  .blog-header-inner { max-width:1200px; margin:0 auto; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; }
  .blog-header-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
  .blog-header-logo img { width:32px; height:32px; border-radius:8px; }
  .blog-header-logo span { font-weight:700; font-size:18px; color:#fff; }
  .blog-header-logo small { font-size:13px; color:var(--brand-muted); margin-left:4px; font-weight:400; }
  .blog-nav { display:flex; gap:20px; align-items:center; }
  .blog-nav a { color:var(--brand-muted); font-size:14px; font-weight:500; transition:color 0.15s; }
  .blog-nav a:hover { color:#fff; text-decoration:none; }
  .btn-app { background:var(--brand-accent); color:#fff; padding:8px 20px; border-radius:10px; font-weight:600; font-size:13px; display:inline-flex; }
  .btn-app:hover { opacity:0.9; text-decoration:none; }

  .blog-container { max-width:800px; margin:0 auto; padding:40px 24px 80px; }
  .blog-list-container { max-width:1200px; margin:0 auto; padding:40px 24px 80px; }

  .blog-hero { text-align:center; margin-bottom:48px; }
  .blog-hero h1 { font-size:40px; font-weight:800; letter-spacing:-0.03em; margin-bottom:12px; background:linear-gradient(135deg,#fff 0%,var(--brand-accent) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .blog-hero p { color:var(--brand-muted); font-size:17px; max-width:600px; margin:0 auto; }

  .posts-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:24px; }
  .post-card { background:var(--brand-card); border:1px solid var(--brand-border); border-radius:16px; overflow:hidden; transition:border-color 0.2s, transform 0.2s; }
  .post-card:hover { border-color:rgba(236,129,255,0.3); transform:translateY(-2px); }
  .post-card a { text-decoration:none; color:inherit; }
  .post-card-img { width:100%; height:200px; object-fit:cover; background:var(--brand-border); }
  .post-card-body { padding:20px; }
  .post-card-meta { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:12px; color:var(--brand-muted); }
  .post-card-cat { display:inline-block; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:600; }
  .post-card h2 { font-size:18px; font-weight:700; color:#fff; margin-bottom:8px; line-height:1.35; }
  .post-card p { font-size:14px; color:var(--brand-muted); line-height:1.6; }

  .article-header { margin-bottom:32px; }
  .article-cat { display:inline-block; padding:3px 12px; border-radius:999px; font-size:12px; font-weight:600; margin-bottom:16px; }
  .article-header h1 { font-size:36px; font-weight:800; color:#fff; line-height:1.2; letter-spacing:-0.02em; margin-bottom:16px; }
  .article-meta { display:flex; align-items:center; gap:12px; color:var(--brand-muted); font-size:14px; flex-wrap:wrap; }
  .article-meta .dot { width:4px; height:4px; border-radius:50%; background:var(--brand-muted); }

  .article-cover { width:100%; border-radius:16px; margin-bottom:32px; max-height:450px; object-fit:cover; }

  .article-body { font-size:17px; line-height:1.8; color:var(--brand-text); }
  .article-body h2 { font-size:26px; font-weight:700; color:#fff; margin:40px 0 16px; }
  .article-body h3 { font-size:20px; font-weight:600; color:#fff; margin:32px 0 12px; }
  .article-body p { margin-bottom:20px; }
  .article-body ul, .article-body ol { margin:0 0 20px 24px; }
  .article-body li { margin-bottom:8px; }
  .article-body blockquote { border-left:3px solid var(--brand-accent); padding:12px 20px; margin:24px 0; background:rgba(236,129,255,0.05); border-radius:0 8px 8px 0; font-style:italic; color:var(--brand-muted); }
  .article-body code { background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-size:0.9em; }
  .article-body pre { background:#0D0D18; border:1px solid var(--brand-border); border-radius:12px; padding:20px; overflow-x:auto; margin:24px 0; }
  .article-body pre code { background:none; padding:0; }
  .article-body img { max-width:100%; border-radius:12px; margin:24px 0; }
  .article-body a { color:var(--brand-accent); text-decoration:underline; }

  .article-tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:32px; padding-top:24px; border-top:1px solid var(--brand-border); }
  .article-tag { background:rgba(236,129,255,0.08); color:var(--brand-accent); padding:4px 12px; border-radius:999px; font-size:12px; font-weight:500; }

  .faq-section { margin-top:48px; padding-top:32px; border-top:1px solid var(--brand-border); }
  .faq-section h2 { font-size:24px; font-weight:700; color:#fff; margin-bottom:20px; }
  .faq-item { margin-bottom:16px; background:var(--brand-card); border:1px solid var(--brand-border); border-radius:12px; padding:16px 20px; }
  .faq-item h3 { font-size:15px; font-weight:600; color:#fff; margin-bottom:8px; }
  .faq-item p { font-size:14px; color:var(--brand-muted); line-height:1.6; }

  .blog-footer { border-top:1px solid var(--brand-border); padding:32px 24px; text-align:center; color:var(--brand-muted); font-size:13px; }

  @media (max-width:640px) {
    .blog-hero h1 { font-size:28px; }
    .posts-grid { grid-template-columns:1fr; }
    .article-header h1 { font-size:26px; }
    .article-body { font-size:16px; }
  }
</style>
</head>
<body>
  <header class="blog-header">
    <div class="blog-header-inner">
      <a href="${APP_URL}/blog" class="blog-header-logo">
        <img src="${APP_URL}/assets/lender-logo5x.png" alt="Lendra" />
        <span>Lendra</span>
        <small>Blog</small>
      </a>
      <nav class="blog-nav">
        <a href="${APP_URL}/blog">Articles</a>
        <a href="${APP_URL}" class="btn-app">Launch App</a>
      </nav>
    </div>
  </header>
  ${bodyContent}
  <footer class="blog-footer">
    <p>&copy; ${new Date().getFullYear()} Lendra Finance. Your wallet is your credit score.</p>
  </footer>
</body>
</html>`;
  }

  function escHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(d: string): string {
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d; }
  }

  // SSR: Blog listing page
  app.get('/blog', async (_req, reply) => {
    try {
      const posts = await sbSelect('blog_posts', 'status=eq.published&order=published_at.desc&limit=50&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,is_featured,blog_authors(name),blog_categories(name,slug,color)');
      const categories = await sbSelect('blog_categories', 'order=sort_order.asc');

      let cardsHtml = '';
      for (const p of (posts || [])) {
        const cat = p.blog_categories;
        const catBadge = cat ? `<span class="post-card-cat" style="background:${cat.color}20;color:${cat.color}">${escHtml(cat.name)}</span>` : '';
        const imgHtml = p.cover_image_url ? `<img class="post-card-img" src="${escHtml(p.cover_image_url)}" alt="${escHtml(p.cover_image_alt || p.title)}" loading="lazy" />` : `<div class="post-card-img" style="background:linear-gradient(135deg,#12121A,#1a1a2e)"></div>`;
        cardsHtml += `<article class="post-card"><a href="${APP_URL}/blog/${escHtml(p.slug)}">${imgHtml}<div class="post-card-body"><div class="post-card-meta">${catBadge}<span>${formatDate(p.published_at)}</span><span>&middot;</span><span>${p.read_time_minutes} min read</span></div><h2>${escHtml(p.title)}</h2>${p.excerpt ? `<p>${escHtml(p.excerpt)}</p>` : ''}</div></a></article>`;
      }

      if (!cardsHtml) {
        cardsHtml = '<div style="text-align:center;padding:60px 20px;color:var(--brand-muted)"><p style="font-size:18px;margin-bottom:8px">No articles yet</p><p>Check back soon for insights on DeFi credit scoring, Solana, and protocol updates.</p></div>';
      }

      const bodyContent = `<div class="blog-list-container"><div class="blog-hero"><h1>Lendra Blog</h1><p>Protocol updates, DeFi research, and engineering deep dives from the Lendra team.</p></div><div class="posts-grid">${cardsHtml}</div></div>`;

      const html = blogHtmlShell(
        'Lendra Blog — DeFi Credit Protocol Insights',
        'Protocol updates, DeFi research, and engineering deep dives from the Lendra team. Your wallet is your credit score.',
        '',
        '/blog',
        bodyContent
      );
      reply.type('text/html').send(html);
    } catch (e: any) {
      reply.code(500).type('text/html').send(`<h1>Error</h1><p>${escHtml(e.message)}</p>`);
    }
  });

  // SSR: Single blog post — MUST be registered AFTER /blog/category/:c and /blog/tag/:t
  app.get('/blog/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    try {
      const posts = await sbSelect('blog_posts', `slug=eq.${slug}&status=eq.published&select=*,blog_authors(name,slug,bio,avatar_url,x_handle),blog_categories(name,slug,color)`);
      if (!posts?.length) {
        return reply.code(404).type('text/html').send(blogHtmlShell('Not Found — Lendra Blog', 'Article not found.', '', `/blog/${slug}`, '<div class="blog-container" style="text-align:center;padding:80px 20px"><h1 style="font-size:32px;color:#fff;margin-bottom:12px">Article not found</h1><p style="color:var(--brand-muted)">This article may have been moved or deleted.</p><p style="margin-top:20px"><a href="' + APP_URL + '/blog">Back to Blog</a></p></div>'));
      }
      const post = posts[0];
      const tagRows = await sbSelect('blog_post_tags', `post_id=eq.${post.id}&select=blog_tags(name,slug)`);
      const tags = tagRows?.map((t: any) => t.blog_tags).filter(Boolean) || [];
      const author = post.blog_authors;
      const cat = post.blog_categories;

      // Build article body
      let articleHtml = '<div class="article-header">';
      if (cat) articleHtml += `<span class="article-cat" style="background:${cat.color}20;color:${cat.color}">${escHtml(cat.name)}</span>`;
      articleHtml += `<h1>${escHtml(post.meta_title || post.title)}</h1>`;
      articleHtml += '<div class="article-meta">';
      if (author) articleHtml += `<span>By ${escHtml(author.name)}</span>`;
      if (post.published_at) articleHtml += `<span class="dot"></span><span>${formatDate(post.published_at)}</span>`;
      articleHtml += `<span class="dot"></span><span>${post.read_time_minutes} min read</span>`;
      articleHtml += '</div></div>';

      if (post.cover_image_url) {
        articleHtml += `<img class="article-cover" src="${escHtml(post.cover_image_url)}" alt="${escHtml(post.cover_image_alt || post.title)}" />`;
      }

      // Quick answer box
      if (post.quick_answer) {
        articleHtml += `<div style="background:rgba(236,129,255,0.06);border:1px solid rgba(236,129,255,0.15);border-radius:12px;padding:16px 20px;margin-bottom:32px"><p style="font-size:13px;font-weight:600;color:var(--brand-accent);margin-bottom:6px">Quick Answer</p><p style="font-size:15px;color:var(--brand-text);line-height:1.6">${escHtml(post.quick_answer)}</p></div>`;
      }

      articleHtml += `<div class="article-body">${post.content_html}</div>`;

      // Tags
      if (tags.length) {
        articleHtml += '<div class="article-tags">';
        for (const tag of tags) articleHtml += `<span class="article-tag">#${escHtml(tag.name)}</span>`;
        articleHtml += '</div>';
      }

      // FAQ
      const faqs = post.faq_items || [];
      if (faqs.length) {
        articleHtml += '<div class="faq-section"><h2>Frequently Asked Questions</h2>';
        for (const faq of faqs) {
          articleHtml += `<div class="faq-item"><h3>${escHtml(faq.question || '')}</h3><p>${escHtml(faq.answer || '')}</p></div>`;
        }
        articleHtml += '</div>';
      }

      // Schema.org
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.meta_title || post.title,
        description: post.meta_description || post.excerpt || '',
        image: post.og_image_url || post.cover_image_url || '',
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: author ? { '@type': 'Person', name: author.name } : undefined,
        publisher: { '@type': 'Organization', name: 'Lendra Finance', url: APP_URL },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${APP_URL}/blog/${post.slug}` },
      };
      const faqSchema = faqs.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f: any) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      } : null;

      const schemaJsonStr = JSON.stringify(schema) + (faqSchema ? `</script><script type="application/ld+json">${JSON.stringify(faqSchema)}` : '');

      const html = blogHtmlShell(
        (post.meta_title || post.title) + ' — Lendra Blog',
        post.meta_description || post.excerpt || '',
        post.og_image_url || post.cover_image_url || '',
        `/blog/${post.slug}`,
        `<div class="blog-container">${articleHtml}</div>`,
        schemaJsonStr
      );
      reply.type('text/html').send(html);
    } catch (e: any) {
      reply.code(500).type('text/html').send(`<h1>Error</h1><p>${escHtml(e.message)}</p>`);
    }
  });

  // SSR: Blog by category
  app.get('/blog/category/:category', async (req, reply) => {
    const { category } = req.params as { category: string };
    try {
      const categories = await sbSelect('blog_categories', 'order=sort_order.asc');
      const cat = (categories || []).find((c: any) => c.slug === category);
      if (!cat) {
        return reply.code(404).type('text/html').send(blogHtmlShell('Not Found — Lendra Blog', 'Category not found.', '', `/blog/category/${category}`, '<div class="blog-container" style="text-align:center;padding:80px 20px"><h1 style="font-size:32px;color:#fff;margin-bottom:12px">Category not found</h1><p style="color:var(--brand-muted)">This category does not exist.</p><p style="margin-top:20px"><a href="' + APP_URL + '/blog">Back to Blog</a></p></div>'));
      }

      const posts = await sbSelect('blog_posts', `status=eq.published&category_id=eq.${cat.id}&order=published_at.desc&limit=50&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,is_featured,blog_authors(name),blog_categories(name,slug,color)`);

      let cardsHtml = '';
      for (const p of (posts || [])) {
        const pCat = p.blog_categories;
        const catBadge = pCat ? `<span class="post-card-cat" style="background:${pCat.color}20;color:${pCat.color}">${escHtml(pCat.name)}</span>` : '';
        const imgHtml = p.cover_image_url ? `<img class="post-card-img" src="${escHtml(p.cover_image_url)}" alt="${escHtml(p.cover_image_alt || p.title)}" loading="lazy" />` : `<div class="post-card-img" style="background:linear-gradient(135deg,#12121A,#1a1a2e)"></div>`;
        cardsHtml += `<article class="post-card"><a href="${APP_URL}/blog/${escHtml(p.slug)}">${imgHtml}<div class="post-card-body"><div class="post-card-meta">${catBadge}<span>${formatDate(p.published_at)}</span><span>&middot;</span><span>${p.read_time_minutes} min read</span></div><h2>${escHtml(p.title)}</h2>${p.excerpt ? `<p>${escHtml(p.excerpt)}</p>` : ''}</div></a></article>`;
      }
      if (!cardsHtml) {
        cardsHtml = '<div style="text-align:center;padding:60px 20px;color:var(--brand-muted)"><p style="font-size:18px;margin-bottom:8px">No articles in this category yet</p><p>Check back soon.</p></div>';
      }
      const bodyContent = `<div class="blog-list-container"><div class="blog-hero"><h1>${escHtml(cat.name)}</h1><p>${escHtml(cat.description || `Articles about ${cat.name} from the Lendra team.`)}</p></div><div class="posts-grid">${cardsHtml}</div></div>`;
      const html = blogHtmlShell(`${cat.name} — Lendra Blog`, cat.description || `${cat.name} articles from Lendra.`, '', `/blog/category/${category}`, bodyContent);
      reply.type('text/html').send(html);
    } catch (e: any) {
      reply.code(500).type('text/html').send(`<h1>Error</h1><p>${escHtml(e.message)}</p>`);
    }
  });

  // SSR: Blog by tag
  app.get('/blog/tag/:tag', async (req, reply) => {
    const { tag } = req.params as { tag: string };
    try {
      const tagRows = await sbSelect('blog_tags', `slug=eq.${tag}&select=id,name,slug&limit=1`);
      const tagObj = tagRows?.[0];
      if (!tagObj) {
        return reply.code(404).type('text/html').send(blogHtmlShell('Not Found — Lendra Blog', 'Tag not found.', '', `/blog/tag/${tag}`, '<div class="blog-container" style="text-align:center;padding:80px 20px"><h1 style="font-size:32px;color:#fff;margin-bottom:12px">Tag not found</h1><p style="color:var(--brand-muted)">This tag does not exist.</p><p style="margin-top:20px"><a href="' + APP_URL + '/blog">Back to Blog</a></p></div>'));
      }

      const postTags = await sbSelect('blog_post_tags', `tag_id=eq.${tagObj.id}&select=post_id`);
      const postIds = (postTags || []).map((pt: any) => pt.post_id);

      let posts: any[] = [];
      if (postIds.length > 0) {
        posts = await sbSelect('blog_posts', `status=eq.published&id=in.(${postIds.join(',')})&order=published_at.desc&limit=50&select=id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,read_time_minutes,is_featured,blog_authors(name),blog_categories(name,slug,color)`) || [];
      }

      let cardsHtml = '';
      for (const p of posts) {
        const cat = p.blog_categories;
        const catBadge = cat ? `<span class="post-card-cat" style="background:${cat.color}20;color:${cat.color}">${escHtml(cat.name)}</span>` : '';
        const imgHtml = p.cover_image_url ? `<img class="post-card-img" src="${escHtml(p.cover_image_url)}" alt="${escHtml(p.cover_image_alt || p.title)}" loading="lazy" />` : `<div class="post-card-img" style="background:linear-gradient(135deg,#12121A,#1a1a2e)"></div>`;
        cardsHtml += `<article class="post-card"><a href="${APP_URL}/blog/${escHtml(p.slug)}">${imgHtml}<div class="post-card-body"><div class="post-card-meta">${catBadge}<span>${formatDate(p.published_at)}</span><span>&middot;</span><span>${p.read_time_minutes} min read</span></div><h2>${escHtml(p.title)}</h2>${p.excerpt ? `<p>${escHtml(p.excerpt)}</p>` : ''}</div></a></article>`;
      }
      if (!cardsHtml) {
        cardsHtml = '<div style="text-align:center;padding:60px 20px;color:var(--brand-muted)"><p style="font-size:18px;margin-bottom:8px">No articles with this tag yet</p><p>Check back soon.</p></div>';
      }
      const bodyContent = `<div class="blog-list-container"><div class="blog-hero"><h1>#${escHtml(tagObj.name)}</h1><p>Articles tagged with "${escHtml(tagObj.name)}" from the Lendra team.</p></div><div class="posts-grid">${cardsHtml}</div></div>`;
      const html = blogHtmlShell(`#${tagObj.name} — Lendra Blog`, `Articles tagged "${tagObj.name}" from Lendra.`, '', `/blog/tag/${tag}`, bodyContent);
      reply.type('text/html').send(html);
    } catch (e: any) {
      reply.code(500).type('text/html').send(`<h1>Error</h1><p>${escHtml(e.message)}</p>`);
    }
  });

  // Sitemap for blog
  app.get('/blog/sitemap.xml', async (_req, reply) => {
    try {
      const posts = await sbSelect('blog_posts', 'status=eq.published&select=slug,updated_at&order=updated_at.desc');
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      xml += `<url><loc>${APP_URL}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
      for (const p of (posts || [])) {
        xml += `<url><loc>${APP_URL}/blog/${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
      }
      xml += '</urlset>';
      reply.type('application/xml').send(xml);
    } catch { reply.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'); }
  });

  // RSS Feed
  app.get('/blog/feed.xml', async (_req, reply) => {
    try {
      const posts = await sbSelect('blog_posts', 'status=eq.published&order=published_at.desc&limit=20&select=title,slug,excerpt,published_at,blog_authors(name)');
      let rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n<title>Lendra Blog</title>\n<link>${APP_URL}/blog</link>\n<description>Protocol updates, DeFi research, and engineering deep dives from the Lendra team.</description>\n<atom:link href="${APP_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />\n`;
      for (const p of (posts || [])) {
        rss += `<item><title>${escHtml(p.title)}</title><link>${APP_URL}/blog/${p.slug}</link><guid>${APP_URL}/blog/${p.slug}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate>${p.excerpt ? `<description>${escHtml(p.excerpt)}</description>` : ''}${p.blog_authors ? `<author>${escHtml(p.blog_authors.name)}</author>` : ''}</item>\n`;
      }
      rss += '</channel>\n</rss>';
      reply.type('application/rss+xml').send(rss);
    } catch { reply.type('application/rss+xml').send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Lendra Blog</title></channel></rss>'); }
  });

  return app;
}
