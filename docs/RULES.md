# MCPSeal rules

MCPSeal rules are deterministic heuristics designed to make review easier, not to prove safety.

## risky-command

Flags shell/interpreter launchers (`bash`, `python`, `node`, etc.), mutable package runners (`npx`, `uvx`, `npm`, `pnpm`, `docker`, etc.), and command lines containing high-risk network/privilege/destructive tokens.

## secret-env

Flags environment keys and values that look like tokens, passwords, private keys, or cloud credentials. Output redacts these by default.

## broad-fs

Flags root/home/tmp-style filesystem roots, broad mount flags, and Docker socket references.

## tool-description

Flags missing or very short tool descriptions and prompt-risk phrases such as attempts to override previous instructions or send secrets.

## config-shape

Flags invalid JSON, missing commands, and inputs that do not contain recognizable MCP server definitions.
