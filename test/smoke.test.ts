import { test } from "node:test";
import assert from "node:assert/strict";
import { hello } from "../src/model.ts";

test("module loads", () => {
  assert.equal(hello(), "toolbudget");
});
