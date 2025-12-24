'use client';

import { SidebarMain } from '@/components/dashboard/sidebar-main';
import { SidebarUser } from '@/components/dashboard/sidebar-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { LocaleLink } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { Routes } from '@/routes';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/layout/logo';
import type { NestedMenuItem } from '@/types';
import {
    LayoutDashboardIcon,
    UsersIcon,
    TicketIcon,
    FileTextIcon,
    PenLineIcon,
    ShieldIcon,
    ArrowLeftIcon,
    CreditCardIcon,
    CoinsIcon,
    SettingsIcon,
    GlobeIcon,
    BookOpenIcon,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

/**
 * Admin-only sidebar links
 */
function useAdminSidebarLinks(): NestedMenuItem[] {
    const t = useTranslations('Dashboard');

    return [
        {
            title: t('admin.dashboard.title'),
            icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
            href: Routes.AdminDashboard,
            external: false,
        },
        {
            title: t('admin.orders.title'),
            icon: <CreditCardIcon className="size-4 shrink-0" />,
            href: Routes.AdminOrders,
            external: false,
        },
        {
            title: t('admin.users.title'),
            icon: <UsersIcon className="size-4 shrink-0" />,
            href: Routes.AdminUsers,
            external: false,
        },
        {
            title: t('admin.redemption.title'),
            icon: <TicketIcon className="size-4 shrink-0" />,
            href: Routes.AdminRedemption,
            external: false,
        },
        {
            title: t('admin.credits.title'),
            icon: <CoinsIcon className="size-4 shrink-0" />,
            href: Routes.AdminCredits,
            external: false,
        },
        {
            title: t('admin.plaza.title'),
            icon: <GlobeIcon className="size-4 shrink-0" />,
            href: Routes.AdminPlaza,
            external: false,
        },
        {
            title: t('admin.notes.title'),
            icon: <BookOpenIcon className="size-4 shrink-0" />,
            href: Routes.AdminNotes,
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
        {
            title: t('admin.settings.title'),
            icon: <SettingsIcon className="size-4 shrink-0" />,
            href: Routes.AdminSettings,
            external: false,
        },
    ];
}

/**
 * Admin Sidebar Component
 */
function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const t = useTranslations();
    const [mounted, setMounted] = useState(false);
    const { data: session, isPending } = authClient.useSession();
    const currentUser = session?.user;

    const sidebarLinks = useAdminSidebarLinks();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <LocaleLink href={Routes.AdminDashboard}>
                                <ShieldIcon className="size-5" />
                                <span className="truncate font-semibold text-base">
                                    {t('Dashboard.admin.title')}
                                </span>
                            </LocaleLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {!isPending && mounted && <SidebarMain items={sidebarLinks} />}
            </SidebarContent>

            <SidebarFooter className="flex flex-col gap-4">
                {/* Back to app link */}
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <LocaleLink href={Routes.NoteDraw}>
                                <ArrowLeftIcon className="size-4 shrink-0" />
                                <span className="truncate font-medium text-sm">
                                    {t('Dashboard.notedraw.create.title')}
                                </span>
                            </LocaleLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Show user profile if user is logged in */}
                {!isPending && mounted && currentUser && (
                    <SidebarUser user={currentUser} />
                )}
            </SidebarFooter>
        </Sidebar>
    );
}

/**
 * Admin Console Label Component - uses translations
 */
function AdminConsoleLabel() {
    const t = useTranslations('Dashboard');
    return (
        <span className="font-medium text-sm text-muted-foreground">
            {t('admin.console')}
        </span>
    );
}

interface AdminLayoutClientProps {
    children: React.ReactNode;
}

/**
 * Admin Layout with Sidebar - Client Component
 */
export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <AdminConsoleLabel />
                </header>
                <main className="flex-1 p-4 lg:p-6">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
