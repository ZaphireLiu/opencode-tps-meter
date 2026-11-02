/**
 * Token throughput tracking, shared by v1 and v2.
 *
 * Every recorded chunk carries the interval it was GENERATED in, not just the moment it
 * arrived. Hosts batch output before publishing it (v2 flushes text every ~100ms), so a
 * chunk's tokens were produced between the previous chunk and this one. Dividing a chunk by
 * anything shorter is what produced readings like 10,000 TPS.
 *
 * The opening chunk of a stream is the special case: it was generated over an interval the
 * meter never saw (from request start, through any prefill, to its arrival). It counts toward
 * the token total but never toward a rate.
 *
 * All maths uses the timestamps the caller records with, so one tracker never mixes clocks:
 * v2 passes host event times, v1 passes local time.
 */
import type { TPSTrackerOptions, TPSTracker } from "./types.js";
/**
 * A settled step's average, corrected by the provider's exact token count.
 *
 * The streamed average divides heuristic tokens by the time they streamed over, so both
 * sides describe the same output. When the provider's count of that same output
 * (`providerVisible`: output, plus reasoning only if reasoning actually streamed) is close
 * to the heuristic's, it replaces the heuristic's estimate. When it is far off, the two are
 * not counting the same thing, and the streamed figure stands.
 */
export declare function correctedAverage(streamedAvg: number, streamedTokens: number, providerVisible: number): number;
export declare function createTracker(options?: TPSTrackerOptions): TPSTracker;
//# sourceMappingURL=tracker.d.ts.map