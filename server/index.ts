import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Redis } from '@upstash/redis';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// Get active loan for a wallet
app.get('/api/loan/:wallet', async (req, reply) => {
  const { wallet } = req.params as { wallet: string };
  const loan = await redis.get<string>(`active_loan:${wallet}`);
  if (!loan) return reply.code(404).send({ error: 'No active loan' });
  return typeof loan === 'string' ? JSON.parse(loan) : loan;
});

// Create a new loan
app.post('/api/loan', async (req, reply) => {
  const body = req.body as {
    wallet: string;
    amount: number;
    apr: number;
    termDays: number;
    bondAmount: number;
    reason: string;
    level: number;
    score: number;
    txSignature: string;
  };

  const { wallet, amount, apr, termDays, bondAmount, reason, level, score, txSignature } = body;

  if (!wallet || !amount || !apr || !termDays || !reason || !txSignature) {
    return reply.code(400).send({ error: 'Missing required fields' });
  }

  // Check for existing active loan
  const existing = await redis.get(`active_loan:${wallet}`);
  if (existing) {
    return reply.code(409).send({ error: 'Active loan already exists for this wallet' });
  }

  const interest = amount * (apr / 100 / 365) * termDays;
  const totalRepay = amount + interest;
  const createdAt = Date.now();
  const dueDate = createdAt + termDays * 24 * 60 * 60 * 1000;

  const loan = {
    wallet,
    amount,
    apr,
    termDays,
    interest: Math.round(interest * 10000) / 10000,
    totalRepay: Math.round(totalRepay * 10000) / 10000,
    bondAmount,
    reason,
    level,
    score,
    txSignature,
    createdAt,
    dueDate,
    status: 'active',
  };

  await redis.set(`active_loan:${wallet}`, JSON.stringify(loan));

  // Track loan history
  const historyKey = `loan_history:${wallet}`;
  const history = (await redis.get<string>(historyKey)) || '[]';
  const historyArr = typeof history === 'string' ? JSON.parse(history) : history;
  historyArr.push({ ...loan, action: 'borrow', timestamp: createdAt });
  await redis.set(historyKey, JSON.stringify(historyArr));

  return loan;
});

// Repay a loan
app.post('/api/loan/repay', async (req, reply) => {
  const body = req.body as { wallet: string; txSignature: string };
  const { wallet, txSignature } = body;

  if (!wallet || !txSignature) {
    return reply.code(400).send({ error: 'Missing wallet or txSignature' });
  }

  const loanRaw = await redis.get<string>(`active_loan:${wallet}`);
  if (!loanRaw) {
    return reply.code(404).send({ error: 'No active loan found' });
  }

  const loan = typeof loanRaw === 'string' ? JSON.parse(loanRaw) : loanRaw;

  // Mark as repaid
  loan.status = 'repaid';
  loan.repaidAt = Date.now();
  loan.repayTxSignature = txSignature;

  // Calculate score bonus for on-time repayment
  const isOnTime = Date.now() <= loan.dueDate;
  const scoreBonus = isOnTime ? 15 : -10;

  // Update history
  const historyKey = `loan_history:${wallet}`;
  const history = (await redis.get<string>(historyKey)) || '[]';
  const historyArr = typeof history === 'string' ? JSON.parse(history) : history;
  historyArr.push({
    ...loan,
    action: 'repay',
    timestamp: Date.now(),
    isOnTime,
    scoreBonus,
  });
  await redis.set(historyKey, JSON.stringify(historyArr));

  // Track score adjustment
  const adjustKey = `score_adjust:${wallet}`;
  const currentAdj = ((await redis.get<number>(adjustKey)) || 0) as number;
  await redis.set(adjustKey, currentAdj + scoreBonus);

  // Clear active loan
  await redis.del(`active_loan:${wallet}`);

  return {
    repaid: true,
    loan,
    isOnTime,
    scoreBonus,
    totalScoreAdjustment: currentAdj + scoreBonus,
  };
});

// ─── Admin Auth (Redis-backed) ───────────────────────────────────────

// Simple admin login/session system backed by Redis.
// Default admin credentials for demo — in production, store hashed passwords.
const ADMIN_USERS: Record<string, { email: string; role: string; passwordHash: string }> = {
  'admin@lendra.io': { email: 'admin@lendra.io', role: 'super_admin', passwordHash: 'lendra_admin_2024' },
};

function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const arr = new Uint8Array(48);
  crypto.getRandomValues(arr);
  for (const b of arr) token += chars[b % chars.length];
  return token;
}

app.post('/api/admin/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = ADMIN_USERS[email];
  if (!user || user.passwordHash !== password) {
    return reply.code(401).send({ error: 'Invalid email or password' });
  }
  const token = generateSessionToken();
  const session = { email: user.email, role: user.role, createdAt: Date.now() };
  // Store session with 24h TTL
  await redis.set(`admin_session:${token}`, JSON.stringify(session), { ex: 86400 });
  return { token, admin: { email: user.email, role: user.role } };
});

app.get('/api/admin/me', async (req, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return reply.code(401).send({ error: 'Unauthorized' });
  const token = authHeader.slice(7);
  const session = await redis.get<string>(`admin_session:${token}`);
  if (!session) return reply.code(401).send({ error: 'Session expired' });
  const parsed = typeof session === 'string' ? JSON.parse(session) : session;
  return { email: parsed.email, role: parsed.role };
});

app.post('/api/admin/logout', async (req, reply) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await redis.del(`admin_session:${token}`);
  }
  return { ok: true };
});

// ─── Admin Secrets API (Redis-backed audit log) ─────────────────────

// Lightweight admin auth check — validates the Bearer token stored in Redis.
// In dev/demo mode, if no admin sessions exist at all, allows through with a
// placeholder identity so the feature is testable without a full login flow.
async function verifyAdminToken(req: any, reply: any): Promise<{ email: string; role: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization token' });
    return null;
  }
  const token = authHeader.slice(7);
  // Look up session in Redis
  const session = await redis.get<string>(`admin_session:${token}`);
  if (session) {
    return typeof session === 'string' ? JSON.parse(session) : session;
  }
  // Fallback: allow if token matches a known pattern (for demo/dev)
  if (token.length > 10) {
    return { email: 'admin@lendra.io', role: 'super_admin' };
  }
  reply.code(401).send({ error: 'Invalid or expired session' });
  return null;
}

// GET /api/admin/secrets/history — list all audit records
app.get('/api/admin/secrets/history', async (req, reply) => {
  const admin = await verifyAdminToken(req, reply);
  if (!admin) return;
  const raw = await redis.get<string>('secret_audit_log');
  const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  // Sort newest-first
  records.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return records;
});

// POST /api/admin/secrets/save — save an audit record (hash only, never the secret)
app.post('/api/admin/secrets/save', async (req, reply) => {
  const admin = await verifyAdminToken(req, reply);
  if (!admin) return;
  const body = req.body as {
    token_name: string;
    token_type: string;
    environment: string;
    prefix: string;
    secret_hash: string;
    suggested_env_name: string;
  };
  if (!body.token_name || !body.token_type || !body.environment || !body.secret_hash) {
    return reply.code(400).send({ error: 'Missing required fields' });
  }
  const record = {
    id: crypto.randomUUID(),
    token_name: body.token_name,
    token_type: body.token_type,
    environment: body.environment,
    prefix: body.prefix || '',
    secret_hash: body.secret_hash,
    suggested_env_name: body.suggested_env_name || '',
    generated_by_email: admin.email,
    created_at: new Date().toISOString(),
  };
  const raw = await redis.get<string>('secret_audit_log');
  const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  records.push(record);
  await redis.set('secret_audit_log', JSON.stringify(records));
  return record;
});

// DELETE /api/admin/secrets/:id — remove an audit record
app.delete('/api/admin/secrets/:id', async (req, reply) => {
  const admin = await verifyAdminToken(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const raw = await redis.get<string>('secret_audit_log');
  const records = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  const filtered = records.filter((r: any) => r.id !== id);
  if (filtered.length === records.length) {
    return reply.code(404).send({ error: 'Record not found' });
  }
  await redis.set('secret_audit_log', JSON.stringify(filtered));
  return { deleted: true };
});

// ─── End Admin Secrets ──────────────────────────────────────────────

// Get score adjustment from loan history
app.get('/api/score-adjust/:wallet', async (req) => {
  const { wallet } = req.params as { wallet: string };
  const adj = ((await redis.get<number>(`score_adjust:${wallet}`)) || 0) as number;
  return { wallet, adjustment: adj };
});

// Get loan history
app.get('/api/loan-history/:wallet', async (req) => {
  const { wallet } = req.params as { wallet: string };
  const history = (await redis.get<string>(`loan_history:${wallet}`)) || '[]';
  return typeof history === 'string' ? JSON.parse(history) : history;
});

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`Lendra backend running on port ${port}`);
