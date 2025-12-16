import { RedemptionPageClient } from '@/components/admin/redemption-page-client';
import { getTranslations } from 'next-intl/server';

/**
 * Redemption codes management page
 * Admin only - for managing redemption codes during beta period
 */
export default async function RedemptionPage() {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('redemption.title')}</h1>
        <p className="text-muted-foreground">{t('redemption.description')}</p>
      </div>
      <RedemptionPageClient />
    </div>
  );
}
