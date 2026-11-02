/**
 * Session tracking core for OpenCode v2.
 *
 * Framework-free so both the v2 TUI entry and the v2 server entry can drive it.
 * Mirrors the v1 TUI state machine (see src/tui.tsx) so displayed numbers stay
 * consistent across hosts, but consumes the v2 event vocabulary:
 *
 *   v1 message.part.delta (field "text")  -> v2 session.text.delta
 *   v1 message.part.updated               -> v2 session.text.delta / session.reasoning.delta
 *   v1 message.updated (time.completed)   -> v2 session.step.ended
 *   v1 session.idle                       -> v2 session.idle  (unchanged)
 *
 * Unlike v1 there is no role filtering: text/reasoning deltas are assistant output by
 * construction, so the message-role and part-type caches are gone.
 *
 * @module v2/meter
 */
import { type Calibration } from "./metrics.js";
import type { Config } from "../types.js";
import type { V2UnknownEvent } from "./types.js";
/** A rendered view of one session's throughput. */
export interface V2Snapshot {
    sessionID: string;
    instantTps: number;
    avgTps: number;
    totalTokens: number;
    elapsedMs: number;
    /** True while tokens are actively streaming; false once the turn settles. */
    active: boolean;
    /**
     * Tokens the session spent that no step reported: auto-title generation and context
     * compaction. Derived as (cumulative session usage - sum of observed step deltas), so it
     * is only meaningful once at least one session.usage.updated has arrived. 0 when unknown.
     */
    overheadTokens: number;
    /** Milliseconds from turn start to first streamed token. 0 when unknown. */
    ttftMs: number;
    /** Milliseconds this turn spent inside tool execution. */
    toolMs: number;
    /**
     * The model's generation rate. Tool execution happens between steps, never inside a
     * step's measured window, so this equals the step average; kept for the dashboard.
     */
    generationTps: number;
    /** `providerID/modelID[#variant]`, or "default" before attribution arrives. */
    modelKey: string;
    /** Agent that produced the current step, when known. */
    agent?: string;
    /** Calibration samples backing this model's live estimate. 0 = uncalibrated. */
    calibrationSamples: number;
    /** True when the turn was aborted; the reading is not trustworthy. */
    interrupted: boolean;
    /** Prompt tokens served from the cache this step (provider-reported). */
    cacheReadTokens: number;
    /** Prompt tokens written to the cache this step (provider-reported). */
    cacheWriteTokens: number;
    /** Uncached prompt input tokens this step (provider-reported). */
    inputTokens: number;
    /** Cached prompt tokens summed over every reported step this session. */
    sessionCacheReadTokens: number;
    /** Prompt tokens written to the cache over every reported step this session. */
    sessionCacheWriteTokens: number;
    /** Uncached prompt input tokens over every reported step this session. */
    sessionInputTokens: number;
    /**
     * LOCAL wall-clock time of this session's most recent token (or of its settling step end).
     *
     * Lets consumers age out readings themselves (the footer drops finished subagents after
     * a few seconds) without re-deriving activity from event streams they never see. It is
     * deliberately NOT the host event clock that token maths uses: consumers compare it
     * against their own Date.now(), and a remote or containerised service can be seconds off.
     */
    lastActivityAt: number;
    /**
     * Host-clock time of this session's first token in its current RUN — surviving the
     * per-step resets between tool calls, cleared when the session goes idle. The footer
     * renders children in this order, so columns hold still through tool calls, while a
     * finished session that is re-dispatched rejoins at the end. Only ever compared against
     * sibling stamps, which share the host clock.
     */
    startedAt: number;
}
/** One settled step, emitted for durable rollups. Interrupted turns are never emitted. */
export interface V2StepMeasurement {
    sessionID: string;
    modelKey: string;
    agent?: string;
    tokens: number;
    /** Time spent generating `tokens`, implied by the step's measured rate. */
    generationMs: number;
    cost: number;
    ttftMs: number;
}
export interface V2MeterHooks {
    readonly onStepSettled?: (measurement: V2StepMeasurement) => void;
    /** Per-model token calibration saved by an earlier session. */
    readonly initialCalibration?: Readonly<Record<string, Calibration>>;
    /** A model's calibration changed; persist it so the next session starts calibrated. */
    readonly onCalibrated?: (modelKey: string, calibration: Calibration) => void;
}
export interface V2Meter {
    /** Feeds one event in. Unrecognised events are ignored. */
    handleEvent(event: V2UnknownEvent): void;
    /** Current snapshot per session. */
    getSnapshots(): ReadonlyMap<string, V2Snapshot>;
    /** Subscribes to snapshot changes. Returns an unsubscribe function. */
    subscribe(listener: (snapshots: ReadonlyMap<string, V2Snapshot>) => void): () => void;
    /** Clears all timers and state. */
    dispose(): void;
}
export declare function createMeter(config: Config, hooks?: V2MeterHooks): V2Meter;
//# sourceMappingURL=meter.d.ts.map