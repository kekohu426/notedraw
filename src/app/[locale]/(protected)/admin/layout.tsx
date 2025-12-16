import { AdminLayoutClient } from '@/components/admin/admin-layout-client';
import { isDemoWebsite } from '@/lib/demo';
import { getSession } from '@/lib/server';
import { notFound } from 'next/navigation';
import type { PropsWithChildren } from 'react';

/**
 * Admin Layout - 管理后台布局，带侧边栏导航
 * 只有 admin 角色的用户才能访问
 */
export default async function AdminLayout({ children }: PropsWithChildren) {
    // Demo 模式下允许访问（数据是假的）
    const isDemo = isDemoWebsite();

    // 检查用户是否是管理员
    const session = await getSession();
    if (!session || (session.user.role !== 'admin' && !isDemo)) {
        notFound();
    }

    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
