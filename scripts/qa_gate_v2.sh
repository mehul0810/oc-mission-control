#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }
warn() { echo "[WARN] $1"; }

echo "== Mission Control v2 QA Gate (Wave 2) =="

cd "$ROOT_DIR"

bash scripts/verify.sh >/tmp/oc_verify.log 2>&1 || {
  cat /tmp/oc_verify.log
  fail "Gate 0 verify failed"
}
pass "Gate 0 verify"

PORT="${PORT:-4021}" bash scripts/smoke_api.sh >/tmp/oc_smoke.log 2>&1 || {
  cat /tmp/oc_smoke.log
  fail "Gate 1/2A API smoke/regression failed"
}
pass "Gate 1 + Gate 2A API smoke/regression"

bash scripts/smoke_ui_v2.sh >/tmp/oc_ui_smoke.log 2>&1 || {
  cat /tmp/oc_ui_smoke.log
  fail "Gate 2B UI smoke failed"
}
pass "Gate 2B UI smoke"

warn "Gate 3 (performance sanity) is manual"
warn "Gate 4 (release readiness triage/waiver review) is manual"

echo "RESULT: PASS (automated gates 0/1/2A/2B). Manual gates pending."
