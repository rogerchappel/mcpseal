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
npm install --global mcpseal
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

The `--out` path must not resolve to a scanned input file. MCPSeal rejects the command before writing so config files cannot be replaced by reports.

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

Server collections may be object maps (for example, `mcpServers.name`) or arrays (for example, `servers[0]`). Every entry must be an object: `command` is a string, `args` is a string or array of strings, `env` is an object, and `tools` is an array of objects. MCPSeal reports malformed entries and fields at their exact config path while continuing to scan valid fields and siblings.

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
## CLI Help Smoke

Confirm the packaged command starts and prints its help text before relying on a release tarball or downstream automation:

```bash
npm run build
node ./dist/src/cli.js --help
```

The command should exit successfully, print the available options, and avoid reading project files or contacting external services.

## Limitations

MCPSeal is a linter, not a sandbox. It uses deterministic heuristics and cannot prove a server is safe. Treat findings as review prompts, keep server packages pinned, and combine this with normal code review and OS-level permission boundaries.

## Package contents

The npm package allowlist includes compiled runtime files, schemas, examples,
and the public support documents needed for release review: `README.md`,
`LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and
`CODE_OF_CONDUCT.md`.

Run `npm run package:smoke` before publishing. It builds and packs the exact
tarball, rejects test artifacts or missing public files, installs the tarball
in a disposable consumer project, runs the installed `mcpseal` binary against
a packaged example, and imports the public library entrypoint.

Releases are published by pushing a version tag. The `Release` workflow checks
that the tag matches `package.json`, runs the complete release gate, publishes
the public `mcpseal` package to npm with provenance through npm trusted
publishing, and only then creates the GitHub release. The npm package's trusted
publisher must point to `rogerchappel/mcpseal` and `.github/workflows/release.yml`.
No long-lived npm token is used by this workflow.

## Verification

Run the release-readiness checks that match this package before publishing or opening a release PR.

- `npm run release:check` - run the full release gate
- `npm publish --dry-run` - exercise npm's pack and public-publish configuration without publishing

The release gate also verifies that the CLI version output, help banner, and
generated JSON report all match the version declared in `package.json`.

Release tags must exactly equal `v` followed by the version in `package.json`
(for example, package version `0.1.5` must be released from tag `v0.1.5`). The
tag release workflow verifies this relationship before packing or creating a
GitHub release. You can run the same guard locally with
`npm run release:tag-check -- v0.1.5 0.1.5`.
