import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getPostSlugs, createAuthorSlug } from '../utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type JournalPostPageProps = {
  params: Promise<{
    lang: string;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  const languages = ['en', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'tr', 'zh'];

  return slugs.flatMap((slug) =>
    languages.map((lang) => ({
      lang,
      slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: JournalPostPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.excerpt || post.title,
  };
}

export default async function JournalPostPage({
  params,
}: JournalPostPageProps) {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);

  if (!post || !post.published) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/${resolvedParams.lang}/journal`}
          className="text-primary hover:underline text-sm mb-6 inline-block"
        >
          ← Back to Journal
        </Link>
        <article>
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
            {post.subtitle && (
              <p className="text-xl text-muted-foreground mb-4">
                {post.subtitle}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <time dateTime={post.date}>
                {format(new Date(post.date), 'MMMM d, yyyy')}
              </time>
              <span>•</span>
              <div className="flex items-center gap-1">
                {post.author.map((author, index) => (
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
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
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
          </header>

          <div
            className="max-w-none text-base leading-7 [&_p]:my-4 [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 [&_hr]:my-8 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-8 [&_h3]:mb-3 [&_h4]:text-xl [&_h4]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2 [&>*:first-child]:mt-0 [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:my-6 [&_blockquote]:italic [&_code]:text-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:my-6 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_img]:my-6 [&_img]:rounded-xl [&_sup]:scroll-mt-20 [&_section[data-footnotes]]:text-sm [&_section[data-footnotes]]:mt-12 [&_section[data-footnotes]]:pt-8 [&_section[data-footnotes]]:border-t [&_section[data-footnotes]_ol]:list-decimal [&_section[data-footnotes]_ol]:ml-6 [&_section[data-footnotes]_ol]:pl-2 [&_section[data-footnotes]_li]:scroll-mt-20"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </article>
      </div>
    </div>
  );
}
