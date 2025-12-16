import { getTranslations } from 'next-intl/server';

interface UsersLayoutProps {
  children: React.ReactNode;
}

/**
 * Users 页面布局 - 只添加页面标题
 * 权限检查已在 admin/layout.tsx 中完成
 */
export default async function UsersLayout({ children }: UsersLayoutProps) {
  const t = await getTranslations('Dashboard.admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('users.title')}</h1>
        <p className="text-muted-foreground">{t('users.description')}</p>
      </div>
      {children}
    </div>
  );
}
