// Scoring configuration & guardrails (PRD §7.1.1 / §7.2.6).
//
// These rules are enforced in code now, ahead of calibration:
//   * NO live-rank function. No score component may read the wallet's current
//     position in the live population (denominator attack + explainability
//     break). This is PERMANENT.
//   * Frozen benchmarks. Any threshold derived from a population is a FROZEN
//     constant tied to SCORE_VERSION — never recomputed from today's
//     distribution at runtime. Recalibrating means bumping SCORE_VERSION and
//     freezing new values, not reading live data.
//   * Population statistics may feed ANOMALY DETECTION only (flag outliers for
//     §12.3 scrutiny) — never positive score.
//   * The score stays recency-anchored (§7.1). Lifetime/deep-pass values are
//     display-only and must never appear as score inputs.

export const SCORE_VERSION = 's1';

// Frozen, population-independent benchmarks tied to SCORE_VERSION. Seed values;
// recalibrate later per §7 by bumping the version and freezing new numbers.
// DO NOT compute any of these from the live distribution at runtime.
export const FROZEN_BENCHMARKS = Object.freeze({
  version: SCORE_VERSION,
  tier_thresholds: Object.freeze({ starter: 0, bronze: 430, silver: 500, gold: 575, platinum: 650, diamond: 725 }),
  // "full credit" anchors for the recency-anchored activity components
  activity_full: Object.freeze({ age_days: 365, volume_tx: 500, active_months: 12, protocols: 15, portfolio_usd: 5000 }),
});

// Inputs that may NEVER feed the score (§7.2.6). Anything derived from where a
// wallet ranks in the live population belongs here.
const FORBIDDEN_SCORE_INPUTS = new Set<string>([
  'live_rank',
  'population_percentile',
  'population_distribution',
  'peer_percentile',
  'lifetime_volume', // display-only; score stays recency-anchored (§7.1)
]);

// Structural assertion: call with the set of input keys a score computation
// intends to read. Throws if any forbidden input is present.
export function assertScoreInputsAllowed(inputKeys: Iterable<string>): void {
  for (const k of inputKeys) {
    if (FORBIDDEN_SCORE_INPUTS.has(k)) {
      throw new Error(`Forbidden score input "${k}" (§7.2.6: no live-rank into score; population stats are anomaly-detection only).`);
    }
  }
}

// Permanent: live rank is never an allowed score input. Kept as an explicit,
// referenceable invariant so any future code that tries to wire it in fails review.
export function isLiveRankAllowedInScore(): false {
  return false;
}

// Forbidden change-reason phrases (§7.2.6): a score change must never be
// explained by population movement.
export const FORBIDDEN_CHANGE_REASONS = Object.freeze(['the population shifted', 'population shift', 'rank changed']);
