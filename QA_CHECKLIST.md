# Mission Control v2 — QA Gate Checklist (Wave 1)

Owner: Vision (QA)  
Sign-off Partners: Tony (technical), Jarvis (go/no-go)

## Gate 0 — Build Integrity (automated)
- [ ] `bash scripts/verify.sh` passes
- [ ] `bash scripts/smoke_api.sh` passes
- [ ] Backend build succeeds (`backend npm run build`)

## Gate 1 — API Smoke Scenarios (automated)
- [ ] Health endpoint returns `{ data.status: "ok" }`
- [ ] Core reads return valid JSON arrays: agents/projects/tasks
- [ ] Dashboard summary + ownership board return expected data
- [ ] Unknown route returns `404` with envelope `{ error: { code, message } }`
- [ ] Unauthorized write is rejected (`401`, `UNAUTHORIZED`)
- [ ] Invalid payload on write returns `400`, `VALIDATION_ERROR`
- [ ] Event stream endpoint responds and emits an event frame

## Gate 2 — Regression Integrity
### Suite A (API contract) — automated
- [ ] Agents/projects/tasks response envelopes stay stable
- [ ] Dashboard + chat + activity routes reachable
- [ ] Auth guard active on mutating routes
- [ ] Error envelope contract validated on 404 and invalid payload

### Suite B (UI smoke) — manual
- [ ] Dashboard loads without runtime crash
- [ ] KPI cards match API values
- [ ] Ownership board rows + placeholders render correctly
- [ ] Quick add task updates board/counters
- [ ] Watercooler post appears in chat + activity
- [ ] Failed API call shows user-safe error state

## Gate 3 — Performance Sanity (manual release candidate)
- [ ] `/dashboard/summary` p95 <= 400ms (30 samples)
- [ ] `/dashboard/ownership-board` p95 <= 600ms (30 samples)
- [ ] First visible dashboard content <= 2.5s
- [ ] 10-min SSE idle shows no >20% linear memory climb

## Gate 4 — Release Readiness
- [ ] Known limitations documented
- [ ] Open defects logged with severity, owner, ETA
- [ ] No open Sev-1 defects
- [ ] No open Sev-2 defects without written waiver (owner + expiry)
- [ ] Final QA recommendation: Go / Go-with-waiver / No-Go

## Smoke scenario commands
- Automated bundle: `bash scripts/qa_gate_v2.sh`
- API-only smoke: `bash scripts/smoke_api.sh`

## Evidence Log Template
- Commit:
- Date/Time:
- Runner:
- Gate 0:
- Gate 1:
- Gate 2A:
- Gate 2B:
- Gate 3:
- Gate 4:
- Recommendation:
- Risks/Blockers:
