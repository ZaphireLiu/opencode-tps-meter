/**
 * Multi-session aggregation for the footer meter.
 *
 * Pure logic with no JSX and no host dependencies, so it is unit-testable without a
 * renderer and shared by both hosts: the v2 TUI supplies `ctx.data.session`, the v1 TUI
 * supplies `api.state.session` — this module just selects, labels, orders and formats.
 *
 * @module v2/family
 */
/**
 * Minimal reading shape the aggregation needs.
 *
 * Structural on purpose: both hosts feed their own snapshot types in (v2's V2Snapshot,
 * v1's TuiSnapshot), so the footer renders identically on `opencode` and `opencode2`.
 */
export interface FamilyReading {
    readonly instantTps: number;
    readonly avgTps: number;
    readonly active: boolean;
    /**
     * LOCAL-clock time of the most recent token — the consumer's own `Date.now()`, never the
     * host event clock. It is compared against the caller's `now`, and the host clock can be
     * skewed (v2's eventTime tolerates up to a day), so a host stamp would make finished
     * subagents vanish instantly or linger far too long.
     */
    readonly lastActivityAt: number;
    /**
     * When this session first produced tokens in its current run. Children render in this
     * order so concurrent streams never swap positions. Only ever compared against siblings,
     * so it may use either clock as long as one host uses one clock.
     */
    readonly startedAt: number;
}
/**
 * How long a finished subagent stays visible in the aggregate line before dropping off.
 *
 * Subagents finish between tool calls all the time; dropping them the instant they settle
 * makes the line flicker. ~4s keeps completed entries readable while honouring the 3-5s
 * disappearance window.
 */
export declare const SUBAGENT_LINGER_MS = 4000;
/** Maximum agent entries rendered before the remainder collapses into `+N`. */
export declare const MAX_METER_ENTRIES = 4;
/** One agent's contribution to the aggregate footer line. */
export interface AgentMeterEntry {
    readonly sessionID: string;
    /** "main" for the root session; otherwise the agent name or a short session id. */
    readonly label: string;
    readonly isRoot: boolean;
    /** Live rate while generating; the frozen average otherwise. */
    readonly tps: number;
    /** Instantaneous rate at the last publish — the component of Σ while generating. */
    readonly instantTps: number;
    /** Producing tokens right now (see isGenerating). Only these entries count toward Σ. */
    readonly generating: boolean;
}
/** Short fallback identifier when no agent name is available. Same convention as the sidebar. */
export declare function shortSessionLabel(sessionID: string): string;
/**
 * Whether a reading is producing tokens right now.
 *
 * `active` alone cannot answer this, because it means something different on each host:
 * v1 keeps a session active until its assistant message completes — straight through its
 * own tool calls, and through the root's wait on its subagents — and a session that crashes
 * or is cancelled mid-stream never leaves it at all. Meanwhile the stored instantTps is
 * frozen at the last publish. A reading with no token inside the rolling window has, by the
 * meter's own definition, an instantaneous rate of zero, so recency is what decides.
 */
export declare function isGenerating(reading: FamilyReading, now: number, windowMs: number): boolean;
/**
 * Selects and orders the family sessions worth showing.
 *
 * The root always qualifies if it has a reading — its frozen summary persisting after the
 * turn ends IS the single-agent behaviour the meter has always had. Children qualify while
 * generating, within SUBAGENT_LINGER_MS of their last token, or while the host still reports
 * them running: a subagent inside a long tool call has produced no token for a while, but
 * it has not finished, and dropping it would flip the line back to the single-session
 * layout and then to Σ again. A session that died without a terminal event stops
 * generating and ages out, however its `active` flag was left.
 *
 * Ordering: root first, then children in SPAWN order. Recency-based ordering was tried and
 * rejected: as subagents trade the "most recent token" crown their columns swap places,
 * which reads as flicker. Spawn order is stable for the whole fan-out; a session that
 * finishes (goes idle) and is re-dispatched counts as a new spawn — both hosts clear its
 * spawn stamp on idle — and rejoins at the end.
 */
export declare function collectMeterEntries(options: {
    rootID: string;
    memberIDs: readonly string[];
    snapshots: ReadonlyMap<string, FamilyReading>;
    /** Resolves an agent display name, e.g. from `ctx.data.session.get(id)?.agent`. */
    agentOf?: (sessionID: string) => string | undefined;
    /** Host run status: true while the session is still working, e.g. inside a tool call. */
    isRunning?: (sessionID: string) => boolean | undefined;
    now: number;
    /** Token recency that counts as generating; pass the meter's rolling window. */
    generatingWindowMs?: number;
}): AgentMeterEntry[];
/** True once work has fanned out — i.e. at least one non-root entry qualifies. */
export declare function hasSubagentEntries(entries: readonly AgentMeterEntry[]): boolean;
/**
 * What the aggregate line is coloured by.
 *
 * Live only while something generates, at the MEAN per-stream rate: the slow/fast
 * thresholds are per-stream figures, so colouring by Σ would read four healthy streams as
 * one very fast one — and colouring by the selected session (usually the waiting root)
 * would dim or redden the line for the whole fan-out.
 */
export declare function aggregateReading(entries: readonly AgentMeterEntry[]): {
    readonly active: boolean;
    readonly instantTps: number;
};
/**
 * Renders the aggregate line:
 *
 *   TPS Σ 318 | main 63 | explore 91 | general 86 | reviewer 78 | +2
 *
 * Σ sums every entry generating right now, the root included: while the root waits on its
 * subagents it is not generating, so it drops out on its own, and once it resumes (say, to
 * summarise their results) its throughput is real and counts. Entries that are lingering or
 * sitting in a tool call show their frozen average and contribute nothing.
 */
export declare function formatAggregateLine(entries: readonly AgentMeterEntry[]): string;
/**
 * Order-sensitive id-list equality, for memos keyed on "which sessions have a reading".
 *
 * Snapshot maps are rebuilt on every publish, but their key order is insertion order and
 * republishing an existing key keeps its slot, so the list only changes when a session
 * gains or loses a reading. Family resolution keys off this instead of the snapshots.
 */
export declare function sameIDs(a: readonly string[], b: readonly string[]): boolean;
//# sourceMappingURL=family.d.ts.map