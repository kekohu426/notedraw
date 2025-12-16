import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { constructMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ProjectDetail } from './project-detail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });

  return constructMetadata({
    title: t('notedraw.title'),
    description: t('notedraw.page.description'),
    locale,
    pathname: '/notedraw',
  });
}

interface ProjectDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations('Dashboard');

  const breadcrumbs = [
    {
      label: t('notedraw.title'),
      href: '/notedraw',
    },
    {
      label: t('notedraw.history.title'),
      href: '/notedraw/history',
    },
    {
      label: locale === 'zh' ? '项目详情' : 'Project Detail',
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
              <ProjectDetail projectId={id} locale={locale === 'zh' ? 'zh' : 'en'} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
