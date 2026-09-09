import test from "node:test";
import assert from "node:assert/strict";

test("next config allows loopback dev origins alongside LAN access", async () => {
  const { default: nextConfig } = await import("../../next.config.mjs");

  assert.ok(nextConfig.allowedDevOrigins.includes("localhost"));
  assert.ok(nextConfig.allowedDevOrigins.includes("127.0.0.1"));
  assert.ok(nextConfig.allowedDevOrigins.includes("192.168.1.10"));
});
