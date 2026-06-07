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
