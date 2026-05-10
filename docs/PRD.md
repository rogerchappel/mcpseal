# MCPSeal PRD

Status: in-progress

## Summary

A no-network MCP config linter that explains risky server commands, env exposure, broad filesystem access, and tool descriptions before an agent connects.

## Source attribution

Created during the twice-daily OSS factory run on 2026-05-10. Web search was attempted for current developer-tool and agent-workflow signals, but the configured search provider returned plan/rate-limit errors. This PRD is therefore based on local OSS factory context, recurring OpenClaw/agentic workflow pain, and broad public patterns around reproducible local developer tooling.

## Target users

- Developers using agents for local coding, testing, and release prep.
- OSS maintainers who want scriptable safety checks with reviewable output.
- Agent operators who need deterministic local evidence and no hidden SaaS state.

## Problem

MCP adoption has made local agent capability configuration powerful but easy to misread. Users need a deterministic preflight that spots sharp edges without uploading configs or blocking legitimate local tools.

## Goals

- Provide a useful MVP through a single memorable CLI.
- Work completely offline by default.
- Read local fixtures/files and produce deterministic Markdown and JSON reports.
- Redact obvious secrets before output.
- Exit non-zero when configured quality gates fail.
- Include practical examples and tests that another developer can run immediately.

## Non-goals

- Hosted dashboard or account system.
- LLM calls in the V1 path.
- Replacing full CI, security, or observability platforms.
- Mutating source files unless a command explicitly writes to an output path.

## Inputs

Claude/OpenClaw/Cursor-style MCP JSON configs and fixture manifests.

## V1 CLI

```bash
mcpseal scan ~/.config/my-agent/mcp.json --out mcpseal-report.md
mcpseal check ./fixtures/mcp.json --fail-on secret-env,broad-fs
```

## Functional requirements

1. Accept local files/directories and checked-in fixtures.
2. Produce stable Markdown and JSON outputs.
3. Support `--fail-on` or equivalent threshold flags for CI usage.
4. Include `--redact` enabled by default for common token/key patterns.
5. Include documented examples with copy-paste commands.
6. Include fixtures under `examples/` and tests under `tests/`.
7. Avoid telemetry, external network calls, or hidden file writes.

## Acceptance criteria

- `npm test`, `npm run check`, `npm run build`, and `npm run smoke` pass.
- `bash scripts/validate.sh` passes when present.
- At least one real CLI smoke uses a checked-in fixture.
- README explains why the tool exists, quick start, examples, safety model, and limitations.
- GitHub repository is public under `rogerchappel/mcpseal` with useful description and topics.

## Suggested implementation waves

1. Scaffold TypeScript CLI with StackForge and planning docs.
2. Add parser/core module for deterministic analysis.
3. Add renderer module for Markdown and JSON output.
4. Add CLI flags, fixtures, and tests.
5. Add smoke scripts and validation docs.
6. Polish README, package metadata, topics, branch protection, and release-readiness notes.
