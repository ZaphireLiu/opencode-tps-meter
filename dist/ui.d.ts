/**
 * UI Manager for OpenCode TPS Meter Extension
 * Handles display of token processing statistics with throttling and dual-mode support
 */
import type { Config, OpenCodeClient, UIManager as IUIManager } from "./types.js";
/**
 * Creates a UIManager instance
 *
 * Handles display of token processing statistics with throttling and dual-mode support
 * (status bar primary, toast fallback)
 *
 * @param client - OpenCode client object with TUI and toast capabilities
 * @param config - Configuration options
 * @returns UIManager instance
 */
export declare function createUIManager(client: OpenCodeClient, config: Config): IUIManager;
export default createUIManager;
//# sourceMappingURL=ui.d.ts.map