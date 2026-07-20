import {Agent, OpenAIProvider, Runner, setTracingDisabled} from "@openai/agents";

setTracingDisabled(true);

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


const agent = new Agent({
    name: "Assistant",
    instructions: "你是一个有帮助的助手。"
});

export async function runAgent(input: string) {
    const result = await runner.run(agent, input);
    return result.finalOutput;
}
