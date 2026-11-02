/**
 * OpenCode v2 server plugin entry.
 *
 * Scope note: unlike v1, the v2 server context exposes no UI surface — there is no
 * `client`, no toast API, and no way to publish TUI events from a server plugin. The
 * meter therefore renders exclusively from the v2 TUI entry (src/v2/tui.tsx); this entry
 * exists so the package registers cleanly under v2's `plugins` array, and so measurements
 * only reachable below the streaming pipeline are available to embedders and tests.
 *
 * The v1 `toastFallback` option has no effect here.
 *
 * @module v2/server
 */
import { type V2Snapshot } from "./meter.js";
import type { V2Cleanup, V2PluginDefinition, V2ServerContext } from "./types.js";
/**
 * Wire-level latency per session.
 *
 * This is strictly below what the TUI can see. `session.text.delta` timing includes the
 * provider's queueing plus OpenCode's own streaming pipeline; the HTTP hooks measure the
 * request-dispatch to response-headers gap directly, which is the true network + queue
 * cost. v1 had no equivalent hook.
 */
export interface WireTiming {
    /** Milliseconds from provider request dispatch to response headers. */
    ttfbMs: number;
    /** Requests measured this session. */
    samples: number;
    providerID?: string;
}
/** Current per-session readings, or an empty map when the plugin is not running. */
export declare function getSnapshots(): ReadonlyMap<string, V2Snapshot>;
/**
 * Wire-level timings observed by the server half.
 *
 * NOTE: server and TUI are separate processes with no shared memory, so these numbers
 * cannot reach the on-screen meter as things stand. They are exposed for embedders and for
 * the day a plugin-owned channel between the two halves exists.
 */
export declare function getWireTimings(): ReadonlyMap<string, WireTiming>;
/**
 * v2 server setup. Returns a cleanup function; v2 calls it on disable, reload, and shutdown.
 */
export declare function setupServer(ctx: V2ServerContext): V2Cleanup | void;
/**
 * v2 server plugin definition. Structurally what `Plugin.define` from `@opencode-ai/plugin` returns.
 *
 * NOTE: do NOT add a `tui: true` field here. The v1-style loader validates plugin modules with
 * v1-era shape rules (`readV1Plugin` in packages/opencode/src/plugin/shared.ts): a `tui`
 * key, when present, must be a FUNCTION, and anything else throws
 * `Plugin <spec> has invalid tui export` — which silently kills the whole plugin load.
 * For registry (npm) packages the host discovers the TUI half through `package.json`
 * `exports["./tui"]`, never through a boolean flag on the server module. (For local `file://`
 * directories the loader ignores `exports` entirely and resolves `<dir>/tui.*` by file path —
 * see AGENTS.md constraint 7 — so the flag would be dead weight there too.)
 */
export declare const v2ServerPlugin: V2PluginDefinition<V2ServerContext>;
export default v2ServerPlugin;
//# sourceMappingURL=server.d.ts.map