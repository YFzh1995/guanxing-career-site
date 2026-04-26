#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

const ROOT = "src/data/blog";

function cleanTagLine(line) {
  const m = line.match(/^(\s*-\s*)(["']?)(.*?)(\2)?\s*$/);
  if (!m) return line;
  const indentHyphen = m[1];
  let tag = m[3];
  tag = tag.replace(/^[\-\u2013\u2014\–\s]+/, "").trim();
  tag = tag.replace(/"/g, '\\"');
  return indentHyphen + '"' + tag + '"';
}

async function processFile(file) {
  const content = await fs.readFile(file, "utf8");
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const m = content.match(fmRegex);
  if (!m) return false;
  const fmRaw = m[1];
  const rest = content.slice(m[0].length);
  const lines = fmRaw.split(/\r?\n/);
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("tags:")) {
      let j = i + 1;
      while (j < lines.length && /^\s*-\s*/.test(lines[j])) {
        const old = lines[j];
        const nw = cleanTagLine(old);
        if (nw !== old) {
          lines[j] = nw;
          changed = true;
        } else {
          // still replace to ensure consistent quoting
          lines[j] = nw;
        }
        j++;
      }
      break;
    }
  }
  if (!changed) return false;
  const newFm = lines.join("\n");
  const newContent = `---\n${newFm}\n---\n${rest}`;
  await fs.copyFile(file, `${file}.bak`);
  await fs.writeFile(file, newContent, "utf8");
  return true;
}

async function walk(dir) {
  let modified = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      modified += await walk(full);
    } else if (e.isFile() && full.endsWith('.md')) {
      try {
        const ok = await processFile(full);
        if (ok) {
          console.log('Modified', full);
          modified++;
        }
      } catch (err) {
        console.error('Error processing', full, err.message);
      }
    }
  }
  return modified;
}

async function main() {
  const root = path.resolve(process.cwd(), ROOT);
  try {
    const n = await walk(root);
    console.log(`Modified ${n} files.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
