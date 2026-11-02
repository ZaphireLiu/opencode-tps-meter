# Fork 说明：流式-only TPS

本仓库是 [`ChiR24/opencode-tps-meter`](https://github.com/ChiR24/opencode-tps-meter)
的个人 fork，目的是把速度显示拆成两个阶段：

- **运行中**：只显示实时 TPS
- **结算后**：只显示本轮用量（token、cache、TTFT），不再显示 TPS 和平均

这份文档记录与上游的差异、代码落点和跟进上游时的操作步骤。改动代码前先读一遍，rebase 后也请同步更新。

---

## 1. 上游基线

| 项目 | 值 |
| --- | --- |
| 上游仓库 | `https://github.com/ChiR24/opencode-tps-meter` |
| 本 fork | `https://github.com/ZaphireLiu/opencode-tps-meter` |
| 基线 tag | `v0.4.2` |
| 基线 commit | `a6e050d` |
| 本地工作分支 | `feat/stream-only-tps` |
| 本地提交 | 以 `git log --oneline a6e050d..HEAD` 为准 |

分支约定：

- `origin` 指自己的 fork：`git@github.com:ZaphireLiu/opencode-tps-meter.git`
- `upstream` 指上游：`https://github.com/ChiR24/opencode-tps-meter.git`
- `main` 用来镜像上游，不直接提交业务改动
- 所有改动都在 `feat/stream-only-tps`，已推送到 `origin`
- SSH 走 `ssh.github.com:443`（见 `~/.ssh/config`），22 端口在本机不通

---

## 2. 行为差异

### 2.1 显示效果

| 阶段 | 上游默认 | 本 fork 默认 |
| --- | --- | --- |
| 流式 | `92.4 TPS · avg 78.1 · 1,842 tok` | `92.4 TPS` |
| 结算 | `78.1 TPS · avg 78.1 · 1,842 tok · cache 91% · session cache 64%` | `1,842 tok · cache 91% · session cache 64%` |
| 结算 + `showTtft` | 追加 ` · ttft 1.2s` | 追加 ` · ttft 1.2s` |
| 子代理聚合行 | `TPS Σ … \| main … \| agent …` | 不变 |
| `/tps` 仪表盘 | 完整统计 | 不变 |

### 2.2 默认配置差异

| 选项 | 上游默认 | 本 fork 默认 |
| --- | --- | --- |
| `streamOnlyTps` | 不存在 | `true` |
| `showAverage` | `true` | `false` |
| `showInstant` | `true` | `true` |
| `showTotalTokens` | `true` | `true` |
| `showCacheHit` | `true` | `true` |
| `showTtft` | `false` | `false` |
| `showElapsed` | `false` | `false` |

注意：因为 `showAverage` 默认也改了，即使把 `streamOnlyTps` 设为 `false`，默认显示仍与上游不同；要完全恢复上游默认，需要显式设置 `showAverage: true`。

### 2.3 `streamOnlyTps` 的语义

```text
streamOnlyTps = false
  流式: TPS · avg · tok · cache…
  结算: TPS(平均) · avg · tok · cache…

streamOnlyTps = true（默认）
  流式: TPS
  结算: tok · cache…（无 TPS、无 avg）
```

`streamOnlyTps` 为 `true` 时，`showAverage` 不再生效。这是刻意的：该模式下速度只属于流式阶段。

---

## 3. 代码落点（rebase 重点）

### 3.1 `src/types.ts`

`Config` 新增字段：

```ts
streamOnlyTps: boolean;
```

同时把 `showAverage` 的注释默认值改为 `false`。

### 3.2 `src/config.ts`

三处：

1. `defaultConfig`

```ts
showAverage: false,
// …
streamOnlyTps: true,
```

2. `mergeConfig`

```ts
streamOnlyTps: isBoolean(partial.streamOnlyTps)
  ? partial.streamOnlyTps
  : defaults.streamOnlyTps,
```

3. `loadEnvConfig`

```ts
if (process.env.TPS_METER_STREAM_ONLY_TPS !== undefined) {
  envConfig.streamOnlyTps = process.env.TPS_METER_STREAM_ONLY_TPS === "true";
}
```

### 3.3 `src/format.ts`：唯一的渲染决策点

v1 和 v2 的 footer 都调用 `formatMeterText`，所以核心逻辑只在这里：

```ts
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
```

要点：

- 流式且开启 `streamOnlyTps`：提前 return，后面的 token/cache 全部不渲染
- 结算且开启 `streamOnlyTps`：跳过 TPS 和 avg，继续渲染 token/cache
- 关闭 `streamOnlyTps`：保持上游逻辑

### 3.4 `src/v2/tui.tsx`

v2 footer 在 `formatMeterText` 之外还会追加 `extra`（`ttft`、`tools`、`ovh`）。开启 `streamOnlyTps` 时，流式阶段必须跳过这些：

```ts
const base = formatMeterText(snapshot, props.config);
if (props.config.streamOnlyTps && snapshot.active) {
  return base;
}
const extra: string[] = [];
```

如果没有这段，流式时会显示 `92.4 TPS · ttft 1.2s`。

### 3.5 测试改动

| 文件 | 改动 | 原因 |
| --- | --- | --- |
| `src/__tests__/format.test.ts` | 新增 5 个断言组 | 覆盖 fork 默认的流式/结算/会话缓存，以及关闭选项后的上游行为 |
| `src/__tests__/tui.test.ts` | 调整 5 处 frame 断言 | 结算帧不再包含 `TPS`；流式帧不再包含 `tok` |
| `src/__tests__/v1-family.test.ts` | 调整 1 处 | 流式单 agent 帧只有 TPS |
| `src/__tests__/v2.test.ts` | ttft 用例改为先发 `session.step.ended` | fork 默认下 ttft 只在结算后出现 |

rebase 后如果上游新增了 footer 断言，通常两种处理：

- 测试的是流式帧：期望值只保留 TPS
- 测试的是结算帧：期望值去掉行首 TPS / avg，保留 token/cache

### 3.6 文档

- `README.md`：顶部 Fork defaults 说明、默认配置表、footer 示例
- 本文件：差异与 rebase 清单

---

## 4. 保持不变的部分

以下逻辑刻意没有改，降低 rebase 成本：

- 跟踪、校准、ledger、子代理聚合（`src/tracker.ts`、`src/v2/meter.ts`、`src/v2/family.ts`、`src/v2/ledger.ts`）
- `cache` / `session cache` 的计算口径
- `/tps` 仪表盘与 `detailed` 模式的数据
- v1 的双入口结构、构建脚本、`package.json` exports

---

## 5. 跟进上游的步骤

```bash
cd ~/Workshop/opencode-tps-meter

# 1. 拉上游
git fetch upstream

# 2. 变基到上游
git rebase upstream/main

# 可选：同步 fork 的 main
git checkout main
git merge --ff-only upstream/main
git push origin main
git checkout feat/stream-only-tps

# 3. 重新安装与验证
export PATH="$HOME/.bun/bin:$PATH"
bun install
bun test
bun run build
```

预期冲突点，按优先级：

1. `src/format.ts` 的 `formatMeterText`
2. `src/config.ts` 的 `defaultConfig` / `mergeConfig` / `loadEnvConfig`
3. `src/v2/tui.tsx` 的 `line` memo
4. `src/__tests__/format.test.ts` 与各 footer 断言
5. `README.md`

冲突解决清单：

- [ ] `Config` 仍有 `streamOnlyTps`
- [ ] `defaultConfig.streamOnlyTps === true`
- [ ] `defaultConfig.showAverage === false`
- [ ] `mergeConfig` 和 `loadEnvConfig` 仍处理 `streamOnlyTps`
- [ ] `formatMeterText` 仍能在流式时提前返回
- [ ] 结算行仍跳过 TPS 与 avg
- [ ] v2 footer 仍在流式时跳过 `extra`
- [ ] `bun test` 全绿
- [ ] `bun run build` 成功

---

## 6. 构建后的验证

自动检查：

```bash
export PATH="$HOME/.bun/bin:$PATH"

bun test

bun -e '
import { defaultConfig, loadConfigSync } from "./src/config.ts";
import { formatMeterText } from "./src/format.ts";
const c = loadConfigSync({ showTtft: true });
console.log("stream :", formatMeterText({ active: true, instantTps: 42.5, avgTps: 40.1, totalTokens: 900, elapsedMs: 5000 }, c));
console.log("settled:", formatMeterText({ active: false, avgTps: 40.1, totalTokens: 900, elapsedMs: 5000, cacheReadTokens: 91, inputTokens: 9 }, c));
'
```

期望：

```text
stream : 42.5 TPS
settled: 900 tok · cache 91%
```

TUI 冒烟测试：

1. 重新打开 TUI
2. 流式阶段 footer 只有 `xx.x TPS`
3. 结算后 footer 是 `N tok · cache … · session cache …`，没有 TPS 和 avg
4. `/tps` 仪表盘仍能打开

插件状态：

```bash
opencode api get /api/plugin
```

应包含：

```json
{
  "id": "opencode-tps-meter",
  "source": { "type": "local", "path": "/home/liuhan/Workshop/opencode-tps-meter/dist" },
  "features": { "server": true, "tui": true },
  "state": { "status": "active" }
}
```

---

## 7. 本地运行方式（非上游内容）

本机不使用 npm 包，而是注册构建产物：

```jsonc
"plugins": [
  {
    "package": "file:///home/liuhan/Workshop/opencode-tps-meter/dist",
    "options": { "showTtft": true }
  }
]
```

远端：

```text
origin   git@github.com:ZaphireLiu/opencode-tps-meter.git   # 自己的 fork
upstream https://github.com/ChiR24/opencode-tps-meter.git    # 上游
```

相关约定：

- 必须指向 `dist/`，不能指向仓库根目录
- `dist/` 与 `node_modules/` 都被 `.gitignore` 忽略
- 修改源码后必须 `bun run build`，重新打开 TUI 生效
- 版本号仍是 `0.4.2`，没有跟随本地提交
- Bun 位于 `~/.bun/bin/bun`，并用 `~/.bun/bin/bunx` 软链供构建脚本调用

---

## 8. 已知限制

- 一轮里有多个 step 时，工具执行间隙算“已结算”，会短暂显示用量行；下一步开始流式后又只剩 TPS
- 子代理聚合行仍然是上游格式（`TPS Σ …`），不受 `streamOnlyTps` 影响
- TTFT 只在能拿到 turn start 的 V2 上出现；拿不到时不会显示
- `streamOnlyTps` 只影响 footer 文本，不影响 `/tps` 仪表盘、ledger 和校准
- 默认 `showAverage: false` 是 fork 的行为差异；恢复上游显示需要同时设置 `streamOnlyTps: false` 和 `showAverage: true`
