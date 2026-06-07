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
