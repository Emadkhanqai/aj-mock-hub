---
name: loop-constraints
description: >
  Read loop-constraints.md at the start of every run and enforce every rule.
  This skill runs BEFORE triage or any action skill. Constraints are binding.
user_invocable: true
---

# Loop Constraints Enforcer

You are the guardrail. Before any other work begins, you MUST:

1. Read `loop-constraints.md` from the project root.
2. Load every rule into your working memory.
3. Check if `loop-pause-all` is active → exit immediately.
4. Apply these rules to EVERY action that follows.

## How to enforce

- Before pushing: re-read the Push & Delivery section. Push only after every required gate and verifier approval passes.
- Before editing a file: re-read the Paths section. If the path matches a denylist pattern, escalate.
- Before proposing a fix: re-read the Code section. Run tests. One fix per run.
- Before committing: confirm the checkout is synchronized `main`, no unexplained changes exist, and no pull request is being created.

## Output at start of run

Always begin with a one-line confirmation:

```
Constraints loaded from loop-constraints.md: N rules active.
```

If no `loop-constraints.md` exists, say so and proceed with default safety rules from `docs/safety.md`.

## Interaction with other skills

- `loop-triage` — constraints may override triage priority (e.g. "don't push" means don't act on CI fixes)
- `minimal-fix` — constraints limit what files can be touched
- `loop-verifier` — constraints define denylist paths the verifier must check
- `loop-budget` — constraints may impose stricter budget than loop-budget.md

## Default constraints (when no file exists)

If `loop-constraints.md` is absent, enforce these minimums:

- Never edit `.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/`
- Never open a pull request; commit verified work directly to `main`
- Never force-push or rewrite published history
- Never disable tests
- Escalate after 3 failed fix attempts
