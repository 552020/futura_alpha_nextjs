import { getDictionary } from '@/utils/dictionaries';
import { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, createAuthorSlug } from './utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type JournalPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

export async function generateMetadata({
  params,
}: JournalPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang);

  return {
    title: dict.nav?.journal || 'Journal',
    description: 'Lorem Ipsum',
  };
}

export default async function JournalPage({ params }: JournalPageProps) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang);
  const posts = await getAllPosts();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          {dict.nav?.journal || 'Journal'}
        </h1>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No journal entries yet.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="border-b border-border pb-8 last:border-b-0"
              >
                <Link
                  href={`/${resolvedParams.lang}/journal/${post.slug}`}
                  className="block group"
                >
                  <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <time dateTime={post.date}>
                    {format(new Date(post.date), 'MMMM d, yyyy')}
                  </time>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    {post.author
                      .filter((author) => author && author.trim().length > 0)
                      .map((author, index) => (
                        <span key={author} className="flex items-center gap-1">
                          {index > 0 && <span>&</span>}
                          <Link
                            href={`/${resolvedParams.lang}/journal/author/${createAuthorSlug(author)}`}
                            className="hover:text-primary hover:underline"
                          >
                            {author}
                          </Link>
                        </span>
                      ))}
                  </div>
                </div>
                {post.excerpt && (
                  <Link
                    href={`/${resolvedParams.lang}/journal/${post.slug}`}
                    className="block"
                  >
                    <p className="mt-4 text-muted-foreground">{post.excerpt}</p>
                  </Link>
                )}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
