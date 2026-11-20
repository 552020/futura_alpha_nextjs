import Link from 'next/link';
import { deskDocs } from '@/lib/desk';

export default function Desk() {
  const docs = deskDocs();
  const groups = [...new Set(docs.map((d) => d.group))];
  return (
    <main className="px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold">Desk</h1>
      <p className="mt-2 text-black/60">
        Futura&apos;s working material: where the project stands, how it is
        built, and the analysis behind decisions. Admins only, not linked from
        the site.
      </p>
      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="text-lg font-semibold">{g}</h2>
            <ul className="mt-2 space-y-1">
              {docs
                .filter((d) => d.group === g)
                .map((d) => (
                  <li key={d.path}>
                    <Link className="underline" href={`/desk/${d.path}`}>
                      {d.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
