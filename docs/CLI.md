# MCPSeal CLI reference

## `mcpseal scan`

```bash
mcpseal scan <file-or-dir...> [--out path] [--format markdown|json] [--fail-on categories] [--no-redact]
```

- Default format: Markdown.
- Exit code: `0` unless an explicit `--fail-on` category is found.
- `--out` must be distinct from every scanned config file, including files discovered through a directory.

## `mcpseal check`

```bash
mcpseal check <file-or-dir...> --fail-on secret-env,broad-fs
```

- Default format: JSON.
- Exit code: `2` when requested gates fail.

## Supported server entry shapes

MCPSeal recognizes object maps and arrays under `mcpServers`, `servers`, `mcp.servers`, and `experimental.mcpServers`. Each entry in those collections must be an object with these supported fields:

- `command`: a string (required for a launchable server).
- `args`: a string or an array containing only strings.
- `env`: an object.
- `tools`: an array containing only objects.

Invalid entries and fields produce path-specific `config-shape` findings, including the index of each malformed `args` or `tools` member. Valid fields and sibling servers continue through the other risk rules.

## Exit codes

- `0`: completed and no requested gate failed.
- `1`: CLI/input/runtime error.
- `2`: scan completed and at least one requested gate failed.
