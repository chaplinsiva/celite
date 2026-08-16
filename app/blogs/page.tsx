import type { Metadata } from 'next';
import Script from 'next/script';
import { getPublishedBlogs, getAllBlogCategories } from '@/data/blogData';
import BlogHero from '@/components/blog/BlogHero';
import BlogNewsletterCTA from '@/components/blog/BlogNewsletterCTA';

// agent-notes: { ctx: "Celite Blog directory listing page querying 100% from Supabase database", deps: [data/blogData, components/blog/BlogHero], state: active, last: "sato@2026-08-16" }

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://celite.in';

export const metadata: Metadata = {
  title: 'Blog & Video Production Guides • Celite',
  description:
    'Discover in-depth After Effects tutorials, wedding video invitation guides, sound design strategies, 3D workflows, and creator productivity articles by Celite.',
  keywords: [
    'celite blog',
    'after effects templates tutorials',
    'wedding video guides',
    'save the date after effects',
    'motion graphics tips',
    'royalty free music guides',
    '3d motion design tutorials',
  ],
  openGraph: {
    title: 'Celite Blog — Video Production & Motion Design Insights',
    description:
      'Tutorials, masterclasses, and workflows for video editors, wedding filmmakers, and motion designers. Authored by the Celite creative team.',
    url: `${BASE_URL}/blogs`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/hero_ae_template.png`,
        width: 1200,
        height: 630,
        alt: 'Celite Blog & Creative Guides',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Celite Blog — Video Production & Motion Design Insights',
    description:
      'Tutorials, masterclasses, and workflows for video editors, wedding filmmakers, and motion designers.',
    images: [`${BASE_URL}/hero_ae_template.png`],
  },
  alternates: {
    canonical: `${BASE_URL}/blogs`,
  },
};

export const revalidate = 60; // Revalidate every 60 seconds

export default async function BlogsPage() {
  const blogs = await getPublishedBlogs();
  const categories = getAllBlogCategories(blogs);

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
        name: 'Blogs & Guides',
        item: `${BASE_URL}/blogs`,
      },
    ],
  };

  const blogListStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Celite Creative Journal & Video Production Blog',
    description:
      'Master the craft of motion design, wedding video production, 3D visual effects, and audio sound design with Celite.',
    url: `${BASE_URL}/blogs`,
    publisher: {
      '@type': 'Organization',
      name: 'Celite',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/Logo.png`,
      },
    },
    blogPost: blogs.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${BASE_URL}/blogs/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        '@type': 'Organization',
        name: post.author.name,
      },
      image: `${BASE_URL}${post.coverImage}`,
    })),
  };

  return (
    <>
      <Script
        id="blogs-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <Script
        id="blogs-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListStructuredData) }}
      />

      <div className="min-h-screen bg-[#07080c] py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlogHero initialPosts={blogs} categories={categories} />
          
          <div className="mt-16">
            <BlogNewsletterCTA />
          </div>
        </div>
      </div>
    </>
  );
}
