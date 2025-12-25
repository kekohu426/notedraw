import { websiteConfig } from '@/config/website';
import { seoConfig } from '@/config/seo.config';
import { getLocalePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { generateHreflangUrls } from '@/lib/hreflang';
import { isIndexable } from '@/lib/seo';
import { blogSource, categorySource, source } from '@/lib/source';
import { db } from '@/db';
import { noteProject } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import type { MetadataRoute } from 'next';
import type { Locale } from 'next-intl';
import { getBaseUrl } from '../lib/urls/urls';

type Href = Parameters<typeof getLocalePathname>[0]['href'];

/**
 * static routes for sitemap, you may change the routes for your own
 */
const staticRoutes = [
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/waitlist',
  '/changelog',
  '/privacy',
  '/terms',
  '/cookie',
  '/auth/login',
  '/auth/register',
  ...(websiteConfig.blog.enable ? ['/blog'] : []),
  ...(websiteConfig.docs.enable ? ['/docs'] : []),
];

/**
 * Generate a sitemap for the website with hreflang support
 *
 * 严选逻辑：只收录 isIndexable() === true 的页面
 *
 * https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps
 * https://github.com/javayhu/cnblocks/blob/main/app/sitemap.ts
 * https://ahrefs.com/blog/hreflang-tags/
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapList: MetadataRoute.Sitemap = []; // final result

  // add static routes (always indexable)
  sitemapList.push(
    ...staticRoutes.flatMap((route) => {
      return routing.locales.map((locale) => ({
        url: getUrl(route, locale),
        alternates: {
          languages: generateHreflangUrls(route),
        },
      }));
    })
  );

  // add blog related routes if enabled
  if (websiteConfig.blog.enable) {
    // add paginated blog list pages (with pagination limit check)
    routing.locales.forEach((locale) => {
      const posts = blogSource
        .getPages(locale)
        .filter((post) => post.data.published);
      const totalPages = Math.max(
        1,
        Math.ceil(posts.length / websiteConfig.blog.paginationSize)
      );
      // /blog/page/[page] (from 2, with pagination limit)
      for (let page = 2; page <= totalPages; page++) {
        // Check if this pagination page should be indexed
        if (!isIndexable({ type: 'pagination', pageNumber: page })) {
          continue; // Skip pages beyond the limit
        }
        sitemapList.push({
          url: getUrl(`/blog/page/${page}`, locale),
          alternates: {
            languages: generateHreflangUrls(`/blog/page/${page}`),
          },
        });
      }
    });

    // add paginated category pages
    routing.locales.forEach((locale) => {
      const localeCategories = categorySource.getPages(locale);
      localeCategories.forEach((category) => {
        // posts in this category and locale
        const postsInCategory = blogSource
          .getPages(locale)
          .filter((post) => post.data.published)
          .filter((post) =>
            post.data.categories.some((cat) => cat === category.slugs[0])
          );

        // Check if category page has enough items
        if (!isIndexable({ type: 'aggregation', itemCount: postsInCategory.length })) {
          return; // Skip categories with too few posts
        }

        const totalPages = Math.max(
          1,
          Math.ceil(postsInCategory.length / websiteConfig.blog.paginationSize)
        );
        // /blog/category/[slug] (first page)
        sitemapList.push({
          url: getUrl(`/blog/category/${category.slugs[0]}`, locale),
          alternates: {
            languages: generateHreflangUrls(
              `/blog/category/${category.slugs[0]}`
            ),
          },
        });
        // /blog/category/[slug]/page/[page] (from 2, with pagination limit)
        for (let page = 2; page <= totalPages; page++) {
          if (!isIndexable({ type: 'pagination', pageNumber: page })) {
            continue;
          }
          sitemapList.push({
            url: getUrl(
              `/blog/category/${category.slugs[0]}/page/${page}`,
              locale
            ),
            alternates: {
              languages: generateHreflangUrls(
                `/blog/category/${category.slugs[0]}/page/${page}`
              ),
            },
          });
        }
      });
    });

    // add posts (single post pages - only published ones)
    routing.locales.forEach((locale) => {
      const posts = blogSource
        .getPages(locale)
        .filter((post) => post.data.published);
      posts.forEach((post) => {
        // Blog posts are always indexable if published
        if (!isIndexable({ type: 'blog-post', isPublished: post.data.published })) {
          return;
        }
        sitemapList.push({
          url: getUrl(`/blog/${post.slugs.join('/')}`, locale),
          alternates: {
            languages: generateHreflangUrls(`/blog/${post.slugs.join('/')}`),
          },
        });
      });
    });
  }

  // add docs related routes if enabled
  if (websiteConfig.docs.enable) {
    const docsParams = source.generateParams();
    sitemapList.push(
      ...docsParams.flatMap((param) =>
        routing.locales.map((locale) => ({
          url: getUrl(`/docs/${param.slug.join('/')}`, locale),
          alternates: {
            languages: generateHreflangUrls(`/docs/${param.slug.join('/')}`),
          },
        }))
      )
    );
  }

  // ============================================================
  // 添加广场公开笔记（Plaza public notes）
  // 只收录 isPublic=true 且 status=completed 且有 slug 的笔记
  // ============================================================
  try {
    const publicNotes = await db
      .select({
        slug: noteProject.slug,
        status: noteProject.status,
        isPublic: noteProject.isPublic,
        updatedAt: noteProject.updatedAt,
      })
      .from(noteProject)
      .where(
        and(
          eq(noteProject.isPublic, true),
          eq(noteProject.status, 'completed'),
          isNotNull(noteProject.slug)
        )
      );

    // Add each public note to sitemap (with isIndexable check)
    publicNotes.forEach((note) => {
      if (!note.slug) return;

      // Double-check with isIndexable
      if (!isIndexable({
        type: 'note-detail',
        projectStatus: note.status,
        isPublic: note.isPublic,
      })) {
        return;
      }

      // Add for each locale
      routing.locales.forEach((locale) => {
        sitemapList.push({
          url: getUrl(`/plaza/notes/${note.slug}`, locale),
          lastModified: note.updatedAt,
          alternates: {
            languages: generateHreflangUrls(`/plaza/notes/${note.slug}`),
          },
        });
      });
    });

    // Add plaza main page
    routing.locales.forEach((locale) => {
      sitemapList.push({
        url: getUrl('/plaza', locale),
        alternates: {
          languages: generateHreflangUrls('/plaza'),
        },
      });
    });

    // Add gallery page
    routing.locales.forEach((locale) => {
      sitemapList.push({
        url: getUrl('/gallery', locale),
        alternates: {
          languages: generateHreflangUrls('/gallery'),
        },
      });
    });
  } catch (error) {
    // Database might not be available during build, skip plaza notes
    console.warn('Sitemap: Could not fetch plaza notes from database:', error);
  }

  return sitemapList;
}

function getUrl(href: Href, locale: Locale) {
  const pathname = getLocalePathname({ locale, href });
  return getBaseUrl() + pathname;
}
