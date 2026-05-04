import { useState, useCallback } from 'react';

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
      const res = await fetch(`api/loan/${wallet}`);
      if (res.status === 404) {
        setActiveLoan(null);
        return null;
      }
      if (!res.ok) throw new Error('Failed to fetch loan');
      const data = await res.json();
      setActiveLoan(data);
      return data;
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
      const res = await fetch('api/loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create loan');
      }
      const data = await res.json();
      setActiveLoan(data);
      return data;
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
      const res = await fetch('api/loan/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, txSignature }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to repay loan');
      }
      const data = await res.json();
      setActiveLoan(null);
      return data;
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
      const res = await fetch(`api/loan-history/${wallet}`);
      if (!res.ok) return;
      const data = await res.json();
      setLoanHistory(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchScoreAdjustment = useCallback(async (wallet) => {
    if (!wallet) return 0;
    try {
      const res = await fetch(`api/score-adjust/${wallet}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.adjustment || 0;
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
