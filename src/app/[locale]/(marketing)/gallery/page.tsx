import { GalleryPageClient } from '@/components/gallery/gallery-page-client';
import { constructMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Gallery' });

  return constructMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    locale,
    pathname: '/gallery',
  });
}

interface GalleryPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;

  return <GalleryPageClient locale={locale} />;
}
