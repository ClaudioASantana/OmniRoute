// tests/unit/claude-passthrough-system-extraction.test.ts
// Regression coverage for #9520.
// extractSystemRoleMessagesForPassthrough is the seam the Claude passthrough call site in
// chatCore.ts uses. It ties provider + shouldUseMidConversationSystem() to the leadingOnly
// flag. Imported from the pure module (not the chatCore.ts aggregator) so these tests do not
// pull in the god-file's DB/credential dependencies.
import test from "node:test";
import assert from "node:assert/strict";
import { extractSystemRoleMessagesForPassthrough } from "../../open-sse/handlers/chatCore/claudeSystemRole.ts";

/** The exact shape the original 400 came from: Opus + top-level system + tools + a leading
 * role:"system" message plus a genuinely mid-conversation one. */
function opusPassthroughPayload(): Record<string, unknown> {
  return {
    model: "claude-opus-4-1-20250805",
    system: "You are Claude Code.",
    tools: [{ name: "Bash", description: "run a command", input_schema: { type: "object" } }],
    messages: [
      { role: "system", content: "Initial system prompt" },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "system", content: "Mid-conversation reminder" },
      { role: "user", content: "continue" },
    ],
  };
}

test("passthrough: non-claude provider always fully extracts (all system-role messages hoisted)", () => {
  const payload = opusPassthroughPayload();
  extractSystemRoleMessagesForPassthrough(payload, "openai", payload.model as string);
  // Full extraction: both the leading AND the mid-conversation system messages are hoisted,
  // merging with the existing top-level system string.
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude Code." },
    { type: "text", text: "Initial system prompt" },
    { type: "text", text: "Mid-conversation reminder" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "user", content: "continue" },
  ]);
});

test("passthrough: claude provider, non-Opus model → full extraction (mid-conversation beta N/A)", () => {
  const payload = opusPassthroughPayload();
  payload.model = "claude-sonnet-4-5-20250929";
  // Sonnet does not qualify for the mid-conversation-system beta → shouldUseMidConversationSystem
  // is false → full extraction, so the mid-conversation system message is also hoisted.
  extractSystemRoleMessagesForPassthrough(payload, "claude", payload.model as string);
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude Code." },
    { type: "text", text: "Initial system prompt" },
    { type: "text", text: "Mid-conversation reminder" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "user", content: "continue" },
  ]);
});

test("passthrough: claude Opus but no tools → full extraction (beta gate not met)", () => {
  const payload = opusPassthroughPayload();
  delete payload.tools;
  // Without tools, shouldUseMidConversationSystem is false → full extraction.
  extractSystemRoleMessagesForPassthrough(payload, "claude", payload.model as string);
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude Code." },
    { type: "text", text: "Initial system prompt" },
    { type: "text", text: "Mid-conversation reminder" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "user", content: "continue" },
  ]);
});

test("passthrough: claude Opus + system + tools → leadingOnly (the #9520 fix)", () => {
  const payload = opusPassthroughPayload();
  // The exact reported scenario: shouldUseMidConversationSystem is true, so only the leading
  // run (messages[0]) is hoisted — satisfying Anthropic's "use the top-level 'system'
  // parameter for the initial system prompt" 400 — while the genuinely mid-conversation
  // system message stays in place (Opus accepts it under its beta; hoisting it would break
  // the prompt-cache prefix).
  extractSystemRoleMessagesForPassthrough(payload, "claude", payload.model as string);
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude Code." },
    { type: "text", text: "Initial system prompt" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "system", content: "Mid-conversation reminder" },
    { role: "user", content: "continue" },
  ]);
});

test("passthrough: claude Opus + system + tools, model read from payload when arg omitted", () => {
  const payload = opusPassthroughPayload();
  // shouldUseMidConversationSystem falls back to payload.model when the model arg is undefined.
  extractSystemRoleMessagesForPassthrough(payload, "claude");
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude Code." },
    { type: "text", text: "Initial system prompt" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "system", content: "Mid-conversation reminder" },
    { role: "user", content: "continue" },
  ]);
});

test("passthrough: leadingOnly still hoists when messages[0] is system even with no mid-conversation system", () => {
  const payload: Record<string, unknown> = {
    model: "claude-opus-4-1-20250805",
    system: "You are Claude Code.",
    tools: [{ name: "Bash", description: "run a command", input_schema: { type: "object" } }],
    messages: [
      { role: "system", content: "Initial system prompt" },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessagesForPassthrough(payload, "claude", payload.model as string);
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude Code." },
    { type: "text", text: "Initial system prompt" },
  ]);
  assert.deepEqual(payload.messages, [{ role: "user", content: "hello" }]);
});
