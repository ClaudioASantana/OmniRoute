/**
 * Mode Packs — Pre-defined weight profiles for Auto-Combo scoring.
 *
 * Each pack optimizes for a different priority:
 *   - ship-fast:       Prioritize latency and health
 *   - cost-saver:      Prioritize cost efficiency
 *   - quality-first:   Prioritize task fitness and stability
 *   - offline-friendly: Prioritize quota availability
 *
 * Complexity-aware routing (#13386): `tierAffinity` and `specificityMatch` are the
 * ONLY channel through which the request-complexity hint reaches the score
 * (scoring.ts::calculateScore). Every pack therefore carries the same 0.0476 on
 * both that DEFAULT_WEIGHTS uses — previously they were pinned to 0 ("manifest-
 * routing-only weights"), which silently neutralized the always-on complexity
 * classification for every request routed under a mode pack. The remaining
 * factors were re-normalized proportionally, so each pack keeps its relative
 * character and still sums to 1.0 (validateWeights / autoCombo.test.ts).
 */

import type { ScoringWeights } from "./scoring";

export const MODE_PACKS: Record<string, ScoringWeights> = {
  // Prioritize latency → health. tierPriority replaces 0.05 from stability.
  "ship-fast": {
    quota: 0.1206,
    health: 0.2413,
    costInv: 0.0431,
    latencyInv: 0.2758,
    taskFit: 0.0861,
    stability: 0,
    tierPriority: 0.0431,
    tierAffinity: 0.0476,
    specificityMatch: 0.0476,
    contextAffinity: 0.0086,
    sessionAvailability: 0.0431,
    resetWindowAffinity: 0,
    connectionDensity: 0.0431,
  },
  // Prioritize cost. tierPriority replaces 0.05 from stability.
  "cost-saver": {
    quota: 0.1206,
    health: 0.1638,
    costInv: 0.3188,
    latencyInv: 0.0431,
    taskFit: 0.0861,
    stability: 0.0431,
    tierPriority: 0.0431,
    tierAffinity: 0.0476,
    specificityMatch: 0.0476,
    contextAffinity: 0,
    sessionAvailability: 0.0431,
    resetWindowAffinity: 0,
    connectionDensity: 0.0431,
  },
  // Prioritize task fitness. tierPriority replaces 0.05 from latencyInv.
  "quality-first": {
    quota: 0.0861,
    health: 0.1551,
    costInv: 0.0431,
    latencyInv: 0.0431,
    taskFit: 0.3188,
    stability: 0.1293,
    tierPriority: 0.0431,
    tierAffinity: 0.0476,
    specificityMatch: 0.0476,
    contextAffinity: 0,
    sessionAvailability: 0.0431,
    resetWindowAffinity: 0,
    connectionDensity: 0.0431,
  },
  // Prioritize quota availability. tierPriority replaces 0.05 from taskFit.
  "offline-friendly": {
    quota: 0.3189,
    health: 0.2413,
    costInv: 0.0861,
    latencyInv: 0.0431,
    taskFit: 0,
    stability: 0.0861,
    tierPriority: 0.0431,
    tierAffinity: 0.0476,
    specificityMatch: 0.0476,
    contextAffinity: 0,
    sessionAvailability: 0.0431,
    resetWindowAffinity: 0,
    connectionDensity: 0.0431,
  },
  // #4235 `:reliable` — prioritize healthy, low-variance providers (high availability).
  // health (circuit-breaker) + stability (latency std-dev) dominate; weights sum to ~1.0
  // (re-normalized after #8940 added sessionAvailability without rebalancing — #9985).
  "reliability-first": {
    quota: 0.1206,
    health: 0.3188,
    costInv: 0.0345,
    latencyInv: 0.0431,
    taskFit: 0.0861,
    stability: 0.1724,
    tierPriority: 0.0431,
    tierAffinity: 0.0476,
    specificityMatch: 0.0476,
    contextAffinity: 0,
    sessionAvailability: 0.0431,
    resetWindowAffinity: 0,
    connectionDensity: 0.0431,
  },
  // Chaos mode — priority: health > stability > taskFit > latency.
  // Selects top-N healthy providers for parallel dispatch. Favors providers with
  // closed circuit breakers, low latency variance, and high task fitness.
  // quota weight reduced (chaos fans out in parallel, quota diversity is secondary
  // to picking the most stable providers); connectionDensity boosted slightly to
  // prefer providers with multiple accounts (more resilient to per-account rate limits).
  "chaos-mode": {
    quota: 0.0431,
    health: 0.3618,
    costInv: 0.0172,
    latencyInv: 0.0259,
    taskFit: 0.1724,
    stability: 0.1551,
    tierPriority: 0.0172,
    tierAffinity: 0.0476,
    specificityMatch: 0.0476,
    contextAffinity: 0.0259,
    sessionAvailability: 0.0431,
    resetWindowAffinity: 0,
    connectionDensity: 0.0431,
  },
};

/**
 * Get a mode pack by name, falling back to default weights.
 */
export function getModePack(name: string): ScoringWeights | undefined {
  return MODE_PACKS[name];
}

/**
 * Get all available mode pack names.
 */
export function getModePackNames(): string[] {
  return Object.keys(MODE_PACKS);
}
