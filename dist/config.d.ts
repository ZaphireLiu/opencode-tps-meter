/**
 * Configuration management for OpenCode TPS Meter Plugin
 *
 * Handles loading configuration from multiple sources in priority order:
 * 1. Project-level config (.opencode/tps-meter.json)
 * 2. Global config (~/.config/opencode/tps-meter.json)
 * 3. Environment variables (TPS_METER_*)
 *
 * @module config
 */
import type { Config } from "./types.js";
/**
 * Default configuration values
 * Used when no config file is found or values are missing
 *
 * @constant {Config}
 */
export declare const defaultConfig: Config;
/**
 * Loads configuration from multiple sources in priority order:
 * 1. .opencode/tps-meter.json (project-level)
 * 2. ~/.config/opencode/tps-meter.json (global)
 * 3. Environment variables (TPS_METER_*)
 * 4. Inline overrides (v2 plugin `options`)
 *
 * Later sources override earlier ones.
 *
 * @returns {Config} - Resolved configuration with all defaults applied
 *
 * @example
 * const config = loadConfigSync();
 * if (config.enabled) {
 *   // Initialize plugin
 * }
 */
export declare function loadConfigSync(overrides?: Partial<Config>): Config;
/**
 * Exports default config for external access
 * @deprecated Use loadConfigSync() to get resolved configuration
 */
export { defaultConfig as config };
/**
 * Backwards-compatible alias for loadConfigSync
 * @deprecated Use loadConfigSync() instead
 */
export { loadConfigSync as loadConfig };
//# sourceMappingURL=config.d.ts.map