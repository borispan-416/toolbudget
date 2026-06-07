import type { Finding } from "../rules/types.ts";

const WEIGHT = { error: 10, warn: 4, info: 1 } as const;

// Deterministic 0-100. Penalty is normalized by surface size so a big server
// isn't doomed purely for having more tools; minimum divisor keeps small servers fair.
export function scoreFindings(findings: Finding[], toolCount: number): number {
  const penalty = findings.reduce((sum, f) => sum + WEIGHT[f.severity], 0);
  const divisor = Math.max(toolCount, 3);
  const normalized = (penalty / divisor) * 6;
  return Math.max(0, Math.min(100, Math.round(100 - normalized)));
}
