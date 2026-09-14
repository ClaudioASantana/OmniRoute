import test from "node:test";
import assert from "node:assert/strict";

const { shouldUseMidConversationSystem, supportsMidConversationSystemModel } = await import(
  "../../open-sse/executors/claudeIdentity.ts"
);

function agentBody(model: string) {
  return {
    model,
    system: "You are a coding agent.",
    tools: [{ name: "Bash", description: "run", input_schema: { type: "object" } }],
  };
}

test("supportsMidConversationSystemModel: Opus 4.8+ / 5 / Fable / Mythos only", () => {
  assert.equal(supportsMidConversationSystemModel("claude-opus-4-7"), false);
  assert.equal(supportsMidConversationSystemModel("claude-opus-4-6"), false);
  assert.equal(supportsMidConversationSystemModel("claude-opus-4-8"), true);
  assert.equal(supportsMidConversationSystemModel("claude-opus-4-9"), true);
  assert.equal(supportsMidConversationSystemModel("claude-opus-5"), true);
  assert.equal(supportsMidConversationSystemModel("claude-fable-5"), true);
  assert.equal(supportsMidConversationSystemModel("claude-mythos-5"), true);
  assert.equal(supportsMidConversationSystemModel("claude-sonnet-4-6"), false);
});

test("shouldUseMidConversationSystem: false for Opus 4.7 full-agent (hoist all systems)", () => {
  assert.equal(shouldUseMidConversationSystem(agentBody("claude-opus-4-7")), false);
});

test("shouldUseMidConversationSystem: true for Opus 4.8 / 5 full-agent", () => {
  assert.equal(shouldUseMidConversationSystem(agentBody("claude-opus-4-8")), true);
  assert.equal(shouldUseMidConversationSystem(agentBody("claude-opus-5")), true);
});

test("shouldUseMidConversationSystem: requires system + tools", () => {
  assert.equal(
    shouldUseMidConversationSystem({ model: "claude-opus-4-8", system: "x", tools: [] }),
    false
  );
  assert.equal(
    shouldUseMidConversationSystem({
      model: "claude-opus-4-8",
      tools: [{ name: "x", input_schema: { type: "object" } }],
    }),
    false
  );
});
