/**
 * Agent-name extraction from v1 message payloads.
 *
 * Shared by the v1 server plugin (src/index.ts) and the v1 TUI footer (src/tui.tsx) so the
 * same session never gets two different labels. v2 does not need this: `ctx.data.session`
 * serves the agent name directly.
 *
 * @module agentName
 */
/**
 * Extracts an agent name from whatever a v1 message payload carries.
 *
 * v1 has drifted here across releases: newer SDK builds put a plain `agent` string on
 * messages (and `mode` on assistant messages), while older ones carry an `AgentIdentity`
 * object or a legacy `agentType`. Precedence, most specific first:
 *
 *   1. `agent` as a plain string
 *   2. `agent` as an AgentIdentity — `type` (the lowercase identifier, e.g. "explore")
 *      before `name` (the display name, e.g. "Explore Agent") before `id`
 *   3. legacy `agentType`
 *   4. assistant `mode`
 */
export declare function agentNameFromMessage(info: unknown): string | undefined;
//# sourceMappingURL=agentName.d.ts.map