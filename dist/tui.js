var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/tui.tsx
var exports_tui2 = {};
__export(exports_tui2, {
  default: () => tui_default2
});
module.exports = __toCommonJS(exports_tui2);

// src/v2/tui.tsx
var exports_tui = {};
__export(exports_tui, {
  colorForSnapshot: () => colorForSnapshot,
  default: () => tui_default,
  normalizeTheme: () => normalizeTheme,
  setupTui: () => setupTui,
  v2TuiPlugin: () => v2TuiPlugin
});

// src/tui.tsx
var import_solid8 = require("@opentui/solid");
var import_solid9 = require("@opentui/solid");
var import_solid10 = require("@opentui/solid");
var import_solid11 = require("@opentui/solid");
var import_solid12 = require("@opentui/solid");
var import_solid13 = require("@opentui/solid");
var import_solid_js2 = require("solid-js");

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
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var os = __toESM(require("os"), 1);
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

// src/v2/family.ts
var SUBAGENT_LINGER_MS = 4000;
var MAX_METER_ENTRIES = 4;
var DUPLICATE_SUFFIX_LENGTH = 4;
function shortSessionLabel(sessionID) {
  return sessionID.slice(-6);
}
function isGenerating(reading, now, windowMs) {
  return reading.active && now - reading.lastActivityAt <= windowMs;
}
function ask(resolve, sessionID) {
  if (!resolve) {
    return;
  }
  try {
    return resolve(sessionID);
  } catch {
    return;
  }
}
function labelFor(sessionID, agentOf) {
  const name = ask(agentOf, sessionID);
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : shortSessionLabel(sessionID);
}
function collectMeterEntries(options) {
  const { rootID, memberIDs, snapshots, agentOf, isRunning, now } = options;
  const windowMs = options.generatingWindowMs ?? DEFAULT_ROLLING_WINDOW_MS;
  const entries = [];
  for (const sessionID of memberIDs) {
    const snapshot = snapshots.get(sessionID);
    if (!snapshot) {
      continue;
    }
    const isRoot = sessionID === rootID;
    const generating = isGenerating(snapshot, now, windowMs);
    if (!isRoot && !generating && now - snapshot.lastActivityAt > SUBAGENT_LINGER_MS && ask(isRunning, sessionID) !== true) {
      continue;
    }
    entries.push({
      sessionID,
      isRoot,
      label: isRoot ? "main" : labelFor(sessionID, agentOf),
      tps: generating ? snapshot.instantTps : snapshot.avgTps,
      instantTps: snapshot.instantTps,
      generating
    });
  }
  entries.sort((a, b) => {
    if (a.isRoot !== b.isRoot) {
      return a.isRoot ? -1 : 1;
    }
    const aStart = snapshots.get(a.sessionID)?.startedAt ?? 0;
    const bStart = snapshots.get(b.sessionID)?.startedAt ?? 0;
    if (aStart !== bStart) {
      return aStart - bStart;
    }
    return a.sessionID < b.sessionID ? -1 : a.sessionID > b.sessionID ? 1 : 0;
  });
  const counts = new Map;
  for (const entry of entries) {
    counts.set(entry.label, (counts.get(entry.label) ?? 0) + 1);
  }
  return entries.map((entry) => (counts.get(entry.label) ?? 0) > 1 ? { ...entry, label: `${entry.label}(${entry.sessionID.slice(-DUPLICATE_SUFFIX_LENGTH)})` } : entry);
}
function hasSubagentEntries(entries) {
  return entries.some((entry) => !entry.isRoot);
}
function aggregateReading(entries) {
  const { sum, count } = generatingTotals(entries);
  return { active: count > 0, instantTps: count > 0 ? sum / count : 0 };
}
function generatingTotals(entries) {
  let sum = 0;
  let count = 0;
  for (const entry of entries) {
    if (entry.generating) {
      sum += entry.instantTps;
      count += 1;
    }
  }
  return { sum, count };
}
function formatAggregateLine(entries) {
  const { sum } = generatingTotals(entries);
  const shown = entries.slice(0, MAX_METER_ENTRIES);
  const parts = shown.map((entry) => `${entry.label} ${Math.round(entry.tps)}`);
  const overflow = entries.length - shown.length;
  if (overflow > 0) {
    parts.push(`+${overflow}`);
  }
  return `TPS Σ ${Math.round(sum)} | ${parts.join(" | ")}`;
}
function sameIDs(a, b) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

// src/v2/tui.tsx
var import_solid = require("@opentui/solid");
var import_solid2 = require("@opentui/solid");
var import_solid3 = require("@opentui/solid");
var import_solid4 = require("@opentui/solid");
var import_solid5 = require("@opentui/solid");
var import_solid6 = require("@opentui/solid");
var import_solid7 = require("@opentui/solid");
var import_solid_js = require("solid-js");

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

// src/v2/ledger.ts
var LEDGER_KEY = "ledger.v2";
var EMPTY = { version: 2, models: {} };
function emptyEntry() {
  return {
    samples: 0,
    tokens: 0,
    generationMs: 0,
    cost: 0,
    bestTps: 0,
    lastTps: 0,
    meanTtftMs: 0,
    ttftSamples: 0
  };
}
function createLedger(storage) {
  let fallback = { ...EMPTY, models: {} };
  let handle;
  try {
    handle = storage?.store(LEDGER_KEY, { initial: { ...EMPTY, models: {} } });
    if (handle && (!Array.isArray(handle) || typeof handle[1] !== "function")) {
      handle = undefined;
    }
  } catch {
    handle = undefined;
  }
  function read() {
    if (!handle) {
      return fallback;
    }
    try {
      return handle[0] ?? fallback;
    } catch {
      return fallback;
    }
  }
  function mutate(fn) {
    if (handle) {
      try {
        handle[1](fn);
        return;
      } catch {
        handle = undefined;
      }
    }
    const draft = JSON.parse(JSON.stringify(fallback));
    fn(draft);
    fallback = draft;
  }
  return {
    record(measurement) {
      const { modelKey, tokens, generationMs, cost, ttftMs } = measurement;
      if (!modelKey || tokens <= 0 || generationMs <= 0) {
        return;
      }
      const tps = tokens / (generationMs / 1000);
      if (!Number.isFinite(tps) || tps <= 0) {
        return;
      }
      mutate((draft) => {
        if (!draft.models) {
          draft.models = {};
        }
        const entry = draft.models[modelKey] ?? emptyEntry();
        entry.samples += 1;
        entry.tokens += tokens;
        entry.generationMs += generationMs;
        entry.cost += cost > 0 ? cost : 0;
        entry.lastTps = tps;
        entry.bestTps = Math.max(entry.bestTps, tps);
        if (ttftMs > 0) {
          entry.meanTtftMs = (entry.meanTtftMs * entry.ttftSamples + ttftMs) / (entry.ttftSamples + 1);
          entry.ttftSamples += 1;
        }
        draft.models[modelKey] = entry;
      });
    },
    read,
    meanTps(modelKey) {
      const entry = read().models?.[modelKey];
      if (!entry || entry.generationMs <= 0) {
        return 0;
      }
      return entry.tokens / (entry.generationMs / 1000);
    },
    calibrations() {
      const saved = read().calibration;
      return saved ? { ...saved } : {};
    },
    recordCalibration(modelKey, entry) {
      if (!modelKey || !Number.isFinite(entry.factor) || entry.factor <= 0) {
        return;
      }
      mutate((draft) => {
        draft.calibration = { ...draft.calibration ?? {}, [modelKey]: { ...entry } };
      });
    },
    clear() {
      mutate((draft) => {
        draft.models = {};
      });
    }
  };
}

// src/v2/tui.tsx
var SUBSCRIBED_EVENTS = ["session.text.delta", "session.reasoning.delta", "session.step.ended", "session.step.failed", "session.usage.updated", "session.idle", "session.step.started", "session.tool.input.delta", "session.tool.input.ended", "session.tool.called", "session.tool.success", "session.tool.failed", "session.execution.started", "session.execution.succeeded", "session.execution.failed", "session.execution.interrupted"];
var MODE_ORDER = ["compact", "detailed", "hidden"];
var DASHBOARD_ROUTE = "tps";
var PLUGIN_ID = "opencode-tps-meter";
function loadTuiConfig(options) {
  try {
    return loadConfigSync(options);
  } catch {
    return defaultConfig;
  }
}
function tps(value) {
  return value.toFixed(1);
}
function ms(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}
function normalizeTheme(getTheme) {
  const pick = (...candidates) => candidates.find((c) => c !== undefined);
  const resolve = () => {
    const text = getTheme().text ?? {};
    const feedback = (kind) => pick(text.feedback?.[kind]?.base, text.feedback?.[kind]?.default);
    return {
      default: pick(text.base, text.default),
      subdued: pick(text.muted, text.subdued),
      feedback: {
        error: {
          default: feedback("error")
        },
        warning: {
          default: feedback("warning")
        },
        success: {
          default: feedback("success")
        },
        info: {
          default: feedback("info")
        }
      }
    };
  };
  return {
    get text() {
      return resolve();
    }
  };
}
function colorForSnapshot(theme, config, reading) {
  if (!reading.active) {
    return theme.text.subdued;
  }
  if (!config.enableColorCoding) {
    return theme.text.default;
  }
  if (reading.instantTps < config.slowTpsThreshold) {
    return theme.text.feedback.error.default;
  }
  if (reading.instantTps > config.fastTpsThreshold) {
    return theme.text.feedback.success.default;
  }
  return theme.text.feedback.warning.default;
}
var IDLE_READING = {
  active: false,
  instantTps: 0
};
function resolveFamily(data, sessionID) {
  const solo = {
    rootID: sessionID,
    memberIDs: [sessionID],
    names: new Map
  };
  if (!data) {
    return solo;
  }
  let rootID;
  let family;
  try {
    rootID = data.root(sessionID);
    if (typeof rootID !== "string" || rootID.length === 0) {
      return solo;
    }
    family = data.family(rootID);
  } catch {
    return solo;
  }
  if (!Array.isArray(family)) {
    return solo;
  }
  const memberIDs = [...new Set([rootID, sessionID, ...family.filter((id) => typeof id === "string" && id.length > 0)])];
  const names = new Map;
  for (const id of memberIDs) {
    try {
      const agent = data.get(id)?.agent;
      if (typeof agent === "string" && agent.trim().length > 0) {
        names.set(id, agent);
      }
    } catch {}
  }
  return {
    rootID,
    memberIDs,
    names
  };
}
function MeterView(props) {
  const current = import_solid_js.createMemo(() => {
    if (props.mode() === "hidden") {
      return;
    }
    const sessionID = props.input.sessionID;
    return sessionID ? props.snapshots().get(sessionID) : undefined;
  });
  const readingIDs = import_solid_js.createMemo(() => [...props.snapshots().keys()], [], {
    equals: sameIDs
  });
  const family = import_solid_js.createMemo(() => {
    const sessionID = props.input.sessionID;
    if (props.mode() === "hidden" || !sessionID) {
      return;
    }
    readingIDs();
    return resolveFamily(props.session, sessionID);
  });
  const [tick, setTick] = import_solid_js.createSignal(0);
  const entries = import_solid_js.createMemo(() => {
    const members = family();
    if (!members) {
      return [];
    }
    const snaps = props.snapshots();
    const data = props.session;
    tick();
    return collectMeterEntries({
      rootID: members.rootID,
      memberIDs: members.memberIDs,
      snapshots: snaps,
      agentOf: (id) => members.names.get(id) ?? snaps.get(id)?.agent,
      isRunning: data ? (id) => data.status(id) === "running" : undefined,
      now: Date.now(),
      generatingWindowMs: props.config.rollingWindowMs
    });
  });
  const aggregate = import_solid_js.createMemo(() => {
    const rows = entries();
    return hasSubagentEntries(rows) ? {
      text: formatAggregateLine(rows),
      reading: aggregateReading(rows)
    } : undefined;
  });
  const showingAggregate = import_solid_js.createMemo(() => aggregate() !== undefined);
  import_solid_js.createEffect(() => {
    if (!showingAggregate()) {
      return;
    }
    const heartbeat = setInterval(() => setTick((value) => value + 1), AGGREGATE_TICK_INTERVAL_MS);
    import_solid_js.onCleanup(() => clearInterval(heartbeat));
  });
  const line = import_solid_js.createMemo(() => {
    const rows = aggregate();
    if (rows !== undefined) {
      return rows.text;
    }
    const snapshot = current();
    if (!snapshot) {
      return "";
    }
    const base = formatMeterText(snapshot, props.config);
    if (props.config.streamOnlyTps && snapshot.active) {
      return base;
    }
    const extra = [];
    if (props.mode() === "detailed") {
      if (snapshot.toolMs > 0) {
        extra.push(`tools ${ms(snapshot.toolMs)}`);
      }
      if (snapshot.ttftMs > 0) {
        extra.push(`ttft ${ms(snapshot.ttftMs)}`);
      }
      if (snapshot.overheadTokens > 0) {
        extra.push(`+${snapshot.overheadTokens} ovh`);
      }
      if (snapshot.interrupted) {
        extra.push("aborted");
      }
    } else if (props.config.showTtft && snapshot.ttftMs > 0) {
      extra.push(`ttft ${ms(snapshot.ttftMs)}`);
    }
    return extra.length > 0 ? `${base} · ${extra.join(" · ")}` : base;
  });
  const reading = () => aggregate()?.reading ?? current() ?? IDLE_READING;
  return import_solid2.createComponent(import_solid_js.Show, {
    get when() {
      return line();
    },
    get fallback() {
      return (() => {
        var _el$3 = import_solid7.createElement("box");
        import_solid6.setProp(_el$3, "flexShrink", 0);
        return _el$3;
      })();
    },
    get children() {
      var _el$ = import_solid7.createElement("box"), _el$2 = import_solid7.createElement("text");
      import_solid4.insertNode(_el$, _el$2);
      import_solid6.setProp(_el$, "flexDirection", "row");
      import_solid6.setProp(_el$, "flexShrink", 0);
      import_solid5.insert(_el$2, line);
      import_solid3.effect((_$p) => import_solid6.setProp(_el$2, "fg", colorForSnapshot(props.theme, props.config, reading()), _$p));
      return _el$;
    }
  });
}
function SidebarPanel(props) {
  const family = import_solid_js.createMemo(() => {
    const data = props.ctx.data.session;
    const sessionID = props.input.sessionID;
    if (!data || !sessionID) {
      return [];
    }
    let rootID;
    let ids;
    try {
      rootID = data.root(sessionID);
      ids = data.family(rootID) ?? [];
    } catch {
      return [];
    }
    if (ids.length <= 1) {
      return [];
    }
    return ids.map((id) => ({
      id,
      label: data.get(id)?.agent ?? (id === rootID ? "main" : id.slice(-6)),
      isRoot: id === rootID
    }));
  });
  const rows = import_solid_js.createMemo(() => {
    const members = family();
    if (members.length === 0) {
      return [];
    }
    const data = props.ctx.data.session;
    const snaps = props.snapshots();
    return members.map((member) => {
      const snapshot = snaps.get(member.id);
      return {
        ...member,
        running: data?.status(member.id) === "running",
        tps: snapshot ? snapshot.active ? snapshot.instantTps : snapshot.avgTps : 0,
        tokens: snapshot?.totalTokens ?? 0
      };
    });
  });
  return import_solid2.createComponent(import_solid_js.Show, {
    get when() {
      return rows().length > 0;
    },
    get fallback() {
      return (() => {
        var _el$7 = import_solid7.createElement("box");
        import_solid6.setProp(_el$7, "flexShrink", 0);
        return _el$7;
      })();
    },
    get children() {
      var _el$4 = import_solid7.createElement("box"), _el$5 = import_solid7.createElement("text");
      import_solid4.insertNode(_el$4, _el$5);
      import_solid6.setProp(_el$4, "flexDirection", "column");
      import_solid6.setProp(_el$4, "flexShrink", 0);
      import_solid4.insertNode(_el$5, import_solid.createTextNode(`Throughput`));
      import_solid5.insert(_el$4, import_solid2.createComponent(import_solid_js.For, {
        get each() {
          return rows();
        },
        children: (row) => (() => {
          var _el$8 = import_solid7.createElement("box"), _el$9 = import_solid7.createElement("text");
          import_solid4.insertNode(_el$8, _el$9);
          import_solid6.setProp(_el$8, "flexDirection", "row");
          import_solid6.setProp(_el$8, "flexShrink", 0);
          import_solid5.insert(_el$9, () => `${row.isRoot ? ">" : " "} ${row.label} ${tps(row.tps)} t/s ${row.tokens} tok`);
          import_solid3.effect((_$p) => import_solid6.setProp(_el$9, "fg", row.running ? props.theme.text.default : props.theme.text.subdued, _$p));
          return _el$8;
        })()
      }), null);
      import_solid3.effect((_$p) => import_solid6.setProp(_el$5, "fg", props.theme.text.subdued, _$p));
      return _el$4;
    }
  });
}
function DashboardPage(props) {
  try {
    props.ctx.keymap?.layer(() => ({
      commands: [{
        id: "tps.back",
        bind: "escape,q",
        title: "Back",
        description: "Leave the throughput dashboard",
        group: "TPS Meter",
        run: props.onClose
      }]
    }));
  } catch {}
  const models = import_solid_js.createMemo(() => {
    const data = props.ledger.read();
    return Object.entries(data.models ?? {}).map(([key, entry]) => ({
      key,
      entry,
      meanTps: entry.generationMs > 0 ? entry.tokens / (entry.generationMs / 1000) : 0
    })).sort((a, b) => b.meanTps - a.meanTps);
  });
  const live = import_solid_js.createMemo(() => [...props.snapshots().values()].filter((s) => s.active));
  const header = "model".padEnd(34) + "mean".padStart(8) + "best".padStart(8) + "ttft".padStart(9) + "n".padStart(6);
  return (() => {
    var _el$0 = import_solid7.createElement("box"), _el$1 = import_solid7.createElement("text"), _el$14 = import_solid7.createElement("text");
    import_solid4.insertNode(_el$0, _el$1);
    import_solid4.insertNode(_el$0, _el$14);
    import_solid6.setProp(_el$0, "flexDirection", "column");
    import_solid6.setProp(_el$0, "flexGrow", 1);
    import_solid4.insertNode(_el$1, import_solid.createTextNode(`Throughput dashboard`));
    import_solid5.insert(_el$0, import_solid2.createComponent(import_solid_js.Show, {
      get when() {
        return live().length > 0;
      },
      get children() {
        var _el$11 = import_solid7.createElement("box"), _el$12 = import_solid7.createElement("text");
        import_solid4.insertNode(_el$11, _el$12);
        import_solid6.setProp(_el$11, "flexDirection", "column");
        import_solid6.setProp(_el$11, "flexShrink", 0);
        import_solid4.insertNode(_el$12, import_solid.createTextNode(`Live`));
        import_solid5.insert(_el$11, import_solid2.createComponent(import_solid_js.For, {
          get each() {
            return live();
          },
          children: (s) => (() => {
            var _el$16 = import_solid7.createElement("text");
            import_solid5.insert(_el$16, () => `  ${s.modelKey}  ${tps(s.instantTps)} t/s  avg ${tps(s.avgTps)}  ${s.totalTokens} tok`);
            import_solid3.effect((_$p) => import_solid6.setProp(_el$16, "fg", props.theme.text.default, _$p));
            return _el$16;
          })()
        }), null);
        import_solid3.effect((_$p) => import_solid6.setProp(_el$12, "fg", props.theme.text.subdued, _$p));
        return _el$11;
      }
    }), _el$14);
    import_solid4.insertNode(_el$14, import_solid.createTextNode(`model                                 mean    best     ttft     n`));
    import_solid5.insert(_el$0, import_solid2.createComponent(import_solid_js.Show, {
      get when() {
        return models().length > 0;
      },
      get fallback() {
        return (() => {
          var _el$17 = import_solid7.createElement("text");
          import_solid4.insertNode(_el$17, import_solid.createTextNode(` no completed steps recorded yet`));
          import_solid3.effect((_$p) => import_solid6.setProp(_el$17, "fg", props.theme.text.subdued, _$p));
          return _el$17;
        })();
      },
      get children() {
        return import_solid2.createComponent(import_solid_js.For, {
          get each() {
            return models();
          },
          children: (row) => (() => {
            var _el$19 = import_solid7.createElement("text");
            import_solid5.insert(_el$19, () => row.key.slice(0, 33).padEnd(34) + tps(row.meanTps).padStart(8) + tps(row.entry.bestTps).padStart(8) + (row.entry.ttftSamples > 0 ? ms(row.entry.meanTtftMs) : "-").padStart(9) + String(row.entry.samples).padStart(6));
            import_solid3.effect((_$p) => import_solid6.setProp(_el$19, "fg", props.theme.text.default, _$p));
            return _el$19;
          })()
        });
      }
    }), null);
    import_solid3.effect((_p$) => {
      var _v$ = props.theme.text.default, _v$2 = props.theme.text.subdued;
      _v$ !== _p$.e && (_p$.e = import_solid6.setProp(_el$1, "fg", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = import_solid6.setProp(_el$14, "fg", _v$2, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$0;
  })();
}
function CommandLayer(props) {
  const describe = () => {
    const entries = [...props.snapshots().values()];
    if (entries.length === 0) {
      return "No throughput recorded yet.";
    }
    return entries.map((s) => {
      const parts = [`${tps(s.active ? s.instantTps : s.avgTps)} TPS`, `${s.totalTokens} tok`];
      if (s.toolMs > 0)
        parts.push(`tools ${ms(s.toolMs)}`);
      if (s.ttftMs > 0)
        parts.push(`ttft ${ms(s.ttftMs)}`);
      if (s.overheadTokens > 0)
        parts.push(`+${s.overheadTokens} overhead`);
      const cache = formatCacheHit(s);
      if (cache !== null) {
        parts.push(`cache ${cache}`);
      }
      const sessionCache = formatSessionCacheHit(s);
      if (sessionCache !== null) {
        parts.push(`session cache ${sessionCache}`);
      }
      return parts.join(" · ");
    }).join(" | ");
  };
  const layer = () => ({
    mode: "global",
    commands: [{
      id: "tps.toggle",
      title: "Throughput meter",
      description: "Open the dashboard, cycle the meter, or show current stats",
      group: "TPS Meter",
      palette: true,
      slash: {
        name: "tps",
        arguments: true
      },
      run: (input) => {
        const arg = (input ?? "").trim().toLowerCase();
        if (arg === "" && props.ctx.ui.router) {
          props.openDashboard();
          return;
        }
        if (arg === "detail" || arg === "details") {
          props.ctx.ui.toast?.show({
            title: "Throughput",
            message: describe(),
            variant: "info",
            duration: 6000
          });
          return;
        }
        if (arg === "reset") {
          props.ledger.clear();
          props.ctx.ui.toast?.show({
            title: "Throughput",
            message: "Ledger cleared.",
            variant: "success"
          });
          return;
        }
        if (arg === "compact" || arg === "detailed" || arg === "hidden") {
          props.setMode(arg);
          return;
        }
        const index = MODE_ORDER.indexOf(props.mode());
        props.setMode(MODE_ORDER[(index + 1) % MODE_ORDER.length]);
      }
    }]
  });
  try {
    props.ctx.keymap?.layer(layer);
  } catch {}
  return null;
}
function setupTui(ctx) {
  const config = loadTuiConfig(ctx.options);
  if (!config.enabled) {
    return;
  }
  const theme = normalizeTheme(() => ctx.theme);
  const ledger = createLedger(ctx.storage);
  let initialCalibration = {};
  try {
    initialCalibration = ledger.calibrations();
  } catch {}
  const meter = createMeter(config, {
    onStepSettled: (measurement) => {
      try {
        ledger.record(measurement);
      } catch {}
    },
    initialCalibration,
    onCalibrated: (modelKey, calibration) => {
      try {
        ledger.recordCalibration(modelKey, calibration);
      } catch {}
    }
  });
  const [snapshots, setSnapshots] = import_solid_js.createSignal(new Map);
  const [mode, setMode] = import_solid_js.createSignal("compact");
  const disposers = [];
  let returnTo;
  const openDashboard = () => {
    const router = ctx.ui.router;
    if (!router) {
      return;
    }
    const current = router.current();
    if (current.type === "plugin" && current.id === PLUGIN_ID && current.name === DASHBOARD_ROUTE) {
      return;
    }
    returnTo = {
      ...current
    };
    router.navigate({
      type: "plugin",
      name: DASHBOARD_ROUTE
    });
  };
  const closeDashboard = () => {
    const destination = returnTo ?? {
      type: "home"
    };
    returnTo = undefined;
    ctx.ui.router?.navigate(destination);
  };
  const cleanup = () => {
    for (const dispose of disposers) {
      dispose();
    }
    disposers.length = 0;
    meter.dispose();
    setSnapshots(() => new Map);
  };
  try {
    disposers.push(meter.subscribe((next) => setSnapshots(() => next)));
    for (const type of SUBSCRIBED_EVENTS) {
      disposers.push(ctx.data.on(type, (event) => {
        meter.handleEvent(event);
      }));
    }
    disposers.push(ctx.ui.slot({
      after: "prompt.footer.status",
      render: (input) => import_solid2.createComponent(MeterView, {
        input,
        theme,
        config,
        mode,
        snapshots,
        get session() {
          return ctx.data.session;
        }
      })
    }));
  } catch (error) {
    cleanup();
    throw error;
  }
  function optional(label, register) {
    try {
      const dispose = register();
      if (typeof dispose === "function") {
        disposers.push(dispose);
      }
    } catch {}
  }
  if (ctx.data.session) {
    optional("sidebar", () => ctx.ui.slot({
      append: "sidebar.content",
      render: (input) => import_solid2.createComponent(SidebarPanel, {
        input,
        ctx,
        theme,
        snapshots
      })
    }));
  }
  if (ctx.ui.router) {
    optional("dashboard", () => ctx.ui.router?.register({
      name: DASHBOARD_ROUTE,
      render: () => import_solid2.createComponent(DashboardPage, {
        ctx,
        ledger,
        theme,
        snapshots,
        onClose: closeDashboard
      })
    }));
  }
  if (ctx.keymap) {
    optional("commands", () => ctx.ui.slot({
      append: "app",
      render: () => import_solid2.createComponent(CommandLayer, {
        ctx,
        mode,
        setMode,
        snapshots,
        ledger,
        openDashboard
      })
    }));
  }
  return cleanup;
}
var v2TuiPlugin = {
  id: PLUGIN_ID,
  setup: setupTui
};
var tui_default = v2TuiPlugin;

// src/tui.tsx
var MAX_TREE_DEPTH = 16;
var IDLE_READING2 = {
  active: false,
  instantTps: 0
};
function loadTuiConfig2() {
  try {
    return loadConfigSync();
  } catch {
    return defaultConfig;
  }
}
function rememberBounded(map, key, value) {
  map.delete(key);
  map.set(key, value);
  while (map.size > MAX_REMEMBERED_SESSIONS) {
    const oldest = map.keys().next();
    if (oldest.done) {
      break;
    }
    map.delete(oldest.value);
  }
}
function colorForSnapshot2(theme, config, reading) {
  if (!reading.active) {
    return theme.textMuted;
  }
  if (!config.enableColorCoding) {
    return theme.text;
  }
  if (reading.instantTps < config.slowTpsThreshold) {
    return theme.error;
  }
  if (reading.instantTps > config.fastTpsThreshold) {
    return theme.success;
  }
  return theme.warning;
}
function MeterView2(props) {
  const current = import_solid_js2.createMemo(() => props.snapshots().get(props.sessionId));
  const readingIDs = import_solid_js2.createMemo(() => [...props.snapshots().keys()], [], {
    equals: sameIDs
  });
  const family = import_solid_js2.createMemo(() => {
    props.treeVersion();
    return props.familyOf(props.sessionId, readingIDs());
  });
  const [tick, setTick] = import_solid_js2.createSignal(0);
  const entries = import_solid_js2.createMemo(() => {
    const {
      rootID,
      memberIDs
    } = family();
    tick();
    return collectMeterEntries({
      rootID,
      memberIDs,
      snapshots: props.snapshots(),
      agentOf: props.agentOf,
      isRunning: props.isRunning,
      now: Date.now(),
      generatingWindowMs: props.config.rollingWindowMs
    });
  });
  const aggregate = import_solid_js2.createMemo(() => {
    const rows = entries();
    return hasSubagentEntries(rows) ? {
      text: formatAggregateLine(rows),
      reading: aggregateReading(rows)
    } : undefined;
  });
  const showingAggregate = import_solid_js2.createMemo(() => aggregate() !== undefined);
  import_solid_js2.createEffect(() => {
    if (!showingAggregate()) {
      return;
    }
    const heartbeat = setInterval(() => setTick((value) => value + 1), AGGREGATE_TICK_INTERVAL_MS);
    import_solid_js2.onCleanup(() => clearInterval(heartbeat));
  });
  const line = import_solid_js2.createMemo(() => {
    const rows = aggregate();
    if (rows !== undefined) {
      return rows.text;
    }
    const snapshot = current();
    return snapshot ? formatMeterText(snapshot, props.config) : "";
  });
  const reading = () => aggregate()?.reading ?? current() ?? IDLE_READING2;
  return import_solid8.createComponent(import_solid_js2.Show, {
    get when() {
      return line();
    },
    get fallback() {
      return (() => {
        var _el$3 = import_solid13.createElement("box");
        import_solid12.setProp(_el$3, "flexShrink", 0);
        return _el$3;
      })();
    },
    get children() {
      var _el$ = import_solid13.createElement("box"), _el$2 = import_solid13.createElement("text");
      import_solid10.insertNode(_el$, _el$2);
      import_solid12.setProp(_el$, "flexDirection", "row");
      import_solid12.setProp(_el$, "flexShrink", 0);
      import_solid11.insert(_el$2, line);
      import_solid9.effect((_$p) => import_solid12.setProp(_el$2, "fg", colorForSnapshot2(props.api.theme.current, props.config, reading()), _$p));
      return _el$;
    }
  });
}
var tui = async (api) => {
  const config = loadTuiConfig2();
  if (!config.enabled) {
    return;
  }
  const tokenizerAlgorithm = config.fallbackTokenHeuristic === "words_div_0_75" ? "word" : config.fallbackTokenHeuristic === "chars_div_3" ? "code" : "heuristic";
  const tokenizer = createTokenizer(tokenizerAlgorithm);
  const [snapshots, setSnapshots] = import_solid_js2.createSignal(new Map);
  const sessions = new Map;
  const sessionCacheUsage = new Map;
  const accountedCacheUsage = new Map;
  const cacheAccountingSeenAt = new Map;
  let lastCacheSweepAt = 0;
  const partTextCache = new Map;
  const messageRoles = new Map;
  const publishTimers = new Map;
  const stallTimers = new Map;
  const disposers = [];
  const sessionParents = new Map;
  const sessionAgents = new Map;
  const [treeVersion, setTreeVersion] = import_solid_js2.createSignal(0);
  const sessionSpawnAt = new Map;
  function parentOf(sessionId) {
    try {
      const fromState = api.state?.session?.get?.(sessionId)?.parentID;
      if (typeof fromState === "string" && fromState.length > 0) {
        return fromState;
      }
    } catch {}
    return sessionParents.get(sessionId) ?? undefined;
  }
  function rememberParent(info) {
    if (!info || typeof info !== "object") {
      return;
    }
    const record = info;
    if (typeof record.id !== "string" || record.id.length === 0) {
      return;
    }
    const parentID = typeof record.parentID === "string" && record.parentID.length > 0 ? record.parentID : null;
    if (sessionParents.has(record.id) && sessionParents.get(record.id) === parentID) {
      return;
    }
    rememberBounded(sessionParents, record.id, parentID);
    setTreeVersion((version) => version + 1);
  }
  function walkToRoot(sessionId, resolved) {
    const path = [];
    const seen = new Set;
    let current = sessionId;
    let root = resolved.get(current);
    while (root === undefined) {
      path.push(current);
      seen.add(current);
      const parent = path.length <= MAX_TREE_DEPTH ? parentOf(current) : undefined;
      if (!parent || seen.has(parent)) {
        root = current;
        break;
      }
      current = parent;
      root = resolved.get(current);
    }
    for (const id of path) {
      resolved.set(id, root);
    }
    return root;
  }
  function resolveFamily(sessionId, candidateIDs) {
    const resolved = new Map;
    const rootID = walkToRoot(sessionId, resolved);
    const memberIDs = [];
    for (const id of new Set([sessionId, ...candidateIDs])) {
      if (walkToRoot(id, resolved) === rootID) {
        memberIDs.push(id);
      }
    }
    return {
      rootID,
      memberIDs
    };
  }
  function isRunning(sessionId) {
    const status = api.state?.session?.status?.(sessionId);
    return status ? status.type !== "idle" : undefined;
  }
  function getPartTextCache(sessionId) {
    const cache = partTextCache.get(sessionId) ?? new Map;
    partTextCache.set(sessionId, cache);
    return cache;
  }
  function getSessionState(sessionId) {
    let state = sessions.get(sessionId);
    if (state) {
      return state;
    }
    state = {
      tracker: createTracker({
        sessionId,
        rollingWindowMs: config.rollingWindowMs
      }),
      firstTokenAt: null,
      lastTokenAt: null,
      lastPublishedAt: 0,
      sawReasoning: false,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 0
    };
    sessions.set(sessionId, state);
    return state;
  }
  function getSessionCacheUsage(sessionId) {
    let usage = sessionCacheUsage.get(sessionId);
    if (!usage) {
      const retained = snapshots().get(sessionId);
      usage = {
        read: retained?.sessionCacheReadTokens ?? 0,
        write: retained?.sessionCacheWriteTokens ?? 0,
        input: retained?.sessionInputTokens ?? 0
      };
      sessionCacheUsage.set(sessionId, usage);
    }
    cacheAccountingSeenAt.set(sessionId, Date.now());
    return usage;
  }
  function sweepCacheAccounting(now) {
    if (now - lastCacheSweepAt < CLEANUP_INTERVAL_MS) {
      return;
    }
    lastCacheSweepAt = now;
    for (const [sessionId, seenAt] of cacheAccountingSeenAt) {
      if (now - seenAt <= MAX_MESSAGE_AGE_MS) {
        continue;
      }
      sessionCacheUsage.delete(sessionId);
      accountedCacheUsage.delete(sessionId);
      cacheAccountingSeenAt.delete(sessionId);
    }
  }
  function accountMessageCache(sessionId, messageId, usage) {
    let byMessage = accountedCacheUsage.get(sessionId);
    if (!byMessage) {
      byMessage = new Map;
      accountedCacheUsage.set(sessionId, byMessage);
    }
    const previous = byMessage.get(messageId) ?? {
      read: 0,
      write: 0,
      input: 0
    };
    byMessage.set(messageId, {
      ...usage
    });
    return {
      read: Math.max(0, usage.read - previous.read),
      write: Math.max(0, usage.write - previous.write),
      input: Math.max(0, usage.input - previous.input)
    };
  }
  function sessionCacheFields(sessionId) {
    const usage = sessionCacheUsage.get(sessionId);
    return {
      sessionCacheReadTokens: usage?.read ?? 0,
      sessionCacheWriteTokens: usage?.write ?? 0,
      sessionInputTokens: usage?.input ?? 0
    };
  }
  function publish(sessionId, active, now = Date.now()) {
    const state = sessions.get(sessionId);
    if (!state) {
      return;
    }
    const totalTokens = state.tracker.getTotalTokens();
    if (totalTokens === 0 || !state.tracker.isRateReady()) {
      return;
    }
    clearPublishTimer(sessionId);
    state.lastPublishedAt = now;
    const nextSnapshot = {
      sessionId,
      instantTps: state.tracker.getSmoothedTPS(),
      avgTps: state.tracker.getAverageTPS(),
      totalTokens,
      elapsedMs: state.tracker.getElapsedMs(),
      active,
      cacheReadTokens: state.cacheReadTokens,
      cacheWriteTokens: state.cacheWriteTokens,
      inputTokens: state.inputTokens,
      ...sessionCacheFields(sessionId),
      lastActivityAt: state.lastTokenAt ?? Date.now(),
      startedAt: sessionSpawnAt.get(sessionId) ?? state.firstTokenAt ?? Date.now()
    };
    setSnapshots((current) => new Map(current).set(sessionId, nextSnapshot));
  }
  function clearPublishTimer(sessionId) {
    const timer = publishTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      publishTimers.delete(sessionId);
    }
  }
  function scheduleActivePublish(sessionId, delayMs) {
    if (publishTimers.has(sessionId)) {
      return;
    }
    const timer = setTimeout(() => {
      publishTimers.delete(sessionId);
      const state = sessions.get(sessionId);
      const now = Date.now();
      if (state !== undefined && state.firstTokenAt !== null && now - state.firstTokenAt >= config.initialDisplayDelayMs && now - state.lastPublishedAt >= config.updateIntervalMs && state.tracker.getTotalTokens() > 0 && state.tracker.getSmoothedTPS() >= config.minVisibleTPS) {
        publish(sessionId, true, now);
      }
    }, delayMs);
    publishTimers.set(sessionId, timer);
  }
  function maybePublishActive(sessionId, now) {
    const state = sessions.get(sessionId);
    if (!state || state.firstTokenAt === null) {
      return;
    }
    const elapsedSinceFirstToken = now - state.firstTokenAt;
    const elapsedSinceLastPublish = now - state.lastPublishedAt;
    const initialDelayRemaining = config.initialDisplayDelayMs - elapsedSinceFirstToken;
    const throttleDelayRemaining = config.updateIntervalMs - elapsedSinceLastPublish;
    if (initialDelayRemaining <= 0 && throttleDelayRemaining <= 0 && state.tracker.getSmoothedTPS() >= config.minVisibleTPS) {
      publish(sessionId, true, now);
      return;
    }
    if (state.tracker.getSmoothedTPS() >= config.minVisibleTPS) {
      scheduleActivePublish(sessionId, Math.max(1, initialDelayRemaining, throttleDelayRemaining));
    }
  }
  function settledReading(state, providerTokens, providerVisible, createdAt, completedAt) {
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
    const elapsedMs = Math.max(0, completedAt - createdAt);
    return {
      totalTokens,
      avgTps: elapsedMs > 0 ? totalTokens / (elapsedMs / 1000) : 0,
      elapsedMs
    };
  }
  function publishFinal(sessionId, reading) {
    const {
      totalTokens,
      avgTps,
      elapsedMs
    } = reading;
    if (totalTokens <= 0 || !(avgTps > 0)) {
      return false;
    }
    const state = sessions.get(sessionId);
    const now = Date.now();
    const nextSnapshot = {
      sessionId,
      instantTps: 0,
      avgTps,
      totalTokens,
      elapsedMs,
      active: false,
      cacheReadTokens: state?.cacheReadTokens ?? 0,
      cacheWriteTokens: state?.cacheWriteTokens ?? 0,
      inputTokens: state?.inputTokens ?? 0,
      ...sessionCacheFields(sessionId),
      lastActivityAt: now,
      startedAt: sessionSpawnAt.get(sessionId) ?? now
    };
    setSnapshots((current) => new Map(current).set(sessionId, nextSnapshot));
    return true;
  }
  function clearStallTimer(sessionId) {
    const timer = stallTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      stallTimers.delete(sessionId);
    }
  }
  function republishStalled(sessionId) {
    stallTimers.delete(sessionId);
    const state = sessions.get(sessionId);
    const current = snapshots().get(sessionId);
    if (!state || !current?.active) {
      return;
    }
    const instantTps = state.tracker.getInstantTPS(Date.now());
    setSnapshots((existing) => new Map(existing).set(sessionId, {
      ...current,
      instantTps
    }));
    if (instantTps > 0) {
      stallTimers.set(sessionId, setTimeout(() => republishStalled(sessionId), STALL_REPUBLISH_MS));
    }
  }
  function resetSession(sessionId) {
    clearPublishTimer(sessionId);
    clearStallTimer(sessionId);
    sessions.delete(sessionId);
    partTextCache.delete(sessionId);
    messageRoles.delete(sessionId);
  }
  function clearActiveSnapshot(sessionId) {
    const current = snapshots().get(sessionId);
    if (current?.active) {
      setSnapshots((existing) => {
        const next = new Map(existing);
        next.delete(sessionId);
        return next;
      });
    }
  }
  function persistIdleSnapshot(sessionId, now = Date.now(), stepCache) {
    const state = sessions.get(sessionId);
    if (state?.tracker.isRateReady()) {
      publish(sessionId, false, now);
      return;
    }
    const current = snapshots().get(sessionId);
    if (!current || !current.active && !stepCache) {
      return;
    }
    setSnapshots((existing) => new Map(existing).set(sessionId, {
      ...current,
      active: false,
      ...stepCache && {
        ...stepCache,
        ...sessionCacheFields(sessionId)
      }
    }));
  }
  function countTokenDifference(previousText, nextText) {
    return Math.max(0, tokenizer.count(nextText) - tokenizer.count(previousText));
  }
  function rememberDeltaText(sessionId, messageId, partId, delta) {
    const cache = getPartTextCache(sessionId);
    for (const partType of COUNTABLE_PART_TYPES) {
      const key = `${messageId}:${partId}:${partType}`;
      const existing = cache.get(key);
      cache.set(key, `${typeof existing === "string" ? existing : ""}${delta}`);
    }
    const liveKey = `${messageId}:${partId}:live`;
    let counter = cache.get(liveKey);
    if (typeof counter === "string" || counter === undefined) {
      counter = createIncrementalCounter(tokenizerAlgorithm);
      cache.set(liveKey, counter);
    }
    return counter.add(delta);
  }
  function shouldTrackText(sessionId, messageId, text) {
    if (text.length === 0) {
      return false;
    }
    return messageRoles.get(sessionId)?.get(messageId) === "assistant";
  }
  function recordTokenCount(sessionId, tokenCount) {
    if (tokenCount === 0) {
      return false;
    }
    const now = Date.now();
    const state = getSessionState(sessionId);
    if (state.firstTokenAt === null) {
      state.firstTokenAt = now;
    }
    state.lastTokenAt = now;
    if (!sessionSpawnAt.has(sessionId)) {
      rememberBounded(sessionSpawnAt, sessionId, now);
    }
    state.tracker.recordTokens(tokenCount, now);
    maybePublishActive(sessionId, now);
    clearStallTimer(sessionId);
    stallTimers.set(sessionId, setTimeout(() => republishStalled(sessionId), STALL_REPUBLISH_MS));
    return true;
  }
  api.slots.register({
    order: 20,
    slots: {
      session_prompt_right(_ctx, props) {
        return import_solid8.createComponent(MeterView2, {
          api,
          config,
          get sessionId() {
            return props.session_id;
          },
          snapshots,
          familyOf: resolveFamily,
          treeVersion,
          agentOf: (id) => sessionAgents.get(id),
          isRunning
        });
      }
    }
  });
  disposers.push(api.event.on("session.created", (event) => {
    rememberParent(event.properties.info);
  }));
  disposers.push(api.event.on("session.updated", (event) => {
    rememberParent(event.properties.info);
  }));
  disposers.push(api.event.on("message.updated", (event) => {
    const info = event.properties.info;
    const sessionId = event.properties.sessionID || info.sessionID;
    sweepCacheAccounting(Date.now());
    const roleCache = messageRoles.get(sessionId) ?? new Map;
    messageRoles.set(sessionId, roleCache);
    roleCache.set(info.id, info.role);
    const agentName = agentNameFromMessage(info);
    if (agentName && !sessionAgents.has(sessionId)) {
      rememberBounded(sessionAgents, sessionId, agentName);
    }
    if (info.role !== "assistant" || !info.time.completed) {
      return;
    }
    const cacheReadTokens = info.tokens.cache?.read ?? 0;
    const cacheWriteTokens = info.tokens.cache?.write ?? 0;
    const inputTokens = info.tokens.input ?? 0;
    const cachedSession = getSessionState(sessionId);
    cachedSession.cacheReadTokens = cacheReadTokens;
    cachedSession.cacheWriteTokens = cacheWriteTokens;
    cachedSession.inputTokens = inputTokens;
    const stepCache = accountMessageCache(sessionId, info.id, {
      read: cacheReadTokens,
      write: cacheWriteTokens,
      input: inputTokens
    });
    const sessionCacheForStep = getSessionCacheUsage(sessionId);
    sessionCacheForStep.read += stepCache.read;
    sessionCacheForStep.write += stepCache.write;
    sessionCacheForStep.input += stepCache.input;
    if (info.finish && info.finish !== TOOL_CALL_FINISH_REASON && INVALID_FINISH_REASONS.has(info.finish)) {
      resetSession(sessionId);
      clearActiveSnapshot(sessionId);
      return;
    }
    const state = sessions.get(sessionId);
    const output = typeof info.tokens.output === "number" ? info.tokens.output : 0;
    const reasoning = typeof info.tokens.reasoning === "number" ? info.tokens.reasoning : 0;
    const reading = settledReading(state, output + reasoning, state?.sawReasoning && reasoning === 0 ? 0 : output + (state?.sawReasoning ? reasoning : 0), info.time.created, info.time.completed);
    if (!publishFinal(sessionId, reading)) {
      persistIdleSnapshot(sessionId, info.time.completed, {
        cacheReadTokens,
        cacheWriteTokens,
        inputTokens
      });
    }
    resetSession(sessionId);
  }));
  disposers.push(api.event.on("message.part.delta", (event) => {
    if (event.properties.field !== "text") {
      return;
    }
    if (shouldTrackText(event.properties.sessionID, event.properties.messageID, event.properties.delta)) {
      const tokenCount = rememberDeltaText(event.properties.sessionID, event.properties.messageID, event.properties.partID, event.properties.delta);
      recordTokenCount(event.properties.sessionID, tokenCount);
    }
  }));
  disposers.push(api.event.on("message.part.updated", (event) => {
    const part = event.properties.part;
    if (!COUNTABLE_PART_TYPES.has(part.type)) {
      return;
    }
    const text = (() => {
      switch (part.type) {
        case "text":
        case "reasoning":
          return part.text;
        default:
          return "";
      }
    })();
    const sessionCache = getPartTextCache(event.properties.sessionID);
    const cacheKey = `${part.messageID}:${part.id}:${part.type}`;
    const cached = sessionCache.get(cacheKey);
    const previousText = typeof cached === "string" ? cached : "";
    if (shouldTrackText(event.properties.sessionID, part.messageID, text)) {
      const tokenCount = text.startsWith(previousText) ? countTokenDifference(previousText, text) : tokenizer.count(text);
      sessionCache.set(cacheKey, text);
      if (recordTokenCount(event.properties.sessionID, tokenCount) && part.type === "reasoning") {
        getSessionState(event.properties.sessionID).sawReasoning = true;
      }
    }
  }));
  disposers.push(api.event.on("session.idle", (event) => {
    persistIdleSnapshot(event.properties.sessionID);
    resetSession(event.properties.sessionID);
    accountedCacheUsage.delete(event.properties.sessionID);
    sessionSpawnAt.delete(event.properties.sessionID);
  }));
  api.lifecycle.onDispose(() => {
    for (const dispose of disposers) {
      dispose();
    }
    sessions.clear();
    partTextCache.clear();
    messageRoles.clear();
    sessionCacheUsage.clear();
    accountedCacheUsage.clear();
    cacheAccountingSeenAt.clear();
    sessionParents.clear();
    sessionAgents.clear();
    sessionSpawnAt.clear();
    for (const timer of publishTimers.values()) {
      clearTimeout(timer);
    }
    publishTimers.clear();
    for (const timer of stallTimers.values()) {
      clearTimeout(timer);
    }
    stallTimers.clear();
    setSnapshots(new Map);
  });
};
var plugin = {
  id: "opencode-tps-meter",
  tui,
  setup: setupTui
};
var tui_default2 = plugin;
