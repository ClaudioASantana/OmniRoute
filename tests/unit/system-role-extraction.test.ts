import test from "node:test";
import assert from "node:assert/strict";
import { extractSystemRoleMessages } from "../../open-sse/handlers/chatCore.ts";

test("extractSystemRoleMessages moves role=system to top-level system", () => {
  const payload = {
    messages: [
      { role: "system", content: "Memory context: foo" },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 2);
  assert.equal(payload.messages[0].role, "user");
  assert.deepEqual(payload.system, [{ type: "text", text: "Memory context: foo" }]);
});

test("extractSystemRoleMessages also lifts role=developer (OpenAI Responses system alias)", () => {
  const payload = {
    messages: [
      { role: "developer", content: "Dev instructions" },
      { role: "system", content: "Sys context" },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessages(payload);
  // both developer and system are removed from messages and lifted into system
  assert.equal(payload.messages.length, 1);
  assert.equal(payload.messages[0].role, "user");
  assert.deepEqual(payload.system, [
    { type: "text", text: "Dev instructions" },
    { type: "text", text: "Sys context" },
  ]);
});

test("extractSystemRoleMessages merges with existing top-level system string", () => {
  const payload = {
    system: "You are Claude.",
    messages: [
      { role: "system", content: "Memory context: bar" },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 1);
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude." },
    { type: "text", text: "Memory context: bar" },
  ]);
});

test("extractSystemRoleMessages merges with existing top-level system array", () => {
  const payload = {
    system: [{ type: "text", text: "Existing system" }],
    messages: [
      { role: "system", content: "Memory context: baz" },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 1);
  assert.deepEqual(payload.system, [
    { type: "text", text: "Existing system" },
    { type: "text", text: "Memory context: baz" },
  ]);
});

test("extractSystemRoleMessages does nothing when no system role messages", () => {
  const payload = {
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 2);
  assert.equal(payload.system, undefined);
});

test("extractSystemRoleMessages handles non-array messages gracefully", () => {
  const payload = { messages: "not-an-array" };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages, "not-an-array");
});

test("extractSystemRoleMessages handles empty messages array", () => {
  const payload = { messages: [] };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 0);
});

test("extractSystemRoleMessages handles case-insensitive role System", () => {
  const payload = {
    messages: [
      { role: "System", content: "Memory context: caps" },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 1);
  assert.deepEqual(payload.system, [{ type: "text", text: "Memory context: caps" }]);
});

test("extractSystemRoleMessages drops empty text content from system messages", () => {
  const payload = {
    messages: [
      { role: "system", content: "" },
      { role: "system", content: "valid" },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 1);
  assert.deepEqual(payload.system, [{ type: "text", text: "valid" }]);
});

test("extractSystemRoleMessages handles system messages with array content", () => {
  const payload = {
    messages: [
      {
        role: "system",
        content: [
          { type: "text", text: "Block 1" },
          { type: "text", text: "Block 2" },
        ],
      },
      { role: "user", content: "hello" },
    ],
  };
  extractSystemRoleMessages(payload);
  assert.equal(payload.messages.length, 1);
  assert.deepEqual(payload.system, [
    { type: "text", text: "Block 1" },
    { type: "text", text: "Block 2" },
  ]);
});

// #9520: leadingOnly hoists only the messages[0] system prompt (what Anthropic's
// "use the top-level 'system' parameter for the initial system prompt" 400 requires)
// and preserves genuinely mid-conversation system-role messages in place.
test("extractSystemRoleMessages leadingOnly hoists only messages[0] and keeps mid-conversation system in place", () => {
  const payload = {
    messages: [
      { role: "system", content: "Initial system prompt" },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "system", content: "Mid-conversation reminder" },
      { role: "user", content: "continue" },
    ],
  };
  extractSystemRoleMessages(payload, { leadingOnly: true });
  assert.deepEqual(payload.system, [{ type: "text", text: "Initial system prompt" }]);
  // messages[0] was hoisted out; the mid-conversation system message stays untouched.
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "system", content: "Mid-conversation reminder" },
    { role: "user", content: "continue" },
  ]);
});

test("extractSystemRoleMessages leadingOnly hoists a contiguous leading run (system + developer)", () => {
  const payload = {
    messages: [
      { role: "developer", content: "Dev instructions" },
      { role: "system", content: "Sys context" },
      { role: "user", content: "hello" },
      { role: "system", content: "Mid-conversation reminder" },
    ],
  };
  extractSystemRoleMessages(payload, { leadingOnly: true });
  assert.deepEqual(payload.system, [
    { type: "text", text: "Dev instructions" },
    { type: "text", text: "Sys context" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "system", content: "Mid-conversation reminder" },
  ]);
});

test("extractSystemRoleMessages leadingOnly is a no-op when messages[0] is not system/developer", () => {
  const payload = {
    messages: [
      { role: "user", content: "hello" },
      { role: "system", content: "Mid-conversation reminder" },
    ],
  };
  extractSystemRoleMessages(payload, { leadingOnly: true });
  assert.equal(payload.system, undefined);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "system", content: "Mid-conversation reminder" },
  ]);
});

test("extractSystemRoleMessages leadingOnly merges with an existing top-level system value", () => {
  const payload = {
    system: "You are Claude.",
    messages: [
      { role: "system", content: "Initial system prompt" },
      { role: "user", content: "hello" },
      { role: "system", content: "Mid-conversation reminder" },
    ],
  };
  extractSystemRoleMessages(payload, { leadingOnly: true });
  assert.deepEqual(payload.system, [
    { type: "text", text: "You are Claude." },
    { type: "text", text: "Initial system prompt" },
  ]);
  assert.deepEqual(payload.messages, [
    { role: "user", content: "hello" },
    { role: "system", content: "Mid-conversation reminder" },
  ]);
});
