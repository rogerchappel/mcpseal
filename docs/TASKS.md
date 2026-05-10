# MCPSeal tasks

## MVP

- [x] Scaffold OSS TypeScript CLI with StackForge.
- [x] Define scan report model and stable output contract.
- [x] Load MCP JSON files and directories without network access.
- [x] Normalize common `mcpServers` and `servers` shapes.
- [x] Flag risky commands and shell/package runners.
- [x] Flag credential-looking environment variables.
- [x] Flag broad filesystem roots and Docker socket references.
- [x] Flag weak or prompt-risk tool descriptions.
- [x] Redact common secret values by default.
- [x] Render deterministic Markdown and JSON reports.
- [x] Implement `scan`, `check`, `--out`, `--format`, `--fail-on`, and `--no-redact`.
- [x] Add checked-in risky and safer fixtures.
- [x] Add unit and CLI tests.
- [x] Add smoke script that exercises checked-in fixtures.
- [x] Document quick start, examples, safety model, and limitations.

## Post-MVP

- [ ] Add JSON schema validation for known clients.
- [ ] Support SARIF export for code scanning integrations.
- [ ] Add rule suppression comments/manifests with deterministic justifications.
- [ ] Add Windows path heuristics beyond the initial broad-root checks.
- [ ] Publish release artifacts after review.
