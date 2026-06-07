import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "fixture", version: "0.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "search_web", description: "Search the public web for a query and return ranked snippets.", inputSchema: { type: "object", properties: { query: { type: "string", description: "The query." } } } },
    { name: "a", inputSchema: { type: "object", properties: { x: { type: "string" } } } },
  ],
}));
await server.connect(new StdioServerTransport());
