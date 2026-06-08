import { parseArgs } from "node:util";
import { analyze } from "./core/analyze.ts";
import { mergeConfig } from "./config.ts";
import { loadStaticSurface } from "./introspect/static.ts";
import { introspectStdio, introspectHttp } from "./introspect/live.ts";
import { render, type Format } from "./report/index.ts";
import { isProUnlocked } from "./license.ts";
import type { Surface } from "./model.ts";

const HELP = `toolbudget — know what your MCP tool surface costs an agent.

Usage:
  toolbudget --input tools.json [--format pretty|json|markdown]
  toolbudget --stdio "node server.js" [--format ...]
  toolbudget --url https://host/mcp [--format ...]

Options:
  --input <file>     Analyze a captured tools/list JSON file
  --stdio <cmd>      Launch an MCP server over stdio and introspect it
  --url <url>        Connect to a Streamable HTTP MCP server and introspect it
  --format <fmt>     pretty (default) | json | markdown
  --ci               Exit non-zero if score < --min-score or any error finding
  --min-score <n>    CI threshold (default 80)
  --fix              (Pro) Suggest starter descriptions for tools that lack one
  --license-key <k>  Pro license key (or set TOOLBUDGET_LICENSE_KEY env var)
  --max-tools <n>    Override the tool-count budget
  --token-budget <n> Override the token budget
  -h, --help         Show this help
`;

async function resolveSurface(values: Record<string, string | boolean | undefined>): Promise<Surface> {
  if (typeof values.input === "string") return loadStaticSurface(values.input);
  if (typeof values.stdio === "string") {
    const [command, ...args] = values.stdio.split(" ").filter(Boolean);
    if (!command) throw new Error("--stdio needs a command, e.g. --stdio \"node server.js\"");
    return introspectStdio(command, args);
  }
  if (typeof values.url === "string") return introspectHttp(values.url);
  throw new Error("Provide one of --input, --stdio, or --url. See --help.");
}

async function main(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      input: { type: "string" },
      stdio: { type: "string" },
      url: { type: "string" },
      format: { type: "string", default: "pretty" },
      ci: { type: "boolean", default: false },
      "min-score": { type: "string" },
      "max-tools": { type: "string" },
      "token-budget": { type: "string" },
      fix: { type: "boolean", default: false },
      "license-key": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) { process.stdout.write(HELP); return 0; }

  const config = mergeConfig({
    ...(values["min-score"] ? { minScore: Number(values["min-score"]) } : {}),
    ...(values["max-tools"] ? { maxTools: Number(values["max-tools"]) } : {}),
    ...(values["token-budget"] ? { tokenBudget: Number(values["token-budget"]) } : {}),
  });

  let surface: Surface;
  try {
    surface = await resolveSurface(values);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return 2;
  }

  const report = analyze(surface, config);
  process.stdout.write(render(report, (values.format as Format) ?? "pretty") + "\n");

  if (values.fix) {
    const unlocked = await isProUnlocked(typeof values["license-key"] === "string" ? values["license-key"] : process.env.TOOLBUDGET_LICENSE_KEY);
    if (!unlocked) {
      process.stderr.write("--fix is a Pro feature (coming soon). See https://github.com/pancratic/toolbudget.\n");
      return 3;
    }
    const { suggestFixes } = await import("./fix.ts");
    for (const change of suggestFixes(surface)) {
      process.stdout.write(`fix ${change.tool}.${change.field}: ${change.suggestion}\n`);
    }
  }

  if (values.ci) {
    const hasError = report.findings.some((f) => f.severity === "error");
    if (report.score < config.minScore || hasError) return 1;
  }
  return 0;
}

main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`${(err as Error).message}\n`);
  process.exit(2);
});
