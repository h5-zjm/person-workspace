import {
  AgentRunTimeoutError,
  type BusinessContext,
  type ConversationMessage,
  runAgent
} from "../../../agents/custom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AgentRequest = {
  input?: string;
  conversationId?: string;
  history?: ConversationMessage[];
  context?: BusinessContext;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  let payload: AgentRequest;

  try {
    payload = (await request.json()) as AgentRequest;
  } catch {
    return Response.json(
      { error: "请求体必须是 JSON" },
      { status: 400, headers: corsHeaders }
    );
  }

  const input = payload.input?.trim();

  if (!input) {
    return Response.json(
      { error: "input 不能为空" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const output = await runAgent(input, payload.context, payload.history);

    return Response.json(
      { output },
      {
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error("Agent run failed", error);

    if (error instanceof AgentRunTimeoutError) {
      return Response.json(
        { error: "Agent 调用超时，请检查 OPENAI_BASE_URL、OPENAI_API_KEY、OPENAI_MODEL 或模型服务网络" },
        { status: 504, headers: corsHeaders }
      );
    }

    return Response.json(
      { error: "Agent 调用失败" },
      { status: 500, headers: corsHeaders }
    );
  }
}
