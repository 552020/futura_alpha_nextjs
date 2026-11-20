import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

// The desk: Futura's working material (analysis, architecture, decisions),
// read from docs/desk/*.md. A document's group comes from its first line
// `<!-- desk: Group -->`, its title from the first heading. Same mechanism as
// the other desks (fkws, deloop, ...): see docs/desk-pages.md and docs/desk-login.md in fotokotti/fkws.
export type DeskDoc = { path: string; title: string; group: string };

const DESK_DIR = path.join(process.cwd(), 'docs', 'desk');
const DEFAULT_GROUP = 'Notes';

const titleOf = (raw: string, fallback: string) =>
  (raw.match(/^#\s+(.*)$/m)?.[1] ?? fallback).replace(/\*/g, '');
const groupOf = (raw: string) =>
  raw.match(/^\s*<!--\s*desk:\s*(.+?)\s*-->/)?.[1] ?? DEFAULT_GROUP;

export function deskDocs(): DeskDoc[] {
  let files: string[];
  try {
    files = readdirSync(DESK_DIR);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const raw = readFileSync(path.join(DESK_DIR, f), 'utf8');
      const slug = f.replace(/\.md$/, '');
      return { path: slug, group: groupOf(raw), title: titleOf(raw, slug) };
    });
}

export function deskDoc(p: string) {
  if (!/^[a-z0-9-]+$/i.test(p)) return null; // flat folder, no path traversal
  const doc = deskDocs().find((d) => d.path === p);
  if (!doc) return null;
  const raw = readFileSync(path.join(DESK_DIR, `${p}.md`), 'utf8');
  // the page shows the title itself: drop the group comment and a leading "# title"
  const body = raw
    .replace(/^\s*<!--\s*desk:[^>]*-->\s*\n/, '')
    .replace(/^\s*#\s+.*\n/, '');
  return { ...doc, raw, body };
}

// Desk documents are our own files, so inline HTML (e.g. the architecture
// drawing) is kept.
export async function renderDeskMarkdown(md: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(file);
}
