import fs from "fs/promises";
import path from "path";

const ATTACH_ROOT = "/Users/zhangyangfan/Desktop/GXG/自媒体创作/website-articles";
const DEST_ROOT = "src/data/blog";

function stripCategoryPrefix(name) {
  return name.replace(/^[\d\-\._\s]+/, "").trim();
}

function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return { fm: null, body: content };
  const fmRaw = fmMatch[1];
  const body = content.slice(fmMatch[0].length);
  const lines = fmRaw.split(/\r?\n/);
  const fm = {};
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      let val = keyMatch[2].trim();
      if (key === "tags") {
        const tags = [];
        i++;
        while (i < lines.length && lines[i].trim().startsWith("-")) {
          tags.push(lines[i].replace(/^-+\s*/, "").trim().replace(/^"|"$/g, ""));
          i++;
        }
        fm.tags = tags;
        continue;
      }
      if (val === "" && i + 1 < lines.length && lines[i + 1].startsWith("  -")) {
        // fallback for tags written on next lines
        i++;
        continue;
      }
      // strip surrounding quotes
      val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      fm[key] = val;
      i++;
    } else {
      i++;
    }
  }
  return { fm, body };
}

function toIsoDate(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return `${val}T00:00:00Z`;
  if (/^\d{8}$/.test(val)) return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6)}T00:00:00Z`;
  const parsed = new Date(val);
  if (!isNaN(parsed)) return parsed.toISOString();
  return val;
}

function yamlSafeString(s) {
  if (s == null) return "";
  const esc = String(s).replace(/"/g, "\\\"").replace(/\\/g, "\\\\");
  return `"${esc}"`;
}

function buildFrontmatter(obj) {
  const lines = ["---"];
  if (obj.title) lines.push(`title: ${yamlSafeString(obj.title)}`);
  if (obj.author) lines.push(`author: ${yamlSafeString(obj.author)}`);
  if (obj.pubDatetime) lines.push(`pubDatetime: ${obj.pubDatetime}`);
  if (obj.modDatetime) lines.push(`modDatetime: ${obj.modDatetime}`);
  if (obj.slug) lines.push(`slug: ${yamlSafeString(obj.slug)}`);
  if (typeof obj.featured !== "undefined") lines.push(`featured: ${obj.featured}`);
  if (typeof obj.draft !== "undefined") lines.push(`draft: ${obj.draft}`);
  if (Array.isArray(obj.tags)) {
    lines.push(`tags:`);
    for (const t of obj.tags) lines.push(`  - ${yamlSafeString(t)}`);
  }
  if (obj.ogImage) lines.push(`ogImage: ${yamlSafeString(obj.ogImage)}`);
  if (obj.description) lines.push(`description: ${yamlSafeString(obj.description)}`);
  if (obj.canonicalURL) lines.push(`canonicalURL: ${yamlSafeString(obj.canonicalURL)}`);
  if (typeof obj.hideEditPost !== "undefined") lines.push(`hideEditPost: ${obj.hideEditPost}`);
  if (obj.timezone) lines.push(`timezone: ${yamlSafeString(obj.timezone)}`);
  lines.push("---\n");
  return lines.join("\n");
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function getFirstParagraph(body) {
  const parts = body.split(/\n\s*\n/);
  if (parts.length === 0) return "";
  return parts[0].replace(/\n+/g, " ").trim();
}

async function processFile(srcPath, destDir, categoryName) {
  const content = await fs.readFile(srcPath, "utf8");
  const { fm, body } = parseFrontmatter(content);
  const out = {};
  if (fm) {
    out.title = fm.title || fm.slug || path.basename(srcPath, path.extname(srcPath));
    out.author = fm.author || undefined;
    if (fm.pubDatetime) {
      out.pubDatetime = toIsoDate(fm.pubDatetime);
    } else if (fm.date) {
      out.pubDatetime = toIsoDate(fm.date);
    }
    if (fm.modDatetime) out.modDatetime = toIsoDate(fm.modDatetime);
    if (fm.slug) out.slug = fm.slug;
    if (typeof fm.featured !== "undefined") out.featured = fm.featured;
    if (typeof fm.draft !== "undefined") out.draft = fm.draft;
    out.tags = Array.isArray(fm.tags) ? fm.tags.slice() : [];
    if (fm.description) out.description = fm.description;
    if (fm.category) {
      if (!out.tags.includes(fm.category)) out.tags.push(fm.category);
    }
  } else {
    const fname = path.basename(srcPath, path.extname(srcPath));
    const maybeTitle = fname.replace(/^\d{4}-?\d{2}-?\d{2}-?/, "").replace(/^\d{8}-?/, "").replace(/_/g, " ");
    out.title = maybeTitle;
    out.pubDatetime = null;
    out.tags = [];
    out.description = undefined;
  }
  if (!out.pubDatetime) {
    const fname = path.basename(srcPath, path.extname(srcPath));
    const dateMatch = fname.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateMatch2 = fname.match(/^(\d{8})/);
    if (dateMatch) out.pubDatetime = toIsoDate(dateMatch[1]);
    else if (dateMatch2) out.pubDatetime = toIsoDate(dateMatch2[1]);
    else {
      const stats = await fs.stat(srcPath);
      out.pubDatetime = new Date(stats.mtime).toISOString();
    }
  }
  if (!out.tags.includes(categoryName)) out.tags.push(categoryName);
  if (!out.description) {
    out.description = await getFirstParagraph(body);
  }
  // remove category key from frontmatter (we converted it into tag)
  const finalFM = buildFrontmatter(out);
  const outContent = finalFM + body;
  await ensureDir(destDir);
  const destPath = path.join(destDir, path.basename(srcPath));
  await fs.writeFile(destPath, outContent, "utf8");
  return destPath;
}

async function main() {
  const entries = await fs.readdir(ATTACH_ROOT, { withFileTypes: true });
  const processed = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const rawName = entry.name;
    const categoryName = stripCategoryPrefix(rawName);
    const srcDir = path.join(ATTACH_ROOT, rawName);
    const destDir = path.join(DEST_ROOT, categoryName);
    await ensureDir(destDir);
    const files = await fs.readdir(srcDir);
    for (const f of files) {
      if (!f.toLowerCase().endsWith('.md')) continue;
      const srcPath = path.join(srcDir, f);
      try {
        const wrote = await processFile(srcPath, destDir, categoryName);
        processed.push(wrote);
        console.log(`Imported ${srcPath} -> ${wrote}`);
      } catch (e) {
        console.error(`Failed to import ${srcPath}:`, e);
      }
    }
  }
  console.log(`Imported ${processed.length} files.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
