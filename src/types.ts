export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type FindingCategory =
  | 'risky-command'
  | 'secret-env'
  | 'broad-fs'
  | 'tool-description'
  | 'config-shape';

export type Finding = {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  message: string;
  path: string;
  evidence?: string;
  recommendation: string;
};

export type McpServer = {
  name: string;
  command?: unknown;
  args?: unknown;
  env?: unknown;
  tools?: unknown;
  [key: string]: unknown;
};

export type ScanTarget = {
  label: string;
  absolutePath: string;
  raw: string;
  parsed: unknown;
};

export type ScanOptions = {
  redact: boolean;
  failOn: FindingCategory[];
};

export type ScanReport = {
  tool: 'mcpseal';
  version: string;
  generatedAt: string;
  targets: Array<{
    path: string;
    serverCount: number;
  }>;
  summary: {
    findings: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<FindingCategory, number>;
    failedGates: FindingCategory[];
  };
  findings: Finding[];
};

export const severities: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];

export const categories: FindingCategory[] = [
  'risky-command',
  'secret-env',
  'broad-fs',
  'tool-description',
  'config-shape'
];
