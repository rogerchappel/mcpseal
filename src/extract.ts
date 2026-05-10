import type { McpServer } from './types.js';

export function extractServers(config: unknown): McpServer[] {
  if (!isRecord(config)) return [];
  const candidates = [config.mcpServers, config.servers, config.mcp?.servers, config.experimental?.mcpServers];
  for (const candidate of candidates) {
    const servers = normalizeServers(candidate);
    if (servers.length > 0) return servers;
  }
  return [];
}

function normalizeServers(value: unknown): McpServer[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord).map((server, index) => ({ ...server, name: String(server.name ?? `server-${index + 1}`) }));
  }
  if (isRecord(value)) {
    return Object.entries(value).filter(([, server]) => isRecord(server)).map(([name, server]) => ({ ...server, name }));
  }
  return [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') return [value];
  return [];
}
