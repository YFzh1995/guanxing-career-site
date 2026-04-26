#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = 'src/data/blog';

function toIsoDate(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return `${val}T00:00:00Z`;
  if (/^\d{8}$/.test(val)) return `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6)}T00:00:00Z`;
  const d = new Date(val);
  if (!isNaN(d)) return d.toISOString();
  return null;
}

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

async function processFile(file) {
  const content = await fs.readFile(file, 'utf8');
  const ex = extractFrontmatter(content);
  if (!ex) return { file, changed: false, reason: 'no frontmatter' };
  const lines = ex.fm.split(/\r?\n/);
  const idx = lines.findIndex(l => /^\s*pubDatetime\s*:/i.test(l));
  if (idx === -1) {
    // insert pubDatetime based on filename or mtime
    const fname = path.basename(file, path.extname(file));
    const dateMatch = fname.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateMatch2 = fname.match(/^(\d{8})/);
    let iso = null;
    if (dateMatch) iso = toIsoDate(dateMatch[1]);
    else if (dateMatch2) iso = toIsoDate(dateMatch2[1]);
    if (!iso) {
      const st = await fs.stat(file);
      iso = new Date(st.mtime).toISOString();
    }
    lines.splice(2, 0, `pubDatetime: ${iso}`); // put after title/author area - best-effort
    const newFm = lines.join('\n');
    const newContent = `---\n${newFm}\n---\n${ex.rest}`;
    await fs.copyFile(file, `${file}.bak2`);
    await fs.writeFile(file, newContent, 'utf8');
    return { file, changed: true, reason: 'inserted pubDatetime' };
  }
  // found pubDatetime line
  const line = lines[idx];
  const m = line.match(/^\s*pubDatetime\s*:\s*(.*)$/);
  if (!m) return { file, changed: false, reason: 'no-match' };
  let val = m[1].trim();
  // remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  const iso = toIsoDate(val);
  if (!iso) {
    // try from filename
    const fname = path.basename(file, path.extname(file));
    const dateMatch = fname.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateMatch2 = fname.match(/^(\d{8})/);
    let iso2 = null;
    if (dateMatch) iso2 = toIsoDate(dateMatch[1]);
    else if (dateMatch2) iso2 = toIsoDate(dateMatch2[1]);
    if (!iso2) {
      const st = await fs.stat(file);
      iso2 = new Date(st.mtime).toISOString();
    }
    lines[idx] = `pubDatetime: ${iso2}`;
    const newFm = lines.join('\n');
    const newContent = `---\n${newFm}\n---\n${ex.rest}`;
    await fs.copyFile(file, `${file}.bak3`);
    await fs.writeFile(file, newContent, 'utf8');
    return { file, changed: true, reason: 'replaced with filename/mtime' };
  }
  // If iso found but quoted previously, ensure unquoted iso
  if (val !== iso) {
    lines[idx] = `pubDatetime: ${iso}`;
    const newFm = lines.join('\n');
    const newContent = `---\n${newFm}\n---\n${ex.rest}`;
    await fs.copyFile(file, `${file}.bak3`);
    await fs.writeFile(file, newContent, 'utf8');
    return { file, changed: true, reason: 'normalized iso' };
  }
  // if val === iso but was quoted, ensure unquoted
  if (m[1].trim().startsWith('"') || m[1].trim().startsWith("'")) {
    lines[idx] = `pubDatetime: ${iso}`;
    const newFm = lines.join('\n');
    const newContent = `---\n${newFm}\n---\n${ex.rest}`;
    await fs.copyFile(file, `${file}.bak3`);
    await fs.writeFile(file, newContent, 'utf8');
    return { file, changed: true, reason: 'removed quotes' };
  }
  return { file, changed: false, reason: 'ok' };
}

async function main() {
  const root = path.resolve(process.cwd(), ROOT);
  const files = await walk(root);
  const results = [];
  for (const f of files) {
    try {
      const r = await processFile(f);
      if (r.changed) console.log('Fixed pubDatetime:', f, r.reason);
      results.push(r);
    } catch (err) {
      console.error('Err', f, String(err));
    }
  }
  const n = results.filter(r => r.changed).length;
  console.log(`Done. Changed ${n} files.`);
}

main().catch(err => { console.error(err); process.exit(1); });
