# toolbudget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `toolbudget`, a TypeScript/Node CLI that measures the token cost of an MCP server's tool surface and reports how to make it leaner.

**Architecture:** A pure, framework-agnostic core (`model` → `tokens` → `rules` → `score` → `report`) wrapped by a thin CLI. Input comes from either a static `tools/list` JSON file or a live MCP handshake. Free features are fully open; Pro features are gated by a no-backend license check. Each rule is a pure function over a normalized `Surface`, making everything trivially unit-testable.

**Tech Stack:** TypeScript, Node 22 (native test runner + `--experimental-strip-types`), `@modelcontextprotocol/sdk` (live introspection), `gpt-tokenizer` (local token counts, no network), `esbuild` (bundle), `node:util` `parseArgs` (no arg-parser dependency).

**Plan location note:** saved under `track-B/plans/` (Boris's workspace) rather than the skill default `docs/superpowers/plans/`. Repo root for all paths below: `Projects/Autonomous Operator/track-B/` (a git repo; commits use the `borispan-416` noreply identity already configured locally, no co-author trailer).

---

## File structure

```
track-B/
  package.json            # name "toolbudget", bin, scripts, deps
  tsconfig.json           # strict TS, NodeNext
  esbuild.config.mjs      # bundle src/cli.ts -> out/cli.js
  src/
    model.ts              # ToolDef, JSONSchema, Surface types
    tokens.ts             # token estimation for tools + surface
    config.ts             # Config type + DEFAULT_CONFIG
    rules/
      types.ts            # Finding, Rule, RuleContext
      surface.ts          # surface/too-many-tools, surface/token-budget
      tool.ts             # per-tool quality rules
      redundancy.ts       # redundancy/near-duplicate-tools
      index.ts            # ALL_RULES registry
    core/
      score.ts            # deterministic 0-100 score from findings
      analyze.ts          # Surface -> Report orchestrator
      report.ts           # Report type
    introspect/
      static.ts           # load + validate a tools.json file -> Surface
      live.ts             # MCP handshake (stdio/http) -> Surface
    report/
      pretty.ts           # colorized terminal reporter
      json.ts             # JSON reporter
      markdown.ts         # Markdown reporter
      index.ts            # reporter selector
    license.ts            # LemonSqueezy activate/validate, Pro gating
    fix.ts                # (Pro) codemod suggestions -> patch
    cli.ts                # arg parsing, mode selection, exit codes
  test/
    fixtures/
      bloated.tools.json  # a known-bad surface for tests
      lean.tools.json     # a known-good surface
      fixture-server.mjs  # minimal stdio MCP server for live tests
    *.test.ts             # one test file per module
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `test/smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `test/smoke.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { hello } from "../src/model.ts";

test("module loads", () => {
  assert.equal(hello(), "toolbudget");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/smoke.test.ts`
Expected: FAIL — cannot find module `../src/model.ts`.

- [ ] **Step 3: Create package.json, tsconfig, esbuild config, and a minimal src/model.ts**

`package.json`:
```json
{
  "name": "toolbudget",
  "version": "0.1.0",
  "description": "Know what your MCP server's tool surface costs an agent — in tokens and tool-selection accuracy.",
  "license": "MIT",
  "type": "module",
  "bin": { "toolbudget": "out/cli.js" },
  "files": ["out", "README.md"],
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --experimental-strip-types --test test/**/*.test.ts",
    "build": "node esbuild.config.mjs",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "gpt-tokenizer": "^2.5.0"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "typescript": "^5.6.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

`esbuild.config.mjs`:
```js
import { build } from "esbuild";

await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "out/cli.js",
  banner: { js: "#!/usr/bin/env node" },
});
console.log("built out/cli.js");
```

Create `src/model.ts` (minimal, expanded in Task 2):
```ts
export function hello(): string {
  return "toolbudget";
}
```

- [ ] **Step 4: Install deps and run the test to verify it passes**

Run: `npm install && npm test`
Expected: smoke test PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json esbuild.config.mjs src/model.ts test/smoke.test.ts package-lock.json
git commit -m "chore: scaffold toolbudget project"
```

---

## Task 2: Domain model + token estimation

**Files:**
- Modify: `src/model.ts`
- Create: `src/tokens.ts`
- Create: `test/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/tokens.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ToolDef, Surface } from "../src/model.ts";
import { toolTokens, surfaceTokens } from "../src/tokens.ts";

const tool: ToolDef = {
  name: "search",
  description: "Search the web for a query string.",
  inputSchema: { type: "object", properties: { q: { type: "string" } } },
};

test("toolTokens counts name + description + schema and is positive", () => {
  const n = toolTokens(tool);
  assert.ok(n > 0);
});

test("toolTokens grows when description grows", () => {
  const bigger: ToolDef = { ...tool, description: tool.description! + " ".repeat(50) + "extra words here many" };
  assert.ok(toolTokens(bigger) > toolTokens(tool));
});

test("surfaceTokens sums tool tokens", () => {
  const surface: Surface = { tools: [tool, { ...tool, name: "fetch" }] };
  assert.equal(surfaceTokens(surface), toolTokens(surface.tools[0]!) + toolTokens(surface.tools[1]!));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/tokens.test.ts`
Expected: FAIL — cannot find `../src/tokens.ts` / missing exports.

- [ ] **Step 3: Implement model types and token estimation**

Replace `src/model.ts` with:
```ts
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema | JSONSchema[];
  required?: string[];
  enum?: unknown[];
  description?: string;
  [k: string]: unknown;
}

export interface ToolDef {
  name: string;
  description?: string;
  inputSchema?: JSONSchema;
}

export interface Surface {
  serverName?: string;
  tools: ToolDef[];
}
```

Create `src/tokens.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model.ts src/tokens.ts test/tokens.test.ts
git commit -m "feat: domain model and token estimation"
```

---

## Task 3: Config and defaults

**Files:**
- Create: `src/config.ts`
- Create: `test/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/config.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, mergeConfig } from "../src/config.ts";

test("defaults are present", () => {
  assert.equal(DEFAULT_CONFIG.maxTools, 25);
  assert.equal(DEFAULT_CONFIG.tokenBudget, 2000);
  assert.equal(DEFAULT_CONFIG.minScore, 80);
});

test("mergeConfig overrides only provided keys", () => {
  const merged = mergeConfig({ maxTools: 10 });
  assert.equal(merged.maxTools, 10);
  assert.equal(merged.tokenBudget, DEFAULT_CONFIG.tokenBudget);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/config.test.ts`
Expected: FAIL — cannot find `../src/config.ts`.

- [ ] **Step 3: Implement config**

Create `src/config.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/config.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/config.test.ts
git commit -m "feat: config with defaults and merge"
```

---

## Task 4: Rule framework + types

**Files:**
- Create: `src/rules/types.ts`
- Create: `test/rules-types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/rules-types.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeContext } from "../src/rules/types.ts";
import { DEFAULT_CONFIG } from "../src/config.ts";

test("makeContext exposes config and a tokensFor helper", () => {
  const ctx = makeContext(DEFAULT_CONFIG);
  assert.equal(ctx.config.maxTools, 25);
  assert.ok(ctx.tokensFor({ name: "x", description: "hello world example" }) > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/rules-types.test.ts`
Expected: FAIL — cannot find `../src/rules/types.ts`.

- [ ] **Step 3: Implement rule types and context**

Create `src/rules/types.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/rules-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules/types.ts test/rules-types.test.ts
git commit -m "feat: rule framework types and context"
```

---

## Task 5: Surface-level rules

**Files:**
- Create: `src/rules/surface.ts`
- Create: `test/rules-surface.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/rules-surface.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { tooManyTools, tokenBudget } from "../src/rules/surface.ts";
import { makeContext } from "../src/rules/types.ts";
import { mergeConfig } from "../src/config.ts";
import type { Surface } from "../src/model.ts";

function surfaceOf(n: number): Surface {
  return { tools: Array.from({ length: n }, (_, i) => ({ name: `tool_${i}`, description: "does a thing well enough for tests" })) };
}

test("tooManyTools fires above threshold", () => {
  const ctx = makeContext(mergeConfig({ maxTools: 5 }));
  assert.equal(tooManyTools.run(surfaceOf(6), ctx).length, 1);
  assert.equal(tooManyTools.run(surfaceOf(5), ctx).length, 0);
});

test("tokenBudget fires when surface exceeds budget", () => {
  const ctx = makeContext(mergeConfig({ tokenBudget: 1 }));
  const findings = tokenBudget.run(surfaceOf(3), ctx);
  assert.equal(findings.length, 1);
  assert.ok(findings[0]!.tokens! > 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/rules-surface.test.ts`
Expected: FAIL — cannot find `../src/rules/surface.ts`.

- [ ] **Step 3: Implement surface rules**

Create `src/rules/surface.ts`:
```ts
import type { Rule, Finding } from "./types.ts";
import { surfaceTokens } from "../tokens.ts";

export const tooManyTools: Rule = {
  id: "surface/too-many-tools",
  run(surface, ctx): Finding[] {
    const n = surface.tools.length;
    if (n <= ctx.config.maxTools) return [];
    return [{
      ruleId: this.id,
      severity: "error",
      message: `${n} tools exposed (budget ${ctx.config.maxTools}). Large surfaces hurt tool-selection accuracy; split or lazy-load.`,
    }];
  },
};

export const tokenBudget: Rule = {
  id: "surface/token-budget",
  run(surface, ctx): Finding[] {
    const total = surfaceTokens(surface);
    if (total <= ctx.config.tokenBudget) return [];
    return [{
      ruleId: this.id,
      severity: "error",
      tokens: total,
      message: `Tool surface costs ~${total} tokens/call (budget ${ctx.config.tokenBudget}). Trim descriptions/schemas or reduce tools.`,
    }];
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/rules-surface.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/rules/surface.ts test/rules-surface.test.ts
git commit -m "feat: surface-level lint rules"
```

---

## Task 6: Per-tool quality rules

**Files:**
- Create: `src/rules/tool.ts`
- Create: `test/rules-tool.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/rules-tool.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toolRules } from "../src/rules/tool.ts";
import { makeContext } from "../src/rules/types.ts";
import { DEFAULT_CONFIG, mergeConfig } from "../src/config.ts";
import type { Surface } from "../src/model.ts";

function run(surface: Surface, cfg = DEFAULT_CONFIG) {
  const ctx = makeContext(cfg);
  return toolRules.flatMap((r) => r.run(surface, ctx));
}

test("missing description fires", () => {
  const f = run({ tools: [{ name: "a" }] });
  assert.ok(f.some((x) => x.ruleId === "tool/missing-description" && x.tool === "a"));
});

test("too-short description fires", () => {
  const f = run({ tools: [{ name: "a", description: "short one" }] });
  assert.ok(f.some((x) => x.ruleId === "tool/description-too-short"));
});

test("param missing description fires", () => {
  const f = run({ tools: [{ name: "a", description: "a sufficiently long and clear description for the tool here", inputSchema: { type: "object", properties: { q: { type: "string" } } } }] });
  assert.ok(f.some((x) => x.ruleId === "tool/param-missing-description"));
});

test("deeply nested schema fires", () => {
  const cfg = mergeConfig({ maxSchemaDepth: 2 });
  const deep = { type: "object", properties: { a: { type: "object", properties: { b: { type: "object", properties: { c: { type: "string" } } } } } } };
  const f = run({ tools: [{ name: "a", description: "a sufficiently long and clear description for the tool here", inputSchema: deep }] }, cfg);
  assert.ok(f.some((x) => x.ruleId === "tool/schema-deeply-nested"));
});

test("clean tool produces no tool-level findings", () => {
  const f = run({ tools: [{ name: "search_web", description: "Search the public web for a query and return the top ranked result snippets.", inputSchema: { type: "object", properties: { query: { type: "string", description: "The search query text." } }, required: ["query"] } }] });
  assert.equal(f.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/rules-tool.test.ts`
Expected: FAIL — cannot find `../src/rules/tool.ts`.

- [ ] **Step 3: Implement per-tool rules**

Create `src/rules/tool.ts`:
```ts
import type { Rule, Finding } from "./types.ts";
import type { JSONSchema, ToolDef } from "../model.ts";
import { estimateTokens } from "../tokens.ts";

function words(s: string | undefined): number {
  return s ? s.trim().split(/\s+/).filter(Boolean).length : 0;
}

function schemaDepth(schema: JSONSchema | undefined, depth = 1): number {
  if (!schema || typeof schema !== "object") return depth;
  let max = depth;
  if (schema.properties) {
    for (const v of Object.values(schema.properties)) max = Math.max(max, schemaDepth(v, depth + 1));
  }
  if (schema.items) {
    const items = Array.isArray(schema.items) ? schema.items : [schema.items];
    for (const v of items) max = Math.max(max, schemaDepth(v, depth + 1));
  }
  return max;
}

function* properties(schema: JSONSchema | undefined): Generator<[string, JSONSchema]> {
  if (!schema?.properties) return;
  for (const [k, v] of Object.entries(schema.properties)) yield [k, v];
}

function perTool(id: string, severity: "error" | "warn" | "info", check: (t: ToolDef, ctx: import("./types.ts").RuleContext) => string | null): Rule {
  return {
    id,
    run(surface, ctx): Finding[] {
      const out: Finding[] = [];
      for (const t of surface.tools) {
        const msg = check(t, ctx);
        if (msg) out.push({ ruleId: id, severity, tool: t.name, message: msg });
      }
      return out;
    },
  };
}

export const toolRules: Rule[] = [
  perTool("tool/missing-description", "error", (t) => (words(t.description) === 0 ? "No description. Agents can't choose a tool they can't understand." : null)),
  perTool("tool/description-too-short", "warn", (t, ctx) => (words(t.description) > 0 && words(t.description) < ctx.config.minDescriptionWords ? `Description is ${words(t.description)} words (<${ctx.config.minDescriptionWords}). Add purpose + when to use it.` : null)),
  perTool("tool/description-too-long", "info", (t, ctx) => (words(t.description) > ctx.config.maxDescriptionWords ? `Description is ${words(t.description)} words (>${ctx.config.maxDescriptionWords}). Trim to cut per-call token cost.` : null)),
  perTool("tool/no-examples", "info", (t) => (t.description && !/e\.g\.|example|for instance|\bex:/i.test(t.description) ? "No usage example in the description; a short example improves tool selection." : null)),
  perTool("tool/schema-too-large", "warn", (t, ctx) => {
    if (!t.inputSchema) return null;
    const n = estimateTokens(JSON.stringify(t.inputSchema));
    return n > ctx.config.maxToolSchemaTokens ? `Input schema is ~${n} tokens (>${ctx.config.maxToolSchemaTokens}). Simplify or split.` : null;
  }),
  perTool("tool/schema-deeply-nested", "warn", (t, ctx) => {
    const d = schemaDepth(t.inputSchema);
    return d > ctx.config.maxSchemaDepth ? `Input schema nests ${d} levels (>${ctx.config.maxSchemaDepth}). Flatten for reliability.` : null;
  }),
  perTool("tool/param-missing-description", "warn", (t) => {
    const missing = [...properties(t.inputSchema)].filter(([, v]) => !v.description).map(([k]) => k);
    return missing.length ? `Parameters lack descriptions: ${missing.join(", ")}.` : null;
  }),
  perTool("tool/freeform-should-enum", "info", (t) => {
    const candidates = [...properties(t.inputSchema)].filter(([, v]) => v.type === "string" && !v.enum && /one of|must be one of|: *(?:[a-z]+ *\| *){2,}/i.test(v.description ?? "")).map(([k]) => k);
    return candidates.length ? `String params imply a fixed set; use enum: ${candidates.join(", ")}.` : null;
  }),
  perTool("tool/unclear-name", "info", (t) => (/^(tool|fn|do|run|action)\d*$/i.test(t.name) || t.name.length < 3 ? `Name "${t.name}" is non-descriptive; rename to a verb_object.` : null)),
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/rules-tool.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/rules/tool.ts test/rules-tool.test.ts
git commit -m "feat: per-tool quality lint rules"
```

---

## Task 7: Redundancy rule

**Files:**
- Create: `src/rules/redundancy.ts`
- Create: `test/rules-redundancy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/rules-redundancy.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { nearDuplicate } from "../src/rules/redundancy.ts";
import { makeContext } from "../src/rules/types.ts";
import { mergeConfig } from "../src/config.ts";

test("near-duplicate tools are flagged", () => {
  const ctx = makeContext(mergeConfig({ similarityThreshold: 0.6 }));
  const surface = { tools: [
    { name: "search_web", description: "Search the web for a query" },
    { name: "web_search", description: "Search the web for a query" },
    { name: "delete_file", description: "Remove a file from disk permanently" },
  ] };
  const f = nearDuplicate.run(surface, ctx);
  assert.equal(f.length, 1);
  assert.match(f[0]!.message, /search_web/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/rules-redundancy.test.ts`
Expected: FAIL — cannot find `../src/rules/redundancy.ts`.

- [ ] **Step 3: Implement redundancy rule**

Create `src/rules/redundancy.ts`:
```ts
import type { Rule, Finding } from "./types.ts";
import type { ToolDef } from "../model.ts";

function tokenize(t: ToolDef): Set<string> {
  return new Set(`${t.name} ${t.description ?? ""}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export const nearDuplicate: Rule = {
  id: "redundancy/near-duplicate-tools",
  run(surface, ctx): Finding[] {
    const out: Finding[] = [];
    const toks = surface.tools.map(tokenize);
    for (let i = 0; i < surface.tools.length; i++) {
      for (let j = i + 1; j < surface.tools.length; j++) {
        if (jaccard(toks[i]!, toks[j]!) >= ctx.config.similarityThreshold) {
          out.push({
            ruleId: this.id,
            severity: "warn",
            message: `"${surface.tools[i]!.name}" and "${surface.tools[j]!.name}" look near-duplicate; merge to reduce surface and ambiguity.`,
          });
        }
      }
    }
    return out;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/rules-redundancy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules/redundancy.ts test/rules-redundancy.test.ts
git commit -m "feat: near-duplicate tool detection"
```

---

## Task 8: Rule registry

**Files:**
- Create: `src/rules/index.ts`
- Create: `test/rules-index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/rules-index.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_RULES } from "../src/rules/index.ts";

test("registry has unique rule ids and includes the key rules", () => {
  const ids = ALL_RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ["surface/too-many-tools", "surface/token-budget", "tool/missing-description", "redundancy/near-duplicate-tools"]) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/rules-index.test.ts`
Expected: FAIL — cannot find `../src/rules/index.ts`.

- [ ] **Step 3: Implement the registry**

Create `src/rules/index.ts`:
```ts
import type { Rule } from "./types.ts";
import { tooManyTools, tokenBudget } from "./surface.ts";
import { toolRules } from "./tool.ts";
import { nearDuplicate } from "./redundancy.ts";

export const ALL_RULES: Rule[] = [tooManyTools, tokenBudget, ...toolRules, nearDuplicate];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/rules-index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules/index.ts test/rules-index.test.ts
git commit -m "feat: rule registry"
```

---

## Task 9: Scoring

**Files:**
- Create: `src/core/score.ts`
- Create: `test/score.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/score.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreFindings } from "../src/core/score.ts";
import type { Finding } from "../src/rules/types.ts";

test("no findings = 100", () => {
  assert.equal(scoreFindings([], 5), 100);
});

test("errors cost more than warns", () => {
  const oneError: Finding[] = [{ ruleId: "x", severity: "error", message: "" }];
  const oneWarn: Finding[] = [{ ruleId: "x", severity: "warn", message: "" }];
  assert.ok(scoreFindings(oneError, 5) < scoreFindings(oneWarn, 5));
});

test("score is clamped to 0..100", () => {
  const many: Finding[] = Array.from({ length: 50 }, () => ({ ruleId: "x", severity: "error", message: "" }));
  const s = scoreFindings(many, 5);
  assert.ok(s >= 0 && s <= 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/score.test.ts`
Expected: FAIL — cannot find `../src/core/score.ts`.

- [ ] **Step 3: Implement scoring**

Create `src/core/score.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/score.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/score.ts test/score.test.ts
git commit -m "feat: deterministic surface score"
```

---

## Task 10: Analyzer orchestrator + Report

**Files:**
- Create: `src/core/report.ts`
- Create: `src/core/analyze.ts`
- Create: `test/analyze.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/analyze.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/core/analyze.ts";
import { DEFAULT_CONFIG } from "../src/config.ts";
import type { Surface } from "../src/model.ts";

const surface: Surface = {
  serverName: "demo",
  tools: [
    { name: "search_web", description: "Search the public web for a query and return the top ranked result snippets.", inputSchema: { type: "object", properties: { query: { type: "string", description: "The query." } } } },
    { name: "a" },
  ],
};

test("analyze returns a complete report", () => {
  const r = analyze(surface, DEFAULT_CONFIG);
  assert.equal(r.serverName, "demo");
  assert.equal(r.totalTools, 2);
  assert.ok(r.totalTokens > 0);
  assert.ok(r.score <= 100 && r.score >= 0);
  assert.ok(r.findings.some((f) => f.tool === "a"));
  assert.equal(r.perTool.length, 2);
  const shareSum = r.perTool.reduce((s, t) => s + t.share, 0);
  assert.ok(Math.abs(shareSum - 1) < 1e-6 || r.totalTokens === 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/analyze.test.ts`
Expected: FAIL — cannot find `../src/core/analyze.ts`.

- [ ] **Step 3: Implement Report type and analyzer**

Create `src/core/report.ts`:
```ts
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
```

Create `src/core/analyze.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/analyze.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/report.ts src/core/analyze.ts test/analyze.test.ts
git commit -m "feat: analyzer orchestrator and report model"
```

---

## Task 11: Static input loader

**Files:**
- Create: `src/introspect/static.ts`
- Create: `test/fixtures/bloated.tools.json`
- Create: `test/fixtures/lean.tools.json`
- Create: `test/static.test.ts`

- [ ] **Step 1: Write the failing test and fixtures**

Create `test/fixtures/lean.tools.json`:
```json
{ "tools": [ { "name": "search_web", "description": "Search the public web for a query and return ranked snippets for the user.", "inputSchema": { "type": "object", "properties": { "query": { "type": "string", "description": "The query." } }, "required": ["query"] } } ] }
```

Create `test/fixtures/bloated.tools.json`:
```json
{ "tools": [
  { "name": "a", "inputSchema": { "type": "object", "properties": { "x": { "type": "string" } } } },
  { "name": "b", "description": "short" },
  { "name": "search_web", "description": "Search the web for a query" },
  { "name": "web_search", "description": "Search the web for a query" }
] }
```

Create `test/static.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadStaticSurface } from "../src/introspect/static.ts";

const fx = (n: string) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));

test("loads a tools.json into a Surface", async () => {
  const s = await loadStaticSurface(fx("lean.tools.json"));
  assert.equal(s.tools.length, 1);
  assert.equal(s.tools[0]!.name, "search_web");
});

test("accepts a bare array or {tools:[...]} and rejects garbage", async () => {
  await assert.rejects(() => loadStaticSurface(fx("does-not-exist.json")));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/static.test.ts`
Expected: FAIL — cannot find `../src/introspect/static.ts`.

- [ ] **Step 3: Implement the static loader**

Create `src/introspect/static.ts`:
```ts
import { readFile } from "node:fs/promises";
import type { Surface, ToolDef } from "../model.ts";

function coerce(raw: unknown): ToolDef[] {
  const arr = Array.isArray(raw) ? raw : (raw as { tools?: unknown }).tools;
  if (!Array.isArray(arr)) throw new Error("Expected a JSON array of tools or an object with a `tools` array.");
  return arr.map((t, i) => {
    if (!t || typeof t !== "object" || typeof (t as ToolDef).name !== "string") {
      throw new Error(`Tool at index ${i} is missing a string "name".`);
    }
    const tt = t as ToolDef;
    return { name: tt.name, description: tt.description, inputSchema: tt.inputSchema };
  });
}

export async function loadStaticSurface(path: string): Promise<Surface> {
  const text = await readFile(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${path} is not valid JSON.`);
  }
  const serverName = (parsed as { serverName?: string }).serverName;
  return { serverName, tools: coerce(parsed) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/static.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/introspect/static.ts test/fixtures/lean.tools.json test/fixtures/bloated.tools.json test/static.test.ts
git commit -m "feat: static tools.json loader"
```

---

## Task 12: Reporters

**Files:**
- Create: `src/report/json.ts`
- Create: `src/report/markdown.ts`
- Create: `src/report/pretty.ts`
- Create: `src/report/index.ts`
- Create: `test/report.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/report.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "../src/report/index.ts";
import type { Report } from "../src/core/report.ts";

const report: Report = {
  serverName: "demo",
  totalTools: 2,
  totalTokens: 120,
  score: 64,
  findings: [{ ruleId: "tool/missing-description", severity: "error", tool: "a", message: "No description." }],
  perTool: [{ name: "a", tokens: 80, share: 0.6667 }, { name: "search_web", tokens: 40, share: 0.3333 }],
};

test("json reporter emits parseable JSON with the score", () => {
  const out = render(report, "json");
  const parsed = JSON.parse(out);
  assert.equal(parsed.score, 64);
});

test("markdown reporter includes score and a findings section", () => {
  const out = render(report, "markdown");
  assert.match(out, /64/);
  assert.match(out, /missing-description/);
});

test("pretty reporter mentions token cost and the failing tool", () => {
  const out = render(report, "pretty");
  assert.match(out, /120/);
  assert.match(out, /\ba\b/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/report.test.ts`
Expected: FAIL — cannot find `../src/report/index.ts`.

- [ ] **Step 3: Implement reporters**

Create `src/report/json.ts`:
```ts
import type { Report } from "../core/report.ts";
export function toJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
```

Create `src/report/markdown.ts`:
```ts
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
```

Create `src/report/pretty.ts`:
```ts
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
```

Create `src/report/index.ts`:
```ts
import type { Report } from "../core/report.ts";
import { toJson } from "./json.ts";
import { toMarkdown } from "./markdown.ts";
import { toPretty } from "./pretty.ts";

export type Format = "pretty" | "json" | "markdown";

export function render(report: Report, format: Format): string {
  switch (format) {
    case "json": return toJson(report);
    case "markdown": return toMarkdown(report);
    case "pretty": return toPretty(report);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/report.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/report/ test/report.test.ts
git commit -m "feat: pretty, json, and markdown reporters"
```

---

## Task 13: Live MCP introspection

**Files:**
- Create: `src/introspect/live.ts`
- Create: `test/fixtures/fixture-server.mjs`
- Create: `test/live.test.ts`

- [ ] **Step 1: Write the failing test and a fixture MCP server**

Create `test/fixtures/fixture-server.mjs` (a minimal stdio MCP server using the SDK):
```js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "fixture", version: "0.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "search_web", description: "Search the public web for a query and return ranked snippets.", inputSchema: { type: "object", properties: { query: { type: "string", description: "The query." } } } },
    { name: "a", inputSchema: { type: "object", properties: { x: { type: "string" } } } },
  ],
}));
await server.connect(new StdioServerTransport());
```

Create `test/live.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { introspectStdio } from "../src/introspect/live.ts";

const serverPath = fileURLToPath(new URL("./fixtures/fixture-server.mjs", import.meta.url));

test("introspectStdio captures the real tool surface via the MCP handshake", async () => {
  const surface = await introspectStdio("node", [serverPath]);
  const names = surface.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["a", "search_web"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/live.test.ts`
Expected: FAIL — cannot find `../src/introspect/live.ts`.

- [ ] **Step 3: Implement live introspection**

Create `src/introspect/live.ts`:
```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Surface, ToolDef } from "../model.ts";

async function withClient<T>(transport: ConstructorParameters<typeof Client>[0] extends never ? never : any, connect: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: "toolbudget", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  try {
    return await connect(client);
  } finally {
    await client.close();
  }
}

async function listTools(client: Client): Promise<ToolDef[]> {
  const res = await client.listTools();
  return res.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema as ToolDef["inputSchema"] }));
}

export async function introspectStdio(command: string, args: string[]): Promise<Surface> {
  const transport = new StdioClientTransport({ command, args });
  const tools = await withClient(transport, listTools);
  return { tools };
}

export async function introspectHttp(url: string): Promise<Surface> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const tools = await withClient(transport, listTools);
  return { serverName: url, tools };
}
```

> Implementation note for the engineer: if the SDK import paths differ for the installed version, run `node -e "console.log(require.resolve('@modelcontextprotocol/sdk/package.json'))"` and check the package's `exports` map; adjust the subpath imports (`client/index.js`, `client/stdio.js`, `client/streamableHttp.js`) to match. The public API used here — `new Client(...)`, `client.connect(transport)`, `client.listTools()`, `client.close()` — is stable across 1.x.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/live.test.ts`
Expected: PASS (the test spawns the fixture server over stdio and reads its tools).

- [ ] **Step 5: Commit**

```bash
git add src/introspect/live.ts test/fixtures/fixture-server.mjs test/live.test.ts
git commit -m "feat: live MCP stdio/http introspection"
```

---

## Task 14: License module (Pro gating, no backend)

**Files:**
- Create: `src/license.ts`
- Create: `test/license.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/license.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isProUnlocked } from "../src/license.ts";

test("no key = locked", async () => {
  assert.equal(await isProUnlocked(undefined, { fetch: async () => ({ ok: false }) as any }), false);
});

test("valid activation = unlocked", async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ activated: true, valid: true }) }) as any;
  assert.equal(await isProUnlocked("KEY-123", { fetch: fakeFetch }), true);
});

test("network failure fails closed (locked) without throwing", async () => {
  const fakeFetch = async () => { throw new Error("offline"); };
  assert.equal(await isProUnlocked("KEY-123", { fetch: fakeFetch }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/license.test.ts`
Expected: FAIL — cannot find `../src/license.ts`.

- [ ] **Step 3: Implement license check**

Create `src/license.ts`:
```ts
// No backend: validate a license key directly against LemonSqueezy's public
// license API (same BYOK mechanism shipped in ReleaseScribe). Fails closed.
const LS_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";

interface Deps { fetch: typeof globalThis.fetch }

export async function isProUnlocked(licenseKey: string | undefined, deps: Deps = { fetch: globalThis.fetch }): Promise<boolean> {
  if (!licenseKey) return false;
  try {
    const res = await deps.fetch(LS_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ license_key: licenseKey }).toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/license.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/license.ts test/license.test.ts
git commit -m "feat: no-backend Pro license validation"
```

---

## Task 15: CLI wiring + exit codes

**Files:**
- Create: `src/cli.ts`
- Create: `test/cli.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/cli.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const bloated = fileURLToPath(new URL("./fixtures/bloated.tools.json", import.meta.url));
const lean = fileURLToPath(new URL("./fixtures/lean.tools.json", import.meta.url));

function exec(args: string[]) {
  return run("node", ["--experimental-strip-types", cli, ...args], { encoding: "utf8" }).catch((e) => e);
}

test("--input json reporter prints a score", async () => {
  const { stdout } = await exec(["--input", lean, "--format", "json"]);
  assert.match(stdout, /"score"/);
});

test("--ci exits non-zero on a bloated surface below min-score", async () => {
  const res = await exec(["--input", bloated, "--ci", "--min-score", "95"]);
  assert.equal(res.code, 1);
});

test("--ci exits zero on a clean surface", async () => {
  const res = await exec(["--input", lean, "--ci", "--min-score", "50"]);
  // resolved promise (no error) means exit 0
  assert.ok(res.stdout !== undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/cli.test.ts`
Expected: FAIL — cannot find `../src/cli.ts`.

- [ ] **Step 3: Implement the CLI**

Create `src/cli.ts`:
```ts
import { parseArgs } from "node:util";
import { analyze } from "./core/analyze.ts";
import { mergeConfig } from "./config.ts";
import { loadStaticSurface } from "./introspect/static.ts";
import { introspectStdio, introspectHttp } from "./introspect/live.ts";
import { render, type Format } from "./report/index.ts";
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

  if (values.ci) {
    const hasError = report.findings.some((f) => f.severity === "error");
    if (report.score < config.minScore || hasError) return 1;
  }
  return 0;
}

main(process.argv.slice(2)).then((code) => process.exit(code));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test test/cli.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test`
Expected: all tests green.

```bash
git add src/cli.ts test/cli.test.ts
git commit -m "feat: CLI with static/live modes, reporters, and CI exit codes"
```

---

## Task 16: Build, bin, README, and real-world verification

**Files:**
- Create: `README.md`
- Modify: `package.json` (already has bin/build; verify)

- [ ] **Step 1: Build the bundle**

Run: `npm run build`
Expected: writes `out/cli.js` with a shebang banner; no errors.

- [ ] **Step 2: Smoke-test the built binary against a fixture**

Run: `node out/cli.js --input test/fixtures/bloated.tools.json --format pretty`
Expected: prints a score < 100, a "Heaviest tools" list, and findings including `tool/missing-description (a)`.

- [ ] **Step 3: Verify against a real public MCP server (end-to-end)**

Pick a real server known to expose many tools (e.g., an official reference server runnable via `npx`). Run, capturing its tool surface live:

Run: `node out/cli.js --stdio "npx -y @modelcontextprotocol/server-everything" --format markdown`
Expected: a Markdown report with a realistic token count and at least one finding. If the chosen server happens to be clean, run against `@modelcontextprotocol/server-filesystem` or capture its `tools/list` to a JSON file and use `--input`. Record the observed totals — they calibrate the Task 17 thresholds.

- [ ] **Step 4: Write the README**

Create `README.md` with: the one-line value prop ("Know what your MCP tool surface costs an agent"), install (`npx toolbudget`), the three usage modes, an example report, the rule list, the free-vs-Pro table, and a link to the Pancratic store. Keep it skimmable; lead with the token-cost screenshot/example.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json
git commit -m "docs: README and verify built binary end-to-end"
```

---

## Task 17: Calibrate default thresholds

**Files:**
- Modify: `src/config.ts`
- Modify: `test/config.test.ts` (if defaults change)

- [ ] **Step 1: Gather real data**

Run `toolbudget` against 5–8 real public MCP servers (mix of small and large; capture each via `--stdio`/`--url` or saved `tools.json`). Record `totalTools` and `totalTokens` for each.

- [ ] **Step 2: Set defensible defaults**

In `src/config.ts`, set `maxTools` and `tokenBudget` so that lean servers score well (≥80) and clearly-bloated ones (e.g., the 43-tool case) score poorly. Document the chosen numbers in a code comment citing the sample. Update `test/config.test.ts` to assert the final values.

- [ ] **Step 3: Run tests and commit**

Run: `npm test`
Expected: green.

```bash
git add src/config.ts test/config.test.ts
git commit -m "chore: calibrate default thresholds against real MCP servers"
```

---

## Task 18 (Pro): `--fix` codemod

> First Pro feature. Gate behind `isProUnlocked`. Ship only after the free core is published and validated.

**Files:**
- Create: `src/fix.ts`
- Modify: `src/cli.ts` (add `--fix` and `--license-key`)
- Create: `test/fix.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/fix.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestFixes } from "../src/fix.ts";
import type { Surface } from "../src/model.ts";

test("suggestFixes proposes a description for a tool that lacks one", () => {
  const surface: Surface = { tools: [{ name: "delete_file", inputSchema: { type: "object", properties: { path: { type: "string" } } } }] };
  const patch = suggestFixes(surface);
  const change = patch.find((p) => p.tool === "delete_file" && p.field === "description");
  assert.ok(change);
  assert.ok((change!.suggestion as string).length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/fix.test.ts`
Expected: FAIL — cannot find `../src/fix.ts`.

- [ ] **Step 3: Implement deterministic fix suggestions**

Create `src/fix.ts`:
```ts
import type { Surface } from "./model.ts";

export interface FixChange {
  tool: string;
  field: "description";
  suggestion: string;
}

// Deterministic, no-LLM suggestions: derive a starter description from the tool
// name and its parameters. (An optional BYOK AI-polish pass can be added later.)
export function suggestFixes(surface: Surface): FixChange[] {
  const out: FixChange[] = [];
  for (const t of surface.tools) {
    if (!t.description || t.description.trim() === "") {
      const verbObject = t.name.replace(/[_-]+/g, " ");
      const params = t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : [];
      const tail = params.length ? ` Parameters: ${params.join(", ")}.` : "";
      out.push({ tool: t.name, field: "description", suggestion: `${verbObject[0]?.toUpperCase()}${verbObject.slice(1)}.${tail} (Edit this starter description.)` });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test, then wire `--fix` into the CLI behind the license gate**

Run: `node --experimental-strip-types --test test/fix.test.ts`
Expected: PASS.

In `src/cli.ts`: add `fix: { type: "boolean", default: false }` and `"license-key": { type: "string" }` to options. After producing the report, if `values.fix`:
```ts
if (values.fix) {
  const unlocked = await isProUnlocked(typeof values["license-key"] === "string" ? values["license-key"] : process.env.TOOLBUDGET_LICENSE_KEY);
  if (!unlocked) {
    process.stderr.write("--fix is a Pro feature. Get a license at <Pancratic store URL>.\n");
    return 3;
  }
  const { suggestFixes } = await import("./fix.ts");
  for (const change of suggestFixes(surface)) {
    process.stdout.write(`fix ${change.tool}.${change.field}: ${change.suggestion}\n`);
  }
}
```
Add the matching import at the top: `import { isProUnlocked } from "./license.ts";`

- [ ] **Step 5: Run full suite and commit**

Run: `npm test`
Expected: green.

```bash
git add src/fix.ts src/cli.ts test/fix.test.ts
git commit -m "feat(pro): --fix description codemod behind license gate"
```

---

## Launch checklist (Boris-gated, post-build — not code tasks)

These are review-gated to Boris per the identity rule; do not execute autonomously:
- [ ] Create `toolbudget` Pro products in the existing Pancratic LemonSqueezy store ($39 lifetime, $5/mo); enable license keys.
- [ ] `npm publish` (Pancratic/borispan-416 npm account).
- [ ] Create public GitHub repo `toolbudget` (MIT) under the Pancratic org; push.
- [ ] List in MCP directories; seed the first entries.
- [ ] First public launch post per channel (Show HN / dev.to / Reddit) — Boris approves the first one, then autonomous.

---

## Self-review (completed by plan author)

- **Spec coverage:** input modes (Tasks 11, 13), token metric (Task 2), all v1 rules (Tasks 5–7), score (Task 9), reporters (Task 12), CI exit codes (Task 15), free/Pro boundary + license (Tasks 14, 18), distribution/README (Task 16), threshold calibration (Task 17). The #3 directory is intentionally out of scope (separate spec). ✔
- **Placeholders:** none — every code step contains complete code; the one SDK-import caveat (Task 13) includes the exact command to resolve it. ✔
- **Type consistency:** `Surface`, `ToolDef`, `JSONSchema`, `Finding`, `Rule`, `RuleContext`, `Config`, `Report`, `PerToolCost`, `Format` are defined once and used with consistent signatures across tasks (`analyze(surface, config)`, `render(report, format)`, `isProUnlocked(key, deps?)`, `scoreFindings(findings, toolCount)`). ✔
