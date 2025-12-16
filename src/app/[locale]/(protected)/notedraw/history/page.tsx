import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { constructMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { NoteHistoryList } from './note-history-list';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard.notedraw.historyPage' });

  return constructMetadata({
    title: t('title'),
    description: t('description'),
    locale,
    pathname: '/notedraw/history',
  });
}

interface NoteHistoryPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function NoteHistoryPage({ params }: NoteHistoryPageProps) {
  const { locale } = await params;
  const t = await getTranslations('Dashboard');

  const breadcrumbs = [
    {
      label: t('notedraw.title'),
    },
    {
      label: t('notedraw.history.title'),
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <NoteHistoryList locale={locale === 'zh' ? 'zh' : 'en'} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
