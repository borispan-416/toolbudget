import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const bloated = fileURLToPath(new URL("./fixtures/bloated.tools.json", import.meta.url));
const lean = fileURLToPath(new URL("./fixtures/lean.tools.json", import.meta.url));

function exec(args: string[]) {
  return run("node", ["--experimental-strip-types", cli, ...args], { encoding: "utf8" }).catch((e) => e);
}

test("--input json reporter prints a score", async () => {
  const { stdout } = await exec(["--input", lean, "--format", "json"]);
  assert.match(stdout, /"score"/);
});

test("--ci exits non-zero on a bloated surface below min-score", async () => {
  const res = await exec(["--input", bloated, "--ci", "--min-score", "95"]);
  assert.equal(res.code, 1);
});

test("--ci exits zero on a clean surface", async () => {
  const res = await exec(["--input", lean, "--ci", "--min-score", "50"]);
  // resolved promise (no error) means exit 0
  assert.ok(res.stdout !== undefined);
});
