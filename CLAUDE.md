# Toolbudget — Project Guide

Extends the global `~/.claude/CLAUDE.md`. Rules here are specific to this codebase.
When working in a web/remote session where the global file isn't available, the full global rules are embedded below.

## What this product does

CLI tool that measures the token cost of an MCP tool surface — every tool name,
description, and JSON schema sent to the model on every call. Outputs a 0–100 score,
flags the rules that inflate cost, and is designed to be gated in CI pipelines.

## Stack

- TypeScript, Node.js CLI
- No backend, no network calls — analysis runs entirely on local input
- Unit tests via [Vitest / Jest — confirm which]

## Architecture rules

- Core scoring and token-counting logic must stay pure and network-free — fully
  unit-testable with fixture inputs.
- CLI entry point is thin: parse args, call core logic, format and print output.
  No business logic in the CLI layer.
- CI integration output (exit codes, machine-readable format) is a public contract
  — don't change without discussion.

## What not to touch without discussion

- The 0–100 scoring formula — changing it breaks anyone gating on the score in CI.
- The token-counting method — consistency matters more than perfection here.
- Any flags or output format that users might be parsing in scripts.

## Deferred (do not implement without explicit instruction)

- GUI or web interface
- Cloud/remote analysis (always local-first)
- Paid tiers or accounts

---

## Global rules (embedded for web/remote sessions)

[paste global rules section here — same as in ai-findability CLAUDE.md]
