import type { McpServer } from './types.js';

export function extractServers(config: unknown): McpServer[] {
  return extractServerConfig(config).servers;
}

export type InvalidServerEntry = {
  path: string;
  value: unknown;
};

export type ExtractedServerConfig = {
  servers: McpServer[];
  invalidEntries: InvalidServerEntry[];
};

export function extractServerConfig(config: unknown): ExtractedServerConfig {
  if (!isRecord(config)) return { servers: [], invalidEntries: [] };
  const mcp = isRecord(config.mcp) ? config.mcp : {};
  const experimental = isRecord(config.experimental) ? config.experimental : {};
  const candidates: Array<[string, unknown]> = [
    ['mcpServers', config.mcpServers],
    ['servers', config.servers],
    ['mcp.servers', mcp.servers],
    ['experimental.mcpServers', experimental.mcpServers]
  ];
  for (const [path, candidate] of candidates) {
    const result = normalizeServers(candidate, path);
    if (result.servers.length > 0 || result.invalidEntries.length > 0) return result;
  }
  return { servers: [], invalidEntries: [] };
}

function normalizeServers(value: unknown, path: string): ExtractedServerConfig {
  if (Array.isArray(value)) {
    const servers: McpServer[] = [];
    const invalidEntries: InvalidServerEntry[] = [];
    value.forEach((server, index) => {
      if (isRecord(server)) servers.push({ ...server, name: String(server.name ?? `server-${index + 1}`) } as McpServer);
      else invalidEntries.push({ path: `${path}[${index}]`, value: server });
    });
    return { servers, invalidEntries };
  }
  if (isRecord(value)) {
    const servers: McpServer[] = [];
    const invalidEntries: InvalidServerEntry[] = [];
    Object.entries(value).forEach(([name, server]) => {
      if (isRecord(server)) servers.push({ ...server, name } as McpServer);
      else invalidEntries.push({ path: `${path}.${name}`, value: server });
    });
    return { servers, invalidEntries };
  }
  return { servers: [], invalidEntries: [] };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') return [value];
  return [];
}
