// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deskDoc, deskDocs, renderDeskMarkdown } from '@/lib/desk';

describe('desk documents', () => {
  it('lists docs/desk pages with group and title from the file', () => {
    const docs = deskDocs();
    const stand = docs.find((d) => d.path === 'stand');
    expect(stand?.group).toBe('Analysis');
    expect(stand?.title).toMatch(/where it stands/i);
    expect(docs.find((d) => d.path === 'architecture')?.group).toBe(
      'Architecture'
    );
  });

  it('drops the group comment and the leading title from the body', () => {
    const doc = deskDoc('stand');
    expect(doc?.body.startsWith('<!--')).toBe(false);
    expect(doc?.body).not.toMatch(/^\s*# /);
    expect(doc?.raw.startsWith('<!-- desk: Analysis -->')).toBe(true);
  });

  it('refuses paths outside docs/desk', () => {
    expect(deskDoc('../README')).toBeNull();
    expect(deskDoc('stand/../../auth')).toBeNull();
    expect(deskDoc('does-not-exist')).toBeNull();
  });

  it('renders tables and keeps inline HTML such as the drawing', async () => {
    const html = await renderDeskMarkdown(
      '| a | b |\n| --- | --- |\n| 1 | 2 |\n\n<img src="/diagrams/futura-running.png" alt="x" />'
    );
    expect(html).toContain('<table>');
    expect(html).toContain('<img src="/diagrams/futura-running.png"');
  });
});
