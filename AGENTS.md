# Workspace Agent Rules

## 基本原则

- 当前目录是 pnpm monorepo，`packages/ui` 是可发布 UI 包，`FrontProject` 是业务前端消费者。
- `FrontProject` 和 `BackEnd` 都使用 Next.js；前端页面在 `FrontProject/src/app/`，后端 API 在 `BackEnd/src/app/api/`。
- UI 组件优先从 `@person-workspace/ui` 引入，不要在应用层重复写 Button、Input、Textarea、Select、Dialog、Form、Card、Table、PageLayout。
- 设计 token 只能集中维护在 `packages/ui/src/styles/tokens.css`。
- 应用层不要写 raw color、inline style、临时 UI class，也不要直接使用原生 `button/input/select/table/form/dialog` 搭业务界面。

## 必跑校验

改 UI 后至少运行：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

或者直接运行：

```bash
pnpm check
```

这些命令会通过 ESLint、本地设计规则脚本、TypeScript 和 Vite build 兜底，不能只依赖 prompt 约束。

## 组件库边界

- 新增通用 UI 能力：放 `packages/ui/src/components/`。
- 新增业务页面：放 `FrontProject/`，不要污染组件库。
- 新增后端接口：放 `BackEnd/src/app/api/`，不要塞进前端项目。
- 只有真实复用超过一个位置的通用能力才进入 `@person-workspace/ui`。
- 如果组件库能力不足，先补组件库，再在应用层使用。
