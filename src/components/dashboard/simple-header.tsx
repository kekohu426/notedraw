'use client';

import { LocaleLink } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { Routes } from '@/routes';
import { useTranslations } from 'next-intl';
import { Logo } from '../layout/logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { History, Settings, LogOut, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

export function SimpleHeader() {
  const t = useTranslations();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <LocaleLink href={Routes.Root} className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="font-semibold text-lg hidden sm:inline-block">
            {t('Metadata.name')}
          </span>
        </LocaleLink>

        {/* 分隔 */}
        <div className="flex-1" />

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {/* History 按钮 */}
          <Button variant="ghost" size="sm" asChild>
            <LocaleLink href="/notedraw/history">
              <History className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">
                {t('Dashboard.notedraw.history.title')}
              </span>
            </LocaleLink>
          </Button>

          {/* 主题切换 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* 用户菜单 */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentUser.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LocaleLink href="/settings/profile">
                    <User className="mr-2 h-4 w-4" />
                    {t('Dashboard.settings.profile.title')}
                  </LocaleLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <LocaleLink href="/settings/billing">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('Dashboard.settings.title')}
                  </LocaleLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('Common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
