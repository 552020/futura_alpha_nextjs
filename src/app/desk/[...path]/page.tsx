import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deskDoc, renderDeskMarkdown } from '@/lib/desk';
import Copy from './Copy';

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = deskDoc((await params).path.join('/'));
  return { title: doc?.title };
}

export default async function DeskPage({ params }: Props) {
  const doc = deskDoc((await params).path.join('/'));
  if (!doc) notFound();
  const html = await renderDeskMarkdown(doc.body);
  return (
    <main className="px-4 py-10 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/50">
            <Link className="underline" href="/desk">
              Desk
            </Link>{' '}
            · {doc.group}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{doc.title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={`/desk/raw/${doc.path}.md`}
            download
            aria-label="Download"
            title="Download"
            className="p-1 text-black/35 hover:text-black/70"
          >
            <svg
              viewBox="0 0 16 16"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              aria-hidden="true"
            >
              <path d="M8 2.5v8M4.5 7l3.5 3.5L11.5 7M3 13.5h10" />
            </svg>
          </a>
          <Copy text={doc.raw} />
        </div>
      </div>
      <div
        className="desk-prose mt-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
