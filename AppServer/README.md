# Codex Bridge AppServer

独立的 Node.js/TypeScript Codex Bridge 后端。浏览器只连接本服务，本服务通过 stdio JSON-RPC 连接 `codex app-server`。

## 启动

```bash
pnpm --filter codex-bridge build
pnpm --filter codex-bridge start
```

默认监听 `127.0.0.1:3100`，默认 Codex 工作目录是 monorepo 根目录。可以用环境变量覆盖：

```bash
CODEX_BRIDGE_PORT=3100 CODEX_BRIDGE_HOST=127.0.0.1 CODEX_BRIDGE_DEFAULT_CWD=/path/to/repo pnpm --filter codex-bridge start
```

## 接口

- `GET /codex/options`：从本地 Codex app-server 读取模型列表、支持的强度、速度 tier 和当前默认配置。
- `GET /sessions`：返回 Bridge 当前内存会话和 Codex 本地历史 thread 列表。
- `POST /sessions`：创建 Codex 会话，并启动一个 app-server thread。
- `GET /sessions/:id`：读取某个 Bridge 会话或 Codex thread 的详情，包含历史 turns。
- `POST /sessions/:id/resume`：恢复一个 Codex 本地 thread，并为它建立新的 Bridge 内存会话。
- `POST /sessions/:id/turns`：发送一次用户需求。
- `WS /sessions/:id/events`：订阅 Codex 流式事件。
- `POST /sessions/:id/interrupt`：中断当前或指定 turn。
- `POST /sessions/:id/compact`：触发当前 thread 的历史压缩。
- `POST /sessions/:id/goal`：设置、读取或清除当前 thread 的持续目标。
- `POST /approvals/:id`：浏览器审批后回传给 Codex。

### GET /codex/options

```json
{
  "defaults": {
    "model": "gpt-5.5",
    "modelProvider": "OpenAI",
    "effort": "xhigh",
    "serviceTier": "default"
  },
  "models": []
}
```

### GET /sessions

```json
{
  "sessions": [],
  "threads": [],
  "nextCursor": null,
  "backwardsCursor": null
}
```

### POST /sessions

```json
{
  "cwd": "/path/to/repo",
  "model": "gpt-5.4",
  "approvalPolicy": "on-request",
  "sandbox": "workspace-write"
}
```

返回的 `id` 与 Codex thread id 一致，前端可以把它存进 `localStorage`，下次打开页面后用 `POST /sessions/:id/resume` 恢复。

### GET /sessions/:id

```json
{
  "session": null,
  "thread": {
    "id": "019f3c33-bd64-75d3-a409-4ce7f2dcdd52",
    "turns": []
  },
  "turns": []
}
```

### POST /sessions/:id/resume

`:id` 优先按 Codex thread id 处理。如果该 thread 已经在 Bridge 内存中运行，会直接复用当前内存会话；否则会调用 Codex app-server 的 `thread/resume`。

```json
{}
```

### POST /sessions/:id/turns

```json
{
  "message": "帮我看一下这个仓库结构"
}
```

也可以直接传 Codex app-server 的 `input` 数组：

```json
{
  "input": [{ "type": "text", "text": "总结这个 repo", "text_elements": [] }]
}
```

### POST /sessions/:id/compact

触发 `thread/compact/start`，请求会立即返回，进度通过当前会话事件继续推送。

```json
{}
```

### POST /sessions/:id/goal

设置目标：

```json
{
  "action": "set",
  "objective": "完成迁移并保持测试通过"
}
```

清除目标：

```json
{
  "action": "clear"
}
```

### POST /approvals/:id

简单审批：

```json
{ "approved": true }
```

或透传 app-server 需要的完整 result：

```json
{
  "result": { "decision": "accept" }
}
```
