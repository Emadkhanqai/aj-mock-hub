# Loop Budget — AJ Mock Hub

## Daily limits

| Loop               | Max runs/day | Max tokens/day | Max sub-agent spawns/run | Max draft PRs/day |
| ------------------ | ------------ | -------------- | ------------------------ | ----------------- |
| Daily Triage       | 2            | 100k           | 0                        | 0                 |
| PR Babysitter      | 12           | 200k           | 2                        | 2                 |
| CI Sweeper         | 8            | 200k           | 2                        | 2                 |
| Dependency Sweeper | 2            | 120k           | 2                        | 2                 |

## On budget exceed

1. Stop action mode and switch to report-only.
2. Append the event to `loop-run-log.md`.
3. Add a concise escalation to the relevant state file.
4. Do not resume action mode until the next budget window or explicit human approval.

## Kill switch

- `loop-pause-all` in `STATE.md` pauses every loop immediately.
- A pattern-specific `loop-pause` entry in its state file pauses only that pattern.
- Resume only after the human clears the flag.

## Cost checks

```bash
npx @cobusgreyling/loop-cost --pattern daily-triage --level L1
npx @cobusgreyling/loop-cost --pattern pr-babysitter --level L2
npx @cobusgreyling/loop-cost --pattern ci-sweeper --level L2
npx @cobusgreyling/loop-cost --pattern dependency-sweeper --level L2
```
