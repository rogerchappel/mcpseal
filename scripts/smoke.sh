#!/usr/bin/env bash
set -euo pipefail

rm -rf .tmp
mkdir -p .tmp
node dist/cli.js scan examples/risky-mcp.json --out .tmp/risky-report.md
grep -q "MCPSeal report" .tmp/risky-report.md
grep -q "\[REDACTED\]" .tmp/risky-report.md

if node dist/cli.js check examples/risky-mcp.json --fail-on secret-env,broad-fs > .tmp/risky-report.json; then
  echo "expected fail-on gate to exit non-zero" >&2
  exit 1
fi
grep -q '"failedGates"' .tmp/risky-report.json

node dist/cli.js check examples/safer-mcp.json --fail-on secret-env,broad-fs,risky-command > .tmp/safer-report.json
grep -q '"findings": 0' .tmp/safer-report.json

echo "mcpseal smoke ok"
