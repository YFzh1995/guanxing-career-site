#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = 'src/data/blog';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.isFile()) files.push(full);
  }
  return files;
}

function normalizeName(name) {
  return name.replace(/\?/g, '-');
}

async function main() {
  const root = path.resolve(process.cwd(), ROOT);
  const files = await walk(root);
  let changed = 0;
  for (const f of files) {
    const base = path.basename(f);
    if (base.includes('?')) {
      const dir = path.dirname(f);
      const newBase = normalizeName(base);
      const newPath = path.join(dir, newBase);
      try {
        await fs.rename(f, newPath);
        console.log(`Renamed: ${f} -> ${newPath}`);
        changed++;
      } catch (err) {
        console.error(`Failed to rename ${f}: ${err.message}`);
      }
    }
  }
  console.log(`Done. Renamed ${changed} files.`);
}

main().catch(e => { console.error(e); process.exit(1); });
