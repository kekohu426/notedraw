'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  locale?: 'en' | 'zh';
  className?: string;
  estimatedCredits?: number; // 预计消费积分
  currentCredits?: number; // 当前余额
}

export function GenerateButton({
  onClick,
  disabled = false,
  loading = false,
  locale = 'en',
  className,
  estimatedCredits,
  currentCredits,
}: GenerateButtonProps) {
  const insufficientCredits = currentCredits !== undefined && estimatedCredits !== undefined
    && currentCredits < estimatedCredits;

  return (
    <div className="space-y-2">
      <Button
        onClick={onClick}
        disabled={disabled || loading || insufficientCredits}
        size="lg"
        className={cn(
          'w-full gap-2 bg-gradient-to-r from-primary to-primary/80',
          'hover:from-primary/90 hover:to-primary/70',
          'transition-all duration-200',
          className
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {locale === 'zh' ? '生成中...' : 'Generating...'}
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            {locale === 'zh' ? '生成视觉笔记' : 'Generate Visual Notes'}
          </>
        )}
      </Button>

      {/* 积分信息 */}
      {estimatedCredits !== undefined && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {locale === 'zh' ? `预计消耗 ${estimatedCredits} 积分` : `Est. ${estimatedCredits} credits`}
          </span>
          {currentCredits !== undefined && (
            <span className={cn(insufficientCredits && 'text-destructive font-medium')}>
              {locale === 'zh' ? `余额: ${currentCredits}` : `Balance: ${currentCredits}`}
            </span>
          )}
        </div>
      )}

      {/* 积分不足警告 */}
      {insufficientCredits && (
        <p className="text-xs text-destructive">
          {locale === 'zh' ? '积分不足，请充值后重试' : 'Insufficient credits, please top up'}
        </p>
      )}
    </div>
  );
}
