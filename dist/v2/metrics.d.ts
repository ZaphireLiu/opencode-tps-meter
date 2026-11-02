/**
 * Tier-2 metrics for OpenCode v2: tokenizer calibration and turn decomposition.
 *
 * All of this is impossible on v1, for two structural reasons:
 *
 * - v1 events carry no timestamps at all, so tool execution could not be separated from
 *   model generation and time-to-first-token could not be measured.
 * - v1's StepStartPart carries neither the model nor the agent, so throughput could not be
 *   attributed. v2's session.step.started carries both.
 *
 * @module v2/metrics
 */
import type { V2ModelRef } from "./types.js";
export interface TurnMetrics {
    /** Milliseconds from turn start to the first streamed token. 0 when unknown. */
    ttftMs: number;
    /** Milliseconds spent inside tool execution during this turn. */
    toolMs: number;
    /** True when the turn was aborted; its numbers should not be trusted. */
    interrupted: boolean;
}
export interface ModelAttribution {
    /** `providerID/modelID[#variant]`, or "default" before any step.started is seen. */
    key: string;
    model?: V2ModelRef;
    agent?: string;
}
export interface Calibration {
    factor: number;
    samples: number;
    /** Heuristic tokens behind the factor, capped at CALIBRATION_MEMORY_TOKENS. */
    weight?: number;
}
export interface MetricsOptions {
    /** Per-model calibration learned in earlier sessions. Out-of-band entries are ignored. */
    readonly initial?: Readonly<Record<string, Calibration>>;
    /** Called after every accepted sample, so the caller can persist the new factor. */
    readonly onCalibrated?: (modelKey: string, calibration: Calibration) => void;
}
export interface V2Metrics {
    onExecutionStarted(sessionID: string, at: number): void;
    onExecutionSettled(sessionID: string, interrupted: boolean): void;
    onStepStarted(sessionID: string, model: V2ModelRef | undefined, agent: string | undefined): void;
    onToolCalled(sessionID: string, callID: string, at: number): void;
    onToolSettled(sessionID: string, callID: string, at: number): void;
    onFirstToken(sessionID: string, at: number): void;
    /** Applies the learned factor to a raw heuristic count, carrying the remainder. */
    scale(sessionID: string, rawTokens: number): number;
    /** Folds one step's ground truth into the calibration for its model. */
    calibrate(sessionID: string, realTokens: number): void;
    turnOf(sessionID: string): TurnMetrics;
    attributionOf(sessionID: string): ModelAttribution;
    /** Samples recorded for this session's current model. */
    samplesOf(sessionID: string): number;
    resetTurn(sessionID: string): void;
    forget(sessionID: string): void;
    dispose(): void;
}
export declare function createMetrics(options?: MetricsOptions): V2Metrics;
//# sourceMappingURL=metrics.d.ts.map