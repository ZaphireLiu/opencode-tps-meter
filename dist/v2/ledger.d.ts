/**
 * Durable throughput ledger, keyed by model.
 *
 * v1 could not do this at all: its TUI KV is documented as
 * `@deprecated Persistent TUI KV storage is not supported in V2`, so a v1 TUI plugin loses
 * every reading when the TUI exits. v2's `ctx.storage.store` persists to disk under a
 * cross-process lock and live-syncs to every running TUI window, so a rollup written by one
 * window is immediately visible in another.
 *
 * Degrades to an in-memory rollup when the host exposes no storage, so the dashboard still
 * works on a host that predates the API.
 *
 * @module v2/ledger
 */
import type { V2Storage } from "./types.js";
export interface LedgerEntry {
    /** Settled steps folded into this entry. */
    samples: number;
    /** Provider-reported tokens, summed. */
    tokens: number;
    /** Milliseconds spent generating those tokens, summed. Tool execution is never inside. */
    generationMs: number;
    /** Provider-reported cost, summed. */
    cost: number;
    /** Best single-step tokens/sec seen. */
    bestTps: number;
    /** Most recent step's tokens/sec. */
    lastTps: number;
    /** Mean time-to-first-token across samples with a measurement. */
    meanTtftMs: number;
    ttftSamples: number;
}
/** A model's learned heuristic-to-provider token ratio. See v2/metrics.ts. */
export interface CalibrationEntry {
    factor: number;
    samples: number;
    /** Heuristic tokens behind the factor. */
    weight?: number;
}
export interface LedgerData {
    version: number;
    models: Record<string, LedgerEntry>;
    /**
     * Per-model token calibration. Persisted so a new session's live rate is corrected from
     * its first token, instead of running uncalibrated until its first step settles.
     */
    calibration?: Record<string, CalibrationEntry>;
}
export interface StepMeasurement {
    modelKey: string;
    tokens: number;
    generationMs: number;
    cost: number;
    ttftMs: number;
}
export interface V2Ledger {
    /** Folds one settled step into the rollup. Interrupted turns must not be passed here. */
    record(measurement: StepMeasurement): void;
    read(): LedgerData;
    /** Mean tokens/sec for a model, or 0 when unmeasured. */
    meanTps(modelKey: string): number;
    /** Saved per-model calibration, to seed the meter at startup. */
    calibrations(): Record<string, CalibrationEntry>;
    recordCalibration(modelKey: string, entry: CalibrationEntry): void;
    /**
     * Clears the throughput rollup. Calibration is kept: it describes the model's tokenizer,
     * not its speed, and keeps refining itself step by step anyway.
     */
    clear(): void;
}
export declare function createLedger(storage?: V2Storage): V2Ledger;
//# sourceMappingURL=ledger.d.ts.map