import type { Surface, ToolDef } from "../model.ts";
import type { Config } from "../config.ts";
import { toolTokens } from "../tokens.ts";

export type Severity = "error" | "warn" | "info";

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  tool?: string;   // tool name, when tool-scoped
  tokens?: number; // token cost involved, when relevant
}

export interface RuleContext {
  config: Config;
  tokensFor: (tool: ToolDef) => number;
}

export interface Rule {
  id: string;
  run(surface: Surface, ctx: RuleContext): Finding[];
}

export function makeContext(config: Config): RuleContext {
  return { config, tokensFor: toolTokens };
}
