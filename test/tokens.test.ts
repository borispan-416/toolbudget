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
