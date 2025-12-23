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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { History, LogOut, User, Moon, Sun, Coins, CreditCard, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useCreditBalance } from '@/hooks/use-credits';
import { websiteConfig } from '@/config/website';

export function SimpleHeader() {
  const t = useTranslations();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // 积分余额
  const enableCredits = websiteConfig.credits.enableCredits;
  const { data: balance = 0, isLoading: isLoadingBalance } = useCreditBalance();

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
        <LocaleLink href={Routes.NoteDraw} className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="font-semibold text-lg hidden sm:inline-block">
            {t('Metadata.name')}
          </span>
        </LocaleLink>

        {/* 分隔 */}
        <div className="flex-1" />

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {/* 积分显示 */}
          {enableCredits && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <LocaleLink href={Routes.SettingsCredits}>
                <Coins className="h-4 w-4" />
                <span>
                  {isLoadingBalance ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    balance.toLocaleString()
                  )}
                </span>
              </LocaleLink>
            </Button>
          )}

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
              <DropdownMenuContent align="end" className="w-56">
                {/* 用户信息 */}
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* 积分入口 */}
                {enableCredits && (
                  <DropdownMenuItem asChild>
                    <LocaleLink href={Routes.SettingsCredits} className="cursor-pointer">
                      <Coins className="mr-2 h-4 w-4" />
                      <span className="flex-1">{t('Dashboard.settings.credits.title')}</span>
                      <span className="text-xs text-muted-foreground">
                        {isLoadingBalance ? '...' : balance.toLocaleString()}
                      </span>
                    </LocaleLink>
                  </DropdownMenuItem>
                )}

                {/* 历史记录 */}
                <DropdownMenuItem asChild>
                  <LocaleLink href="/notedraw/history" className="cursor-pointer">
                    <History className="mr-2 h-4 w-4" />
                    {t('Dashboard.notedraw.history.title')}
                  </LocaleLink>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 个人设置 */}
                <DropdownMenuItem asChild>
                  <LocaleLink href={Routes.SettingsProfile} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t('Dashboard.settings.profile.title')}
                  </LocaleLink>
                </DropdownMenuItem>

                {/* 账单设置 */}
                <DropdownMenuItem asChild>
                  <LocaleLink href={Routes.SettingsBilling} className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('Dashboard.settings.billing.title')}
                  </LocaleLink>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 登出 */}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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
