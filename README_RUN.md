# Mission Control — Run Guide

## Prerequisites
- Node.js 20+
- npm 10+
- `curl`
- `jq`

## 0) Repo quality gate
From project root:

```bash
bash scripts/verify.sh
```

Full automated v2 QA gate:

```bash
bash scripts/qa_gate_v2.sh
```

---

## 1) Backend (current implementation)

```bash
cd backend
npm install
npm run dev
```

Production build/run:

```bash
cd backend
npm run build
npm start
```

---

## 2) Frontend (current implementation)
Current frontend location: `frontend`.

Run:

```bash
cd frontend
npm install
npm run dev
```

---

## 3) Quick test checklist
- [ ] `bash scripts/verify.sh` returns PASS
- [ ] `bash scripts/smoke_api.sh` returns PASS
- [ ] `bash scripts/qa_gate_v2.sh` returns automated PASS
- [ ] Backend starts
- [ ] Frontend starts (`frontend`)
- [ ] Core endpoints respond: agents/projects/tasks
- [ ] Dashboard renders counters + ownership board
- [ ] No blocker-level errors in terminal/browser console
