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
