/**
 * tests/unit/complexity-decision-modepack-effectiveness.test.ts
 *
 * Guards the effectiveness — not just the presence — of the always-on
 * complexity-aware routing (#13386, commit 82454dbca) when a mode pack is active.
 *
 * The complexity hint influences the auto-router score ONLY through the
 * `tierAffinity` / `specificityMatch` factors (scoring.ts:138-139). Before this
 * fix all six mode packs hard-coded both weights to 0 ("manifest-routing-only
 * weights"), so with any pack active the complexity level was classified,
 * logged, then multiplied by zero — routing was complexity-blind. This suite
 * pins the fix: every pack now carries the same non-zero tier/specificity weight
 * as DEFAULT_WEIGHTS (0.0476 each), re-normalized so each pack still sums to 1.0
 * and keeps its relative character.
 *
 * Scope note: the second effectiveness gap — the primary model pick in
 * resolveAutoStrategy (lines 327-384) happening BEFORE the hint is built
 * (line 393), so complexity only reorders the fallback tail — pulls in the
 * DB/target-resolution stack and belongs in an integration test, not here.
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

test("baseline — with DEFAULT_WEIGHTS the complexity hint moves the score", () => {
  const withoutHint = scoreWith(DEFAULT_WEIGHTS, null);
  const withHint = scoreWith(DEFAULT_WEIGHTS, complexityHint());
  assert.notEqual(
    withHint[0].score,
    withoutHint[0].score,
    "under DEFAULT_WEIGHTS a complexity hint must change the score"
  );
});

test("every mode pack carries non-zero complexity weights (tierAffinity + specificityMatch)", () => {
  for (const name of getModePackNames()) {
    const pack = getModePack(name) as ScoringWeights;
    assert.ok(
      pack.tierAffinity > 0,
      `${name}: tierAffinity must be > 0 so complexity can influence routing`
    );
    assert.ok(
      pack.specificityMatch > 0,
      `${name}: specificityMatch must be > 0 so complexity can influence routing`
    );
  }
});

test("regression — with ANY mode pack active the complexity hint moves the score", () => {
  for (const name of getModePackNames()) {
    const packWeights = getModePack(name) as ScoringWeights;
    const withoutHint = scoreWith(packWeights, null);
    const withHint = scoreWith(packWeights, complexityHint());
    assert.notEqual(
      withHint[0].score,
      withoutHint[0].score,
      `mode pack "${name}" must let the complexity hint change the score ` +
        `(was neutralized when tierAffinity/specificityMatch were 0)`
    );
  }
});

test("re-normalization invariant — every mode pack still sums to 1.0 (±0.001)", () => {
  for (const name of getModePackNames()) {
    const pack = getModePack(name) as ScoringWeights;
    const sum = Object.values(pack).reduce((a, b) => a + Number(b), 0);
    assert.ok(
      Math.abs(sum - 1.0) < 0.001,
      `${name}: weights must sum to ~1.0 after adding complexity weight (got ${sum})`
    );
  }
});
