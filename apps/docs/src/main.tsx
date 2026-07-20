import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Card, Dialog, Form, FormActions, FormField, Input, PageLayout, Select, Table } from "@person-workspace/ui";
import "@person-workspace/ui/styles.css";
import "./styles.css";

const rows = [
  { id: "ui", name: "组件库", status: "可发布包", owner: "packages/ui" },
  { id: "front", name: "业务前端", status: "消费者", owner: "FrontProject" }
];

function DocsApp() {
  const [open, setOpen] = useState(false);

  return (
    <PageLayout
      actions={<Button onClick={() => setOpen(true)}>打开 Dialog</Button>}
      description="每个示例都来自 @person-workspace/ui，用于约束业务项目优先使用组件库。"
      title="UI 组件文档"
    >
      <section className="docs-grid">
        <Card title="Button">
          <div className="docs-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </Card>

        <Card title="Input">
          <Input hint="使用 token 驱动的输入框样式。" label="项目名称" placeholder="FrontProject" />
        </Card>

        <Card title="Select">
          <Select
            label="项目类型"
            options={[
              { label: "业务前端", value: "front" },
              { label: "后端服务", value: "backend" },
              { label: "本地 App Server", value: "app-server" }
            ]}
            placeholder="请选择"
          />
        </Card>

        <Card title="Form">
          <Form description="表单统一使用组件库结构。" title="发布配置">
            <FormField>
              <Input label="包名" placeholder="@person-workspace/ui" />
            </FormField>
            <FormField>
              <Select
                label="发布范围"
                options={[
                  { label: "公开发布", value: "public" },
                  { label: "私有发布", value: "private" }
                ]}
                placeholder="请选择"
              />
            </FormField>
            <FormActions>
              <Button variant="secondary">重置</Button>
              <Button>保存</Button>
            </FormActions>
          </Form>
        </Card>

        <Card description="Card 用来承载明确的内容块。" title="Card">
          业务页面不直接写重复卡片样式。
        </Card>

        <Card title="Table">
          <Table
            columns={[
              { key: "name", title: "名称", render: (row) => row.name },
              { key: "status", title: "状态", render: (row) => row.status },
              { key: "owner", title: "位置", render: (row) => row.owner }
            ]}
            data={rows}
            rowKey={(row) => row.id}
          />
        </Card>

        <Card title="PageLayout">
          当前页面本身就是 PageLayout 示例，负责页面标题、说明、操作区和内容宽度。
        </Card>
      </section>

      <Dialog
        actions={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              取消
            </Button>
            <Button onClick={() => setOpen(false)}>确认</Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title="Dialog"
      >
        这是 Dialog 使用示例。业务项目通过组件 props 控制弹窗，不直接写遮罩和弹窗样式。
      </Dialog>
    </PageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocsApp />
  </StrictMode>
);
