export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamRequest = {
  conversationId?: string;
  input?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-cache, no-transform",
  "Content-Type": "text/plain; charset=utf-8"
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildChunks(conversationId: string, input: string) {
  return [
    `窗口：${conversationId}\n`,
    `收到输入：${input}\n\n`,
    "开始流式输出：\n",
    "1. 已建立前端和 BackEnd 的 streaming 连接。\n",
    "2. 当前接口使用 Next.js route handler 返回 ReadableStream。\n",
    "3. 后续可以把这里替换成本地 Codex App Server 的真实执行结果。\n",
    "\n完成。"
  ];
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  let payload: StreamRequest;

  try {
    payload = (await request.json()) as StreamRequest;
  } catch {
    return new Response("请求体必须是 JSON", {
      status: 400,
      headers: corsHeaders
    });
  }

  const input = payload.input?.trim();
  const conversationId = payload.conversationId?.trim() || "default";

  if (!input) {
    return new Response("input 不能为空", {
      status: 400,
      headers: corsHeaders
    });
  }

  const encoder = new TextEncoder();
  const chunks = buildChunks(conversationId, input);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await sleep(180);
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: corsHeaders
  });
}
