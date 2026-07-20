import {Agent, OpenAIProvider, Runner, setTracingDisabled, tool} from "@openai/agents";
import {createBusinessMcpServer} from "./mcp/mcpServer";
import {searchKnowledgeText} from "./tools/searchKnowledge";

setTracingDisabled(true);

export class AgentRunTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Agent 调用超过 ${timeoutMs}ms 未返回`);
        this.name = "AgentRunTimeoutError";
    }
}

export type BusinessContext = {
    operatorUserId?: string;
    brandId?: string;
    inputs?: Record<string, unknown>;
};

export type ConversationMessage = {
    role: "user" | "assistant";
    content: string;
};

function getRunTimeoutMs() {
    const timeoutMs = Number(process.env.AGENT_RUN_TIMEOUT_MS);

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
        return timeoutMs;
    }

    return 90000;
}

function normalizeId(value: string | undefined) {
    const id = value?.trim();

    return id && /^\d+$/.test(id) ? id : undefined;
}

function resolveBusinessContext(context: BusinessContext = {}): BusinessContext {
    return {
        operatorUserId: normalizeId(context.operatorUserId),
        brandId: normalizeId(context.brandId),
        inputs: context.inputs && typeof context.inputs === "object"
            ? context.inputs
            : undefined
    };
}

function formatBusinessContext(context: BusinessContext) {
    return JSON.stringify({
        operatorUserId: context.operatorUserId ?? null,
        brandId: context.brandId ?? null,
        page: context.inputs ?? {}
    }, null, 2);
}

function formatConversationHistory(history: ConversationMessage[] = []) {
    const messages = history
        .filter((message) => message && ["user", "assistant"].includes(message.role) && message.content?.trim())
        .slice(-20);

    if (messages.length === 0) {
        return "无历史消息";
    }

    return messages.map((message) => [
        message.role === "user" ? "用户" : "助手",
        message.content.trim()
    ].join("：")).join("\n\n");
}

type JsonSchema = {
    type?: string | string[];
    format?: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
    [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatUnknownError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function formatMissingToolError(error: unknown) {
    const message = formatUnknownError(error);
    const match = /Tool\s+([^\s]+)\s+not found/.exec(message);

    if (!match) {
        return null;
    }

    return `当前 MCP 没有提供模型选择的工具 \`${match[1]}\`，因此无法完成这次查询。请先在 dada-tennis 暴露对应的 MCP 工具。`;
}

function exposeIdsAsStrings(schema: JsonSchema, propertyName?: string): JsonSchema {
    const normalized: JsonSchema = {...schema};

    if (propertyName && /Ids?$/.test(propertyName) && ["integer", "number"].includes(String(schema.type))) {
        normalized.type = "string";
        delete normalized.format;
        normalized.description = [schema.description, "请以字符串传递，避免长整型精度丢失。"]
            .filter(Boolean)
            .join(" ");
    }

    if (schema.properties) {
        normalized.properties = Object.fromEntries(
            Object.entries(schema.properties).map(([name, child]) => [
                name,
                exposeIdsAsStrings(child, name)
            ])
        );
    }

    if (schema.items) {
        normalized.items = exposeIdsAsStrings(schema.items, propertyName);
    }

    return normalized;
}

function buildModelToolSchema(inputSchema: JsonSchema) {
    const schema = exposeIdsAsStrings(inputSchema);
    const properties = {...schema.properties};

    delete properties.operatorUserId;
    delete properties.brandId;

    return {
        ...schema,
        type: "object" as const,
        properties,
        required: (schema.required ?? []).filter(
            (name) => name !== "operatorUserId" && name !== "brandId"
        ),
        additionalProperties: true as const
    };
}

function formatMcpResult(result: unknown) {
    if (Array.isArray(result)) {
        return result.map((item) => {
            if (isRecord(item) && "text" in item) {
                return String(item.text);
            }

            return JSON.stringify(item);
        }).join("\n");
    }

    return typeof result === "string" ? result : JSON.stringify(result);
}

async function createModelSelectedMcpTools(
    mcpServer: ReturnType<typeof createBusinessMcpServer>,
    context: BusinessContext
) {
    const mcpTools = await mcpServer.listTools();
    const attemptedStateChanges = new Set<string>();

    return mcpTools.map((mcpTool) => {
        const inputSchema = mcpTool.inputSchema as JsonSchema;
        const sourceProperties = inputSchema.properties ?? {};
        const isStateChanging = /^State-changing tool:/i.test(mcpTool.description ?? "");

        return tool({
            name: mcpTool.name,
            description: mcpTool.description || `调用 MCP 工具 ${mcpTool.name}`,
            parameters: buildModelToolSchema(inputSchema),
            strict: false,
            execute: async (modelArgs: unknown) => {
                const args = isRecord(modelArgs) ? {...modelArgs} : {};

                if (isStateChanging && attemptedStateChanges.has(mcpTool.name)) {
                    return "工具未执行：同一个写操作在本轮已经调用过，禁止自动重试。请根据首次调用结果直接向用户说明成功或失败原因。";
                }

                if (isStateChanging) {
                    attemptedStateChanges.add(mcpTool.name);
                }

                if (sourceProperties.operatorUserId) {
                    if (!context.operatorUserId) {
                        return "工具未执行：后端上下文缺少 operatorUserId，请先向用户说明需要从已登录的运营端发起。";
                    }

                    args.operatorUserId = context.operatorUserId;
                }

                if (sourceProperties.brandId) {
                    if (!context.brandId) {
                        return "工具未执行：后端上下文缺少 brandId，请先询问用户要操作哪个俱乐部。";
                    }

                    args.brandId = context.brandId;
                }

                try {
                    const result = formatMcpResult(await mcpServer.callTool(mcpTool.name, args));
                    console.info("MCP tool completed", {
                        toolName: mcpTool.name,
                        result: result.slice(0, 1000)
                    });
                    return result;
                } catch (error) {
                    const message = `工具调用失败：${formatUnknownError(error)}`;
                    console.warn("MCP tool failed", {toolName: mcpTool.name, message});
                    return message;
                }
            }
        });
    });
}

const modelProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    useResponses: false
});

const runner = new Runner({
    modelProvider,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    tracingDisabled: true
});

const agentInstructions = [
    "你是搭搭网球业务助手，必须使用简体中文回答。",
    "你可以看到完整的 MCP 工具清单，必须根据用户意图自主判断是否调用工具以及调用哪个工具；后端不会替你筛选工具。",
    "查询实时业务数据或执行业务操作时，选择语义最匹配的 MCP 工具；业务规则问题优先依据知识库。",
    "operatorUserId 和 brandId 由运行时自动注入，不会出现在工具参数中，也禁止向用户索取或猜测。页面参数可以用于理解当前操作对象。",
    "缺少工具必填参数、查询范围不明确或存在多个可能对象时，先用自然语言追问，不要调用参数不完整的工具。",
    "写操作必须先向用户展示操作对象和关键参数，只有用户明确确认后才能调用对应工具。",
    "同一个写操作每轮最多调用一次。无论首次调用成功还是失败，都禁止自动重试；失败时直接向用户说明工具返回的具体原因。",
    "工具返回后必须继续组织为用户可读的摘要，优先展示名称、状态、时间、数量和下一步，不要直接输出原始 JSON。",
    "任何具体赛事、报名、场地、课程、用户、数量、状态、地址、时间或 ID 都必须直接来自本轮成功的工具结果或后端上下文。",
    "工具调用失败、没有返回数据或没有匹配工具时，只能说明失败或能力缺口，绝对禁止编造示例数据、推测数据或用知识库内容冒充实时结果。",
    "查询最近赛事及报名时，先调用赛事列表工具；只有列表返回赛事后，才能用返回的 tournamentId 查询对应报名，最多处理最近 5 场。",
    "知识库未命中且问题不需要实时工具时，直接说明没有找到对应规则。"
].join("\n");

async function runWithAgent(
    input: string,
    signal: AbortSignal,
    businessContext?: BusinessContext,
    history?: ConversationMessage[]
) {
    const context = resolveBusinessContext(businessContext);
    const knowledge = await searchKnowledgeText(input, 3);
    const mcpServer = createBusinessMcpServer();

    try {
        await mcpServer.connect();
        const mcpTools = await createModelSelectedMcpTools(mcpServer, context);

        const agent = new Agent({
            name: "DadaTennisAssistant",
            instructions: agentInstructions,
            tools: mcpTools,
            modelSettings: {
                toolChoice: "auto",
                parallelToolCalls: false,
                maxTokens: 800,
                temperature: 0.2
            }
        });
        agent.on("agent_tool_start", (_runContext, selectedTool) => {
            console.info("Agent selected MCP tool", {toolName: selectedTool.name});
        });
        const enrichedInput = [
            `用户问题：${input}`,
            "",
            "后端可信业务上下文：",
            formatBusinessContext(context),
            "",
            "同一会话的最近历史消息：",
            formatConversationHistory(history),
            "",
            "知识库检索结果：",
            knowledge
        ].join("\n");
        try {
            const result = await runner.run(agent, enrichedInput, {
                signal,
                maxTurns: 8
            });

            return result.finalOutput;
        } catch (error) {
            const missingToolMessage = formatMissingToolError(error);

            if (missingToolMessage) {
                return missingToolMessage;
            }

            throw error;
        }
    } finally {
        await mcpServer.close().catch(() => undefined);
    }
}

export async function runAgent(
    input: string,
    businessContext?: BusinessContext,
    history?: ConversationMessage[]
) {
    const timeoutMs = getRunTimeoutMs();
    const abortController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
            abortController.abort();
            reject(new AgentRunTimeoutError(timeoutMs));
        }, timeoutMs);
    });

    try {
        return await Promise.race([
            runWithAgent(input, abortController.signal, businessContext, history),
            timeoutResult
        ]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}
