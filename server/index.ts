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
