import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostsByAuthor, decodeAuthorSlug, getAllAuthors } from '../../utils';
import { format } from 'date-fns';

type AuthorPageProps = {
  params: Promise<{
    lang: string;
    author: string;
  }>;
};

export async function generateStaticParams() {
  const authors = await getAllAuthors();
  const languages = ['en', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'tr', 'zh'];

  return authors.flatMap((author) => {
    const authorSlug = encodeURIComponent(author.toLowerCase().trim());
    return languages.map((lang) => ({
      lang,
      author: authorSlug,
    }));
  });
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const authorSlug = decodeAuthorSlug(resolvedParams.author);
  const posts = await getPostsByAuthor(authorSlug);

  if (posts.length === 0) {
    return {
      title: 'Author Not Found',
    };
  }

  // Get the proper author name with correct capitalization from the first post
  const properAuthorName =
    posts[0].author.find(
      (author) => author.toLowerCase() === authorSlug.toLowerCase()
    ) || authorSlug;

  return {
    title: `${properAuthorName} - Journal`,
    description: `Journal entries by ${properAuthorName}`,
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const resolvedParams = await params;
  const authorSlug = decodeAuthorSlug(resolvedParams.author);
  const posts = await getPostsByAuthor(authorSlug);

  if (posts.length === 0) {
    notFound();
  }

  // Get the proper author name with correct capitalization from the first post
  const properAuthorName =
    posts[0].author.find(
      (author) => author.toLowerCase() === authorSlug.toLowerCase()
    ) || authorSlug;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/${resolvedParams.lang}/journal`}
            className="text-primary hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Journal
          </Link>
          <h1 className="text-4xl font-bold mb-6">
            Posts by {properAuthorName}
          </h1>

          <div className="prose dark:prose-invert max-w-none mb-8">
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur.
            </p>
          </div>
        </div>

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
                <time
                  dateTime={post.date}
                  className="text-sm text-muted-foreground"
                >
                  {format(new Date(post.date), 'MMMM d, yyyy')}
                </time>
                {post.excerpt && (
                  <p className="mt-4 text-muted-foreground">{post.excerpt}</p>
                )}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
