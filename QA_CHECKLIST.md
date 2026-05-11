# QA Checklist (Sprint 1)

## 1) Setup sanity
- [ ] `scripts/verify.sh` passes
- [ ] Backend dependencies install: `cd backend && npm install`
- [ ] Frontend app exists at `frontend`

## 2) Backend smoke checks
- [ ] Backend starts in dev mode: `npm run dev`
- [ ] `scripts/smoke_api.sh` passes
- [ ] Health/basic route responds (if implemented)
- [ ] `GET /agents`, `GET /projects`, `GET /tasks` return valid JSON
- [ ] API error envelope is consistent: `{ error: { code, message } }`

## 3) Frontend smoke checks
- [ ] Frontend starts in dev mode
- [ ] Dashboard loads without runtime error
- [ ] Agent/project/task counters render
- [ ] Ownership board renders and basic filters work

## 4) Integration checks
- [ ] Frontend reads backend data (no hardcoded-only fallback)
- [ ] Loading and empty states are handled
- [ ] Failed API call shows user-safe error state

## 5) Release gate (demo-ready)
- [ ] No P0/P1 open bugs
- [ ] Known limitations documented
- [ ] Repro steps attached for any unresolved defect
