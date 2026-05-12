#!/usr/bin/env bash
set -u

PASS=0
FAIL=0

check_file() {
  local path="$1"
  if [ -f "$path" ]; then
    echo "PASS file: $path"
    PASS=$((PASS + 1))
  else
    echo "FAIL file: $path"
    FAIL=$((FAIL + 1))
  fi
}

check_dir() {
  local path="$1"
  if [ -d "$path" ]; then
    echo "PASS dir:  $path"
    PASS=$((PASS + 1))
  else
    echo "FAIL dir:  $path"
    FAIL=$((FAIL + 1))
  fi
}

check_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "PASS command: $cmd"
    PASS=$((PASS + 1))
  else
    echo "FAIL command: $cmd"
    FAIL=$((FAIL + 1))
  fi
}

echo "== Mission Control verify =="

# QA/dev gate docs + scripts
check_file "QA_CHECKLIST.md"
check_file "QA_BUG_TEMPLATE.md"
check_file "QA_RELEASE_STRATEGY_V2.md"
check_file "README_RUN.md"
check_file "scripts/smoke_api.sh"
check_file "scripts/qa_gate_v2.sh"

# Tooling assumptions for smoke automation
check_cmd "curl"
check_cmd "jq"

# Backend minimum scaffold
check_file "backend/package.json"
check_file "backend/tsconfig.json"
check_file "backend/src/server.ts"
check_file "backend/src/routes/agents.ts"
check_file "backend/src/routes/projects.ts"
check_file "backend/src/routes/tasks.ts"

# Frontend scaffold
check_dir "frontend"
check_file "frontend/package.json"
check_file "frontend/app/page.tsx"

echo "-----------------------------"
echo "PASS: $PASS"
echo "FAIL: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: PASS"
  exit 0
else
  echo "RESULT: FAIL"
  exit 1
fi
