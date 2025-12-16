'use client';

import { Routes } from '@/routes';
import type { NestedMenuItem } from '@/types';
import {
  BellIcon,
  CircleUserRoundIcon,
  CoinsIcon,
  CreditCardIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LockKeyholeIcon,
  PenToolIcon,
  PenLineIcon,
  Settings2Icon,
  ShieldIcon,
  TicketIcon,
  UsersIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { websiteConfig } from './website';

/**
 * Get sidebar config with translations
 *
 * NOTICE: used in client components only
 *
 * docs:
 * https://mksaas.com/docs/config/sidebar
 *
 * @returns The sidebar config with translated titles and descriptions
 */
export function useSidebarLinks(): NestedMenuItem[] {
  const t = useTranslations('Dashboard');

  return [
    {
      title: t('notedraw.create.title'),
      icon: <PenToolIcon className="size-4 shrink-0" />,
      href: Routes.NoteDraw,
      external: false,
    },
    {
      title: t('notedraw.history.title'),
      icon: <HistoryIcon className="size-4 shrink-0" />,
      href: Routes.NoteDrawHistory,
      external: false,
    },
    {
      title: t('settings.title'),
      icon: <Settings2Icon className="size-4 shrink-0" />,
      items: [
        {
          title: t('settings.profile.title'),
          icon: <CircleUserRoundIcon className="size-4 shrink-0" />,
          href: Routes.SettingsProfile,
          external: false,
        },
        {
          title: t('settings.billing.title'),
          icon: <CreditCardIcon className="size-4 shrink-0" />,
          href: Routes.SettingsBilling,
          external: false,
        },
        ...(websiteConfig.credits.enableCredits
          ? [
              {
                title: t('settings.credits.title'),
                icon: <CoinsIcon className="size-4 shrink-0" />,
                href: Routes.SettingsCredits,
                external: false,
              },
            ]
          : []),
        {
          title: t('settings.security.title'),
          icon: <LockKeyholeIcon className="size-4 shrink-0" />,
          href: Routes.SettingsSecurity,
          external: false,
        },
        {
          title: t('settings.notification.title'),
          icon: <BellIcon className="size-4 shrink-0" />,
          href: Routes.SettingsNotifications,
          external: false,
        },
      ],
    },
    {
      title: t('admin.title'),
      icon: <ShieldIcon className="size-4 shrink-0" />,
      authorizeOnly: ['admin'],
      items: [
        {
          title: t('admin.dashboard.title'),
          icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
          href: Routes.AdminDashboard,
          external: false,
        },
        {
          title: t('admin.users.title'),
          icon: <UsersIcon className="size-4 shrink-0" />,
          href: Routes.AdminUsers,
          external: false,
        },
        {
          title: t('admin.orders.title'),
          icon: <CreditCardIcon className="size-4 shrink-0" />,
          href: Routes.AdminOrders,
          external: false,
        },
        {
          title: t('admin.redemption.title'),
          icon: <TicketIcon className="size-4 shrink-0" />,
          href: Routes.AdminRedemption,
          external: false,
        },
        {
          title: t('admin.content.title'),
          icon: <FileTextIcon className="size-4 shrink-0" />,
          href: Routes.AdminContent,
          external: false,
        },
        {
          title: t('admin.blog.title'),
          icon: <PenLineIcon className="size-4 shrink-0" />,
          href: Routes.AdminBlog,
          external: false,
        },
      ],
    },
  ];
}
