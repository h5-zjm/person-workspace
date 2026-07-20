# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this workspace.

## 这是什么

`person-workspace/` 是一个工作空间目录，用来承载后续的前端项目、后端项目、规划中的 Codex App Server 项目，以及可发布的前端 UI 包。

当前目录约定如下：

| 目录 | 角色 | 说明 |
|---|---|---|
| `FrontProject/` | 前端项目 | Next.js 业务前端，放用户可见页面、交互、前端状态管理和对后端流式接口的调用 |
| `BackEnd/` | 后端项目 | Next.js API 服务，放业务 API、流式接口、鉴权、任务编排等后端逻辑 |
| `AppServer/` | Codex App Server | 规划为连接浏览器和本地 Codex 的本地服务，用于浏览器侧能力、本机服务编排和 Codex 联动 |
| `packages/ui/` | UI 组件库 | 可发布的前端 UI 包，提供 Button、Input、Select、Dialog、Form、Card、Table、PageLayout 和设计 token |
| `apps/docs/` | 组件文档页 | 展示 `packages/ui` 的组件使用示例 |

工作空间根目录只放跨项目说明、monorepo 编排配置和必要的工具入口。不要把具体业务代码直接散落在根目录。

## 项目边界

- `FrontProject/` 负责产品前端体验，不直接承载后端业务逻辑。
- `BackEnd/` 负责真实业务接口和数据持久化，不放前端 UI 组件。
- `AppServer/` 负责本地 Codex / 浏览器连接能力，不替代业务后端。
- `packages/ui/` 是可发布组件库，业务前端通过包依赖使用它，不把组件库嵌在 `FrontProject/` 里面。
- 如果某个改动只服务一个子项目，就放在对应子项目里，不提前抽到 workspace 根目录。

## UI 包放置规则

`packages/ui` 是独立可发布包，属于 workspace 根目录。

`FrontProject` 是业务代码消费者，不再放 `FrontProject/packages/ui`。业务代码使用：

```ts
import { Button, Input } from "@person-workspace/ui";
```

新增通用 UI 能力先补 `packages/ui/src/components/` 和设计 token，再在 `FrontProject` 中引用。业务专属页面和业务组合逻辑仍放 `FrontProject/`。

## Codex App Server 规划边界

`AppServer/` 的目标是做本地能力桥接：

- 连接浏览器页面和本地 Codex；
- 提供本地 HTTP/WebSocket/SSE 等通信入口（按实际技术方案确定）；
- 管理浏览器侧操作、任务状态、日志或本地会话信息；
- 调用本机 Codex 相关能力时保持接口清晰、可验证。

不要把 `AppServer/` 做成第二套业务后端。业务数据、用户体系、核心业务接口仍应归 `BackEnd/`。

## 工作方式

开始修改前先判断当前任务属于哪个子项目：

1. 前端页面、组件、样式、交互：进入 `FrontProject/`。
2. 业务接口、数据库、鉴权、服务逻辑：进入 `BackEnd/`。
3. 浏览器连接、本地 Codex 联动、本地服务编排：进入 `AppServer/`。
4. 通用 UI 组件、设计 token、组件文档：进入 `packages/ui/` 或 `apps/docs/`。
5. 跨项目说明、统一脚本、workspace 级约定：留在根目录。

如果某个子项目后续有自己的 `CLAUDE.md` 或 `AGENTS.md`，在该子项目内工作时先读子项目文档；子项目文档优先于本文件的通用说明。

## 常用命令

```bash
pnpm dev:front      # FrontProject Next.js，默认 http://localhost:3000
pnpm dev:backend    # BackEnd Next.js，默认 http://localhost:3001
pnpm dev:docs       # UI 文档页，默认 http://127.0.0.1:5174
pnpm check          # lint + typecheck + build
```

FrontProject 默认调用 `NEXT_PUBLIC_BACKEND_URL`，未配置时使用 `http://127.0.0.1:3001`。当前流式接口为 `POST /api/chat/stream`。

## 设计原则

- 选择假设最少、最直接的方案。
- 不为了未来可能不会发生的需求提前设计复杂 monorepo、共享包或抽象层。
- 每新增一个包、组件、服务或抽象，都要确认它解决了当前真实问题。
- 跨项目复用要基于实际重复，而不是提前预判。
- 修改范围尽量贴近任务，不顺手重构无关目录。

## 待补充

随着三个子项目落地后，再把以下信息补进对应位置：

- 更完整的前后端接口地址和鉴权约定；
- AppServer 与浏览器、本地 Codex 的通信协议；
- 各子项目自己的代码规范和目录说明。
