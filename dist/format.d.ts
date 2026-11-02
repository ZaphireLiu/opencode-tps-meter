/**
 * Shared meter text formatting.
 *
 * Used by both the v1 and v2 TUI entry points so the two hosts render identical text.
 *
 * @module format
 */
import type { Config } from "./types.js";
/** Minimum shape needed to render a meter reading, satisfied by v1 and v2 snapshots alike. */
export interface MeterReading {
    instantTps: number;
    avgTps: number;
    totalTokens: number;
    elapsedMs: number;
    /** True while tokens are actively streaming. */
    active: boolean;
    /** Prompt tokens served from the cache (provider-reported). */
    cacheReadTokens?: number;
    /** Prompt tokens written to the cache (provider-reported). */
    cacheWriteTokens?: number;
    /** Uncached prompt input tokens (provider-reported). */
    inputTokens?: number;
    /** Cached prompt tokens summed over the whole session (provider-reported). */
    sessionCacheReadTokens?: number;
    /** Prompt tokens written to the cache over the whole session (provider-reported). */
    sessionCacheWriteTokens?: number;
    /** Uncached prompt input tokens over the whole session (provider-reported). */
    sessionInputTokens?: number;
}
/**
 * Prompt cache hit rate in the range 0..1, or null when no prompt accounting is known.
 *
 * OpenCode's `tokens.input` excludes cache reads and writes (verified against the session
 * store: `total === input + output + reasoning + cache.read + cache.write`), so the whole
 * prompt side is `input + read + write` and the hit rate is the cached share of it.
 */
export declare function cacheHitRatio(reading: Pick<MeterReading, "cacheReadTokens" | "cacheWriteTokens" | "inputTokens">): number | null;
/**
 * Formats a 0..1 ratio as a whole-percent string, e.g. "91%".
 *
 * Rounding must never cross the 100 boundary. A ratio of 0.9967 is not a full cache hit,
 * yet whole-percent rounding turns it into "100%", claiming the whole prompt came from
 * cache while 40 of its 12040 tokens did not. A ratio below 1 that rounds to 100
 * therefore reads 99%; only an exact 1 reads "100%".
 */
export declare function formatCachePercent(ratio: number): string;
/** Formats the latest step's cache hit rate as a whole-percent string, e.g. "91%". */
export declare function formatCacheHit(reading: MeterReading): string | null;
/**
 * Session-wide cache hit rate, aggregated over every reported step.
 *
 * Unlike `formatCacheHit` (which reflects only the latest step), this survives across
 * steps, so it stays on screen while the next step streams and answers "how much of all
 * prompt tokens this session were cache reads".
 */
export declare function formatSessionCacheHit(reading: MeterReading): string | null;
/** Formats a token count with thousands separators. */
export declare function formatNumber(value: number): string;
/** Formats milliseconds as MM:SS. */
export declare function formatElapsedTime(ms: number): string;
/**
 * Renders the meter line.
 *
 * While streaming, the leading figure is the rolling instantaneous rate; once the turn
 * settles it becomes the average, so a frozen meter reads as a summary rather than a
 * stale live value.
 *
 * With `streamOnlyTps`, the rate is treated as a streaming-only signal: a generating step
 * renders only that rate, and a settled step drops both the rate and the average, leaving
 * the usage summary (tokens, cache, and any extra fields added by the host).
 */
export declare function formatMeterText(reading: MeterReading, config: Config): string;
//# sourceMappingURL=format.d.ts.map