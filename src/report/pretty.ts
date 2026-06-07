import type { Report } from "../core/report.ts";

const C = { red: "\x1b[31m", yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", reset: "\x1b[0m" };
const mark = { error: `${C.red}✖${C.reset}`, warn: `${C.yellow}▲${C.reset}`, info: `${C.dim}•${C.reset}` };

export function toPretty(report: Report): string {
  const lines: string[] = [];
  lines.push(`${C.bold}toolbudget${C.reset}${report.serverName ? ` — ${report.serverName}` : ""}`);
  lines.push(`Score ${C.bold}${report.score}/100${C.reset}  |  ${report.totalTools} tools  |  ~${report.totalTokens} tokens/call (est.)`);
  lines.push("");
  lines.push(`${C.bold}Heaviest tools${C.reset}`);
  for (const t of report.perTool.slice(0, 5)) {
    lines.push(`  ${t.name}  ${C.dim}${t.tokens} tok (${Math.round(t.share * 100)}%)${C.reset}`);
  }
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings — clean surface.");
  } else {
    lines.push(`${C.bold}Findings${C.reset}`);
    for (const f of report.findings) {
      lines.push(`  ${mark[f.severity]} ${f.ruleId}${f.tool ? ` (${f.tool})` : ""}: ${f.message}`);
    }
  }
  return lines.join("\n");
}
