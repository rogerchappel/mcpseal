import { extractServers } from './extract.js';
import { analyzeServer } from './rules.js';
import { categories, severities, type Finding, type FindingCategory, type ScanOptions, type ScanReport, type ScanTarget, type Severity } from './types.js';

export const VERSION = '0.1.0';
export const STABLE_GENERATED_AT = '1970-01-01T00:00:00.000Z';

export function scanTargets(targets: ScanTarget[], options: ScanOptions): ScanReport {
  const findings: Finding[] = [];
  const targetSummaries: ScanReport['targets'] = [];
  for (const target of targets) {
    if (isParseError(target.parsed)) {
      findings.push({
        id: `config-shape-${slug(target.label)}-invalid-json`,
        category: 'config-shape',
        severity: 'critical',
        title: 'Invalid JSON',
        message: `Could not parse ${target.label} as JSON: ${String(target.parsed.__mcpsealParseError)}`,
        path: `${target.label}#`,
        recommendation: 'Fix JSON syntax before connecting an agent to this config.'
      });
      targetSummaries.push({ path: target.label, serverCount: 0 });
      continue;
    }
    const servers = extractServers(target.parsed);
    targetSummaries.push({ path: target.label, serverCount: servers.length });
    if (servers.length === 0) {
      findings.push({
        id: `config-shape-${slug(target.label)}-no-servers`,
        category: 'config-shape',
        severity: 'medium',
        title: 'No MCP servers found',
        message: `${target.label} does not contain a recognizable mcpServers/servers object or array.`,
        path: `${target.label}#`,
        recommendation: 'Check that the input is an MCP config or point mcpseal at a file containing server definitions.'
      });
    }
    servers.forEach((server, index) => findings.push(...analyzeServer(server, target.label, index, options.redact)));
  }
  findings.sort(compareFindings);
  const failedGates = categories.filter((category) => options.failOn.includes(category) && findings.some((finding) => finding.category === category));
  return {
    tool: 'mcpseal',
    version: VERSION,
    generatedAt: STABLE_GENERATED_AT,
    targets: targetSummaries.sort((a, b) => a.path.localeCompare(b.path)),
    summary: {
      findings: findings.length,
      bySeverity: countBy(severities, findings.map((finding) => finding.severity)),
      byCategory: countBy(categories, findings.map((finding) => finding.category)),
      failedGates
    },
    findings
  };
}

function isParseError(value: unknown): value is { __mcpsealParseError: string } {
  return typeof value === 'object' && value !== null && '__mcpsealParseError' in value;
}

function countBy<T extends string>(keys: readonly T[], values: T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, values.filter((value) => value === key).length])) as Record<T, number>;
}

function compareFindings(a: Finding, b: Finding): number {
  return a.path.localeCompare(b.path) || a.category.localeCompare(b.category) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parseFailOn(input: string | undefined): FindingCategory[] {
  if (!input) return [];
  const values = input.split(',').map((item) => item.trim()).filter(Boolean);
  const invalid = values.filter((value) => !categories.includes(value as FindingCategory));
  if (invalid.length > 0) throw new Error(`Unknown --fail-on categories: ${invalid.join(', ')}. Valid: ${categories.join(', ')}`);
  return values as FindingCategory[];
}
