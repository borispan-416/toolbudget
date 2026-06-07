# toolbudget — Design Spec

_Track B, Autonomous Operator venture. Date: 2026-06-07. Status: approved design, pre-implementation._

## One-liner
A TypeScript/Node CLI that tells MCP server authors **what their tool surface costs an agent**
— in tokens and in tool-selection accuracy — and exactly how to make it leaner.

## Problem (evidence-backed)
MCP servers expose "tools" to AI agents. Every tool's name + description + input schema is
injected into the model's context on calls. Real, cited failure mode: GitHub's MCP server
"dumps 43 tools into the context window," which makes agents **pick the wrong tool more often,
adds latency, and burns tokens on descriptions the agent never uses." Tool design quality is a
top-discussed MCP pain point, yet no tool today leads with the **economic metric** — the token
cost of the surface and its effect on accuracy. (Sources in `../IDEA-SCAN.md`.)

## The wedge (how we differ from existing linters)
Existing npm packages `mcp-lint` (v0.5.3, client-compatibility focus) and `mcp-tool-lint`
(v0.1.0, static quality defects) validate demand but miss our angle:
1. **Economic/performance framing** — lead with "your tool surface = N tokens/call, est.
   accuracy impact," not generic schema nits.
2. **Live introspection** — measure the *real* surface via the MCP handshake, not just static files.
3. **Directory moat (sequenced)** — feeds a public benchmark/leaderboard of real servers'
   surface health (separate spec, built after v1). Standalone linters can't replicate this.
4. ReleaseScribe-grade polish + BYOK Pro (no backend, ~100% margin).

## Target user
Anyone shipping an MCP server (11k+ servers, ~85% MoM growth): indie devs, dev-tool teams,
platform engineers. They run `toolbudget` locally while building and in CI to prevent regressions.

## Scope — v1
**In:**
- Two input modes:
  - **Live:** `--stdio "<cmd>"` or `--url <http-url>` → perform MCP `initialize` + `tools/list`
    handshake → capture the actual tool surface.
  - **Static:** `--input tools.json` (a captured `tools/list` result) → analyze without a live
    server (CI-friendly, no secrets needed).
- **The metric:** total token weight of the tool surface = sum of tokenized
  (name + description + JSON-schema) across all tools, computed with a local tokenizer
  approximation (no network, no model call). Reported as total + per-tool breakdown + the
  share each tool consumes.
- **Lint rules** (each with id + severity error/warn/info), v1 set:
  - `surface/too-many-tools` — tool count over threshold (default 25, configurable).
  - `surface/token-budget` — total surface tokens over budget (default 2,000, configurable).
  - `tool/missing-description`, `tool/description-too-short` (<12 words), `tool/description-too-long`.
  - `tool/no-examples` — no usage example in description/annotations.
  - `tool/schema-too-large` — input schema token weight over per-tool cap.
  - `tool/schema-deeply-nested` — nesting depth over cap (default 4).
  - `tool/param-missing-description` — a property lacks a description.
  - `tool/freeform-should-enum` — string param whose description implies a fixed set.
  - `tool/unclear-name` — non-descriptive/duplicate-prefix names.
  - `redundancy/near-duplicate-tools` — high name/description similarity between two tools.
- **Score:** 0–100, deterministic, derived from weighted rule violations relative to surface size.
- **Reporters:** `pretty` (default, colorized terminal), `json`, `markdown`.
- **CI mode:** `--ci` → exit non-zero if score below `--min-score` (default 80) OR any `error` rule.

**Out (v1 non-goals, YAGNI):**
- No hosted backend / SaaS dashboard / live monitoring service.
- No auto-PR bot.
- No languages beyond the TS/Node CLI (server under test can be any language — we speak MCP, not its source).
- The #3 directory is a *separate* product/spec, not part of v1.

## Free vs Pro (monetization)
Open-core, MIT free core, **license-gated Pro via LemonSqueezy, BYOK-style activation, no backend**
(identical mechanism to the shipped ReleaseScribe).
- **Free:** all input modes, the metric, all v1 lint rules, score, all three reporters, basic
  `--ci` pass/fail on score. (This is the adoption + SEO engine and seeds the #3 directory.)
- **Pro (~$5/mo or $39 lifetime):**
  - `--fix` auto-fix codemods (rewrite descriptions/enums, split/group oversized surfaces) emitting
    a patch.
  - Custom rule config + per-rule severity overrides (`toolbudget.config.json`).
  - `--baseline` drift tracking: store a baseline, fail CI when the surface regresses.
  - `sarif` / richer machine-readable reporters.

## Architecture (isolated, independently testable units)
```
src/
  core/        pure analysis orchestrator: surface model + scoring (framework-agnostic)
  rules/       one file per rule; each: (surface) => Finding[]; pure + unit-tested in isolation
  tokens/      local tokenizer approximation + token-weight helpers
  introspect/  MCP client (stdio + http transports) and static-JSON loader → normalized Surface
  report/      pretty | json | markdown reporters over a common Report shape
  license/     LemonSqueezy activate/validate (form-encoded, machineId), gates Pro features
  cli.ts       arg parsing, mode selection, orchestration, exit codes
```
- **`core/` imports nothing framework-specific** so the #3 directory can reuse it directly to
  score servers at scale.
- Each rule is a pure function over a normalized `Surface` (the captured tools) → `Finding[]`,
  making rules trivially testable with fixtures.

## Data flow
`introspect` (live handshake OR static file) → normalized `Surface` → `tokens` annotates weights
→ `rules` produce `Finding[]` → `core` computes score + assembles `Report` → `report` renders →
`cli` sets exit code.

## Error handling
- Live handshake failures (bad command, connection refused, auth required, protocol error) →
  clear actionable message + non-zero exit; suggest `--input` static mode as fallback.
- Malformed `tools.json` → schema-validated with a precise error pointing at the offending tool.
- Pro feature invoked without a valid license → graceful message + link to purchase; never crash.
- Tokenizer is approximate by design; output labels it "est." to avoid false precision claims.

## Testing (TDD, ReleaseScribe-grade discipline)
- Each rule: unit tests against hand-built `Surface` fixtures (positive + negative cases).
- `tokens/`: tests asserting monotonic, stable weights on known inputs.
- `introspect/`: tests against a local fixture MCP server (stdio) + a recorded `tools/list` JSON.
- End-to-end: run against a real, known-bloated public MCP server and assert the report flags it.
- Node 22 runs the TS directly for tests; esbuild bundles `cli.ts` for distribution.
- Bar: all tests green before any launch step (mirrors ReleaseScribe's 21/21).

## Distribution / GTM
- npm publish (`npx toolbudget` / `npm i -g toolbudget`), public GitHub OSS core (MIT) for trust + SEO.
- List in MCP directories; this also seeds the #3 directory.
- Launch sequence (Show HN / dev.to / Reddit / X) — **first public post per channel is
  review-gated to Boris** (identity rule), autonomous thereafter.
- Brand: **Pancratic** (consistent with ReleaseScribe + the venture).

## Monetization / pricing
- BYOK → no marginal cost → ~100% margin. Billing via the existing Pancratic LemonSqueezy store
  (add `toolbudget` Pro products: $39 lifetime, $5/mo).
- $0 to build and launch; within the shared $50 cap (nothing required).

## Dependencies (minimal)
- MCP TypeScript SDK (client/transports for introspection).
- A small local tokenizer (approximation; no network/model calls).
- esbuild (bundle), Node 22 native test runner (tests). Avoid heavy frameworks.

## Risks & mitigations
- **Competitors exist** → win on the economic wedge + live introspection + directory moat + polish.
- **MCP spec churn** → keep `introspect/` thin and SDK-backed; pin + track spec releases.
- **Tokenizer accuracy** → label estimates; offer a config to set the target model's tokenizer later.
- **Niche still young** → low downside ($0 spend); the directory (#3) compounds regardless.

## Relationship to #3 (directory) & sequencing
v1 ships standalone and useful on its own. Its `core/` + `tokens/` become the scoring engine the
#3 directory imports to benchmark public servers. #3 gets its own spec after v1 lands.

## Open items to resolve during build (not blockers)
- Final default thresholds (tool count, token budget) calibrated against a sample of real public
  servers during implementation.
- Confirm LemonSqueezy product IDs once created in the Pancratic store.
