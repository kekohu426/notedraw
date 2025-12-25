import { websiteConfig } from '@/config/website';
import { defaultMessages } from '@/i18n/messages';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { generateAlternates, getCurrentHreflang } from './hreflang';
import { getBaseUrl, getImageUrl, getUrlWithLocale } from './urls/urls';

/**
 * Construct the metadata object for the current page (in docs/guides)
 */
/**
 * Strip query parameters and hash from pathname to ensure clean canonical URLs
 * e.g., "/blog/post?utm_source=twitter#section" -> "/blog/post"
 */
function cleanPathname(pathname: string): string {
  if (!pathname) return '';
  // Remove query string and hash
  const cleanPath = pathname.split('?')[0].split('#')[0];
  // Remove trailing slash (except for root)
  return cleanPath === '/' ? cleanPath : cleanPath.replace(/\/$/, '');
}

export function constructMetadata({
  title,
  description,
  image,
  noIndex = false,
  locale,
  pathname,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  locale?: Locale;
  pathname?: string;
} = {}): Metadata {
  title = title || defaultMessages.Metadata.title;
  description = description || defaultMessages.Metadata.description;
  image = image || websiteConfig.metadata.images?.ogImage;
  const ogImageUrl = getImageUrl(image || '');

  // Clean pathname: remove query params and hash for canonical URL
  const cleanedPathname = cleanPathname(pathname || '');

  // Generate canonical URL from pathname and locale
  const canonicalUrl = locale
    ? getUrlWithLocale(cleanedPathname, locale).replace(/\/$/, '')
    : undefined;

  // Generate hreflang alternates if pathname is provided and we have multiple locales
  const alternates =
    cleanedPathname && routing.locales.length > 1
      ? {
          canonical: canonicalUrl,
          ...generateAlternates(cleanedPathname),
        }
      : canonicalUrl
        ? { canonical: canonicalUrl }
        : undefined;

  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      locale: locale ? getCurrentHreflang(locale).replace('-', '_') : 'en_US',
      url: canonicalUrl,
      title,
      description,
      siteName: defaultMessages.Metadata.name,
      images: [ogImageUrl.toString()],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
      site: getBaseUrl(),
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-32x32.png',
      apple: '/apple-touch-icon.png',
    },
    metadataBase: new URL(getBaseUrl()),
    manifest: `${getBaseUrl()}/manifest.webmanifest`,
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
