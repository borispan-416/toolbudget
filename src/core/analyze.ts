import type { Surface } from "../model.ts";
import type { Config } from "../config.ts";
import type { Report } from "./report.ts";
import { ALL_RULES } from "../rules/index.ts";
import { makeContext } from "../rules/types.ts";
import { toolTokens, surfaceTokens } from "../tokens.ts";
import { scoreFindings } from "./score.ts";

export function analyze(surface: Surface, config: Config): Report {
  const ctx = makeContext(config);
  const findings = ALL_RULES.flatMap((r) => r.run(surface, ctx));
  const totalTokens = surfaceTokens(surface);
  const perTool = surface.tools
    .map((t) => {
      const tokens = toolTokens(t);
      return { name: t.name, tokens, share: totalTokens === 0 ? 0 : tokens / totalTokens };
    })
    .sort((a, b) => b.tokens - a.tokens);
  return {
    serverName: surface.serverName,
    totalTools: surface.tools.length,
    totalTokens,
    score: scoreFindings(findings, surface.tools.length),
    findings,
    perTool,
  };
}
