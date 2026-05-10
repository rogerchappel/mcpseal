import type { Finding, ScanReport } from './types.js';

export function renderJson(report: ScanReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderMarkdown(report: ScanReport): string {
  const lines: string[] = [];
  lines.push('# MCPSeal report', '');
  lines.push(`- Tool: ${report.tool} ${report.version}`);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Targets: ${report.targets.length}`);
  lines.push(`- Findings: ${report.summary.findings}`);
  lines.push(`- Failed gates: ${report.summary.failedGates.length > 0 ? report.summary.failedGates.join(', ') : 'none'}`);
  lines.push('', '## Targets', '');
  for (const target of report.targets) lines.push(`- \`${target.path}\` — ${target.serverCount} server(s)`);
  lines.push('', '## Summary by severity', '');
  for (const [severity, count] of Object.entries(report.summary.bySeverity)) lines.push(`- ${severity}: ${count}`);
  lines.push('', '## Summary by category', '');
  for (const [category, count] of Object.entries(report.summary.byCategory)) lines.push(`- ${category}: ${count}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) lines.push(...renderFinding(finding));
  }
  return `${lines.join('\n')}\n`;
}

function renderFinding(finding: Finding): string[] {
  const lines = [
    `### ${finding.title}`,
    '',
    `- ID: \`${finding.id}\``,
    `- Category: ${finding.category}`,
    `- Severity: ${finding.severity}`,
    `- Path: \`${finding.path}\``,
    `- Message: ${finding.message}`
  ];
  if (finding.evidence) lines.push(`- Evidence: \`${escapeBackticks(finding.evidence)}\``);
  lines.push(`- Recommendation: ${finding.recommendation}`, '');
  return lines;
}

function escapeBackticks(input: string): string {
  return input.replace(/`/g, '\\`');
}
