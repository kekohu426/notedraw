import { PlazaPageClient } from '@/components/plaza/plaza-page-client';
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
  const t = await getTranslations({ locale, namespace: 'Plaza' });

  return constructMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    locale,
    pathname: '/plaza',
  });
}

interface PlazaPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PlazaPage({ params, searchParams }: PlazaPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  const style = typeof resolvedSearchParams.style === 'string' ? resolvedSearchParams.style : undefined;
  const tag = typeof resolvedSearchParams.tag === 'string' ? resolvedSearchParams.tag : undefined;
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page, 10) : 1;

  return (
    <PlazaPageClient
      locale={locale}
      initialStyle={style}
      initialTag={tag}
      initialPage={page}
    />
  );
}
