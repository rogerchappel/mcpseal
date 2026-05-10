#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadTargets } from './load.js';
import { renderJson, renderMarkdown } from './render.js';
import { parseFailOn, scanTargets, VERSION } from './scan.js';

type Command = 'scan' | 'check';
type CliOptions = {
  command: Command;
  inputs: string[];
  out?: string;
  format: 'markdown' | 'json';
  redact: boolean;
  failOn?: string;
};

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const options = parseArgs(argv);
    const failOn = parseFailOn(options.failOn);
    const targets = await loadTargets(options.inputs);
    const report = scanTargets(targets, { redact: options.redact, failOn });
    const rendered = options.format === 'json' ? renderJson(report) : renderMarkdown(report);
    if (options.out) {
      await mkdir(path.dirname(path.resolve(options.out)), { recursive: true });
      await writeFile(options.out, rendered, 'utf8');
    } else {
      process.stdout.write(rendered);
    }
    return report.summary.failedGates.length > 0 ? 2 : 0;
  } catch (error) {
    process.stderr.write(`mcpseal: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(helpText()); process.exit(0); }
  if (argv.includes('--version') || argv.includes('-v')) { process.stdout.write(`${VERSION}\n`); process.exit(0); }
  const [commandRaw, ...rest] = argv;
  if (commandRaw !== 'scan' && commandRaw !== 'check') throw new Error(helpText());
  const options: CliOptions = { command: commandRaw, inputs: [], format: commandRaw === 'check' ? 'json' : 'markdown', redact: true };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--out') options.out = requireValue(rest, ++i, '--out');
    else if (arg === '--format') options.format = parseFormat(requireValue(rest, ++i, '--format'));
    else if (arg === '--json') options.format = 'json';
    else if (arg === '--markdown') options.format = 'markdown';
    else if (arg === '--redact') options.redact = true;
    else if (arg === '--no-redact') options.redact = false;
    else if (arg === '--fail-on') options.failOn = requireValue(rest, ++i, '--fail-on');
    else if (arg.startsWith('--fail-on=')) options.failOn = arg.slice('--fail-on='.length);
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else options.inputs.push(arg);
  }
  if (options.inputs.length === 0) throw new Error('Provide at least one MCP config file or directory.');
  return options;
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseFormat(value: string): 'markdown' | 'json' {
  if (value === 'markdown' || value === 'json') return value;
  throw new Error('--format must be markdown or json.');
}

function helpText(): string {
  return `mcpseal ${VERSION}\n\nUsage:\n  mcpseal scan <file-or-dir...> [--out report.md] [--format markdown|json] [--fail-on categories]\n  mcpseal check <file-or-dir...> --fail-on secret-env,broad-fs\n\nCategories: risky-command, secret-env, broad-fs, tool-description, config-shape\nDefaults: markdown for scan, json for check, redaction enabled.\n`;
}


if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
