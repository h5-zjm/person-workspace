# Next.js 代码版 Agent 开发计划

## 目标

在 `person-workspace` 里做一个代码驱动的 Agent 系统：前端体验可以接近 Dify 的 Agent 工作台，但 Agent 的 Prompt、工具、知识库、流程和权限都由后端 TypeScript 代码定义，不通过可视化页面配置。

第一版目标不是复刻完整 Dify，而是先跑通：

- 前端可以选择一个后端代码定义的 Agent。
- 用户输入问题后，后端 Agent 可以调用工具和知识检索。
- 前端能看到最终回答、工具调用过程和运行状态。
- 不影响当前已有的 App Server 页面。

## 官方依据

- OpenAI Agents SDK 适合让 SDK 管理 Agent loop、工具调用、多 Agent handoff、sessions、tracing、guardrails 和审批暂停流程。
  - https://developers.openai.com/api/docs/guides/agents
  - https://openai.github.io/openai-agents-js/
- Responses API 适合自己掌控模型调用、工具循环、分支和状态；如果后续想完全自研编排，可以退到 Responses API。
  - https://developers.openai.com/api/reference/responses/overview/
- TypeScript Agents SDK 支持用代码定义 Agent、instructions、model 和 tools。
  - https://openai.github.io/openai-agents-js/guides/agents/
  - https://openai.github.io/openai-agents-js/guides/tools/
- Assistants API 已废弃，官方迁移方向是 Responses API，计划在 2026-08-26 关闭，不建议新项目使用。
  - https://developers.openai.com/api/docs/deprecations
  - https://developers.openai.com/api/docs/assistants/migration

## 技术选型

### 推荐方案

- 前端：`FrontProject`，Next.js 页面。
- 后端：`BackEnd`，Next.js Route Handler。
- Agent 运行时：`@openai/agents`。
- 低层模型调用备用：`openai` 官方 JS SDK + Responses API。
- 知识库第一版：本地 Markdown/JSON 简单检索。
- 知识库第二版：`pgvector` 或 `Qdrant`。
- 日志和调试：先本地 run log，后续接 Agents SDK tracing。

### 暂不引入

- 暂不引入 LangChain：当前需求不需要额外抽象层。
- 暂不接 Dify SDK：目标是用代码定义 Agent，不是复用 Dify 配置。
- 暂不上复杂工作流引擎：第一版用 TypeScript 函数和 Agent 工具就够。
- 暂不上数据库：会话和运行记录第一版可以先内存或文件，确认形态后再持久化。

## 架构设计

```txt
FrontProject
  src/app/agent/
    page.tsx              # Agent 调试台页面
    components/           # 页面内业务组件，不进 UI 包

BackEnd
  src/app/api/agent/
    chat/route.ts         # Agent 对话入口
    configs/route.ts      # Agent 配置摘要
    runs/[runId]/route.ts # 运行详情

  src/agents/
    index.ts
    runner.ts             # 统一运行入口
    customerSupportAgent.ts
    tools/
      searchKnowledge.ts
      queryBusinessData.ts
      createHandoffSummary.ts
    knowledge/
      loader.ts
      retriever.ts
      docs/
```

前端只负责展示和调试；真正的 Agent 定义、工具权限、知识库选择和流程控制全部放在 `BackEnd/src/agents/`。

## Dify 概念到代码的映射

| Dify 概念 | 代码版实现 |
| --- | --- |
| App | `Agent` 配置文件 |
| Prompt | `instructions` |
| 模型配置 | Agent 的 `model` 和运行参数 |
| 工具 | TypeScript function tools |
| 知识库 | `searchKnowledge()` 工具 |
| Workflow 节点 | 后端函数、工具调用、handoff 或显式步骤 |
| 调试窗口 | `FrontProject/src/app/agent/page.tsx` |
| Trace | Agents SDK tracing + 本地 run log |
| 发布版本 | Agent config version |

## 第一版 MVP 范围

### 后端

1. 新增一个固定 Agent：`customerSupportAgent`。
2. 定义 Agent instructions：
   - 先判断用户问题类型。
   - 优先查业务知识库。
   - 需要实时数据时调用工具。
   - 无法处理时生成转人工摘要。
3. 新增三个工具：
   - `searchKnowledge(query)`：检索本地 Markdown/JSON 文档。
   - `queryBusinessData(params)`：模拟业务数据查询，先返回 mock 数据。
   - `createHandoffSummary(context)`：生成转人工摘要。
4. 新增 `POST /api/agent/chat`：
   - 接收 `agentId`、`conversationId`、`message`。
   - 返回 streaming 或普通 JSON。
   - 返回 run id、工具调用日志、最终回答。
5. 新增 `GET /api/agent/configs`：
   - 返回可选 Agent 列表、工具列表、版本号。

### 前端

1. 新增独立页面：`FrontProject/src/app/agent/page.tsx`。
2. 页面结构：
   - 左侧：Agent 列表。
   - 中间：调试对话。
   - 右侧：Agent 配置摘要、工具列表、知识库状态、运行日志。
3. UI 组件优先使用 `@person-workspace/ui`。
4. 不在应用层自造 Button、Input、Textarea、Select、Table 等基础控件。

## API 协议草案

### `GET /api/agent/configs`

响应：

```json
{
  "agents": [
    {
      "id": "customer-support",
      "name": "业务问答 Agent",
      "description": "回答业务规则、订单状态和客服处理问题",
      "version": "0.1.0",
      "tools": ["searchKnowledge", "queryBusinessData", "createHandoffSummary"],
      "knowledgeBases": ["product-docs", "ops-sop"]
    }
  ]
}
```

### `POST /api/agent/chat`

请求：

```json
{
  "agentId": "customer-support",
  "conversationId": "conv_001",
  "message": "订单状态为什么没有更新？",
  "stream": true
}
```

响应事件：

```json
{
  "type": "tool_call",
  "tool": "searchKnowledge",
  "input": {
    "query": "订单状态为什么没有更新？"
  }
}
```

```json
{
  "type": "final",
  "runId": "run_001",
  "answer": "订单状态未更新通常和支付回调、库存锁定或物流同步延迟有关..."
}
```

## 知识库策略

第一版不用立刻上向量库，先用本地文档检索：

```txt
BackEnd/src/agents/knowledge/docs/
  product-faq.md
  order-status.md
  refund-policy.md
  ops-sop.md
```

检索逻辑先做简单版：

1. 读取文档。
2. 按标题和段落切块。
3. 用关键词匹配找候选片段。
4. 把候选片段交给 Agent。

后续资料变多，再升级到向量库：

- 小项目优先 `pgvector`。
- 如果想独立部署向量服务，选 `Qdrant`。

## 安全和权限边界

1. 第一版工具默认只读。
2. 所有工具入参必须有 schema 校验。
3. 不允许模型直接拼 SQL。
4. 写操作必须单独设计审批，不在第一版做。
5. 工具返回值要做脱敏。
6. 前端只展示后端允许展示的 trace 信息，不直接暴露 API key、环境变量和内部错误堆栈。

## 分阶段里程碑

### 阶段 0：设计确认

- 确认第一个 Agent 的业务场景。
- 确认第一批工具。
- 确认第一批知识文档来源。
- 确认是否需要 streaming。

交付物：

- 本文档。
- 第一版接口协议。

### 阶段 1：后端 Agent 骨架

- 安装 `@openai/agents`。
- 新增 `BackEnd/src/agents/`。
- 定义 `customerSupportAgent`。
- 新增 mock tools。
- 新增 `POST /api/agent/chat`。

验收：

- curl 可以调用 Agent。
- Agent 可以返回最终回答。
- 后端日志能看到工具调用过程。

### 阶段 2：前端调试台

- 新增 `/agent` 页面。
- 展示 Agent 列表。
- 支持输入消息并显示回复。
- 展示工具调用日志。

验收：

- 浏览器里能完成一轮 Agent 调试。
- 不影响原来的 `/` App Server 页面。

### 阶段 3：知识库接入

- 新增本地 Markdown/JSON 文档。
- 实现 `searchKnowledge()`。
- 展示命中的知识片段。

验收：

- Agent 能基于本地业务资料回答。
- 回答里能说明依据来自哪些文档片段。

### 阶段 4：运行记录和 Trace

- 保存 run log。
- 展示 tool call、耗时、输入输出摘要。
- 接入 Agents SDK tracing。

验收：

- 每次对话有 run id。
- 前端能查看本轮执行链路。

### 阶段 5：多 Agent 和权限

- 增加 Router Agent。
- 增加 Data Agent / Writer Agent。
- 引入 handoff。
- 写操作工具增加审批。

验收：

- 不同问题能路由到不同 Agent。
- 高风险工具不会自动执行。

## 推荐第一步

先做最小闭环：

```txt
BackEnd:
  customerSupportAgent
  searchKnowledge mock
  queryBusinessData mock
  POST /api/agent/chat

FrontProject:
  /agent 调试页面
```

不要一开始做完整 Dify 式拖拽编排。当前目标是代码版 Agent，前端只做“可观察、可调试、可运行”的工作台。

## 验收标准

- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- `pnpm build` 通过。
- `/` 原 App Server 页面不受影响。
- `/agent` 能完成至少一轮 Agent 对话。
- 后端日志能看到工具调用和最终输出。

