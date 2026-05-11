# Mission Control — Run Guide

## Prerequisites
- Node.js 20+
- npm 10+

## 0) Repo quality gate
From project root:

```bash
bash scripts/verify.sh
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

### Expected now
Current backend package scripts expect `src/server.ts`.
If missing, `npm run dev`/`npm run build` will fail until backend bootstrap is completed.

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
- [ ] Backend starts (or missing bootstrap is clearly reported)
- [ ] Frontend starts (`frontend`)
- [ ] Core endpoints respond: agents/projects/tasks
- [ ] Dashboard renders counters + ownership board
- [ ] No blocker-level errors in terminal/browser console
