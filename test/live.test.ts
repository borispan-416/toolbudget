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
