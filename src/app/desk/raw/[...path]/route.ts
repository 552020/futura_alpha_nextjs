import { deskDoc } from '@/lib/desk';
import { deskAccess } from '@/lib/desk-auth';

// The markdown source of a desk document, for downloading. Route handlers do
// not pass through the desk layout, so access is checked here too.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if ((await deskAccess()) !== 'admin') {
    return new Response('Not found', { status: 404 });
  }
  const p = (await params).path.join('/').replace(/\.md$/, '');
  const doc = deskDoc(p);
  if (!doc) return new Response('Not found', { status: 404 });
  return new Response(doc.raw, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
