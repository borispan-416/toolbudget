# toolbudget

**Know what your MCP tool surface costs an agent.**

Every tool you expose over MCP — its name, description, and JSON schema — is
re-sent to the model on *every* call. That "tool surface" silently eats your
context window and degrades tool-selection accuracy. `toolbudget` measures the
total token weight of your surface, flags the rules that make it worse, and
gives you a single 0–100 score you can gate on in CI.

It leads with the metric that actually matters — **token cost per call and its
effect on agent performance** — not generic schema linting.

```
$ npx toolbudget --stdio "npx -y @modelcontextprotocol/server-everything"

toolbudget
Score 82/100  |  13 tools  |  ~1015 tokens/call (est.)

Heaviest tools
  gzip-file-as-resource   200 tok (20%)
  simulate-research-query 127 tok (13%)
  get-annotated-message    99 tok (10%)
  ...
```

That's ~1015 tokens spent on tool definitions before the agent has done any
work — on every turn.

## Install

No install required:

```bash
npx toolbudget --input tools.json
```

Or add it to a project:

```bash
npm install -D toolbudget
```

Requires Node 22+.

## Usage

Three ways to point `toolbudget` at a tool surface:

```bash
# 1. A captured tools/list JSON file
toolbudget --input tools.json

# 2. Launch a stdio MCP server and introspect it live
toolbudget --stdio "npx -y @modelcontextprotocol/server-filesystem /tmp"

# 3. Connect to a Streamable HTTP MCP server
toolbudget --url https://your-host/mcp
```

Three output formats — `pretty` (default), `json`, `markdown`:

```bash
toolbudget --stdio "node server.js" --format markdown
toolbudget --input tools.json --format json
```

Gate it in CI — exits non-zero when the score drops below `--min-score`
(default 80) or any error-level finding is present:

```bash
toolbudget --input tools.json --ci --min-score 80
```

Override budgets per run with `--max-tools <n>` and `--token-budget <n>`.

## Example report

Live run against the official `@modelcontextprotocol/server-everything`
reference server (`--format markdown`):

```markdown
# toolbudget report

- **Score:** 82/100
- **Tools:** 13
- **Surface cost:** ~1015 tokens/call (est.)

## Heaviest tools
- `gzip-file-as-resource` — 200 tokens (20%)
- `simulate-research-query` — 127 tokens (13%)
- `get-annotated-message` — 99 tokens (10%)
- `get-resource-reference` — 82 tokens (8%)
- `trigger-long-running-operation` — 82 tokens (8%)
- `get-resource-links` — 77 tokens (8%)
- `get-structured-content` — 71 tokens (7%)
- `get-sum` — 66 tokens (7%)
- `echo` — 53 tokens (5%)
- `toggle-simulated-logging` — 43 tokens (4%)

## Findings
- **[warn]** `tool/description-too-short` (`echo`): Description is 5 words (<12). Add purpose + when to use it.
- **[warn]** `tool/description-too-short` (`get-annotated-message`): Description is 11 words (<12). Add purpose + when to use it.
- **[warn]** `tool/description-too-short` (`get-env`): Description is 10 words (<12). Add purpose + when to use it.
- **[warn]** `tool/param-missing-description` (`get-resource-reference`): Parameters lack descriptions: resourceType.
```

## Rules

| Rule | What it catches |
| --- | --- |
| `surface/too-many-tools` | More tools than the budget; large surfaces hurt tool-selection accuracy. |
| `surface/token-budget` | Total tool-surface token cost over budget. |
| `tool/missing-description` | A tool with no description — agents can't choose what they can't read. |
| `tool/description-too-short` | Description too terse to convey purpose and when to use it. |
| `tool/description-too-long` | Bloated description burning tokens on every call. |
| `tool/unclear-name` | Non-descriptive name (e.g. `a`, `do_thing`); rename to `verb_object`. |
| `tool/param-missing-description` | Parameters with no description. |
| `tool/schema-too-large` | A single tool's input schema is oversized. |
| `tool/schema-deeply-nested` | Schema nests deeper than is reliable for models to fill. |
| `tool/freeform-should-enum` | Free-text param that should be a constrained enum. |
| `tool/no-examples` | No usage examples to anchor correct calls. |
| `redundancy/near-duplicate-tools` | Two tools that look near-identical; merge to cut surface and ambiguity. |

## Free vs Pro

| | Free | Pro |
| --- | --- | --- |
| Full audit + token metric + 0–100 score | ✓ | ✓ |
| All reporters (pretty / json / markdown) | ✓ | ✓ |
| Basic `--ci` gating | ✓ | ✓ |
| `--fix` codemods (auto-trim & rewrite) | | ✓ |
| Custom rules + per-rule severity | | ✓ |
| `--baseline` drift tracking | | ✓ |
| SARIF reporter | | ✓ |

Pro is **~$5/mo or $39 lifetime** via the [Pancratic store](https://pancratic.dev).

## How the score works

The score starts at 100 and subtracts a weighted penalty for every finding
(`error` 10, `warn` 4, `info` 1). The penalty is normalized by the number of
tools, so a large server isn't doomed simply for having more tools — it's
judged on the *quality* of its surface. A score of **≥80 is healthy**; lower
means real, fixable cost in tokens or agent reliability.

---

Brought to you by [Pancratic](https://pancratic.dev).
