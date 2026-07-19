---
name: loop-guard
description: >
  Circuit breaker for fix-capable loops. Before each iteration, append the last
  attempt to the pattern ledger under loop-ledgers/ and run loop-context --check;
  if it escalates, stop and hand the human a clean summary.
user_invocable: true
---

# Loop Guard (Circuit Breaker)

Wrap every fix attempt with a deterministic circuit-breaker check powered by [`loop-context`](https://github.com/cobusgreyling/loop-engineering/tree/main/tools/loop-context). Never retry blindly.

## Select the active ledger

- PR Babysitter: `loop-ledgers/pr-babysitter.json`
- CI Sweeper: `loop-ledgers/ci-sweeper.json`
- Dependency Sweeper: `loop-ledgers/dependency-sweeper.json`

Each ledger stores the goal, pattern, level, and attempts. After every iteration append the action, `success | failure | noop` outcome, token estimate, and exact sanitized error for failures. A verifier rejection counts as a failure.

## Before every fix attempt

1. Append the previous attempt to the active pattern ledger.
2. Run:

   ```bash
   npx @cobusgreyling/loop-context --check \
     --ledger loop-ledgers/<pattern>.json \
     --budget-from-pattern <pattern> \
     --budget-level L2
   ```

3. Exit code `0` permits one next attempt.
4. Exit code `2` stops the loop immediately. Do not widen thresholds or erase history.

For a compact escalation summary, run:

```bash
npx @cobusgreyling/loop-context --inject --ledger loop-ledgers/<pattern>.json
```

Write the summary to the relevant state file and notify the human. Do not create untracked escalation artifacts containing logs or sensitive details.

## Rules

- Defaults are three repeats of the same error, five consecutive failures, or ten iterations.
- Never edit a ledger to hide a failure.
- Never bypass `loop-budget.md` daily limits.
- Never retry an infrastructure, credential, destructive migration, security, cost, architecture, or major-upgrade problem without human direction.
- Stop when the independent verifier rejects the same approach repeatedly.
