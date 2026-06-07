import type { Report } from "../core/report.ts";
export function toMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push(`# toolbudget report${report.serverName ? `: ${report.serverName}` : ""}`);
  lines.push("");
  lines.push(`- **Score:** ${report.score}/100`);
  lines.push(`- **Tools:** ${report.totalTools}`);
  lines.push(`- **Surface cost:** ~${report.totalTokens} tokens/call (est.)`);
  lines.push("");
  lines.push("## Heaviest tools");
  for (const t of report.perTool.slice(0, 10)) {
    lines.push(`- \`${t.name}\` — ${t.tokens} tokens (${Math.round(t.share * 100)}%)`);
  }
  lines.push("");
  lines.push("## Findings");
  if (report.findings.length === 0) lines.push("None — clean surface. 🎉");
  for (const f of report.findings) {
    lines.push(`- **[${f.severity}]** \`${f.ruleId}\`${f.tool ? ` (\`${f.tool}\`)` : ""}: ${f.message}`);
  }
  return lines.join("\n");
}
