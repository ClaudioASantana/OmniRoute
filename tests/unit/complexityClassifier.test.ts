import test from "node:test";
import assert from "node:assert";
import { classifyPromptComplexity, sortTargetsByComplexityTier } from "../../open-sse/services/combo/complexityClassifier.ts";

test("classifyPromptComplexity identifies simple prompts", () => {
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: "Hello" }]), "simple");
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: "Translate this to French: Apple" }]), "simple");
});

test("classifyPromptComplexity identifies complex prompts (code blocks)", () => {
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: "Write a loop:\n```javascript\nfor(...)```" }]), "complex");
});

test("classifyPromptComplexity identifies reasoning prompts (math/logic)", () => {
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: "Solve this equation step by step." }]), "reasoning");
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: "What is \\sum of n=1 to 10?" }]), "reasoning");
});

test("classifyPromptComplexity defaults to standard", () => {
  const longText = "a".repeat(200); // > 150 chars, but < 4000
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: longText }]), "standard");
  
  // Multiline short
  assert.strictEqual(classifyPromptComplexity([{ role: "user", content: "Hi\nhow are you?" }]), "standard");
});

test("sortTargetsByComplexityTier prioritizes correctly", () => {
  const targets = [
    { modelStr: "gpt-4o" }, // complex
    { modelStr: "claude-3-haiku" }, // simple
    { modelStr: "o1-preview" }, // reasoning
  ];

  const simpleSorted = sortTargetsByComplexityTier(targets, "simple");
  assert.strictEqual(simpleSorted[0].modelStr, "claude-3-haiku");

  const complexSorted = sortTargetsByComplexityTier(targets, "complex");
  assert.strictEqual(complexSorted[0].modelStr, "gpt-4o");

  const reasoningSorted = sortTargetsByComplexityTier(targets, "reasoning");
  assert.strictEqual(reasoningSorted[0].modelStr, "o1-preview");
});
