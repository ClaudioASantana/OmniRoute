/**
 * chatCore Claude system-role lifter (Quality Gate v2 / Fase 9 — chatCore god-file
 * decomposition, #3501).
 *
 * Pure helper extracted from chatCore.ts: lifts any `system`/`developer` role messages out of the
 * messages[] array into the top-level `system` field. Anthropic's Messages API rejects either as a
 * chat role, so they must be hoisted. `developer` is OpenAI's Responses-API rename of `system` and
 * is treated identically. Mutates the payload in place; behaviour is byte-identical to the previous
 * top-level definition (still re-exported from chatCore.ts for existing importers/tests).
 *
 * `relocateHoistedCacheBoundary` keeps that hoist from destroying the client's prompt-cache
 * layout (#9436); both hoisting implementations share it.
 */

import { shouldUseMidConversationSystem } from "../../executors/claudeIdentity.ts";

export type HoistedCacheBoundary = "moved" | "kept" | "dropped";

/** Effective cache TTL of a `cache_control` value; Anthropic defaults to 5m when `ttl` is absent. */
function effectiveTtl(marker: unknown): string {
  const ttl = (marker as Record<string, unknown> | null | undefined)?.ttl;
  return typeof ttl === "string" ? ttl : "5m";
}

/**
 * Whether a content block can carry a cache breakpoint. Excludes blocks Anthropic does not accept
 * as one (thinking) and blocks the upstream normalisation discards or empties out anyway.
 */
function isCacheBreakpointTarget(block: unknown): block is Record<string, unknown> {
  if (block === null || typeof block !== "object") return false;
  const candidate = block as Record<string, unknown>;
  switch (candidate.type) {
    case "text":
      // Empty text blocks are stripped before the payload goes upstream.
      return typeof candidate.text === "string" && candidate.text.length > 0;
    case "tool_use":
    case "image":
    case "image_url":
    case "file":
    case "file_url":
    case "document":
      return true;
    case "tool_result": {
      // A tool_result that yields no text collapses to nothing during normalisation.
      const payload = candidate.content ?? candidate.text ?? candidate.output;
      if (typeof payload === "string") return payload.length > 0;
      if (Array.isArray(payload)) {
        // Only the non-empty text parts of the array survive; images and unknown parts do not.
        return payload.some((part) => {
          const text = (part as Record<string, unknown> | null)?.text;
          return (
            (part as Record<string, unknown> | null)?.type === "text" &&
            typeof text === "string" &&
            text.length > 0
          );
        });
      }
      return payload != null;
    }
    default:
      // thinking, redacted_thinking, and anything unrecognised.
      return false;
  }
}

/**
 * Preserves a message-level cache boundary when a marked system/developer block is hoisted into
 * top-level `system[]`.
 *
 * The marker is moved to the nearest preceding block that can carry a breakpoint. If that block is
 * already marked, both are kept — except where the hoisted marker, which ends up ahead of the
 * target in `system[]`, would put a 5m breakpoint before a 1h one; Anthropic requires the longer
 * TTL first, so the hoisted marker is dropped instead.
 *
 * @returns `"moved"` or `"dropped"` — the caller must remove the marker from the hoisted block;
 *          `"kept"` — the marker stays on it
 */
export function relocateHoistedCacheBoundary(
  marker: unknown,
  preceding: ReadonlyArray<{ content?: unknown }>
): HoistedCacheBoundary {
  for (let i = preceding.length - 1; i >= 0; i--) {
    const content = preceding[i]?.content;
    if (!Array.isArray(content)) continue;
    for (let j = content.length - 1; j >= 0; j--) {
      const block = content[j];
      if (!isCacheBreakpointTarget(block)) continue;
      if (block.cache_control == null) {
        block.cache_control = marker;
        return "moved";
      }
      // Occupied: overwriting would discard the client's own marker, and stepping further back
      // would only shorten the prefix — so both stay, unless the TTL order forbids it.
      return effectiveTtl(marker) === "5m" && effectiveTtl(block.cache_control) === "1h"
        ? "dropped"
        : "kept";
    }
  }
  return "kept";
}

export function extractSystemRoleMessages(
  payload: Record<string, unknown>,
  opts: { leadingOnly?: boolean } = {}
): void {
  if (!Array.isArray(payload.messages)) return;
  const messages = payload.messages as Array<{ role?: unknown; content?: unknown }>;
  // Treat both `system` and `developer` as system-equivalent (OpenAI's Responses
  // API renamed system → developer). Anthropic rejects either as a chat role, so
  // both must be lifted into the top-level `system` field — parity with the
  // normal-path extractSystemMessagesToBody closure.
  const isSystemRole = (role: unknown): boolean =>
    typeof role === "string" &&
    (role.toLowerCase() === "system" || role.toLowerCase() === "developer");

  // #9520: Anthropic rejects a `system`/`developer`-role message at messages[0] with a
  // hard 400 ("use the top-level 'system' parameter for the initial system prompt") —
  // only the directive-only form (empty content + output_config) is accepted inline at
  // any position. In `leadingOnly` mode we hoist just the contiguous run of system-role
  // messages starting at index 0 (the "initial system prompt" Anthropic requires
  // top-level) and leave any later, genuinely mid-conversation system-role message in
  // place — Opus accepts those behind its beta, and hoisting them would also break the
  // prompt-cache prefix (see the call site in chatCore.ts).
  let leadingRunEnd = messages.length;
  if (opts.leadingOnly) {
    leadingRunEnd = 0;
    while (leadingRunEnd < messages.length && isSystemRole(messages[leadingRunEnd]?.role)) {
      leadingRunEnd++;
    }
    if (leadingRunEnd === 0) return; // messages[0] isn't system/developer — nothing to hoist
  }
  const shouldExtract = (index: number, role: unknown): boolean =>
    opts.leadingOnly ? index < leadingRunEnd : isSystemRole(role);

  const systemMessages = messages.filter((m, i) => shouldExtract(i, m.role));
  if (systemMessages.length === 0) return;

  const extraBlocks: Array<Record<string, unknown>> = [];
  // Walk in order rather than over the filtered list: re-anchoring a hoisted `cache_control`
  // needs the messages that precede it and stay behind (#9436).
  const preceding: Array<{ content?: unknown }> = [];
  messages.forEach((sm, i) => {
    if (!shouldExtract(i, sm.role)) {
      preceding.push(sm);
      return;
    }
    if (typeof sm.content === "string" && sm.content.length > 0) {
      extraBlocks.push({ type: "text", text: sm.content });
    } else if (Array.isArray(sm.content)) {
      for (const block of sm.content as Array<Record<string, unknown>>) {
        if (block?.type === "text" && typeof block.text === "string" && block.text.length > 0) {
          const hoisted = { ...block };
          if (
            hoisted.cache_control != null &&
            relocateHoistedCacheBoundary(hoisted.cache_control, preceding) !== "kept"
          ) {
            delete hoisted.cache_control;
          }
          extraBlocks.push(hoisted);
        }
      }
    }
  });
  if (extraBlocks.length > 0) {
    const existingSystem = payload.system;
    if (typeof existingSystem === "string" && existingSystem.length > 0) {
      payload.system = [{ type: "text", text: existingSystem }, ...extraBlocks];
    } else if (Array.isArray(existingSystem)) {
      payload.system = [...(existingSystem as Array<Record<string, unknown>>), ...extraBlocks];
    } else {
      payload.system = extraBlocks;
    }
  }
  payload.messages = messages.filter((m, i) => !shouldExtract(i, m.role));
}

/**
 * Wraps the leading-vs-full-extraction decision for the Claude passthrough call site in
 * chatCore.ts, so it is unit-testable without pulling in the god-file's DB/credential
 * dependencies. Mirrors the (documented) intent at that call site:
 *
 * - Legacy Claude models reject ANY `system`/`developer`-role message → hoist all of them.
 * - Opus, when the request already has both `system` and `tools` and qualifies for the
 *   context-1m beta (`shouldUseMidConversationSystem`), is allowed to keep genuinely
 *   mid-conversation system-role messages in place (Anthropic accepts them under that
 *   beta, and hoisting them would break the prompt-cache prefix) — but #9520: Anthropic
 *   still hard-400s when the very first message (messages[0]) is `system`/`developer`;
 *   only the top-level `system` field (or the directive-only content:[] form) is valid
 *   there. So only the leading run gets hoisted in that case.
 */
export function extractSystemRoleMessagesForPassthrough(
  payload: Record<string, unknown>,
  provider: string | null | undefined,
  model?: string | null
): void {
  const leadingOnly = provider === "claude" && shouldUseMidConversationSystem(payload, model);
  extractSystemRoleMessages(payload, { leadingOnly });
}
