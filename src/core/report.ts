import type { Finding } from "../rules/types.ts";

export interface PerToolCost {
  name: string;
  tokens: number;
  share: number; // fraction of total surface tokens (0..1)
}

export interface Report {
  serverName?: string;
  totalTools: number;
  totalTokens: number;
  score: number;
  findings: Finding[];
  perTool: PerToolCost[];
}
