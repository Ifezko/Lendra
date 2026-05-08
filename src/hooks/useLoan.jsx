import { useState, useCallback } from 'react';
import {
  getActiveLoan as dbGetActiveLoan,
  createLoan as dbCreateLoan,
  updateLoan as dbUpdateLoan,
  getLoanHistory as dbGetLoanHistory,
  insertLoanEvent,
  insertBondEvent,
  insertRepayment,
  getRepaymentStats,
  upsertRepaymentStats,
} from '../lib/db';

export function useLoan() {
  const [activeLoan, setActiveLoan] = useState(null);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActiveLoan = useCallback(async (wallet) => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      const loan = await dbGetActiveLoan(wallet);
      setActiveLoan(loan || null);
      return loan || null;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createLoan = useCallback(async (loanData) => {
    setLoading(true);
    setError(null);
    try {
      const { wallet, amount, apr, feePercent, termDays, bondAmount, reason, level, score, txSignature, levelName, purposeTags, borrowAsset, loanSource, isSimulated } = loanData;

      // Accept either apr (legacy) or feePercent (new flat-fee model)
      const effectiveRate = feePercent ?? apr;
      if (!wallet || !amount || effectiveRate == null || !termDays || !reason || !txSignature) {
        throw new Error('Missing required fields');
      }

      // Check for existing active loan
      const existing = await dbGetActiveLoan(wallet);
      if (existing) {
        throw new Error('Active loan already exists for this wallet');
      }

      // Support both APR-based interest and flat fee percentage
      const interest = feePercent != null
        ? amount * (feePercent / 100)
        : amount * (apr / 100 / 365) * termDays;
      const totalRepay = amount + interest;
      const dueDate = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000).toISOString();

      const loanRow = {
        wallet_address: wallet,
        borrow_asset: borrowAsset || 'USDC',
        loan_amount: amount,
        apr: effectiveRate,
        interest_amount: Math.round(interest * 10000) / 10000,
        total_repayment: Math.round(totalRepay * 10000) / 10000,
        bond_amount: bondAmount || 0,
        bond_percentage: 30,
        loan_level: level || 0,
        level_name: levelName || '',
        loan_purpose_text: reason,
        loan_purpose_tags: purposeTags || [],
        status: isSimulated ? 'simulated' : 'active',
        due_date: dueDate,
        borrow_tx_hash: txSignature,
        loan_source: loanSource || 'lendra_credit_pool',
        is_simulated: !!isSimulated,
        loan_term_days: termDays,
        loan_fee_percentage: feePercent ?? 0,
        loan_fee_amount: Math.round(interest * 10000) / 10000,
        fee_model: feePercent != null ? 'fixed_term_fee' : 'apr',
      };

      const loan = await dbCreateLoan(loanRow);
      setActiveLoan(loan);

      // Log loan event
      insertLoanEvent({
        wallet_address: wallet,
        event_type: 'borrow',
        borrow_asset: borrowAsset || 'USDC',
        loan_amount: amount,
        apr: effectiveRate,
        interest_amount: loanRow.interest_amount,
        total_repayment: loanRow.total_repayment,
        bond_amount: bondAmount || 0,
        bond_percentage: 30,
        loan_level: level || 0,
        level_name: levelName || '',
        loan_purpose_text: reason,
        loan_purpose_tags: purposeTags || [],
        status: isSimulated ? 'simulated' : 'active',
        due_date: dueDate,
        transaction_hash: txSignature,
      }).catch(() => {});

      // Log bond event
      if (bondAmount > 0 && loan) {
        insertBondEvent({
          wallet_address: wallet,
          loan_id: loan.id,
          event_type: 'bond_deposited',
          loan_amount: amount,
          bond_percentage: 30,
          bond_amount_usd: bondAmount,
          borrow_asset: borrowAsset || 'USDC',
          bond_token: borrowAsset || 'USDC',
          loan_level: level || 0,
          level_name: levelName || '',
          status: isSimulated ? 'simulated_lock' : 'locked',
          tx_hash: txSignature,
        }).catch(() => {});
      }

      return loan;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const repayLoan = useCallback(async (wallet, txSignature) => {
    setLoading(true);
    setError(null);
    try {
      if (!wallet || !txSignature) {
        throw new Error('Missing wallet or txSignature');
      }

      const loan = await dbGetActiveLoan(wallet);
      if (!loan) {
        throw new Error('No active loan found');
      }

      const now = new Date();
      const isOnTime = now <= new Date(loan.due_date);
      const isEarly = now < new Date(new Date(loan.due_date).getTime() - 24 * 60 * 60 * 1000);
      const scoreBonus = isOnTime ? 15 : -10;

      // Mark loan as repaid
      await dbUpdateLoan(loan.id, {
        status: 'repaid',
        repaid_at: now.toISOString(),
        repay_tx_hash: txSignature,
      });

      // Insert repayment record
      insertRepayment({
        wallet_address: wallet,
        loan_id: loan.id,
        amount_repaid: loan.total_repayment,
        interest_paid: loan.interest_amount,
        bond_returned: loan.bond_amount,
        repaid_at: now.toISOString(),
        was_late: !isOnTime,
        was_early: isEarly,
        transaction_hash: txSignature,
        repayment_points_awarded: scoreBonus,
      }).catch(() => {});

      // Log loan event
      insertLoanEvent({
        wallet_address: wallet,
        event_type: 'repay',
        borrow_asset: loan.borrow_asset,
        loan_amount: loan.loan_amount,
        apr: loan.apr,
        interest_amount: loan.interest_amount,
        total_repayment: loan.total_repayment,
        bond_amount: loan.bond_amount,
        loan_level: loan.loan_level,
        level_name: loan.level_name,
        status: 'repaid',
        transaction_hash: txSignature,
      }).catch(() => {});

      // Update bond status
      if (loan.bond_amount > 0) {
        insertBondEvent({
          wallet_address: wallet,
          loan_id: loan.id,
          event_type: 'bond_returned',
          loan_amount: loan.loan_amount,
          bond_percentage: 30,
          bond_amount_usd: loan.bond_amount,
          borrow_asset: loan.borrow_asset,
          bond_token: 'USDC',
          loan_level: loan.loan_level,
          level_name: loan.level_name,
          status: 'returned',
          tx_hash: txSignature,
        }).catch(() => {});
      }

      // Update repayment stats
      updateRepaymentStatsAfterRepay(wallet, loan, isOnTime, isEarly).catch(() => {});

      setActiveLoan(null);

      return {
        repaid: true,
        loan: { ...loan, status: 'repaid', repaid_at: now.toISOString() },
        isOnTime,
        scoreBonus,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (wallet) => {
    if (!wallet) return;
    try {
      const history = await dbGetLoanHistory(wallet);
      setLoanHistory(history);
    } catch {
      // non-critical
    }
  }, []);

  const fetchScoreAdjustment = useCallback(async (wallet) => {
    if (!wallet) return 0;
    try {
      const stats = await getRepaymentStats(wallet);
      return stats?.repayment_score || 0;
    } catch {
      return 0;
    }
  }, []);

  return {
    activeLoan,
    loanHistory,
    loading,
    error,
    fetchActiveLoan,
    createLoan,
    repayLoan,
    fetchHistory,
    fetchScoreAdjustment,
    setError,
  };
}

async function updateRepaymentStatsAfterRepay(wallet, loan, isOnTime, isEarly) {
  const existing = await getRepaymentStats(wallet);
  const stats = existing || {
    clean_repayments: 0,
    early_repayments: 0,
    late_repayments: 0,
    defaults: 0,
    repayment_score: 0,
    current_level: 0,
    current_level_name: '',
    highest_level_unlocked: 0,
    qualifying_higher_borrow_repayments: 0,
    borrow_growth_points: 0,
  };

  if (isOnTime) stats.clean_repayments += 1;
  if (isEarly) stats.early_repayments += 1;
  if (!isOnTime) stats.late_repayments += 1;

  stats.current_level = Math.max(stats.current_level, loan.loan_level || 0);
  stats.current_level_name = loan.level_name || stats.current_level_name;
  stats.highest_level_unlocked = Math.max(stats.highest_level_unlocked, loan.loan_level || 0);
  stats.last_repayment_at = new Date().toISOString();

  if (!stats.first_borrow_amount) stats.first_borrow_amount = loan.loan_amount;
  if (!stats.highest_borrow_amount_repaid || loan.loan_amount > stats.highest_borrow_amount_repaid) {
    stats.highest_borrow_amount_repaid = loan.loan_amount;
  }

  await upsertRepaymentStats(wallet, stats);
}
