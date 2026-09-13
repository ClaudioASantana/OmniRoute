import test from "node:test";
import assert from "node:assert/strict";
import { foldLeadingSystemRoleMessages } from "../../open-sse/handlers/chatCore/claudeSystemRole.ts";

test("foldLeadingSystemRoleMessages: moves leading system text into top-level system", () => {
  const payload: Record<string, unknown> = {
    system: "base",
    messages: [
      { role: "system", content: "injected memory" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "system", content: "mid-conversation note" },
      { role: "user", content: "continue" },
    ],
  };

  foldLeadingSystemRoleMessages(payload);

  assert.ok(Array.isArray(payload.system));
  const blocks = payload.system as Array<{ type: string; text: string }>;
  assert.equal(blocks[0].text, "base");
  assert.equal(blocks[1].text, "injected memory");

  const messages = payload.messages as Array<{ role: string; content: string }>;
  assert.equal(messages[0].role, "user");
  assert.equal(messages[0].content, "hi");
  // Mid-conversation system is preserved for Opus cache path
  assert.equal(messages[2].role, "system");
  assert.equal(messages[2].content, "mid-conversation note");
});

test("foldLeadingSystemRoleMessages: relocates leading directive-only off messages[0]", () => {
  const directive = {
    role: "system",
    content: [],
    output_config: { effort: "high" },
  };
  const payload: Record<string, unknown> = {
    messages: [directive, { role: "user", content: "hi" }, { role: "assistant", content: "ok" }],
  };

  foldLeadingSystemRoleMessages(payload);

  const messages = payload.messages as Array<Record<string, unknown>>;
  assert.equal(messages[0].role, "user");
  assert.equal(messages[1].role, "system");
  assert.deepEqual(messages[1].content, []);
  assert.deepEqual(messages[1].output_config, { effort: "high" });
});

test("foldLeadingSystemRoleMessages: no-op when messages already start with user", () => {
  const payload: Record<string, unknown> = {
    system: "already top-level",
    messages: [
      { role: "user", content: "hi" },
      { role: "system", content: "mid" },
    ],
  };
  foldLeadingSystemRoleMessages(payload);
  assert.equal(payload.system, "already top-level");
  const messages = payload.messages as Array<{ role: string }>;
  assert.equal(messages[0].role, "user");
  assert.equal(messages[1].role, "system");
});
