import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { V2Cleanup, V2TuiContext } from "./v2/types.js";
/**
 * Dual-host TUI entry.
 *
 * v1 reads `tui`; v2 reads `setup`. Both hosts ignore the key they do not know, so one
 * module serves `opencode` and `opencode2`. v2 users can also point at the dedicated
 * `opencode-tps-meter/v2/tui` entry, which carries no v1 baggage.
 */
type DualHostTuiModule = TuiPluginModule & {
    setup: (ctx: V2TuiContext) => V2Cleanup | void;
};
declare const plugin: DualHostTuiModule;
export default plugin;
//# sourceMappingURL=tui.d.ts.map