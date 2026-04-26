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
  return { fm: m[1], rest: content.slice(m[0].length) };
}

function tryParse(fmRaw) {
  try {
    yaml.load(fmRaw);
    return true;
  } catch (e) {
    return false;
  }
}

function fixDescriptionBlock(fmRaw) {
  const lines = fmRaw.split(/\r?\n/);
  const idx = lines.findIndex(l => /^\s*description\s*:/i.test(l));
  if (idx === -1) return null;
  const line = lines[idx];
  const m = line.match(/^\s*description\s*:\s*(["'])(.*)\1\s*$/);
  if (!m) return null;
  const desc = m[2];
  const descLines = desc.split(/\\r?\\n/);
  const block = ['description: |', ...descLines.map(l => '  ' + l)];
  const newLines = [...lines.slice(0, idx), ...block, ...lines.slice(idx + 1)];
  return newLines.join('\n');
}

async function processFile(file) {
  const content = await fs.readFile(file, 'utf8');
  const ex = extractFrontmatter(content);
  if (!ex) return { file, fixed: false, reason: 'no frontmatter' };
  if (tryParse(ex.fm)) return { file, fixed: false, reason: 'parsed fine' };
  const attempt = fixDescriptionBlock(ex.fm);
  if (!attempt) return { file, fixed: false, reason: 'no description pattern or multi-line' };
  if (!tryParse(attempt)) return { file, fixed: false, reason: 'attempt failed to parse' };
  const newContent = `---\n${attempt}\n---\n${ex.rest}`;
  await fs.copyFile(file, `${file}.bak`);
  await fs.writeFile(file, newContent, 'utf8');
  return { file, fixed: true };
}

async function main() {
  const root = path.resolve(process.cwd(), ROOT);
  const files = await walk(root);
  const results = [];
  for (const f of files) {
    try {
      const r = await processFile(f);
      if (r.fixed) console.log('Fixed:', f);
      else if (r.reason && r.reason !== 'parsed fine') console.log('Skipped:', f, r.reason);
      results.push(r);
    } catch (err) {
      console.error('Error processing', f, String(err));
    }
  }
  const fixedCount = results.filter(r => r.fixed).length;
  console.log(`Done. Fixed ${fixedCount} files.`);
}

main().catch(err => { console.error(err); process.exit(1); });
