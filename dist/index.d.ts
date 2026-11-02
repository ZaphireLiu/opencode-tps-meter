/**
 * OpenCode TPS Meter Plugin
 *
 * A live tokens-per-second meter for tracking AI token throughput in OpenCode.
 *
 * @module opencode-tps-meter
 */
import type { PluginContext, PluginHandlers } from "./types.js";
import type { V2Cleanup, V2ServerContext, V2TuiContext } from "./v2/types.js";
/**
 * Main plugin function that initializes the TPS meter
 *
 * @param {PluginContext} context - Plugin context from OpenCode framework
 * @returns {PluginHandlers | Record<string, never>} - Event handlers or empty object if disabled
 */
declare function TpsMeterPlugin(context: PluginContext): PluginHandlers | Record<string, never>;
/**
 * Dual-host server entry.
 *
 * Exported as an OBJECT, not a bare function. v2 validates the default export against a
 * schema that requires an object and rejects a callable with
 * `SchemaError(Expected object at ["default"])`, so the older v1 bare-function style cannot
 * load there. v1's own `PluginModule` is `{ id?, server }`, so one object satisfies both:
 * v1 reads `server`, v2 reads `setup`, and each ignores the other's key.
 *
 * `setup` dispatches on the context it receives: v2's TUI process loads a package's ROOT
 * export, so this same module is asked to be the TUI plugin there and the server plugin in
 * the service. See src/v2/dispatch.ts.
 */
type DualHostServerModule = {
    id: string;
    server: typeof TpsMeterPlugin;
    setup: (ctx: V2ServerContext | V2TuiContext) => Promise<V2Cleanup | void>;
};
declare const plugin: DualHostServerModule;
export default plugin;
export type { BufferEntry, TPSTrackerOptions, TPSTracker, UIManager, TokenCounter, Config, OpenCodeClient, DisplayState, AgentDisplayState, AgentIdentity, PluginContext, Logger, MessageEvent, PluginHandlers, } from "./types.js";
//# sourceMappingURL=index.d.ts.map