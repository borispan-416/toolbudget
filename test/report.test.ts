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
