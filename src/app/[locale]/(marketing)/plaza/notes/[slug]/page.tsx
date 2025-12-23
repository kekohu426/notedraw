import { getNoteBySlugAction } from '@/actions/plaza';
import { PlazaNoteDetailClient } from '@/components/plaza/plaza-note-detail-client';
import { constructMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

interface NoteDetailPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateMetadata({
  params,
}: NoteDetailPageProps): Promise<Metadata | undefined> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'Plaza' });

  // Fetch note data for metadata
  const result = await getNoteBySlugAction({ slug });
  const note = result?.data?.note;

  if (!note) {
    return constructMetadata({
      title: t('detail.notFound.title'),
      description: t('detail.notFound.description'),
      locale,
      pathname: `/plaza/notes/${slug}`,
    });
  }

  return constructMetadata({
    title: note.title ? `${note.title} - ${t('meta.title')}` : t('meta.title'),
    description: note.description || t('meta.description'),
    locale,
    pathname: `/plaza/notes/${slug}`,
    image: note.cards?.[0]?.imageUrl || undefined,
  });
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { locale, slug } = await params;

  // Fetch note data
  const result = await getNoteBySlugAction({ slug });
  const note = result?.data?.note;

  if (!note) {
    notFound();
  }

  return <PlazaNoteDetailClient locale={locale} note={note} />;
}
