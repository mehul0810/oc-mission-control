# Mission Control v2 — Bug Template & Severity Rubric

Use this for every defect found during QA gates.

## Bug record
- Bug ID: MC2-BUG-###
- Title:
- Area: API / UI / Integration / Realtime / Performance
- Environment: commit + browser + OS
- Preconditions:
- Steps to reproduce:
- Expected:
- Actual:
- Evidence (logs/screenshots/payload):
- Severity: Sev-1 / Sev-2 / Sev-3 / Sev-4
- Priority: P0 / P1 / P2 / P3
- Owner:
- ETA:
- Waiver required?: yes/no
- Status: Open / In Progress / Fixed / Verified / Deferred

## Severity rubric (operational)
| Severity | Definition | Default Priority | Gate impact |
|---|---|---|---|
| Sev-1 Critical | Crash, security/auth bypass, data corruption, core flow unusable | P0 | Hard stop |
| Sev-2 Major | Core feature wrong/unstable; workaround high-friction | P1 | Block unless written waiver |
| Sev-3 Moderate | Non-core issue, workaround exists | P2 | Can defer with owner + date |
| Sev-4 Minor | Cosmetic/copy/polish | P3 | Defer allowed |

## Waiver policy
A waiver is valid only if all are present:
1. Explicit owner
2. Expiry date
3. Risk note + user impact
4. Tony + Jarvis acknowledgement

Missing any item => waiver invalid.
