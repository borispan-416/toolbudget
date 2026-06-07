import { test } from "node:test";
import assert from "node:assert/strict";
import { isProUnlocked } from "../src/license.ts";

test("no key = locked", async () => {
  assert.equal(await isProUnlocked(undefined, { fetch: async () => ({ ok: false }) as any }), false);
});

test("valid activation = unlocked", async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ activated: true, valid: true }) }) as any;
  assert.equal(await isProUnlocked("KEY-123", { fetch: fakeFetch }), true);
});

test("network failure fails closed (locked) without throwing", async () => {
  const fakeFetch = async () => { throw new Error("offline"); };
  assert.equal(await isProUnlocked("KEY-123", { fetch: fakeFetch }), false);
});
