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

echo "== Mission Control verify =="

# QA/dev gate docs
check_file "QA_CHECKLIST.md"
check_file "README_RUN.md"

# Backend minimum scaffold
check_file "backend/package.json"
check_file "backend/tsconfig.json"
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
