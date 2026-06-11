# MCPSeal

MCPSeal is a no-network MCP config linter. It explains risky server commands, environment exposure, broad filesystem access, and suspicious tool descriptions before an agent connects to those tools.

It is built for local review and CI evidence: deterministic Markdown/JSON output, redaction on by default, and explicit `--fail-on` gates.

## Why this exists

MCP configs are powerful launch plans. A single server entry can grant an agent shell execution, broad filesystem reads, Docker access, or credential-bearing environment variables. MCPSeal gives developers a fast preflight that is easy to run, diff, and automate without uploading configs anywhere.

## Quick start

```bash
npm install
npm run build
node dist/src/cli.js scan examples/risky-mcp.json
node dist/src/cli.js check examples/risky-mcp.json --fail-on secret-env,broad-fs
```

After installation from a package, use the binary directly:

```bash
mcpseal scan ~/.config/my-agent/mcp.json --out mcpseal-report.md
mcpseal check ./examples/risky-mcp.json --fail-on secret-env,broad-fs,risky-command
```

## Commands

See [docs/CLI.md](docs/CLI.md) for the full CLI reference.


### `scan`

Produces Markdown by default:

```bash
mcpseal scan <file-or-dir...> --out report.md
mcpseal scan <file-or-dir...> --format json
```

### `check`

Produces JSON by default and exits with code `2` when an explicit gate fails:

```bash
mcpseal check <file-or-dir...> --fail-on secret-env,broad-fs
```

Valid `--fail-on` categories:

- `risky-command`
- `secret-env`
- `broad-fs`
- `tool-description`
- `config-shape`

## What MCPSeal checks

See [docs/RULES.md](docs/RULES.md) for the detailed rule catalog.


- **Risky commands**: shells/interpreters, package runners, network/destructive command tokens.
- **Secret env**: keys or values that look like tokens, passwords, private keys, or cloud credentials.
- **Broad filesystem**: root/home/tmp-style access, broad mount flags, Docker socket references.
- **Tool descriptions**: missing/weak descriptions or prompt-risk language.
- **Config shape**: invalid JSON, missing commands, or files without recognizable server definitions.

## Redaction

Redaction is enabled by default. Secret-looking environment values and common token formats are replaced with `[REDACTED]` in output.

Use `--no-redact` only for local debugging when you are sure the output will not be shared:

```bash
mcpseal scan examples/risky-mcp.json --no-redact
```

## Safety model

- No telemetry.
- No external network calls in scan/check.
- No hidden state or SaaS account.
- No input mutation.
- Deterministic timestamp (`1970-01-01T00:00:00.000Z`) for stable diffs.
- Non-zero policy gates only happen when requested through `--fail-on`.

## Examples

Checked-in fixtures live under [`examples/`](examples/):

```bash
node dist/src/cli.js scan examples/risky-mcp.json --out .tmp/risky.md
node dist/src/cli.js check examples/safer-mcp.json --fail-on secret-env,broad-fs,risky-command
```

## Development

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Limitations

MCPSeal is a linter, not a sandbox. It uses deterministic heuristics and cannot prove a server is safe. Treat findings as review prompts, keep server packages pinned, and combine this with normal code review and OS-level permission boundaries.

## Package contents

The npm package allowlist includes the runtime files plus the public support
documents needed for release review: `README.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
Run `npm run package:smoke` or `npm pack --dry-run` before publishing to
confirm those files are still present in the tarball.

## Verification

Run the release-readiness checks that match this package before publishing or opening a release PR.

- `npm run release:check` - run the full release gate
