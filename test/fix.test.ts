import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestFixes } from "../src/fix.ts";
import type { Surface } from "../src/model.ts";

test("suggestFixes proposes a description for a tool that lacks one", () => {
  const surface: Surface = { tools: [{ name: "delete_file", inputSchema: { type: "object", properties: { path: { type: "string" } } } }] };
  const patch = suggestFixes(surface);
  const change = patch.find((p) => p.tool === "delete_file" && p.field === "description");
  assert.ok(change, "should produce a fix entry for delete_file");
  const suggestion = change!.suggestion as string;
  // suggestion should contain the human-readable tool name words
  assert.ok(suggestion.includes("Delete"), "suggestion should contain 'Delete'");
  assert.ok(suggestion.includes("file"), "suggestion should contain 'file'");
  // suggestion should include the parameter name from the schema
  assert.ok(suggestion.includes("path"), "suggestion should include parameter name 'path'");
});

test("suggestFixes does not propose a fix for a tool that already has a description", () => {
  const surface: Surface = {
    tools: [
      { name: "delete_file", description: "Deletes a file at the given path.", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
    ],
  };
  const patch = suggestFixes(surface);
  const change = patch.find((p) => p.tool === "delete_file");
  assert.ok(!change, "should not suggest a fix for a tool that already has a description");
});
