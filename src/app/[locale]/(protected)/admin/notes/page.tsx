import { AdminNotesClient } from '@/components/admin/admin-notes-client';
import { getTranslations } from 'next-intl/server';

/**
 * Admin Notes Management - Manage all users' notes
 */
export default async function AdminNotesPage() {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('notes.title')}</h1>
        <p className="text-muted-foreground">{t('notes.description')}</p>
      </div>
      <AdminNotesClient />
    </div>
  );
}
