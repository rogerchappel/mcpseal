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

## Exit codes

- `0`: completed and no requested gate failed.
- `1`: CLI/input/runtime error.
- `2`: scan completed and at least one requested gate failed.
