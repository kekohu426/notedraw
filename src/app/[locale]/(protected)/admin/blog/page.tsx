import { BlogManagementClient } from '@/components/admin/blog-management-client';
import { getTranslations } from 'next-intl/server';

/**
 * Admin Blog Management - AI-powered blog generation
 */
export default async function AdminBlogPage() {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('blog.title')}</h1>
        <p className="text-muted-foreground">{t('blog.description')}</p>
      </div>
      <BlogManagementClient />
    </div>
  );
}
