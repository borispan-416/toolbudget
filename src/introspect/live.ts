import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Surface, ToolDef } from "../model.ts";

async function listToolsVia(transport: Transport): Promise<ToolDef[]> {
  const client = new Client({ name: "toolbudget", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  try {
    const res = await client.listTools();
    return res.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as ToolDef["inputSchema"],
    }));
  } finally {
    await client.close();
  }
}

export async function introspectStdio(command: string, args: string[]): Promise<Surface> {
  const transport = new StdioClientTransport({ command, args });
  return { tools: await listToolsVia(transport) };
}

export async function introspectHttp(url: string): Promise<Surface> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  return { serverName: url, tools: await listToolsVia(transport) };
}
