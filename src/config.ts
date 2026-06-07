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
