#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = 'src/data/blog';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.isFile() && full.endsWith('.md')) files.push(full);
  }
  return files;
}

function extractFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  return m[1];
}

async function validateFile(file) {
  const content = await fs.readFile(file, 'utf8');
  const fm = extractFrontmatter(content);
  if (!fm) return { file, ok: false, error: 'no frontmatter' };
  try {
    yaml.load(fm);
    return { file, ok: true };
  } catch (e) {
    return { file, ok: false, error: e.message };
  }
}

async function main() {
  const root = path.resolve(process.cwd(), ROOT);
  try {
    const files = await walk(root);
    const results = [];
    for (const f of files) {
      try {
        const r = await validateFile(f);
        if (!r.ok) results.push(r);
      } catch (err) {
        results.push({ file: f, ok: false, error: String(err) });
      }
    }
    if (results.length === 0) {
      console.log('All frontmatter parsed successfully.');
      process.exit(0);
    }
    console.log(`Found ${results.length} problematic files:\n`);
    for (const r of results) {
      console.log('FILE:', r.file);
      console.log('ERROR:', r.error);
      console.log('---\n');
    }
    process.exit(2);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
