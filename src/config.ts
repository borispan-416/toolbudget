export interface Config {
  maxTools: number;        // surface/too-many-tools threshold
  tokenBudget: number;     // surface/token-budget total threshold
  minDescriptionWords: number;
  maxDescriptionWords: number;
  maxToolSchemaTokens: number;
  maxSchemaDepth: number;
  similarityThreshold: number; // 0..1 for near-duplicate detection
  minScore: number;        // --ci pass threshold
}

// Defaults calibrated 2026-06 against real public MCP servers captured live:
//   sequential-thinking  1 tool /  826 tok   (score 96)
//   memory               9 tools / 805 tok   (score 60 — quality findings)
//   server-everything   13 tools / 1015 tok  (score 82)
//   filesystem          14 tools / 1515 tok  (score 78)
// All of these well-formed servers sit at or below 14 tools and under ~1500
// tokens. maxTools=25 and tokenBudget=2000 leave lean/real servers under the
// hard limits (so they aren't error-flagged just for size) while clearly
// bloated surfaces (e.g. 30 tools / ~2040 tok) trip both rules. A surface
// above 2000 tokens/call is genuinely expensive — it's re-sent every turn.
export const DEFAULT_CONFIG: Config = {
  maxTools: 25,
  tokenBudget: 2000,
  minDescriptionWords: 12,
  maxDescriptionWords: 120,
  maxToolSchemaTokens: 400,
  maxSchemaDepth: 4,
  similarityThreshold: 0.85,
  minScore: 80,
};

export function mergeConfig(overrides: Partial<Config>): Config {
  return { ...DEFAULT_CONFIG, ...overrides };
}
