# MCPSeal examples

- `risky-mcp.json` demonstrates shell launch, package runner, broad filesystem, secret env, and tool-description findings.
- `safer-mcp.json` demonstrates a narrow local binary config that should not trip default risk categories.

Try:

```bash
npm run build
node dist/cli.js scan examples/risky-mcp.json
node dist/cli.js check examples/risky-mcp.json --fail-on secret-env,broad-fs
```
