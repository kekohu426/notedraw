'use client';

import { cn } from '@/lib/utils';
import { getAllStyles, type VisualStyle } from '@/ai/notedraw';

interface StyleSelectorProps {
  value: VisualStyle;
  onChange: (style: VisualStyle) => void;
  disabled?: boolean;
  locale?: 'en' | 'zh';
}

export function StyleSelector({
  value,
  onChange,
  disabled = false,
  locale = 'en',
}: StyleSelectorProps) {
  const styles = getAllStyles();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        {locale === 'zh' ? '选择视觉风格' : 'Visual Style'}
      </label>
      <div className="grid grid-cols-5 gap-2">
        {styles.map((style) => (
          <button
            key={style.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(style.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all',
              'hover:border-primary/50 hover:bg-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              value === style.id
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background'
            )}
          >
            {/* 预览色块 */}
            <div className="grid h-8 w-full grid-cols-2 gap-0.5 overflow-hidden rounded">
              {style.previewColors.map((color, i) => (
                <div
                  key={i}
                  className="h-4"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium leading-tight">
              {locale === 'zh' ? style.name.zh : style.name.en}
            </span>
          </button>
        ))}
      </div>
      {/* 选中风格的描述 */}
      <p className="text-xs text-muted-foreground">
        {styles.find((s) => s.id === value)?.description[locale] || ''}
      </p>
    </div>
  );
}
