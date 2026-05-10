# MCPSeal orchestration

MCPSeal is intentionally local-first. Agent or CI orchestration should run the same commands a human can run locally:

```bash
npm ci
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Roles

- **Scanner**: loads local JSON files/directories and builds a deterministic report.
- **Reviewer**: reads Markdown/JSON output and decides whether to accept, narrow, or remove MCP servers.
- **CI gate**: runs `mcpseal check ... --fail-on <categories>` and fails when requested categories are present.

## Safety boundaries

- No telemetry.
- No network calls in scan/check paths.
- No config mutation.
- Redaction is on by default.
- Non-zero exits are controlled by explicit `--fail-on` categories.

## Recommended CI command

```bash
mcpseal check . --fail-on secret-env,broad-fs,risky-command
```
