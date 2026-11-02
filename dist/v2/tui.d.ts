/**
 * OpenCode v2 TUI plugin — the persistent TPS meter for `opencode2`.
 *
 * Differences from the v1 TUI entry (src/tui.tsx):
 *
 *   v1 `{ id, tui(api, options, meta) }`   -> v2 `{ id, setup(ctx) }`
 *   v1 `api.slots.register({ slots })`     -> v2 `ctx.ui.slot(claim)`
 *   v1 slot `session_prompt_right`         -> v2 `prompt.footer.status`
 *   v1 `props.session_id` (required)       -> v2 `input.sessionID` (optional)
 *   v1 `api.event.on`                      -> v2 `ctx.data.on`
 *   v1 `api.theme.current.<token>`         -> v2 `ctx.theme`, normalized by
 *                                                `normalizeTheme` into `text.<token>`
 *   v1 `api.lifecycle.onDispose(fn)`       -> v2 return cleanup from `setup`
 *
 * Surfaces beyond v1's single status string: a sidebar panel breaking throughput down per
 * subagent, a full-screen dashboard over the durable ledger, and palette/slash commands.
 *
 * @module v2/tui
 */
import type { Config } from "../types.js";
import type { V2Cleanup, V2PluginDefinition, V2ResolvedTheme, V2Rgba, V2TuiContext } from "./types.js";
/**
 * Normalizes the host theme into the shape the rest of this file renders with.
 *
 * The v2 theme leaf names drifted between releases: early v2 builds exposed
 * `theme.text.default` / `theme.text.subdued` /
 * `theme.text.feedback.<kind>.default`, while current hosts (per
 * `@opencode/theme`'s `ResolvedTheme` type) expose `theme.text.base` /
 * `theme.text.muted` / `theme.text.feedback.<kind>.base`. Resolve the current
 * names first and fall back to the older ones, so the meter is colored on
 * either host. Anything still unresolvable degrades to `undefined` (host
 * default color), never a throw.
 *
 * The theme is read LAZILY through the supplied getter. On the host `ctx.theme` is a live
 * getter over the current token set, so resolving it once at setup time would freeze the
 * meter at whatever theme was active then — a theme switch would not recolor it until the
 * TUI restarted. Reading through the getter keeps every property access reactive, the same
 * way the host's own plugins read `ctx.theme` at render time.
 */
export declare function normalizeTheme(getTheme: () => V2ResolvedTheme): V2ResolvedTheme;
/**
 * Maps a reading onto v2's nested theme tokens.
 * v1's flat `error`/`warning`/`success` moved under `text.feedback.<kind>.default`,
 * and `textMuted` became `text.subdued`.
 */
export declare function colorForSnapshot(theme: V2ResolvedTheme, config: Config, reading: {
    readonly active: boolean;
    readonly instantTps: number;
}): V2Rgba;
/**
 * v2 TUI setup. Returns a cleanup function; v2 calls it on disable, reload, and shutdown.
 */
export declare function setupTui(ctx: V2TuiContext): V2Cleanup | void;
/** v2 TUI plugin definition. Structurally what `Plugin.define` from `@opencode-ai/plugin/tui` returns. */
export declare const v2TuiPlugin: V2PluginDefinition<V2TuiContext>;
export default v2TuiPlugin;
//# sourceMappingURL=tui.d.ts.map