/**
 * Token Counter Module for OpenCode TPS Meter
 *
 * Provides token counting implementations using heuristics.
 * No external dependencies - pure JavaScript implementation.
 *
 * @module tokenCounter
 */
import type { TokenCounter } from "./types.js";
/** Type for token counting algorithms */
export type TokenizerAlgorithm = "heuristic" | "word" | "code";
/**
 * Create a fast heuristic token counter.
 * Uses a simple approximation: Math.ceil(text.length / 4).
 *
 * This is useful for fast approximate token counting.
 *
 * Accuracy: ~75% for English text (tokens ≈ characters / 4)
 *
 * @returns {TokenCounter} - TokenCounter implementation
 * @deprecated Use createTokenizer('heuristic') instead
 */
export declare function createHeuristicCounter(): TokenCounter;
/**
 * Create a word-based heuristic token counter.
 * Uses approximation: Math.ceil(wordCount / 0.75).
 *
 * Better for English prose than character-based heuristics.
 *
 * Accuracy: ~80% for English prose
 *
 * @returns {TokenCounter} - TokenCounter implementation
 * @deprecated Use createTokenizer('word') instead
 */
export declare function createWordHeuristicCounter(): TokenCounter;
/**
 * Create a code-optimized heuristic token counter.
 * Uses approximation: Math.ceil(text.length / 3).
 *
 * Code typically has more tokens per character than prose.
 *
 * @returns {TokenCounter} - TokenCounter implementation
 * @deprecated Use createTokenizer('code') instead
 */
export declare function createCodeHeuristicCounter(): TokenCounter;
/**
 * Factory function to create a token counter instance.
 *
 * @param {'heuristic' | 'word' | 'code'} [preferred='heuristic'] - The preferred tokenizer type
 *   - 'heuristic': Use char/4 approximation (default, recommended)
 *   - 'word': Use word/0.75 approximation, better for prose
 *   - 'code': Use char/3 approximation, better for code
 * @returns {TokenCounter} - An instance of the requested token counter
 *
 * @example
 * // Create default heuristic tokenizer
 * const tokenizer = createTokenizer();
 * const count = tokenizer.count("Hello, world!");
 *
 * @example
 * // Create word-based tokenizer for prose
 * const wordTokenizer = createTokenizer('word');
 * const approxCount = wordTokenizer.count("Hello, world!");
 */
export declare function createTokenizer(algorithm?: TokenizerAlgorithm): TokenCounter;
/**
 * Convenience export for direct token counting using the default tokenizer.
 *
 * @param {string} text - The text to count tokens for
 * @returns {number} - The number of tokens
 *
 * @example
 * import { countTokens } from './tokenCounter';
 * const tokenCount = countTokens("Hello, world!");
 */
export declare function countTokens(text: string): number;
/**
 * Simple text encoding function (returns empty array - placeholder for compatibility)
 *
 * @param {string} text - The text to encode
 * @returns {number[]} - Array of token IDs (always empty in this implementation)
 */
export declare function encodeText(_text: string): number[];
export type { TokenCounter } from "./types.js";
/**
 * A counter that consumes a stream of deltas without ever re-reading what came before.
 *
 * The naive approach — accumulate the text and diff `count(before)` against `count(after)`
 * — is O(total) per delta and therefore O(n^2) per response. With the word heuristic that
 * measured 10.2s to absorb a 186k-character response; this absorbs the same stream in
 * roughly the time it takes to scan each chunk once.
 *
 * Counts are identical to the batch counters: chars/N uses ceil(totalChars / N), and the
 * word counter counts maximal non-whitespace runs, joining runs that straddle a chunk
 * boundary so "fo" + "x" stays one word.
 */
export interface IncrementalCounter {
    /** Returns how many whole tokens this delta added. */
    add(delta: string): number;
    /** Total tokens counted so far. */
    total(): number;
    reset(): void;
}
/** Creates an incremental counter matching the given batch algorithm. */
export declare function createIncrementalCounter(algorithm?: TokenizerAlgorithm): IncrementalCounter;
//# sourceMappingURL=tokenCounter.d.ts.map