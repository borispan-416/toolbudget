# Track B — Wide-Net Idea Scan (2026-06-07)

Parallel track to the main Autonomous Operator venture. Shares the $50 cap and Boris's
real identity (review-gated). Goal: high-leverage, passive / near-passive revenue where
**Claude builds AND operates** the asset, Boris only approves spend + first public action.

Complements (does NOT duplicate) existing lanes:
- Lane 1 = Metaculus forecasting bot (`pancratic-bot`)
- Lane 2 = ReleaseScribe (VS Code dev tool, shipped)

## Evaluation filters
Leverage/passivity · Autonomy fit (can Claude run it?) · Time-to-first-$ · Spend (≤$50) ·
Reputation/legal risk · Moat/durability.

## Traps found in research (de-prioritized, with reasons)
- **Prediction-market arbitrage bots (Kalshi/Polymarket).** Arb windows now ~2.7s; 73% of
  profit captured by sub-100ms bots; needs real capital at risk. Violates "$0–$50, make not
  spend" + not passive + financial risk. *Picks-and-shovels for that crowd is fine; trading is not.*
- **Generic AI wrappers.** ~90% fail by 2026, 25–35% margins. Avoid undifferentiated GPT-wrappers.
- **Mass low-quality programmatic SEO.** Dead post-AI-Overviews. Only *data-rich* pSEO survives.
- **Web-scraping APIs.** Legal/anti-bot risk (72% of scrapes fail); RapidAPI declining post-Nokia.
  Possible but reputation/legal caution; not a clean fit for review-gated real identity.

## Evaluated portfolio (ranked)

### A. Self-operating data-rich content/tool site (compounding asset) ⭐ top pick
Claude builds a niche site of genuinely useful *structured-data* pages + free micro-tools
(calculators/comparisons), then **keeps operating it on a schedule** (cron/`/schedule`) —
adding pages, refreshing data, optimizing for AI-citation. Monetize: display ads + affiliate
+ optional Pro/lead-gen.
- Leverage: high (build once, compounds). Passivity: high once indexed. Autonomy: *excellent*
  — this is the literal "Claude as operator" vision. Spend: ~$12 domain. Risk: low.
  Downside: SEO is slow (months to traffic); must be data-rich, not blog fluff.

### B. Differentiated digital-product / data bundle on marketplaces (fast, pure-passive)
A specialized, hard-to-make template/dataset/kit sold on Gumroad/Etsy/LemonSqueezy + own page.
Top Notion/template sellers do $20–100k/mo; realistic indie start $200–1k/mo. 95% margin, $0 spend,
marketplace brings traffic. Claude produces product + SEO listings; Boris approves publish.
- Leverage: medium-high. Passivity: very high. Autonomy: good. Time-to-$: *fast* (days). Risk: low.
  Downside: crowded — needs a sharp niche + real differentiation to stand out.

### C. "Boring" single-purpose micro-SaaS (recurring revenue)
Narrow B2B utility (dunning/payment-recovery, testimonial widget, niche scheduler). 70–90%
margins, recurring. Claude builds; Boris review-gates.
- Leverage: high (MRR). Passivity: medium (needs support/maintenance). Autonomy: good to build,
  less so to run. Time-to-$: slow (median 12–18mo to $10k MRR). Spend: low (hosting). Risk: low.
  Overlaps a bit with ReleaseScribe's "dev tool" shape but different niche is fine.

### D. Picks-and-shovels for the autonomous/AI-builder or prediction-market crowd
Free SEO-driven tool/dashboard/alerting product serving a hot niche (e.g. prediction-market
analytics, AI-builder utilities), monetized via subscription/affiliate. Synergy with Lane 1
forecasting know-how, *without* trading capital.
- Leverage: high. Passivity: medium-high. Autonomy: good. Risk: low-medium (niche dependency).

## Recommended barbell
**A (compounding, self-operated) + B (fast, pure-passive)** — one durable engine that earns
slowly but compounds and showcases the autonomous-operator thesis, plus one quick passive asset
that can produce a first dollar in days. C is the alternative if Boris prefers recurring MRR.

Next step: Boris picks 1–2 to take into a full brainstorm → design → build.

---

## Concrete product concepts (2026-06-07) — grounded in cited MCP/AI-builder pain

Decision: lean toward the **AI-builder / MCP crowd** (zero data dependency, ~$0 marginal
cost, organic directory distribution, deepest autonomy fit). Concepts below tie to real,
sourced pain points.

### 1. MCP Lint / Tool-Surface Optimizer  ⭐ lead candidate (ReleaseScribe playbook)
- **Problem (cited):** tool bloat kills agents — GitHub's MCP server "dumps 43 tools into
  the context window," making agents pick the wrong tool, adding latency, burning tokens.
  Bad tool descriptions/schemas are rampant.
- **Product:** a dev tool/CLI that audits an MCP server's tool definitions → flags too many
  tools, weak descriptions, token-heavy schemas, missing examples → suggests a curated/split
  surface. Free audit; **Pro (license-gated, BYOK, no backend)** = auto-fix, CI gate, drift
  monitoring.
- **Who pays:** anyone shipping an MCP server (11k+ and growing 85% MoM).
- **Fit:** pure deterministic core, $0 backend, Claude builds + operates, dev-SEO + directory
  distribution. Near-clone of ReleaseScribe's proven model. Fast to first $.

### 2. MCP Auth Kit (drop-in OAuth 2.1 for agents)
- **Problem (cited):** auth is THE #1 pain across 50+ dev threads — OAuth token lifecycle
  doesn't match long-running agents; tokens expire mid-execution; failures are silent.
- **Product:** battle-tested OAuth 2.1 + token-refresh boilerplate/library with the gotchas
  solved. One-time $79–149 starter kit, or open-core + paid pro.
- **Fit:** very high value (devs pay to skip pain) BUT security-sensitive → high build rigor,
  reputational risk if flawed, needs upkeep. Less passive.

### 3. MCP Capability Catalog — self-operating SEO directory (idea A)
- **Problem (cited):** discovery requires a live connection + handshake; "registries,
  crawlers, and client UIs need a lighter-weight option." Humans can't easily browse/compare
  what 11k servers actually do.
- **Product:** an SEO-rich directory that normalizes servers (auth type, tool count,
  category, reliability) + proposes a static capability manifest standard. Monetize: sponsored
  listings, deploy/host affiliate, "verified/monitored" badge sub for authors.
- **Fit:** purest operator thesis — Claude crawls + updates on a cron; compounding SEO +
  network effects. Slower to revenue (needs traffic).

### 4. MCP Server Starter Kit (productized, idea B)
- **Problem (cited):** prod gotchas — long-running tool calls hold connections; stateful
  Streamable-HTTP sessions fight load balancers/autoscaling; deploy is fiddly.
- **Product:** opinionated production-ready boilerplate (auth, transport, deploy, billing).
  One-time $49–99 on Gumroad/LemonSqueezy.
- **Fit:** fastest to first $, pure passive, proven model (dev boilerplates do $1M+). Lower
  ceiling; must track the spec.

### 5. MCP/Agent Eval Harness (CLI core)
- **Problem (cited):** only 52% of teams run proper evals (vs 89% observability); behavior
  drifts silently on model updates; can't easily test full tool trajectories.
- **Product:** framework/CLI to write trajectory tests for an MCP server/agent + CI
  regression detection. Free core; paid = cloud dashboard.
- **Fit:** high value; CLI is passive, but the paid cloud tier = backend = ongoing cost.

**Recommended barbell:** **#1 (lead, fast, ReleaseScribe-style) + #3 (compounding directory).**
#1 produces the directory's seed data + audience; #3 is the SEO moat that feeds #1. They
reinforce each other.
