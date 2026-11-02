// src/agentName.ts
function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function agentNameFromMessage(info) {
  if (!info || typeof info !== "object") {
    return;
  }
  const record = info;
  const agent = record.agent;
  const direct = nonEmpty(agent);
  if (direct) {
    return direct;
  }
  if (agent && typeof agent === "object") {
    const identity = agent;
    const named = nonEmpty(identity.type) ?? nonEmpty(identity.name) ?? nonEmpty(identity.id);
    if (named) {
      return named;
    }
  }
  return nonEmpty(record.agentType) ?? nonEmpty(record.mode);
}

// src/constants.ts
var DEFAULT_INITIAL_DISPLAY_DELAY_MS = 10;
var DEFAULT_ROLLING_WINDOW_MS = 1000;
var MAX_BUFFER_SIZE = 256;
var MIN_RATE_SPAN_MS = 50;
var MIN_PROVIDER_RATIO = 0.5;
var MAX_PROVIDER_RATIO = 2;
var DEFAULT_UPDATE_INTERVAL_MS = 50;
var V2_UPDATE_INTERVAL_MS = 8;
var AGGREGATE_TICK_INTERVAL_MS = 500;
var STALL_REPUBLISH_MS = 250;
var MIN_TOAST_INTERVAL_MS = 80;
var DEFAULT_TOAST_DURATION_MS = 20000;
var FINAL_STATS_DURATION_MS = 2000;
var MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;
var MAX_RETAINED_SNAPSHOTS = 64;
var MAX_REMEMBERED_SESSIONS = 256;
var CLEANUP_INTERVAL_MS = 30000;
var CHARS_DIV_4 = 4;
var CHARS_DIV_3 = 3;
var WORDS_DIV_0_75 = 0.75;
var DEFAULT_SLOW_TPS_THRESHOLD = 10;
var DEFAULT_FAST_TPS_THRESHOLD = 50;
var TOOL_CALL_FINISH_REASON = "tool-calls";
var INVALID_FINISH_REASONS = new Set([TOOL_CALL_FINISH_REASON, "unknown"]);
var COUNTABLE_PART_TYPES = new Set(["text", "reasoning"]);

// src/tracker.ts
function correctedAverage(streamedAvg, streamedTokens, providerVisible) {
  if (!(streamedAvg > 0) || !(streamedTokens > 0) || !(providerVisible > 0)) {
    return streamedAvg > 0 ? streamedAvg : 0;
  }
  const ratio = providerVisible / streamedTokens;
  return ratio >= MIN_PROVIDER_RATIO && ratio <= MAX_PROVIDER_RATIO ? streamedAvg * ratio : streamedAvg;
}
function createTracker(options = {}) {
  const sessionId = options.sessionId;
  const windowMs = typeof options.rollingWindowMs === "number" && options.rollingWindowMs > 0 ? options.rollingWindowMs : DEFAULT_ROLLING_WINDOW_MS;
  let entries = [];
  let totalTokens = 0;
  let ratedTokens = 0;
  let origin = null;
  let lastAt = null;
  function prune() {
    if (lastAt === null) {
      return;
    }
    const cutoff = lastAt - windowMs;
    let drop = 0;
    while (drop < entries.length && entries[drop].at <= cutoff) {
      drop++;
    }
    if (drop > 0) {
      entries.splice(0, drop);
    }
    while (entries.length > MAX_BUFFER_SIZE) {
      const [a, b] = entries;
      entries.splice(0, 2, { from: Math.min(a.from, b.from), at: b.at, count: a.count + b.count });
    }
  }
  function rateAt(now) {
    if (origin === null) {
      return null;
    }
    const start = Math.max(now - windowMs, origin);
    const spanMs = now - start;
    if (spanMs < MIN_RATE_SPAN_MS) {
      return null;
    }
    let tokens = 0;
    for (const entry of entries) {
      if (entry.at <= start || entry.from >= now) {
        continue;
      }
      const length = entry.at - entry.from;
      const overlap = Math.min(entry.at, now) - Math.max(entry.from, start);
      tokens += length > 0 ? entry.count * overlap / length : entry.count;
    }
    return tokens / (spanMs / 1000);
  }
  return {
    recordTokens(count, timestamp) {
      if (!(count > 0)) {
        return;
      }
      const at = Math.max(timestamp ?? Date.now(), lastAt ?? -Infinity);
      totalTokens += count;
      if (lastAt === null || ratedTokens === 0 && at === lastAt) {
        origin = at;
        lastAt = at;
        return;
      }
      entries.push({ from: lastAt, at, count });
      lastAt = at;
      ratedTokens += count;
      prune();
    },
    getInstantTPS(now) {
      return lastAt === null ? 0 : rateAt(now ?? lastAt) ?? 0;
    },
    getSmoothedTPS() {
      return lastAt === null ? 0 : rateAt(lastAt) ?? 0;
    },
    getAverageTPS() {
      if (origin === null || lastAt === null) {
        return 0;
      }
      const spanMs = lastAt - origin;
      return spanMs >= MIN_RATE_SPAN_MS ? ratedTokens / (spanMs / 1000) : 0;
    },
    isRateReady() {
      return lastAt !== null && rateAt(lastAt) !== null;
    },
    getTotalTokens() {
      return totalTokens;
    },
    getElapsedMs() {
      return origin === null || lastAt === null ? 0 : lastAt - origin;
    },
    getSessionId() {
      return sessionId;
    },
    reset() {
      entries = [];
      totalTokens = 0;
      ratedTokens = 0;
      origin = null;
      lastAt = null;
    },
    getBufferSize() {
      return entries.length;
    },
    getMaxBufferSize() {
      return MAX_BUFFER_SIZE;
    },
    getWindowMs() {
      return windowMs;
    }
  };
}

// src/format.ts
function cacheHitRatio(reading) {
  const read = reading.cacheReadTokens ?? 0;
  const write = reading.cacheWriteTokens ?? 0;
  const input = reading.inputTokens ?? 0;
  const promptTokens = read + write + input;
  if (promptTokens <= 0) {
    return null;
  }
  return read / promptTokens;
}
function formatCachePercent(ratio) {
  const percent = Math.round(ratio * 100);
  return `${ratio < 1 && percent > 99 ? 99 : percent}%`;
}
function formatCacheHit(reading) {
  const ratio = cacheHitRatio(reading);
  return ratio === null ? null : formatCachePercent(ratio);
}
function formatSessionCacheHit(reading) {
  const ratio = cacheHitRatio({
    cacheReadTokens: reading.sessionCacheReadTokens,
    cacheWriteTokens: reading.sessionCacheWriteTokens,
    inputTokens: reading.sessionInputTokens
  });
  return ratio === null ? null : formatCachePercent(ratio);
}
function formatNumber(value) {
  return value.toLocaleString("en-US");
}
function formatElapsedTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
function formatMeterText(reading, config) {
  const parts = [];
  const streaming = reading.active;
  const displayTps = streaming ? reading.instantTps : reading.avgTps;
  if (config.showInstant && (streaming || !config.streamOnlyTps)) {
    parts.push(`${displayTps.toFixed(1)} TPS`);
  }
  if (config.streamOnlyTps && streaming) {
    return parts.length > 0 ? parts.join(" · ") : "TPS meter";
  }
  if (config.showAverage && !config.streamOnlyTps) {
    parts.push(`avg ${reading.avgTps.toFixed(1)}`);
  }
  if (config.showTotalTokens) {
    parts.push(`${formatNumber(reading.totalTokens)} tok`);
  }
  if (config.showElapsed) {
    parts.push(formatElapsedTime(reading.elapsedMs));
  }
  if (config.showCacheHit) {
    const cache = formatCacheHit(reading);
    if (cache !== null) {
      parts.push(`cache ${cache}`);
    }
    const sessionCache = formatSessionCacheHit(reading);
    if (sessionCache !== null) {
      parts.push(`session cache ${sessionCache}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "TPS meter";
}

// src/ui.ts
function formatCacheHit2(cache) {
  if (!cache) {
    return null;
  }
  const promptTokens = cache.read + cache.write + cache.input;
  if (promptTokens <= 0) {
    return null;
  }
  return formatCachePercent(cache.read / promptTokens);
}
function createUIManager(client, config) {
  const uiConfig = {
    updateIntervalMs: config?.updateIntervalMs ?? 50,
    format: config?.format ?? "compact",
    showAverage: config?.showAverage ?? true,
    showInstant: config?.showInstant ?? true,
    showTotalTokens: config?.showTotalTokens ?? true,
    showElapsed: config?.showElapsed ?? false,
    showCacheHit: config?.showCacheHit ?? true,
    enableColorCoding: config?.enableColorCoding ?? false,
    slowTpsThreshold: config?.slowTpsThreshold ?? 10,
    fastTpsThreshold: config?.fastTpsThreshold ?? 50
  };
  let flushTimer = null;
  let lastFlushAt = 0;
  let lastToastAt = 0;
  let lastToastMessage = "";
  let pendingState = null;
  function formatElapsedTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  function formatNumberWithCommas(num) {
    return num.toLocaleString("en-US");
  }
  function formatPrimaryLine(state) {
    const parts = [];
    if (uiConfig.showInstant || uiConfig.showAverage) {
      const tpsParts = [];
      if (uiConfig.showInstant) {
        tpsParts.push(`TPS: ${state.instantTps.toFixed(1)}`);
      }
      if (uiConfig.showAverage) {
        tpsParts.push(`(avg ${state.avgTps.toFixed(1)})`);
      }
      if (tpsParts.length > 0) {
        parts.push(tpsParts.join(" "));
      }
    }
    if (uiConfig.showTotalTokens) {
      parts.push(`tokens: ${formatNumberWithCommas(state.totalTokens)}`);
    }
    if (uiConfig.showElapsed) {
      parts.push(formatElapsedTime(state.elapsedMs));
    }
    if (uiConfig.showCacheHit) {
      const cache = formatCacheHit2(state.cache);
      if (cache !== null) {
        parts.push(`cache: ${cache}`);
      }
    }
    return parts.length > 0 ? parts.join(" | ") : "TPS meter";
  }
  function formatAgentLine(agent) {
    const segments = [];
    if (uiConfig.showInstant || uiConfig.showAverage) {
      const tpsParts = [];
      if (uiConfig.showInstant) {
        tpsParts.push(`${agent.instantTps.toFixed(1)}`);
      }
      if (uiConfig.showAverage) {
        tpsParts.push(`(avg ${agent.avgTps.toFixed(1)})`);
      }
      if (tpsParts.length > 0) {
        segments.push(tpsParts.join(" "));
      }
    }
    if (uiConfig.showTotalTokens) {
      segments.push(`tokens: ${formatNumberWithCommas(agent.totalTokens)}`);
    }
    if (uiConfig.showElapsed) {
      segments.push(formatElapsedTime(agent.elapsedMs));
    }
    return `${agent.label} ${segments.join(" | ")}`.trim();
  }
  function formatDisplay(state) {
    const lines = [];
    const hasMainActivity = state.totalTokens > 0;
    if (hasMainActivity) {
      lines.push(formatPrimaryLine(state));
    }
    const agentLines = (state.agents ?? []).filter((agent) => agent.totalTokens > 0).map((agent) => formatAgentLine(agent));
    lines.push(...agentLines);
    if (lines.length === 0) {
      return "TPS meter (idle)";
    }
    return lines.join(`
`);
  }
  function getColorVariant(instantTps, isFinal) {
    if (isFinal) {
      return "success";
    }
    if (!uiConfig.enableColorCoding) {
      return "info";
    }
    if (instantTps < uiConfig.slowTpsThreshold) {
      return "error";
    }
    if (instantTps > uiConfig.fastTpsThreshold) {
      return "success";
    }
    return "warning";
  }
  function display(message, isFinal = false, instantTps = 0) {
    const minToastIntervalMs = Math.max(MIN_TOAST_INTERVAL_MS, uiConfig.updateIntervalMs * 2);
    const toastDuration = Math.max(DEFAULT_TOAST_DURATION_MS, minToastIntervalMs * 20);
    const now = Date.now();
    if (!isFinal) {
      if (message === lastToastMessage) {
        return 0;
      }
      const waitMs = minToastIntervalMs - (now - lastToastAt);
      if (waitMs > 0) {
        return waitMs;
      }
    }
    const variant = getColorVariant(instantTps, isFinal);
    let displayed = false;
    if (client.tui?.showToast) {
      try {
        const result = client.tui.showToast({
          body: {
            title: "TPS Meter",
            message,
            variant,
            duration: isFinal ? 2000 : toastDuration
          }
        });
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
        displayed = true;
      } catch {}
    }
    if (!displayed && client.tui?.publish) {
      try {
        const result = client.tui.publish({
          body: {
            type: "tui.toast.show",
            properties: {
              title: "TPS Meter",
              message,
              variant,
              duration: isFinal ? FINAL_STATS_DURATION_MS : toastDuration
            }
          }
        });
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
        displayed = true;
      } catch {}
    }
    if (!displayed && client.toast?.success && client.toast?.info) {
      try {
        if (isFinal) {
          client.toast.success(message, { duration: FINAL_STATS_DURATION_MS });
        } else {
          client.toast.info(message, { duration: toastDuration });
        }
        displayed = true;
      } catch {}
    }
    if (displayed) {
      lastToastAt = now;
      lastToastMessage = message;
    }
    return 0;
  }
  function flushPendingUpdate() {
    if (pendingState) {
      const formatted = formatDisplay(pendingState);
      let tpsForColor = pendingState.instantTps;
      if (pendingState.totalTokens === 0 && pendingState.agents?.length) {
        tpsForColor = Math.max(...pendingState.agents.map((a) => a.instantTps));
      }
      const waitMs = display(formatted, false, tpsForColor);
      if (waitMs > 0) {
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            lastFlushAt = Date.now();
            flushPendingUpdate();
          }, waitMs);
        }
        return;
      }
      pendingState = null;
    }
  }
  function cancelPendingUpdate() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    pendingState = null;
  }
  function scheduleFlush() {
    if (flushTimer) {
      return;
    }
    const now = Date.now();
    const delay = lastFlushAt === 0 ? 0 : Math.max(0, uiConfig.updateIntervalMs - (now - lastFlushAt));
    flushTimer = setTimeout(() => {
      flushTimer = null;
      lastFlushAt = Date.now();
      flushPendingUpdate();
    }, delay);
  }
  return {
    updateDisplay(instantTps, avgTps, totalTokens, elapsedMs, agents, cache) {
      pendingState = {
        instantTps,
        avgTps,
        totalTokens,
        elapsedMs,
        cache,
        agents: agents && agents.length > 0 ? agents : undefined
      };
      scheduleFlush();
    },
    showFinalStats(totalTokens, avgTps, elapsedMs, cache) {
      cancelPendingUpdate();
      lastToastMessage = "";
      const state = {
        instantTps: 0,
        avgTps,
        totalTokens,
        elapsedMs,
        cache
      };
      const formatted = formatDisplay(state);
      display(formatted, true);
    },
    clear() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushPendingUpdate();
      cancelPendingUpdate();
    },
    setUpdateInterval(ms) {
      uiConfig.updateIntervalMs = ms;
      lastFlushAt = 0;
    }
  };
}

// src/tokenCounter.ts
function countByChars(text, divisor) {
  if (!text || text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / divisor);
}
function countByWords(text, divisor) {
  if (!text || text.length === 0) {
    return 0;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  const wordCount = trimmed.split(/\s+/).length;
  return Math.ceil(wordCount / divisor);
}
function createCounter(algorithm) {
  const strategies = {
    heuristic: (text) => countByChars(text, CHARS_DIV_4),
    word: (text) => countByWords(text, WORDS_DIV_0_75),
    code: (text) => countByChars(text, CHARS_DIV_3)
  };
  return {
    count(text) {
      return strategies[algorithm](text);
    }
  };
}
function createTokenizer(algorithm = "heuristic") {
  return createCounter(algorithm);
}
function createCharCounter(divisor) {
  let chars = 0;
  let tokens = 0;
  return {
    add(delta) {
      if (!delta)
        return 0;
      chars += delta.length;
      const next = Math.ceil(chars / divisor);
      const added = next - tokens;
      tokens = next;
      return added > 0 ? added : 0;
    },
    total: () => tokens,
    reset() {
      chars = 0;
      tokens = 0;
    }
  };
}
var WHITESPACE = /\s/;
function createWordCounter(divisor) {
  let words = 0;
  let tokens = 0;
  let openWord = false;
  return {
    add(delta) {
      if (!delta)
        return 0;
      for (let i = 0;i < delta.length; i++) {
        const isSpace = WHITESPACE.test(delta[i]);
        if (isSpace) {
          openWord = false;
        } else if (!openWord) {
          words += 1;
          openWord = true;
        }
      }
      const next = Math.ceil(words / divisor);
      const added = next - tokens;
      tokens = next;
      return added > 0 ? added : 0;
    },
    total: () => tokens,
    reset() {
      words = 0;
      tokens = 0;
      openWord = false;
    }
  };
}
function createIncrementalCounter(algorithm = "heuristic") {
  if (algorithm === "word")
    return createWordCounter(WORDS_DIV_0_75);
  if (algorithm === "code")
    return createCharCounter(CHARS_DIV_3);
  return createCharCounter(CHARS_DIV_4);
}

// src/config.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var defaultConfig = {
  enabled: true,
  toastFallback: false,
  updateIntervalMs: DEFAULT_UPDATE_INTERVAL_MS,
  initialDisplayDelayMs: DEFAULT_INITIAL_DISPLAY_DELAY_MS,
  rollingWindowMs: DEFAULT_ROLLING_WINDOW_MS,
  showAverage: false,
  showInstant: true,
  showTotalTokens: true,
  showElapsed: false,
  showCacheHit: true,
  showTtft: false,
  streamOnlyTps: true,
  format: "compact",
  minVisibleTPS: 0,
  fallbackTokenHeuristic: "chars_div_4",
  enableColorCoding: false,
  slowTpsThreshold: DEFAULT_SLOW_TPS_THRESHOLD,
  fastTpsThreshold: DEFAULT_FAST_TPS_THRESHOLD
};
function isBoolean(value) {
  return typeof value === "boolean";
}
function isNumber(value) {
  return typeof value === "number" && !isNaN(value) && isFinite(value) && value >= 0;
}
function isString(value) {
  return typeof value === "string";
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function mergeConfig(partial, defaults) {
  const updateIntervalMs = isNumber(partial.updateIntervalMs) ? clamp(partial.updateIntervalMs, 10, 5000) : defaults.updateIntervalMs;
  const initialDisplayDelayMs = isNumber(partial.initialDisplayDelayMs) ? clamp(partial.initialDisplayDelayMs, 0, 1000) : defaults.initialDisplayDelayMs;
  const rollingWindowMs = isNumber(partial.rollingWindowMs) ? clamp(partial.rollingWindowMs, 100, 30000) : defaults.rollingWindowMs;
  const minVisibleTPS = isNumber(partial.minVisibleTPS) ? clamp(partial.minVisibleTPS, 0, 1e4) : defaults.minVisibleTPS;
  let slowTpsThreshold = isNumber(partial.slowTpsThreshold) ? clamp(partial.slowTpsThreshold, 0, 1e4) : defaults.slowTpsThreshold;
  let fastTpsThreshold = isNumber(partial.fastTpsThreshold) ? clamp(partial.fastTpsThreshold, 0, 1e4) : defaults.fastTpsThreshold;
  if (slowTpsThreshold >= fastTpsThreshold) {
    slowTpsThreshold = defaults.slowTpsThreshold;
    fastTpsThreshold = defaults.fastTpsThreshold;
  }
  return {
    enabled: isBoolean(partial.enabled) ? partial.enabled : defaults.enabled,
    toastFallback: isBoolean(partial.toastFallback) ? partial.toastFallback : defaults.toastFallback,
    updateIntervalMs,
    initialDisplayDelayMs,
    rollingWindowMs,
    showAverage: isBoolean(partial.showAverage) ? partial.showAverage : defaults.showAverage,
    showInstant: isBoolean(partial.showInstant) ? partial.showInstant : defaults.showInstant,
    showTotalTokens: isBoolean(partial.showTotalTokens) ? partial.showTotalTokens : defaults.showTotalTokens,
    showElapsed: isBoolean(partial.showElapsed) ? partial.showElapsed : defaults.showElapsed,
    showCacheHit: isBoolean(partial.showCacheHit) ? partial.showCacheHit : defaults.showCacheHit,
    showTtft: isBoolean(partial.showTtft) ? partial.showTtft : defaults.showTtft,
    streamOnlyTps: isBoolean(partial.streamOnlyTps) ? partial.streamOnlyTps : defaults.streamOnlyTps,
    format: isString(partial.format) && ["compact", "verbose", "minimal"].includes(partial.format) ? partial.format : defaults.format,
    minVisibleTPS,
    fallbackTokenHeuristic: isString(partial.fallbackTokenHeuristic) && ["chars_div_4", "chars_div_3", "words_div_0_75"].includes(partial.fallbackTokenHeuristic) ? partial.fallbackTokenHeuristic : defaults.fallbackTokenHeuristic,
    enableColorCoding: isBoolean(partial.enableColorCoding) ? partial.enableColorCoding : defaults.enableColorCoding,
    slowTpsThreshold,
    fastTpsThreshold
  };
}
function loadConfigFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}
function loadEnvConfig() {
  const envConfig = {};
  if (process.env.TPS_METER_ENABLED !== undefined) {
    envConfig.enabled = process.env.TPS_METER_ENABLED === "true";
  }
  if (process.env.TPS_METER_TOAST_FALLBACK !== undefined) {
    envConfig.toastFallback = process.env.TPS_METER_TOAST_FALLBACK === "true";
  }
  if (process.env.TPS_METER_UPDATE_INTERVAL_MS !== undefined) {
    const val = parseInt(process.env.TPS_METER_UPDATE_INTERVAL_MS, 10);
    if (!isNaN(val))
      envConfig.updateIntervalMs = val;
  }
  if (process.env.TPS_METER_INITIAL_DISPLAY_DELAY_MS !== undefined) {
    const val = parseInt(process.env.TPS_METER_INITIAL_DISPLAY_DELAY_MS, 10);
    if (!isNaN(val))
      envConfig.initialDisplayDelayMs = val;
  }
  if (process.env.TPS_METER_ROLLING_WINDOW_MS !== undefined) {
    const val = parseInt(process.env.TPS_METER_ROLLING_WINDOW_MS, 10);
    if (!isNaN(val))
      envConfig.rollingWindowMs = val;
  }
  if (process.env.TPS_METER_SHOW_AVERAGE !== undefined) {
    envConfig.showAverage = process.env.TPS_METER_SHOW_AVERAGE === "true";
  }
  if (process.env.TPS_METER_SHOW_INSTANT !== undefined) {
    envConfig.showInstant = process.env.TPS_METER_SHOW_INSTANT === "true";
  }
  if (process.env.TPS_METER_SHOW_TOTAL_TOKENS !== undefined) {
    envConfig.showTotalTokens = process.env.TPS_METER_SHOW_TOTAL_TOKENS === "true";
  }
  if (process.env.TPS_METER_SHOW_ELAPSED !== undefined) {
    envConfig.showElapsed = process.env.TPS_METER_SHOW_ELAPSED === "true";
  }
  if (process.env.TPS_METER_SHOW_CACHE_HIT !== undefined) {
    envConfig.showCacheHit = process.env.TPS_METER_SHOW_CACHE_HIT === "true";
  }
  if (process.env.TPS_METER_SHOW_TTFT !== undefined) {
    envConfig.showTtft = process.env.TPS_METER_SHOW_TTFT === "true";
  }
  if (process.env.TPS_METER_STREAM_ONLY_TPS !== undefined) {
    envConfig.streamOnlyTps = process.env.TPS_METER_STREAM_ONLY_TPS === "true";
  }
  if (process.env.TPS_METER_FORMAT !== undefined) {
    const val = process.env.TPS_METER_FORMAT;
    if (["compact", "verbose", "minimal"].includes(val)) {
      envConfig.format = val;
    }
  }
  if (process.env.TPS_METER_MIN_VISIBLE_TPS !== undefined) {
    const val = parseFloat(process.env.TPS_METER_MIN_VISIBLE_TPS);
    if (!isNaN(val))
      envConfig.minVisibleTPS = val;
  }
  if (process.env.TPS_METER_FALLBACK_HEURISTIC !== undefined) {
    const val = process.env.TPS_METER_FALLBACK_HEURISTIC;
    if (["chars_div_4", "chars_div_3", "words_div_0_75"].includes(val)) {
      envConfig.fallbackTokenHeuristic = val;
    }
  }
  if (process.env.TPS_METER_ENABLE_COLOR_CODING !== undefined) {
    envConfig.enableColorCoding = process.env.TPS_METER_ENABLE_COLOR_CODING === "true";
  }
  if (process.env.TPS_METER_SLOW_TPS_THRESHOLD !== undefined) {
    const val = parseFloat(process.env.TPS_METER_SLOW_TPS_THRESHOLD);
    if (!isNaN(val))
      envConfig.slowTpsThreshold = val;
  }
  if (process.env.TPS_METER_FAST_TPS_THRESHOLD !== undefined) {
    const val = parseFloat(process.env.TPS_METER_FAST_TPS_THRESHOLD);
    if (!isNaN(val))
      envConfig.fastTpsThreshold = val;
  }
  return envConfig;
}
function loadConfigSync(overrides) {
  let mergedConfig = {};
  const projectConfigPath = path.join(process.cwd(), ".opencode", "tps-meter.json");
  const projectConfig = loadConfigFile(projectConfigPath);
  if (projectConfig) {
    mergedConfig = { ...mergedConfig, ...projectConfig };
  }
  const homeDir = os.homedir();
  const globalConfigPath = path.join(homeDir, ".config", "opencode", "tps-meter.json");
  const globalConfig = loadConfigFile(globalConfigPath);
  if (globalConfig) {
    mergedConfig = { ...mergedConfig, ...globalConfig };
  }
  const envConfig = loadEnvConfig();
  mergedConfig = { ...mergedConfig, ...envConfig };
  if (overrides) {
    mergedConfig = { ...mergedConfig, ...overrides };
  }
  return mergeConfig(mergedConfig, defaultConfig);
}

// src/v2/metrics.ts
var MIN_FACTOR = 0.25;
var MAX_FACTOR = 4;
var CALIBRATION_MEMORY_TOKENS = 20000;
var MIN_CALIBRATION_TOKENS = 8;
function createMetrics(options = {}) {
  const sessions = new Map;
  const calibration = new Map;
  for (const [key, saved] of Object.entries(options.initial ?? {})) {
    if (saved && Number.isFinite(saved.factor) && saved.factor >= MIN_FACTOR && saved.factor <= MAX_FACTOR && saved.samples > 0) {
      calibration.set(key, {
        factor: saved.factor,
        samples: saved.samples,
        weight: typeof saved.weight === "number" && saved.weight > 0 ? saved.weight : undefined
      });
    }
  }
  function get(sessionID) {
    let state = sessions.get(sessionID);
    if (!state) {
      state = {
        turnStartedAt: null,
        firstTokenAt: null,
        toolMs: 0,
        interrupted: false,
        runningTools: new Map,
        stepHeuristicTokens: 0,
        carry: 0,
        attribution: { key: "default" }
      };
      sessions.set(sessionID, state);
    }
    return state;
  }
  function factorFor(key) {
    return calibration.get(key)?.factor ?? 1;
  }
  function attributionFor(sessionID) {
    return sessions.get(sessionID)?.attribution ?? { key: "default" };
  }
  return {
    onExecutionStarted(sessionID, at) {
      const state = get(sessionID);
      state.turnStartedAt = at;
      state.firstTokenAt = null;
      state.toolMs = 0;
      state.interrupted = false;
      state.runningTools.clear();
    },
    onExecutionSettled(sessionID, interrupted) {
      get(sessionID).interrupted = interrupted;
    },
    onStepStarted(sessionID, model, agent) {
      const state = get(sessionID);
      state.stepHeuristicTokens = 0;
      state.attribution = {
        key: model ? `${model.providerID}/${model.id}${model.variant ? `#${model.variant}` : ""}` : state.attribution.key,
        model: model ?? state.attribution.model,
        agent: agent ?? state.attribution.agent
      };
    },
    onToolCalled(sessionID, callID, at) {
      get(sessionID).runningTools.set(callID, at);
    },
    onToolSettled(sessionID, callID, at) {
      const state = get(sessionID);
      const startedAt = state.runningTools.get(callID);
      if (startedAt === undefined) {
        return;
      }
      state.runningTools.delete(callID);
      if (at > startedAt) {
        state.toolMs += at - startedAt;
      }
    },
    onFirstToken(sessionID, at) {
      const state = get(sessionID);
      if (state.firstTokenAt === null) {
        state.firstTokenAt = at;
      }
    },
    scale(sessionID, rawTokens) {
      if (rawTokens <= 0) {
        return 0;
      }
      const state = get(sessionID);
      state.stepHeuristicTokens += rawTokens;
      const factor = factorFor(state.attribution.key);
      if (factor === 1) {
        return rawTokens;
      }
      const scaled = rawTokens * factor + state.carry;
      const whole = Math.floor(scaled);
      state.carry = scaled - whole;
      return whole;
    },
    calibrate(sessionID, realTokens) {
      const state = get(sessionID);
      const heuristic = state.stepHeuristicTokens;
      state.stepHeuristicTokens = 0;
      state.carry = 0;
      if (realTokens <= 0 || heuristic < MIN_CALIBRATION_TOKENS) {
        return;
      }
      const sample = realTokens / heuristic;
      if (!Number.isFinite(sample) || sample < MIN_FACTOR || sample > MAX_FACTOR) {
        return;
      }
      const key = state.attribution.key;
      const existing = calibration.get(key);
      const weight = existing ? Math.min(existing.weight ?? existing.samples * 200, CALIBRATION_MEMORY_TOKENS) : 0;
      const next = {
        factor: (existing ? existing.factor * weight : 0) + realTokens,
        samples: (existing?.samples ?? 0) + 1,
        weight: Math.min(weight + heuristic, CALIBRATION_MEMORY_TOKENS)
      };
      next.factor /= weight + heuristic;
      calibration.set(key, next);
      try {
        options.onCalibrated?.(key, { ...next });
      } catch {}
    },
    turnOf(sessionID) {
      const state = sessions.get(sessionID);
      if (!state) {
        return { ttftMs: 0, toolMs: 0, interrupted: false };
      }
      const ttftMs = state.turnStartedAt !== null && state.firstTokenAt !== null ? Math.max(0, state.firstTokenAt - state.turnStartedAt) : 0;
      return { ttftMs, toolMs: state.toolMs, interrupted: state.interrupted };
    },
    attributionOf: attributionFor,
    samplesOf(sessionID) {
      return calibration.get(attributionFor(sessionID).key)?.samples ?? 0;
    },
    resetTurn(sessionID) {
      const state = sessions.get(sessionID);
      if (!state) {
        return;
      }
      state.stepHeuristicTokens = 0;
      state.carry = 0;
      state.runningTools.clear();
    },
    forget(sessionID) {
      sessions.delete(sessionID);
    },
    dispose() {
      sessions.clear();
      calibration.clear();
    }
  };
}

// src/v2/meter.ts
var HANDLED_EVENT_TYPES = new Set([
  "session.text.delta",
  "session.reasoning.delta",
  "session.step.ended",
  "session.step.failed",
  "session.usage.updated",
  "session.idle",
  "session.step.started",
  "session.tool.input.delta",
  "session.tool.input.ended",
  "session.tool.called",
  "session.tool.success",
  "session.tool.failed",
  "session.execution.started",
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted"
]);
function toTokenCount(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}
function eventTime(event, fallback) {
  const created = event.created;
  if (typeof created !== "number" || !Number.isFinite(created) || created <= 0) {
    return fallback;
  }
  if (Math.abs(created - fallback) > 86400000) {
    return fallback;
  }
  return created;
}
function asMeterEvent(event) {
  if (!event || typeof event.type !== "string" || !HANDLED_EVENT_TYPES.has(event.type)) {
    return;
  }
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }
  const sessionID = data.sessionID;
  if (typeof sessionID !== "string" || sessionID.length === 0) {
    return;
  }
  return event;
}
function createMeter(config, hooks) {
  const publishIntervalMs = config.updateIntervalMs === DEFAULT_UPDATE_INTERVAL_MS ? V2_UPDATE_INTERVAL_MS : config.updateIntervalMs;
  const algorithm = config.fallbackTokenHeuristic === "words_div_0_75" ? "word" : config.fallbackTokenHeuristic === "chars_div_3" ? "code" : "heuristic";
  const sessions = new Map;
  const metrics = createMetrics({
    initial: hooks?.initialCalibration,
    onCalibrated: hooks?.onCalibrated
  });
  const streamText = new Map;
  const publishTimers = new Map;
  const stallTimers = new Map;
  const listeners = new Set;
  const lastActivityAt = new Map;
  const sessionUsage = new Map;
  const sessionSpawnAt = new Map;
  const toolInputs = new Map;
  const stepStartedAt = new Map;
  const ttftRecorded = new Set;
  let snapshots = new Map;
  let lastSweepAt = 0;
  function getSessionUsage(sessionID) {
    let usage = sessionUsage.get(sessionID);
    if (!usage) {
      const retained = snapshots.get(sessionID);
      usage = {
        cumulativeTokens: 0,
        observedStepTokens: 0,
        cacheReadTokens: retained?.sessionCacheReadTokens ?? 0,
        cacheWriteTokens: retained?.sessionCacheWriteTokens ?? 0,
        inputTokens: retained?.sessionInputTokens ?? 0
      };
      sessionUsage.set(sessionID, usage);
    }
    return usage;
  }
  function sessionCacheFields(sessionID) {
    const usage = getSessionUsage(sessionID);
    return {
      sessionCacheReadTokens: usage.cacheReadTokens,
      sessionCacheWriteTokens: usage.cacheWriteTokens,
      sessionInputTokens: usage.inputTokens
    };
  }
  function setSnapshots(next) {
    snapshots = next;
    for (const listener of listeners) {
      listener(snapshots);
    }
  }
  function mutateSnapshots(mutate) {
    const draft = new Map(snapshots);
    mutate(draft);
    setSnapshots(draft);
  }
  function getStreamCache(sessionID) {
    const cache = streamText.get(sessionID) ?? new Map;
    streamText.set(sessionID, cache);
    return cache;
  }
  function getSessionState(sessionID) {
    let state = sessions.get(sessionID);
    if (state) {
      return state;
    }
    state = {
      tracker: createTracker({
        sessionId: sessionID,
        rollingWindowMs: config.rollingWindowMs
      }),
      firstTokenAt: null,
      lastTokenAt: null,
      lastTokenWallAt: null,
      lastPublishedAt: 0,
      lastPublishedWallAt: 0,
      firstTokenWallAt: null,
      dirty: false,
      sawReasoning: false,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 0
    };
    sessions.set(sessionID, state);
    return state;
  }
  function clearPublishTimer(sessionID) {
    const timer = publishTimers.get(sessionID);
    if (timer) {
      clearTimeout(timer);
      publishTimers.delete(sessionID);
    }
  }
  function clearStallTimer(sessionID) {
    const timer = stallTimers.get(sessionID);
    if (timer) {
      clearTimeout(timer);
      stallTimers.delete(sessionID);
    }
  }
  function republishStalled(sessionID) {
    stallTimers.delete(sessionID);
    const state = sessions.get(sessionID);
    const current = snapshots.get(sessionID);
    if (!state || !current?.active || state.lastTokenAt === null || state.lastTokenWallAt === null) {
      return;
    }
    const hostNow = state.lastTokenAt + (Date.now() - state.lastTokenWallAt);
    const instantTps = state.tracker.getInstantTPS(hostNow);
    mutateSnapshots((draft) => {
      draft.set(sessionID, { ...current, instantTps });
    });
    if (instantTps > 0) {
      stallTimers.set(sessionID, setTimeout(() => republishStalled(sessionID), STALL_REPUBLISH_MS));
    }
  }
  function resetSession(sessionID) {
    clearPublishTimer(sessionID);
    clearStallTimer(sessionID);
    sessions.delete(sessionID);
    streamText.delete(sessionID);
    toolInputs.delete(sessionID);
    stepStartedAt.delete(sessionID);
  }
  function sweepStaleSessions(now) {
    if (now - lastSweepAt < CLEANUP_INTERVAL_MS) {
      return;
    }
    lastSweepAt = now;
    const stale = [];
    for (const [sessionID, seenAt] of lastActivityAt) {
      if (now - seenAt > MAX_MESSAGE_AGE_MS) {
        stale.push(sessionID);
      }
    }
    if (stale.length === 0) {
      return;
    }
    for (const sessionID of stale) {
      resetSession(sessionID);
      sessionUsage.delete(sessionID);
      metrics.forget(sessionID);
      sessionSpawnAt.delete(sessionID);
      ttftRecorded.delete(sessionID);
      if (!snapshots.has(sessionID)) {
        lastActivityAt.delete(sessionID);
      }
    }
    if (snapshots.size <= MAX_RETAINED_SNAPSHOTS) {
      return;
    }
    const oldestFirst = [...snapshots.keys()].sort((a, b) => (lastActivityAt.get(a) ?? 0) - (lastActivityAt.get(b) ?? 0));
    const evict = oldestFirst.slice(0, snapshots.size - MAX_RETAINED_SNAPSHOTS);
    for (const sessionID of evict) {
      lastActivityAt.delete(sessionID);
      sessionSpawnAt.delete(sessionID);
    }
    mutateSnapshots((draft) => {
      for (const sessionID of evict) {
        draft.delete(sessionID);
      }
    });
  }
  function derivedFields(sessionID, avgTps) {
    const turn = metrics.turnOf(sessionID);
    const attribution = metrics.attributionOf(sessionID);
    return {
      ttftMs: turn.ttftMs,
      toolMs: turn.toolMs,
      generationTps: avgTps,
      modelKey: attribution.key,
      agent: attribution.agent,
      calibrationSamples: metrics.samplesOf(sessionID),
      interrupted: turn.interrupted
    };
  }
  function publish(sessionID, active, now) {
    const state = sessions.get(sessionID);
    if (!state) {
      return;
    }
    const totalTokens = state.tracker.getTotalTokens();
    if (totalTokens === 0 || !state.tracker.isRateReady()) {
      return;
    }
    clearPublishTimer(sessionID);
    state.lastPublishedAt = now;
    state.lastPublishedWallAt = Date.now();
    state.dirty = false;
    const avgTps = state.tracker.getAverageTPS();
    mutateSnapshots((draft) => {
      draft.set(sessionID, {
        sessionID,
        lastActivityAt: state.lastTokenWallAt ?? Date.now(),
        startedAt: sessionSpawnAt.get(sessionID) ?? state.firstTokenAt ?? now,
        instantTps: state.tracker.getSmoothedTPS(),
        avgTps,
        totalTokens,
        elapsedMs: state.tracker.getElapsedMs(),
        active,
        overheadTokens: overheadFor(sessionID),
        cacheReadTokens: state.cacheReadTokens,
        cacheWriteTokens: state.cacheWriteTokens,
        inputTokens: state.inputTokens,
        ...sessionCacheFields(sessionID),
        ...derivedFields(sessionID, avgTps)
      });
    });
  }
  function overheadFor(sessionID) {
    const usage = sessionUsage.get(sessionID);
    if (!usage || usage.cumulativeTokens <= 0) {
      return 0;
    }
    return Math.max(0, usage.cumulativeTokens - usage.observedStepTokens);
  }
  function settledReading(sessionID, state, providerTokens, providerVisible, endedAt) {
    const streamed = state?.tracker.getTotalTokens() ?? 0;
    const totalTokens = providerTokens > 0 ? providerTokens : streamed;
    const streamedAvg = state?.tracker.getAverageTPS() ?? 0;
    if (state && streamedAvg > 0) {
      return {
        totalTokens,
        avgTps: correctedAverage(streamedAvg, streamed, providerVisible),
        elapsedMs: state.tracker.getElapsedMs()
      };
    }
    const startedAt = stepStartedAt.get(sessionID);
    const elapsedMs = startedAt !== undefined ? Math.max(0, endedAt - startedAt) : 0;
    return {
      totalTokens,
      avgTps: elapsedMs > 0 ? totalTokens / (elapsedMs / 1000) : 0,
      elapsedMs
    };
  }
  function publishFinal(sessionID, reading, overheadTokens, at, stepCache) {
    const { totalTokens, avgTps, elapsedMs } = reading;
    if (totalTokens <= 0 || !(avgTps > 0)) {
      return false;
    }
    const state = sessions.get(sessionID);
    const cacheFields = stepCache ?? {
      cacheReadTokens: state?.cacheReadTokens ?? 0,
      cacheWriteTokens: state?.cacheWriteTokens ?? 0,
      inputTokens: state?.inputTokens ?? 0
    };
    mutateSnapshots((draft) => {
      draft.set(sessionID, {
        sessionID,
        lastActivityAt: Date.now(),
        startedAt: sessionSpawnAt.get(sessionID) ?? at,
        instantTps: 0,
        avgTps,
        totalTokens,
        elapsedMs,
        active: false,
        overheadTokens,
        ...cacheFields,
        ...sessionCacheFields(sessionID),
        ...derivedFields(sessionID, avgTps)
      });
    });
    return true;
  }
  function mergeSnapshotCache(sessionID, stepCache) {
    const current = snapshots.get(sessionID);
    if (!current) {
      return false;
    }
    mutateSnapshots((draft) => {
      draft.set(sessionID, { ...current, ...stepCache, ...sessionCacheFields(sessionID) });
    });
    return true;
  }
  function clearActiveSnapshot(sessionID) {
    const current = snapshots.get(sessionID);
    if (current?.active) {
      mutateSnapshots((draft) => {
        draft.delete(sessionID);
      });
    }
  }
  function persistIdleSnapshot(sessionID, now, stepCache) {
    const state = sessions.get(sessionID);
    if (state?.tracker.isRateReady()) {
      publish(sessionID, false, now);
      return true;
    }
    const current = snapshots.get(sessionID);
    if (!current) {
      return false;
    }
    if (!current.active && !stepCache) {
      return false;
    }
    mutateSnapshots((draft) => {
      draft.set(sessionID, {
        ...current,
        active: false,
        ...stepCache ?? {},
        ...sessionCacheFields(sessionID)
      });
    });
    return true;
  }
  function startupElapsed(state, wallNow, hostNow) {
    const host = state.firstTokenAt === null ? 0 : hostNow - state.firstTokenAt;
    const wall = state.firstTokenWallAt === null ? 0 : wallNow - state.firstTokenWallAt;
    return Math.max(host, wall);
  }
  function scheduleActivePublish(sessionID, delayMs) {
    if (publishTimers.has(sessionID)) {
      return;
    }
    const timer = setTimeout(() => {
      publishTimers.delete(sessionID);
      const state = sessions.get(sessionID);
      if (state === undefined || !state.dirty || state.firstTokenAt === null || state.lastTokenAt === null || state.tracker.getTotalTokens() <= 0) {
        return;
      }
      if (startupElapsed(state, Date.now(), state.lastTokenAt) < config.initialDisplayDelayMs) {
        return;
      }
      publish(sessionID, true, state.lastTokenAt);
    }, delayMs);
    publishTimers.set(sessionID, timer);
  }
  function maybePublishActive(sessionID, now) {
    const state = sessions.get(sessionID);
    if (!state || state.firstTokenAt === null) {
      return;
    }
    state.dirty = true;
    if (state.tracker.getSmoothedTPS() < config.minVisibleTPS) {
      return;
    }
    const wallNow = Date.now();
    const initialDelayRemaining = config.initialDisplayDelayMs - startupElapsed(state, wallNow, now);
    const throttleDelayRemaining = publishIntervalMs - (wallNow - state.lastPublishedWallAt);
    if (initialDelayRemaining <= 0 && throttleDelayRemaining <= 0) {
      publish(sessionID, true, now);
      return;
    }
    scheduleActivePublish(sessionID, Math.max(1, initialDelayRemaining, throttleDelayRemaining));
  }
  function countDelta(sessionID, messageID, ordinal, kind, delta) {
    const cache = getStreamCache(sessionID);
    const key = `${messageID}:${ordinal}:${kind}`;
    let counter = cache.get(key);
    if (!counter) {
      counter = createIncrementalCounter(algorithm);
      cache.set(key, counter);
    }
    return counter.add(delta);
  }
  function recordTokens(sessionID, tokenCount, at) {
    if (tokenCount <= 0) {
      return;
    }
    const state = getSessionState(sessionID);
    if (state.firstTokenAt === null) {
      state.firstTokenAt = at;
      state.firstTokenWallAt = Date.now();
    }
    if (!sessionSpawnAt.has(sessionID)) {
      sessionSpawnAt.set(sessionID, at);
    }
    state.lastTokenAt = at;
    state.lastTokenWallAt = Date.now();
    state.tracker.recordTokens(tokenCount, at);
    maybePublishActive(sessionID, at);
    clearStallTimer(sessionID);
    stallTimers.set(sessionID, setTimeout(() => republishStalled(sessionID), STALL_REPUBLISH_MS));
  }
  function handleDelta(event) {
    const { sessionID, assistantMessageID, ordinal, delta } = event.data;
    if (typeof delta !== "string" || delta.length === 0) {
      return;
    }
    const kind = event.type === "session.reasoning.delta" ? "reasoning" : "text";
    const at = eventTime(event, Date.now());
    if (kind === "reasoning") {
      getSessionState(sessionID).sawReasoning = true;
    }
    const raw = countDelta(sessionID, assistantMessageID, ordinal, kind, delta);
    metrics.onFirstToken(sessionID, at);
    recordTokens(sessionID, metrics.scale(sessionID, raw), at);
  }
  function toolInputKey(event) {
    return `${event.data.assistantMessageID ?? ""}:tool:${event.data.id}`;
  }
  function handleToolInput(event) {
    const { sessionID } = event.data;
    if (typeof event.data.id !== "string") {
      return;
    }
    const at = eventTime(event, Date.now());
    const key = toolInputKey(event);
    const inputs = toolInputs.get(sessionID) ?? new Map;
    toolInputs.set(sessionID, inputs);
    const counted = inputs.get(key) ?? 0;
    let added;
    if (event.type === "session.tool.input.delta") {
      added = typeof event.data.delta === "string" ? event.data.delta : "";
      inputs.set(key, counted + added.length);
    } else {
      const text = typeof event.data.text === "string" ? event.data.text : "";
      added = text.slice(counted);
      inputs.delete(key);
    }
    if (added.length === 0) {
      return;
    }
    const cache = getStreamCache(sessionID);
    let counter = cache.get(key);
    if (!counter) {
      counter = createIncrementalCounter(algorithm);
      cache.set(key, counter);
    }
    metrics.onFirstToken(sessionID, at);
    recordTokens(sessionID, metrics.scale(sessionID, counter.add(added)), at);
  }
  function handleUsageUpdated(event) {
    const { sessionID, tokens } = event.data;
    if (!tokens) {
      return;
    }
    getSessionUsage(sessionID).cumulativeTokens = toTokenCount(tokens.output) + toTokenCount(tokens.reasoning);
  }
  function handleStepStarted(event) {
    metrics.onStepStarted(event.data.sessionID, event.data.model, event.data.agent);
    const created = eventTime(event, Date.now());
    const started = event.data.started;
    const plausible = typeof started === "number" && Number.isFinite(started) && started <= created && created - started < 86400000;
    stepStartedAt.set(event.data.sessionID, plausible ? started : created);
  }
  function handleToolCalled(event) {
    metrics.onToolCalled(event.data.sessionID, event.data.id, eventTime(event, Date.now()));
  }
  function handleToolSettled(event) {
    metrics.onToolSettled(event.data.sessionID, event.data.id, eventTime(event, Date.now()));
  }
  function handleExecutionStarted(event) {
    metrics.onExecutionStarted(event.data.sessionID, eventTime(event, Date.now()));
    ttftRecorded.delete(event.data.sessionID);
  }
  function handleExecutionSettled(event) {
    metrics.onExecutionSettled(event.data.sessionID, event.type === "session.execution.interrupted");
  }
  function foldStepUsage(sessionID, tokens) {
    const stepCache = {
      cacheReadTokens: toTokenCount(tokens?.cache?.read),
      cacheWriteTokens: toTokenCount(tokens?.cache?.write),
      inputTokens: toTokenCount(tokens?.input)
    };
    const state = sessions.get(sessionID);
    if (state) {
      state.cacheReadTokens = stepCache.cacheReadTokens;
      state.cacheWriteTokens = stepCache.cacheWriteTokens;
      state.inputTokens = stepCache.inputTokens;
    }
    const usage = getSessionUsage(sessionID);
    usage.cacheReadTokens += stepCache.cacheReadTokens;
    usage.cacheWriteTokens += stepCache.cacheWriteTokens;
    usage.inputTokens += stepCache.inputTokens;
    const output = toTokenCount(tokens?.output);
    const reasoning = toTokenCount(tokens?.reasoning);
    const providerTokens = output + reasoning;
    if (providerTokens > 0) {
      usage.observedStepTokens += providerTokens;
    }
    const providerVisible = state?.sawReasoning && reasoning === 0 ? 0 : output + (state?.sawReasoning ? reasoning : 0);
    metrics.calibrate(sessionID, providerVisible);
    return { stepCache, providerTokens, providerVisible };
  }
  function handleStepEnded(event) {
    const { sessionID, finish } = event.data;
    const now = eventTime(event, Date.now());
    const state = sessions.get(sessionID);
    const { stepCache, providerTokens, providerVisible } = foldStepUsage(sessionID, event.data.tokens);
    if (finish && finish !== TOOL_CALL_FINISH_REASON && INVALID_FINISH_REASONS.has(finish)) {
      resetSession(sessionID);
      clearActiveSnapshot(sessionID);
      return;
    }
    const reading = settledReading(sessionID, state, providerTokens, providerVisible, now);
    if (!publishFinal(sessionID, reading, overheadFor(sessionID), now, stepCache)) {
      mergeSnapshotCache(sessionID, stepCache);
    }
    const turn = metrics.turnOf(sessionID);
    if (!turn.interrupted && reading.totalTokens > 0 && reading.avgTps > 0) {
      const attribution = metrics.attributionOf(sessionID);
      const ttftMs = ttftRecorded.has(sessionID) ? 0 : turn.ttftMs;
      if (ttftMs > 0) {
        ttftRecorded.add(sessionID);
      }
      hooks?.onStepSettled?.({
        sessionID,
        modelKey: attribution.key,
        agent: attribution.agent,
        tokens: reading.totalTokens,
        generationMs: reading.totalTokens / reading.avgTps * 1000,
        cost: typeof event.data.cost === "number" && event.data.cost > 0 ? event.data.cost : 0,
        ttftMs
      });
    }
    resetSession(sessionID);
  }
  function handleStepFailed(event) {
    const { sessionID } = event.data;
    const { stepCache } = foldStepUsage(sessionID, event.data.tokens);
    persistIdleSnapshot(sessionID, eventTime(event, Date.now()), stepCache);
    resetSession(sessionID);
  }
  return {
    handleEvent(raw) {
      const event = asMeterEvent(raw);
      if (!event) {
        return;
      }
      const now = Date.now();
      lastActivityAt.set(event.data.sessionID, now);
      sweepStaleSessions(now);
      switch (event.type) {
        case "session.text.delta":
        case "session.reasoning.delta":
          handleDelta(event);
          break;
        case "session.usage.updated":
          handleUsageUpdated(event);
          break;
        case "session.step.started":
          handleStepStarted(event);
          break;
        case "session.tool.called":
          handleToolCalled(event);
          break;
        case "session.tool.success":
        case "session.tool.failed":
          handleToolSettled(event);
          break;
        case "session.execution.started":
          handleExecutionStarted(event);
          break;
        case "session.execution.succeeded":
        case "session.execution.failed":
        case "session.execution.interrupted":
          handleExecutionSettled(event);
          break;
        case "session.step.ended":
          handleStepEnded(event);
          break;
        case "session.step.failed":
          handleStepFailed(event);
          break;
        case "session.tool.input.delta":
        case "session.tool.input.ended":
          handleToolInput(event);
          break;
        case "session.idle":
          persistIdleSnapshot(event.data.sessionID, eventTime(event, Date.now()));
          resetSession(event.data.sessionID);
          sessionSpawnAt.delete(event.data.sessionID);
          ttftRecorded.delete(event.data.sessionID);
          break;
      }
    },
    getSnapshots() {
      return snapshots;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      for (const timer of publishTimers.values()) {
        clearTimeout(timer);
      }
      publishTimers.clear();
      for (const timer of stallTimers.values()) {
        clearTimeout(timer);
      }
      stallTimers.clear();
      sessions.clear();
      streamText.clear();
      lastActivityAt.clear();
      sessionUsage.clear();
      sessionSpawnAt.clear();
      toolInputs.clear();
      stepStartedAt.clear();
      ttftRecorded.clear();
      metrics.dispose();
      listeners.clear();
      snapshots = new Map;
      lastSweepAt = 0;
    }
  };
}

// src/v2/server.ts
var activeMeter = null;
var wireTimings = new Map;
function getSnapshots() {
  return activeMeter?.getSnapshots() ?? new Map;
}
function getWireTimings() {
  return wireTimings;
}
function loadServerConfig(options) {
  try {
    return loadConfigSync(options);
  } catch {
    return defaultConfig;
  }
}
function setupServer(ctx) {
  const config = loadServerConfig(ctx.options);
  if (!config.enabled) {
    return;
  }
  const meter = createMeter(config);
  activeMeter = meter;
  const controller = new AbortController;
  (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (controller.signal.aborted) {
          break;
        }
        meter.handleEvent(event);
      }
    } catch {}
  })();
  const dispatchedAt = new Map;
  if (ctx.session?.hook) {
    try {
      ctx.session.hook("http.request", (input) => {
        const sessionID = input?.sessionID;
        if (typeof sessionID === "string" && sessionID.length > 0) {
          dispatchedAt.set(sessionID, Date.now());
        }
      });
      ctx.session.hook("http.response", (input) => {
        const sessionID = input?.sessionID;
        if (typeof sessionID !== "string" || sessionID.length === 0) {
          return;
        }
        const started = dispatchedAt.get(sessionID);
        if (started === undefined) {
          return;
        }
        dispatchedAt.delete(sessionID);
        const elapsed = Date.now() - started;
        if (elapsed < 0) {
          return;
        }
        const existing = wireTimings.get(sessionID);
        if (!existing) {
          wireTimings.set(sessionID, {
            ttfbMs: elapsed,
            samples: 1,
            providerID: input?.providerID
          });
          return;
        }
        wireTimings.set(sessionID, {
          ttfbMs: (existing.ttfbMs * existing.samples + elapsed) / (existing.samples + 1),
          samples: existing.samples + 1,
          providerID: input?.providerID ?? existing.providerID
        });
      });
    } catch {}
  }
  return () => {
    controller.abort();
    meter.dispose();
    dispatchedAt.clear();
    wireTimings.clear();
    if (activeMeter === meter) {
      activeMeter = null;
    }
  };
}
var v2ServerPlugin = {
  id: "opencode-tps-meter",
  setup: setupServer
};
var server_default = v2ServerPlugin;

// src/v2/dispatch.ts
var TUI_MODULE_SPECIFIER = "./tui.mjs";
function isTuiContext(ctx) {
  const candidate = ctx;
  return typeof candidate?.ui?.slot === "function" && typeof candidate?.data?.on === "function";
}
function isServerContext(ctx) {
  return typeof ctx?.event?.subscribe === "function";
}
async function setupAuto(ctx) {
  if (isTuiContext(ctx)) {
    const mod = await import(TUI_MODULE_SPECIFIER);
    const setup = mod.setupTui ?? mod.default?.setup;
    return setup ? setup(ctx) : undefined;
  }
  if (isServerContext(ctx)) {
    return setupServer(ctx);
  }
  return;
}

// src/index.ts
function createNoopUIManager() {
  return {
    updateDisplay: () => {},
    showFinalStats: () => {},
    clear: () => {},
    setUpdateInterval: () => {}
  };
}
function stringifyValue(value) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
function extractToolStateText(state) {
  if (!state) {
    return "";
  }
  const parts = [];
  if (typeof state.raw === "string") {
    parts.push(state.raw);
  }
  if (typeof state.output === "string") {
    parts.push(state.output);
  }
  if (typeof state.error === "string") {
    parts.push(state.error);
  }
  if (state.input && typeof state.input === "object") {
    parts.push(stringifyValue(state.input));
  }
  if (typeof state.title === "string") {
    parts.push(state.title);
  }
  return parts.filter((value) => value.length > 0).join(`
`);
}
function extractPartText(part) {
  if (!part || typeof part !== "object") {
    return "";
  }
  if (!part.type || typeof part.type !== "string") {
    return stringifyValue(part);
  }
  switch (part.type) {
    case "text":
    case "reasoning":
      return part.text ?? part.reasoning ?? "";
    case "subtask":
      return [part.prompt, part.description, part.command].filter((value) => typeof value === "string" && value.length > 0).join(`
`);
    case "tool":
      return extractToolStateText(part.state);
    case "file":
      return [
        part.source?.text?.value,
        part.filename,
        part.url,
        part.source?.path,
        part.source?.name,
        part.source?.uri
      ].filter((value) => typeof value === "string" && value.length > 0).join(`
`);
    case "snapshot":
    case "step-start":
      return part.snapshot ?? "";
    case "step-finish":
      return [part.reason, part.snapshot].filter((value) => typeof value === "string" && value.length > 0).join(`
`);
    case "patch":
      return Array.isArray(part.files) ? part.files.join(`
`) : "";
    case "agent":
      return [part.name, part.source?.text?.value].filter((value) => typeof value === "string" && value.length > 0).join(`
`);
    case "retry":
      return stringifyValue(part.error);
    case "compaction":
      return part.auto ? "compaction:auto" : "compaction";
    default:
      return stringifyValue(part);
  }
}
function TpsMeterPlugin(context) {
  const safeContext = context || {};
  const logger = safeContext.logger || {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
  let config;
  try {
    config = loadConfigSync();
  } catch (error) {
    logger.warn("[TpsMeter] Failed to load config, using defaults:", error instanceof Error ? error.message : String(error));
    config = defaultConfig;
  }
  if (!config) {
    logger.warn("[TpsMeter] Config is undefined, using defaults");
    config = defaultConfig;
  }
  if (!config.enabled) {
    logger.debug("[TpsMeter] Plugin disabled by configuration");
    return {};
  }
  const sessionTrackers = new Map;
  const partTextCache = new Map;
  const messageTokenCache = new Map;
  const messageRoleCache = new Map;
  const sessionAgentNameCache = new Map;
  const messageAgentCache = new Map;
  let primarySessionId = null;
  const pendingDisplayTimers = new Map;
  const resolvedConfig = config;
  const ui = resolvedConfig.toastFallback ? createUIManager(safeContext.client || {}, resolvedConfig) : createNoopUIManager();
  const tokenizerAlgorithm = resolvedConfig.fallbackTokenHeuristic === "words_div_0_75" ? "word" : resolvedConfig.fallbackTokenHeuristic === "chars_div_3" ? "code" : "heuristic";
  const tokenizer = createTokenizer(tokenizerAlgorithm);
  logger.info("[TpsMeter] Plugin initialized and ready");
  function getOrCreateSessionState(sessionId) {
    let state = sessionTrackers.get(sessionId);
    if (!state) {
      state = {
        aggregate: createTracker({
          sessionId,
          rollingWindowMs: resolvedConfig.rollingWindowMs
        }),
        aggregateFirstTokenAt: null,
        messageTrackers: new Map
      };
      sessionTrackers.set(sessionId, state);
      logger.debug(`[TpsMeter] Created tracker for session: ${sessionId}`);
    }
    return state;
  }
  function abbreviateId(id) {
    if (!id)
      return id;
    let stripped = id;
    if (stripped.startsWith("msg_")) {
      stripped = stripped.slice(4);
    }
    if (stripped.length <= 6)
      return stripped;
    return `${stripped.slice(0, 6)}…`;
  }
  function buildTrackerKey(sessionId, messageId) {
    return `${sessionId}:${messageId}`;
  }
  function getOrCreateMessageTrackerState(sessionId, messageId, metadata) {
    const sessionState = getOrCreateSessionState(sessionId);
    const key = buildTrackerKey(sessionId, messageId);
    let trackerState = sessionState.messageTrackers.get(key);
    const cachedAgentName = messageAgentCache.get(messageId);
    const agentName = cachedAgentName || metadata?.agent?.type || metadata?.agentType || metadata?.agent?.name || null;
    const nextLabel = agentName ? `${agentName}(${abbreviateId(messageId)})` : abbreviateId(messageId);
    if (!trackerState) {
      trackerState = {
        key,
        messageId,
        tracker: createTracker({
          sessionId: key,
          rollingWindowMs: resolvedConfig.rollingWindowMs
        }),
        label: nextLabel,
        firstTokenAt: null,
        lastUpdated: 0,
        agent: metadata?.agent,
        agentId: metadata?.agentId,
        agentType: metadata?.agentType
      };
      sessionState.messageTrackers.set(key, trackerState);
    } else if (trackerState.label !== nextLabel && nextLabel) {
      trackerState.label = nextLabel;
    }
    if (metadata?.agent) {
      trackerState.agent = metadata.agent;
    }
    if (metadata?.agentId) {
      trackerState.agentId = metadata.agentId;
    }
    if (metadata?.agentType) {
      trackerState.agentType = metadata.agentType;
    }
    return trackerState;
  }
  function showPrimaryLine(agents) {
    const primary = primarySessionId ? sessionTrackers.get(primarySessionId)?.aggregate : undefined;
    if (!primary?.isRateReady()) {
      return false;
    }
    const liveTps = primary.getSmoothedTPS();
    if (liveTps < resolvedConfig.minVisibleTPS) {
      return false;
    }
    ui.updateDisplay(liveTps, primary.getAverageTPS(), primary.getTotalTokens(), primary.getElapsedMs(), agents);
    return true;
  }
  function getAllActiveAgentsGlobally(now) {
    const activityWindow = Math.max(resolvedConfig.rollingWindowMs, resolvedConfig.initialDisplayDelayMs * 4);
    const entries = [];
    for (const [sessionId, sessionState] of sessionTrackers) {
      for (const [trackerKey, trackerState] of sessionState.messageTrackers) {
        if (!trackerState.firstTokenAt)
          continue;
        if (now - trackerState.lastUpdated > activityWindow)
          continue;
        const isCrossSession = sessionId !== primarySessionId;
        if (!isCrossSession)
          continue;
        const cachedAgentName = messageAgentCache.get(trackerState.messageId);
        const agentName = cachedAgentName || sessionAgentNameCache.get(sessionId) || "bg";
        const identifier = abbreviateId(trackerState.messageId);
        const label = `${agentName}(${identifier})`;
        entries.push({
          id: trackerKey,
          label,
          instantTps: trackerState.tracker.getSmoothedTPS(),
          avgTps: trackerState.tracker.getAverageTPS(),
          totalTokens: trackerState.tracker.getTotalTokens(),
          elapsedMs: now - trackerState.firstTokenAt
        });
      }
    }
    entries.sort((a, b) => b.instantTps - a.instantTps);
    if (entries.length > 0) {
      logger.debug(`[TpsMeter] getAllActiveAgentsGlobally found ${entries.length} agents: ${entries.map((e) => `${e.label}@${e.instantTps.toFixed(1)}`).join(", ")}`);
    }
    return entries;
  }
  function isPrimarySessionActive(now) {
    if (!primarySessionId)
      return false;
    const sessionState = sessionTrackers.get(primarySessionId);
    if (!sessionState)
      return false;
    const activityWindow = Math.max(resolvedConfig.rollingWindowMs, resolvedConfig.initialDisplayDelayMs * 4);
    for (const trackerState of sessionState.messageTrackers.values()) {
      if (trackerState.firstTokenAt && now - trackerState.lastUpdated <= activityWindow) {
        return true;
      }
    }
    return false;
  }
  function removeMessageTrackerState(sessionId, messageId) {
    const sessionState = sessionTrackers.get(sessionId);
    if (!sessionState) {
      return;
    }
    for (const [key, state] of sessionState.messageTrackers) {
      if (state.messageId === messageId) {
        sessionState.messageTrackers.delete(key);
      }
    }
    if (sessionState.messageTrackers.size === 0) {
      sessionState.aggregate.reset();
      sessionState.aggregateFirstTokenAt = null;
    }
  }
  function scheduleDisplayTimer(sessionId) {
    const existingTimer = pendingDisplayTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      pendingDisplayTimers.delete(sessionId);
      const sessionState = sessionTrackers.get(sessionId);
      if (!sessionState || !sessionState.aggregateFirstTokenAt) {
        return;
      }
      const now = Date.now();
      const elapsedSinceFirstToken = now - sessionState.aggregateFirstTokenAt;
      if (elapsedSinceFirstToken < resolvedConfig.initialDisplayDelayMs)
        return;
      const allAgents = getAllActiveAgentsGlobally(now);
      if (!(isPrimarySessionActive(now) && showPrimaryLine(allAgents)) && allAgents.length > 0) {
        ui.updateDisplay(0, 0, 0, 0, allAgents);
      }
      logger.debug(`[TpsMeter] Timer-triggered display for session ${sessionId}`);
    }, resolvedConfig.initialDisplayDelayMs);
    pendingDisplayTimers.set(sessionId, timer);
  }
  function clearDisplayTimer(sessionId) {
    const timer = pendingDisplayTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      pendingDisplayTimers.delete(sessionId);
    }
  }
  function cleanup() {
    logger.debug("[TpsMeter] Cleaning up all trackers and UI");
    for (const timer of pendingDisplayTimers.values()) {
      clearTimeout(timer);
    }
    pendingDisplayTimers.clear();
    sessionTrackers.clear();
    partTextCache.clear();
    messageTokenCache.clear();
    messageRoleCache.clear();
    sessionAgentNameCache.clear();
    messageAgentCache.clear();
    primarySessionId = null;
    ui.clear();
  }
  function getPartTextCache(sessionId) {
    const sessionCache = partTextCache.get(sessionId) || new Map;
    partTextCache.set(sessionId, sessionCache);
    return sessionCache;
  }
  function countTokenDifference(previousText, nextText) {
    return Math.max(0, tokenizer.count(nextText) - tokenizer.count(previousText));
  }
  function rememberDeltaText(sessionId, messageId, partId, delta) {
    const sessionCache = getPartTextCache(sessionId);
    for (const partType of COUNTABLE_PART_TYPES) {
      const key = `${messageId}:${partId}:${partType}`;
      const existing = sessionCache.get(key);
      sessionCache.set(key, `${typeof existing === "string" ? existing : ""}${delta}`);
    }
    const liveKey = `${messageId}:${partId}:live`;
    let counter = sessionCache.get(liveKey);
    if (typeof counter === "string" || counter === undefined) {
      counter = createIncrementalCounter(tokenizerAlgorithm);
      sessionCache.set(liveKey, counter);
    }
    return counter.add(delta);
  }
  function handleMessagePartUpdated(event) {
    const part = event.properties.part;
    const deltaSessionId = event.properties.sessionID;
    const deltaMessageId = event.properties.messageID;
    let delta;
    let partText;
    let partId;
    let sessionId;
    let messageId;
    if (part) {
      if (!COUNTABLE_PART_TYPES.has(part.type)) {
        return;
      }
      sessionId = part.sessionID || deltaSessionId || "default";
      messageId = part.messageID;
      partId = part.id;
      partText = extractPartText(part);
      if (!event.properties.delta && partText.length === 0) {
        return;
      }
      if (event.properties.delta) {
        delta = event.properties.delta;
      } else {
        delta = partText;
      }
    } else if (deltaSessionId && deltaMessageId && event.properties.delta) {
      sessionId = deltaSessionId;
      messageId = deltaMessageId;
      partId = event.properties.partID || "delta";
      delta = event.properties.delta;
    } else {
      return;
    }
    if (!delta || delta.length === 0) {
      return;
    }
    const roleCache = messageRoleCache.get(sessionId);
    const role = roleCache?.get(messageId);
    if (role !== "assistant") {
      return;
    }
    let tokenCount;
    if (part && !event.properties.delta && partText !== undefined) {
      const sessionCache = getPartTextCache(sessionId);
      const cacheKey = `${part.messageID}:${part.id}:${part.type}`;
      const cached = sessionCache.get(cacheKey);
      const previousText = typeof cached === "string" ? cached : "";
      tokenCount = partText.startsWith(previousText) ? countTokenDifference(previousText, partText) : tokenizer.count(partText);
      sessionCache.set(cacheKey, partText);
    } else {
      tokenCount = rememberDeltaText(sessionId, messageId, partId || "delta", delta);
    }
    if (tokenCount === 0) {
      return;
    }
    const sessionState = getOrCreateSessionState(sessionId);
    const messageTracker = getOrCreateMessageTrackerState(sessionId, messageId);
    const now = Date.now();
    cleanupStaleMessages(now);
    if (!sessionState.aggregateFirstTokenAt) {
      sessionState.aggregateFirstTokenAt = now;
      scheduleDisplayTimer(sessionId);
    }
    if (!messageTracker.firstTokenAt) {
      messageTracker.firstTokenAt = now;
      if (primarySessionId === null) {
        primarySessionId = sessionId;
        logger.debug(`[TpsMeter] Primary session set to: ${sessionId}`);
      }
      const metaLabel = messageTracker.label;
      const metaInfo = messageTracker.agent || messageTracker.agentId || messageTracker.agentType ? `agent=${messageTracker.agent?.type ?? messageTracker.agentType ?? "?"} id=${messageTracker.agent?.id ?? messageTracker.agentId ?? "?"}` : "agent=none";
      const trackerKey = messageTracker.key;
      const isBg = sessionId !== primarySessionId;
      logger.debug(`[TpsMeter] Tracker initialized ${metaLabel} (${metaInfo}) session=${sessionId} primary=${primarySessionId} isBg=${isBg} key=${trackerKey} message=${messageId} part=${part?.id ?? event.properties.partID ?? "?"}`);
    }
    messageTracker.lastUpdated = now;
    if (part?.type === "reasoning") {
      messageTracker.sawReasoning = true;
    }
    sessionState.aggregate.recordTokens(tokenCount, now);
    messageTracker.tracker.recordTokens(tokenCount, now);
    const messageCache = messageTokenCache.get(sessionId) || new Map;
    messageTokenCache.set(sessionId, messageCache);
    const previousTokens = messageCache.get(messageId) ?? 0;
    messageCache.set(messageId, previousTokens + tokenCount);
    const smoothedTps = sessionState.aggregate.getSmoothedTPS();
    const avgTps = sessionState.aggregate.getAverageTPS();
    const elapsedSinceFirstToken = sessionState.aggregateFirstTokenAt === null ? 0 : Math.max(0, now - sessionState.aggregateFirstTokenAt);
    if (elapsedSinceFirstToken >= resolvedConfig.initialDisplayDelayMs) {
      clearDisplayTimer(sessionId);
      const allAgents = getAllActiveAgentsGlobally(now);
      if (!(isPrimarySessionActive(now) && showPrimaryLine(allAgents)) && allAgents.length > 0) {
        ui.updateDisplay(0, 0, 0, 0, allAgents);
      }
    }
    logger.debug(`[TpsMeter] Session ${sessionId}: +${tokenCount} tokens, TPS: ${smoothedTps.toFixed(1)} (avg: ${avgTps.toFixed(1)})`);
  }
  function handleMessageUpdated(event) {
    const info = event.properties.info;
    if (!info) {
      return;
    }
    const roleCache = messageRoleCache.get(info.sessionID) || new Map;
    messageRoleCache.set(info.sessionID, roleCache);
    roleCache.set(info.id, info.role);
    const agentName = agentNameFromMessage(info);
    if (agentName) {
      messageAgentCache.set(info.id, agentName);
      logger.debug(`[TpsMeter] Cached agent name "${agentName}" for message ${info.id}`);
      sessionAgentNameCache.set(info.sessionID, agentName);
    }
    if (info.role === "assistant") {
      const sessionId = info.sessionID;
      const sessionCache = partTextCache.get(sessionId);
      const tokenCache = messageTokenCache.get(sessionId) || new Map;
      messageTokenCache.set(sessionId, tokenCache);
      const outputTokens = info.tokens?.output ?? 0;
      const reasoningTokens = info.tokens?.reasoning ?? 0;
      const reportedTokens = outputTokens + reasoningTokens;
      const messageId = info.id;
      const messageTracker = getOrCreateMessageTrackerState(sessionId, messageId);
      const previous = tokenCache.get(messageId) ?? 0;
      const nextTokens = Math.max(previous, reportedTokens);
      tokenCache.set(messageId, nextTokens);
      if (info.time?.completed) {
        const completedAt = info.time?.completed ?? Date.now();
        const createdAt = info.time?.created ?? completedAt;
        const cachedTokens = tokenCache.get(messageId) ?? 0;
        const totalTokens = reportedTokens > 0 ? reportedTokens : cachedTokens;
        const streamedAvg = messageTracker.tracker.getAverageTPS();
        const elapsedMs = streamedAvg > 0 ? messageTracker.tracker.getElapsedMs() : Math.max(0, completedAt - createdAt);
        const avgTps = streamedAvg > 0 ? correctedAverage(streamedAvg, messageTracker.tracker.getTotalTokens(), messageTracker.sawReasoning && reasoningTokens === 0 ? 0 : outputTokens + (messageTracker.sawReasoning ? reasoningTokens : 0)) : elapsedMs > 0 ? totalTokens / (elapsedMs / 1000) : 0;
        const hasValidFinish = info.finish !== undefined && info.finish !== null && !INVALID_FINISH_REASONS.has(info.finish);
        const shouldShowFinalStats = hasValidFinish && totalTokens > 0 && avgTps > 0;
        if (shouldShowFinalStats) {
          ui.showFinalStats(totalTokens, avgTps, elapsedMs, {
            read: info.tokens?.cache?.read ?? 0,
            write: info.tokens?.cache?.write ?? 0,
            input: info.tokens?.input ?? 0
          });
          logger.info(`[TpsMeter] Session ${sessionId} complete: ${totalTokens} tokens in ${(elapsedMs / 1000).toFixed(1)}s (avg ${avgTps.toFixed(1)} TPS)`);
        }
      }
      if (sessionCache) {
        for (const key of sessionCache.keys()) {
          if (key.startsWith(`${info.id}:`)) {
            sessionCache.delete(key);
          }
        }
      }
      if (info.time?.completed) {
        tokenCache.delete(messageId);
        roleCache.delete(messageId);
        removeMessageTrackerState(sessionId, messageId);
      }
    }
    if (info.error) {
      logger.warn(`[TpsMeter] Message error for session: ${info.sessionID}`);
    }
  }
  function handleSessionIdle(event) {
    const sessionId = event.properties.sessionID || "default";
    logger.debug(`[TpsMeter] Session idle: ${sessionId}`);
    clearDisplayTimer(sessionId);
    sessionTrackers.delete(sessionId);
    partTextCache.delete(sessionId);
    messageTokenCache.delete(sessionId);
    messageRoleCache.delete(sessionId);
    sessionAgentNameCache.delete(sessionId);
    if (sessionTrackers.size === 0) {
      cleanup();
    }
  }
  let lastCleanupTime = 0;
  function cleanupStaleMessages(now) {
    if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
      return;
    }
    lastCleanupTime = now;
    let cleanedCount = 0;
    for (const [sessionId, sessionState] of sessionTrackers) {
      const tokenCache = messageTokenCache.get(sessionId);
      const roleCache = messageRoleCache.get(sessionId);
      const sessionCache = partTextCache.get(sessionId);
      const keysToDelete = [];
      for (const [key, messageTracker] of sessionState.messageTrackers) {
        if (messageTracker.lastUpdated > 0 && now - messageTracker.lastUpdated > MAX_MESSAGE_AGE_MS) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        const messageTracker = sessionState.messageTrackers.get(key);
        if (messageTracker) {
          sessionState.messageTrackers.delete(key);
          const messageId = messageTracker.messageId;
          tokenCache?.delete(messageId);
          roleCache?.delete(messageId);
          if (sessionCache) {
            for (const cacheKey of sessionCache.keys()) {
              if (cacheKey.startsWith(`${messageId}:`)) {
                sessionCache.delete(cacheKey);
              }
            }
          }
          cleanedCount++;
        }
      }
      if (sessionState.messageTrackers.size === 0) {
        sessionState.aggregate.reset();
        sessionState.aggregateFirstTokenAt = null;
      }
    }
    if (cleanedCount > 0) {
      logger.debug(`[TpsMeter] Cleaned up ${cleanedCount} stale message entries`);
    }
  }
  return {
    event: async ({ event }) => {
      try {
        switch (event.type) {
          case "message.part.updated":
          case "message.part.delta":
            handleMessagePartUpdated(event);
            break;
          case "message.updated":
            handleMessageUpdated(event);
            break;
          case "session.idle":
            handleSessionIdle(event);
            break;
          default:
            break;
        }
      } catch (error) {
        logger.error("[TpsMeter] Error handling event:", error instanceof Error ? error.message : String(error));
      }
    }
  };
}
var plugin = {
  id: "opencode-tps-meter",
  server: TpsMeterPlugin,
  setup: setupAuto
};
var src_default = plugin;
export {
  src_default as default
};
