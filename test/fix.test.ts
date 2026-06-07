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
