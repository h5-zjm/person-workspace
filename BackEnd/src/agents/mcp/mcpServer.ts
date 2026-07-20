import { MCPServerStreamableHttp } from "@openai/agents";

export function createBusinessMcpServer() {
    return new MCPServerStreamableHttp({
        name: "business-mcp",
        url: process.env.BUSINESS_MCP_URL || "http://localhost:8080/mcp",
        cacheToolsList: true,
        timeout: 10000
    });
}
