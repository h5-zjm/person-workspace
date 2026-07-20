# @person-workspace/ui

可发布的 React UI 组件包，业务项目优先通过它构建基础界面。

## 安装与使用

workspace 内使用：

```bash
pnpm --filter front-project add @person-workspace/ui@workspace:*
```

发布后使用：

```bash
pnpm add @person-workspace/ui
```

```tsx
import "@person-workspace/ui/styles.css";
import { Button, Input } from "@person-workspace/ui";
```

## 设计 token

设计 token 定义在 `src/styles/tokens.css`：

- 颜色：`--ui-color-*`
- 字号：`--ui-font-size-*`
- 间距：`--ui-space-*`
- 圆角：`--ui-radius-*`
- 阴影：`--ui-shadow-*`

业务项目不要直接写 raw color，应该使用组件或 CSS 变量。

## 组件示例

### Button

```tsx
<Button>保存</Button>
<Button variant="secondary">取消</Button>
<Button variant="danger">删除</Button>
```

### Input

```tsx
<Input label="项目名称" name="name" placeholder="输入项目名称" />
```

### Textarea

```tsx
<Textarea label="提示词" name="prompt" placeholder="输入要执行的任务" />
```

### Select

```tsx
<Select
  label="项目类型"
  name="type"
  options={[
    { label: "前端", value: "front" },
    { label: "后端", value: "backend" }
  ]}
  placeholder="请选择"
/>
```

### Dialog

```tsx
<Dialog open={open} onClose={() => setOpen(false)} title="确认操作">
  确认继续吗？
</Dialog>
```

### Form

```tsx
<Form title="创建项目">
  <FormField>
    <Input label="名称" name="name" />
  </FormField>
  <FormActions>
    <Button type="submit">提交</Button>
  </FormActions>
</Form>
```

### Card

```tsx
<Card title="项目概览" description="基础信息">
  内容
</Card>
```

### Table

```tsx
<Table
  columns={[
    { key: "name", title: "名称", render: (row) => row.name },
    { key: "status", title: "状态", render: (row) => row.status }
  ]}
  data={rows}
  rowKey={(row) => row.id}
/>
```

### PageLayout

```tsx
<PageLayout title="业务工作台" actions={<Button>新建</Button>}>
  页面内容
</PageLayout>
```
