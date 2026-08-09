import { asStringArray, isRecord } from './extract.js';
import { redactEnvEntry, redactValue, looksSecretKey } from './redact.js';
import type { Finding, McpServer } from './types.js';

const riskyCommands = new Set(['bash', 'sh', 'zsh', 'fish', 'python', 'python3', 'node', 'ruby', 'perl', 'powershell', 'pwsh', 'cmd.exe']);
const packageRunners = new Set(['npx', 'uvx', 'pipx', 'docker', 'docker-compose', 'bunx', 'pnpm', 'yarn', 'npm']);
const writeyShellTokens = /\b(curl|wget|nc|netcat|ssh|scp|rsync|chmod|chown|sudo|rm\s+-rf|mkfs|dd\s+if=|launchctl|osascript)\b/i;
const broadFsTokens = [/^\/$/, /^~$/, /^\.\.\/?$/, /^\.\/??$/, /^\/Users\/?$/, /^\/home\/?$/, /^\/tmp\/?$/, /^\/var\/?$/, /^C:\\\\?$/i];
const broadArgFlags = new Set(['--filesystem', '--fs', '--root', '--workspace', '--mount', '-v', '--volume']);

export function analyzeServer(server: McpServer, targetPath: string, index: number, redact: boolean): Finding[] {
  return [
    ...serverShapeFindings(server, targetPath, index),
    ...commandFindings(server, targetPath, index, redact),
    ...envFindings(server, targetPath, index, redact),
    ...filesystemFindings(server, targetPath, index, redact),
    ...toolDescriptionFindings(server, targetPath, index, redact)
  ];
}

function serverShapeFindings(server: McpServer, targetPath: string, index: number): Finding[] {
  const findings: Finding[] = [];
  if (server.command !== undefined && typeof server.command !== 'string') {
    findings.push(invalidFieldFinding(server, targetPath, index, 'command', 'a string', server.command));
  }
  if (server.args !== undefined && typeof server.args !== 'string' && !Array.isArray(server.args)) {
    findings.push(invalidFieldFinding(server, targetPath, index, 'args', 'a string or an array of strings', server.args));
  } else if (Array.isArray(server.args)) {
    server.args.forEach((arg, argIndex) => {
      if (typeof arg !== 'string') findings.push(invalidFieldFinding(server, targetPath, index, `args[${argIndex}]`, 'a string', arg));
    });
  }
  if (server.env !== undefined && !isRecord(server.env)) {
    findings.push(invalidFieldFinding(server, targetPath, index, 'env', 'an object', server.env));
  }
  if (server.tools !== undefined && !Array.isArray(server.tools)) {
    findings.push(invalidFieldFinding(server, targetPath, index, 'tools', 'an array of objects', server.tools));
  } else if (Array.isArray(server.tools)) {
    server.tools.forEach((tool, toolIndex) => {
      if (!isRecord(tool)) findings.push(invalidFieldFinding(server, targetPath, index, `tools[${toolIndex}]`, 'an object', tool));
    });
  }
  return findings;
}

function invalidFieldFinding(server: McpServer, targetPath: string, index: number, field: string, expected: string, value: unknown): Finding {
  return makeFinding(
    'config-shape',
    'medium',
    'Invalid MCP server field',
    `Server '${server.name}' field '${field}' must be ${expected}, not ${describeValue(value)}.`,
    targetPath,
    index,
    field,
    undefined,
    `Replace '${field}' with ${expected} or remove the field.`
  );
}

function commandFindings(server: McpServer, targetPath: string, index: number, redact: boolean): Finding[] {
  const findings: Finding[] = [];
  const command = typeof server.command === 'string' ? server.command : '';
  const args = asStringArray(server.args);
  const executable = basename(command);
  const commandLine = [command, ...args].join(' ').trim();
  if (!command) {
    findings.push(makeFinding('config-shape', 'medium', 'Server has no command', 'MCP server entries should declare an explicit command before an agent can launch them.', targetPath, index, 'command', undefined, 'Add an explicit command or remove the server entry.'));
    return findings;
  }
  if (riskyCommands.has(executable)) {
    findings.push(makeFinding('risky-command', 'high', 'Shell or interpreter command', `Server '${server.name}' launches through ${executable}, which can hide arbitrary behavior in arguments.`, targetPath, index, 'command', redactValue(commandLine, redact), 'Prefer a pinned binary/package entrypoint and review arguments before enabling.'));
  }
  if (packageRunners.has(executable)) {
    findings.push(makeFinding('risky-command', 'medium', 'Package runner command', `Server '${server.name}' uses ${executable}; package runners may fetch or execute mutable code depending on local cache and arguments.`, targetPath, index, 'command', redactValue(commandLine, redact), 'Pin package versions and prefer local, locked dependencies for repeatable launches.'));
  }
  if (writeyShellTokens.test(commandLine)) {
    findings.push(makeFinding('risky-command', 'critical', 'Command includes sensitive shell/network operation', `Server '${server.name}' command line contains a token commonly used for network, privilege, or destructive operations.`, targetPath, index, 'args', redactValue(commandLine, redact), 'Split setup from runtime and remove network/destructive operations from MCP launch commands.'));
  }
  return findings;
}

function envFindings(server: McpServer, targetPath: string, index: number, redact: boolean): Finding[] {
  if (!isRecord(server.env)) return [];
  return Object.entries(server.env).flatMap(([key, value]) => {
    const text = String(value ?? '');
    const secretish = looksSecretKey(key) || /sk-|gh[pousr]_|xox[baprs]-|AKIA|PRIVATE KEY/.test(text);
    if (!secretish) return [];
    return [makeFinding('secret-env', 'high', 'Environment variable may expose a secret', `Server '${server.name}' defines '${key}', which looks like credential material.`, targetPath, index, `env.${key}`, redactEnvEntry(key, value, redact), 'Use scoped credentials, environment indirection, or a secrets manager; avoid committing literal secrets.')];
  });
}

function filesystemFindings(server: McpServer, targetPath: string, index: number, redact: boolean): Finding[] {
  const args = asStringArray(server.args);
  const findings: Finding[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? '';
    const next = args[i + 1] ?? '';
    const consumesNext = broadArgFlags.has(arg) && !arg.includes('=');
    const values = arg.includes('=') ? [arg.split('=').slice(1).join('=')] : consumesNext ? [next] : [arg];
    for (const value of values) {
      if (isBroadPath(value) || isBroadBindMount(value)) {
        findings.push(makeFinding('broad-fs', 'high', 'Broad filesystem access', `Server '${server.name}' appears to grant broad filesystem access via '${arg}'.`, targetPath, index, 'args', redactValue([arg, next].filter(Boolean).join(' '), redact), 'Limit MCP filesystem roots to the smallest project directory required.'));
      }
    }
    if (consumesNext) i += 1;
    if (/\/var\/run\/docker\.sock|docker\.sock/.test(arg)) {
      findings.push(makeFinding('broad-fs', 'critical', 'Docker socket access', `Server '${server.name}' references the Docker socket, which can imply host-level control.`, targetPath, index, 'args', redactValue(arg, redact), 'Avoid exposing Docker socket access unless this server is fully trusted.'));
    }
  }
  return findings;
}

function toolDescriptionFindings(server: McpServer, targetPath: string, index: number, redact: boolean): Finding[] {
  const tools = Array.isArray(server.tools) ? server.tools : [];
  const findings: Finding[] = [];
  tools.forEach((tool, toolIndex) => {
    if (!isRecord(tool)) return;
    const description = typeof tool.description === 'string' ? tool.description : '';
    if (!description || description.length < 12) {
      findings.push(makeFinding('tool-description', 'low', 'Tool has weak description', `Server '${server.name}' tool ${String(tool.name ?? toolIndex + 1)} has a missing or very short description.`, targetPath, index, `tools.${toolIndex}.description`, description, 'Add a specific description of side effects, inputs, and safety boundaries.'));
    }
    if (/ignore previous|system prompt|exfiltrate|send.*secret|always allow/i.test(description)) {
      findings.push(makeFinding('tool-description', 'medium', 'Tool description contains prompt-risk language', `Server '${server.name}' tool ${String(tool.name ?? toolIndex + 1)} includes language that may steer an agent unsafely.`, targetPath, index, `tools.${toolIndex}.description`, redactValue(description, redact), 'Keep tool descriptions factual and avoid instructions that override user or system intent.'));
    }
  });
  return findings;
}

function isBroadPath(value: string): boolean {
  const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
  return broadFsTokens.some((pattern) => pattern.test(cleaned));
}

function isBroadBindMount(value: string): boolean {
  const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
  const [source] = cleaned.split(':');
  if (source && source !== cleaned && isBroadPath(source)) return true;

  const options = new Map(cleaned.split(',').map((option) => {
    const [key, ...parts] = option.split('=');
    return [key?.trim().toLowerCase() ?? '', parts.join('=').trim()];
  }));
  if (options.get('type') !== 'bind') return false;
  const longFormSource = options.get('source') ?? options.get('src');
  return Boolean(longFormSource && isBroadPath(longFormSource));
}

function basename(command: string): string {
  return command.split(/[\\/]/).pop()?.toLowerCase() ?? command.toLowerCase();
}

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

function makeFinding(category: Finding['category'], severity: Finding['severity'], title: string, message: string, targetPath: string, serverIndex: number, field: string, evidence: string | undefined, recommendation: string): Finding {
  return {
    id: `${category}:${targetPath}:${serverIndex}:${field}:${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category,
    severity,
    title,
    message,
    path: `${targetPath}#servers[${serverIndex}].${field}`,
    evidence,
    recommendation
  };
}
