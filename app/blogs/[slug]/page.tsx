import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import {
  getBlogBySlug,
  getRelatedBlogs,
  getPublishedBlogs,
} from '@/data/blogData';
import BlogArticleView from '@/components/blog/BlogArticleView';

// agent-notes: { ctx: "Dynamic Celite blog article page querying 100% from Supabase database", deps: [data/blogData, components/blog/BlogArticleView], state: active, last: "sato@2026-08-16" }

interface PageProps {
  params: Promise<{ slug: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://celite.in';

export async function generateStaticParams() {
  const blogs = await getPublishedBlogs();
  return blogs.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return {
      title: 'Article Not Found • Celite',
      description: 'The requested guide or article does not exist.',
    };
  }

  const postUrl = `${BASE_URL}/blogs/${post.slug}`;
  const imageUrl = post.coverImage.startsWith('http')
    ? post.coverImage
    : `${BASE_URL}${post.coverImage}`;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.keywords,
    authors: [{ name: post.author.name }],
    creator: 'Celite',
    publisher: 'Celite',
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: postUrl,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metaTitle,
      description: post.metaDescription,
      images: [imageUrl],
      creator: '@celite',
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export const revalidate = 60;

export default async function BlogDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedBlogs(post.slug, post.categorySlug);
  const postUrl = `${BASE_URL}/blogs/${post.slug}`;
  const imageUrl = post.coverImage.startsWith('http')
    ? post.coverImage
    : `${BASE_URL}${post.coverImage}`;

  // Structured Data: Article / BlogPosting Schema
  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    alternativeHeadline: post.subtitle,
    description: post.excerpt,
    image: imageUrl,
    url: postUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    keywords: post.tags.join(', '),
    author: {
      '@type': 'Organization',
      name: post.author.name,
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Celite',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/Logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  // Structured Data: Breadcrumbs
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blogs',
        item: `${BASE_URL}/blogs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  // Structured Data: FAQ Schema (if FAQs are present)
  const faqStructuredData =
    post.faqs && post.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <Script
        id={`article-schema-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <Script
        id={`breadcrumb-schema-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      {faqStructuredData && (
        <Script
          id={`faq-schema-${post.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      )}

      <BlogArticleView post={post} relatedPosts={relatedPosts} />
    </>
  );
}
