import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'src/app/[lang]/journal/posts');

export interface JournalPost {
    slug: string;
    title: string;
    date: string;
    author: string[];
    tags?: string[];
    excerpt?: string;
    published: boolean;
    content: string;
    contentHtml: string;
}

export function getPostSlugs(): string[] {
    if (!fs.existsSync(postsDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.replace(/\.md$/, ''));
}

export async function getPostBySlug(slug: string): Promise<JournalPost | null> {
    const fullPath = path.join(postsDirectory, `${slug}.md`);

    if (!fs.existsSync(fullPath)) {
        return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    let contentHtml = '';
    try {
        const processedContent = await remark()
            .use(remarkHtml)
            .process(content);

        // VFile result has a 'value' property with the HTML string
        contentHtml = processedContent.value
            ? String(processedContent.value)
            : String(processedContent);

        // Remove the first h1 tag since we're already displaying the title from frontmatter
        contentHtml = contentHtml.replace(/<h1[^>]*>.*?<\/h1>\s*/i, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
        // Fallback to plain text if markdown processing fails
        contentHtml = content;
    }

    // Handle author as array or string (for backward compatibility)
    let authors: string[] = [];
    if (Array.isArray(data.author)) {
        authors = data.author;
    } else if (typeof data.author === 'string' && data.author) {
        // Backward compatibility: parse string format
        authors = [data.author];
    }

    // Handle tags as array
    let tags: string[] = [];
    if (Array.isArray(data.tags)) {
        tags = data.tags;
    } else if (typeof data.tags === 'string' && data.tags) {
        // Backward compatibility: parse string format
        tags = [data.tags];
    }

    return {
        slug,
        title: data.title || slug,
        date: data.date || '',
        author: authors,
        tags: tags.length > 0 ? tags : undefined,
        excerpt: data.excerpt || '',
        published: data.published ?? true,
        content,
        contentHtml,
    };
}

export async function getAllPosts(): Promise<JournalPost[]> {
    const slugs = getPostSlugs();
    const posts = await Promise.all(
        slugs.map(async (slug) => {
            const post = await getPostBySlug(slug);
            return post!;
        })
    );

    // Filter out unpublished posts and sort by date in descending order (newest first)
    return posts
        .filter((post) => post.published)
        .sort((a, b) => {
            if (a.date < b.date) {
                return 1;
            } else {
                return -1;
            }
        });
}

export function createAuthorSlug(author: string): string {
    return encodeURIComponent(author.toLowerCase().trim());
}

export function decodeAuthorSlug(slug: string): string {
    return decodeURIComponent(slug);
}

export async function getPostsByAuthor(authorName: string): Promise<JournalPost[]> {
    const allPosts = await getAllPosts();
    return allPosts.filter((post) => {
        return post.author.some((author) => author.toLowerCase() === authorName.toLowerCase());
    });
}

export async function getAllAuthors(): Promise<string[]> {
    const allPosts = await getAllPosts();
    const authorSet = new Set<string>();

    allPosts.forEach((post) => {
        post.author.forEach((author) => authorSet.add(author));
    });

    return Array.from(authorSet).sort();
}

