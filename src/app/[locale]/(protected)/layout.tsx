import { SimpleHeader } from '@/components/dashboard/simple-header';
import type { PropsWithChildren } from 'react';

/**
 * NoteDraw 简洁布局 - 无侧边栏，只有顶部导航
 */
export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col">
      <SimpleHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
