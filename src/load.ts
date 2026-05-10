import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ScanTarget } from './types.js';

const jsonish = new Set(['.json', '.mcp', '.code-workspace']);

export async function loadTargets(inputs: string[]): Promise<ScanTarget[]> {
  const files = (await Promise.all(inputs.map((input) => expandInput(path.resolve(input))))).flat();
  const unique = [...new Set(files)].sort();
  const targets: ScanTarget[] = [];
  for (const file of unique) {
    const raw = await readFile(file, 'utf8');
    try {
      targets.push({ label: path.relative(process.cwd(), file) || file, absolutePath: file, raw, parsed: JSON.parse(raw) });
    } catch (error) {
      targets.push({ label: path.relative(process.cwd(), file) || file, absolutePath: file, raw, parsed: { __mcpsealParseError: error instanceof Error ? error.message : 'Invalid JSON' } });
    }
  }
  return targets;
}

async function expandInput(input: string): Promise<string[]> {
  const info = await stat(input);
  if (info.isDirectory()) return walk(input);
  return [input];
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      files.push(...await walk(full));
    } else if (entry.isFile() && jsonish.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}
