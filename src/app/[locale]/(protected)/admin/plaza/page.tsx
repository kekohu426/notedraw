import { AdminPlazaClient } from '@/components/admin/admin-plaza-client';
import { getTranslations } from 'next-intl/server';

/**
 * Admin Plaza Management - Manage public notes in plaza
 */
export default async function AdminPlazaPage() {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('plaza.title')}</h1>
        <p className="text-muted-foreground">{t('plaza.description')}</p>
      </div>
      <AdminPlazaClient />
    </div>
  );
}
