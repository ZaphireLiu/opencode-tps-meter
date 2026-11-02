/**
 * Context-dispatching v2 setup.
 *
 * v2 gives server and TUI plugins the identical `{ id, setup }` signature, and the TUI
 * process loads a plugin package's ROOT export (verified against `opencode2` beta 17639,
 * and matching how other v2 TUI plugins lay out their package.json). So the root module
 * must serve whichever process loads it, and can only tell them apart by the context it
 * is handed:
 *
 *   TUI context    -> has `ui.slot` + `data.on`
 *   server context -> has `event.subscribe`
 *
 * The TUI module is loaded with a DYNAMIC import on purpose. Importing `@opentui/solid`
 * inside the service process throws
 * `Error: Environment variable "OPENTUI_FORCE_WCWIDTH" is already registered`, which kills
 * the plugin load. Keeping it behind a runtime import means the service never touches it.
 *
 * @module v2/dispatch
 */
import type { V2Cleanup, V2ServerContext, V2TuiContext } from "./types.js";
/**
 * Routes a v2 `setup` call to the TUI or server implementation based on the context shape.
 * Returns nothing for an unrecognised context rather than throwing, so an API change in the
 * beta degrades to "no meter" instead of a failed plugin load.
 */
export declare function setupAuto(ctx: V2TuiContext | V2ServerContext): Promise<V2Cleanup | void>;
//# sourceMappingURL=dispatch.d.ts.map