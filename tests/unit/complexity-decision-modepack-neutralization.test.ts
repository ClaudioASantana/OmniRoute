/**
 * tests/unit/complexity-decision-modepack-neutralization.test.ts
 *
 * Regression guard for the effectiveness — not just the presence — of the
 * always-on complexity-aware routing that #13386 (commit 82454dbca) shipped.
 *
 * #13386 removed the orphaned `complexityAwareRouting` gate so the complexity
 * hint is now built on every auto combo. The commit message promised "trivial
 * prompts correctly favor free/cheap tiers via tierAffinity". That promise only
 * holds when the auto-router scores with DEFAULT_WEIGHTS (or custom UI weights):
 *
 *   - The complexity hint influences the score ONLY through the `tierAffinity`
 *     and `specificityMatch` factors (scoring.ts:138-139).
 *   - All six mode packs (ship-fast, cost-saver, quality-first, offline-friendly,
 *     reliability-first, chaos-mode) hard-code `tierAffinity: 0` and
 *     `specificityMatch: 0` (modePacks.ts — commented "manifest-routing-only
 *     weights"). resolveAutoStrategy.ts:253 swaps DEFAULT_WEIGHTS for the pack's
 *     weights whenever a mode pack is active.
 *
 * So with ANY mode pack active, the complexity level is classified, logged, and
 * then multiplied by zero — the routing decision is complexity-blind. This test
 * pins that behavior so the gap is visible and a future fix (giving packs a
 * non-zero tier weight, or applying the hint before weighting) breaks it loudly.
 *
 * NOTE: this file does NOT cover the second effectiveness gap — that the primary
 * model pick in resolveAutoStrategy happens (lines 327-384) BEFORE the hint is
 * built (line 393), so complexity only reorders the fallback tail. That path
 * pulls in the DB/target-resolution stack and belongs in an integration test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { scoreAutoTargets } from "../../open-sse/services/combo.ts";
import { DEFAULT_WEIGHTS, type ScoringWeights } from "../../open-sse/services/autoCombo/scoring.ts";
import { getModePack, getModePackNames } from "../../open-sse/services/autoCombo/modePacks.ts";
import type { RoutingHint } from "../../open-sse/services/manifestAdapter.ts";

function target() {
  return {
    kind: "model",
    provider: "openai",
    model: "gpt-4o-mini",
    modelStr: "openai/gpt-4o-mini",
    executionKey: "k1",
    stepId: "s1",
  } as unknown as Parameters<typeof scoreAutoTargets>[0][number];
}

function candidate() {
  return {
    executionKey: "k1",
    provider: "openai",
    model: "gpt-4o-mini",
    modelStr: "openai/gpt-4o-mini",
    quotaRemaining: 100,
    quotaTotal: 100,
    circuitBreakerState: "CLOSED",
    costPer1MTokens: 1,
    p95LatencyMs: 100,
    latencyStdDev: 10,
    errorRate: 0,
    accountTier: "standard",
    quotaResetIntervalSecs: 86400,
  } as unknown as Parameters<typeof scoreAutoTargets>[1][number];
}

// A hint that pushes toward the premium tier with high specificity — the same
// shape the always-on complexity router emits for a hard/agentic request.
function complexityHint(): RoutingHint {
  return {
    recommendedMinTier: "premium",
    specificity: { score: 80 },
  } as unknown as RoutingHint;
}

function scoreWith(weights: ScoringWeights, hint: RoutingHint | null) {
  return scoreAutoTargets([target()], [candidate()], "default", weights, hint);
}

test("baseline — with DEFAULT_WEIGHTS the complexity hint DOES move the score", () => {
  // Sanity anchor: the feature is capable of influencing routing when the
  // tierAffinity/specificityMatch weights are non-zero. If this ever stops being
  // true the neutralization assertions below would be vacuous.
  const withoutHint = scoreWith(DEFAULT_WEIGHTS, null);
  const withHint = scoreWith(DEFAULT_WEIGHTS, complexityHint());
  assert.notEqual(
    withHint[0].score,
    withoutHint[0].score,
    "under DEFAULT_WEIGHTS a complexity hint must change the score"
  );
});

test("every mode pack zeroes tierAffinity and specificityMatch (the neutralizing weights)", () => {
  for (const name of getModePackNames()) {
    const pack = getModePack(name) as ScoringWeights;
    assert.equal(pack.tierAffinity, 0, `${name}: tierAffinity must be 0 (premise of this guard)`);
    assert.equal(
      pack.specificityMatch,
      0,
      `${name}: specificityMatch must be 0 (premise of this guard)`
    );
  }
});

test("regression — with ANY mode pack active the complexity hint has ZERO effect", () => {
  for (const name of getModePackNames()) {
    const packWeights = getModePack(name) as ScoringWeights;
    const withoutHint = scoreWith(packWeights, null);
    const withHint = scoreWith(packWeights, complexityHint());
    assert.equal(
      withHint[0].score,
      withoutHint[0].score,
      `mode pack "${name}" neutralizes the complexity hint: the score is identical ` +
        `with and without it, so routing is complexity-blind whenever this pack is active`
    );
  }
});
