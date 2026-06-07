import { encode } from "gpt-tokenizer";
import type { ToolDef, Surface } from "./model.ts";

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

export function toolTokens(tool: ToolDef): number {
  const parts = [tool.name, tool.description ?? ""];
  if (tool.inputSchema) parts.push(JSON.stringify(tool.inputSchema));
  return estimateTokens(parts.join("\n"));
}

export function surfaceTokens(surface: Surface): number {
  return surface.tools.reduce((sum, t) => sum + toolTokens(t), 0);
}
