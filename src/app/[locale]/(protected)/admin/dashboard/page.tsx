import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';
import { getTranslations } from 'next-intl/server';

/**
 * Admin Dashboard - Overview of system statistics
 */
export default async function AdminDashboardPage() {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description')}</p>
      </div>
      <AdminDashboardClient />
    </div>
  );
}

