import { ContentModerationClient } from '@/components/admin/content-moderation-client';
import { getTranslations } from 'next-intl/server';

/**
 * Admin Content Moderation - Review public notes
 */
export default async function ContentModerationPage() {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('content.title')}</h1>
        <p className="text-muted-foreground">{t('content.description')}</p>
      </div>
      <ContentModerationClient />
    </div>
  );
}
