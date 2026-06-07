import { test } from "node:test";
import assert from "node:assert/strict";
import { makeContext } from "../src/rules/types.ts";
import { DEFAULT_CONFIG } from "../src/config.ts";

test("makeContext exposes config and a tokensFor helper", () => {
  const ctx = makeContext(DEFAULT_CONFIG);
  assert.equal(ctx.config.maxTools, 25);
  assert.ok(ctx.tokensFor({ name: "x", description: "hello world example" }) > 0);
});
