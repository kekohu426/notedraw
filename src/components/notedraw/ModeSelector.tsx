'use client';

import { LayoutGrid, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerateMode } from '@/ai/notedraw/types';

interface ModeSelectorProps {
  value: GenerateMode;
  onChange: (mode: GenerateMode) => void;
  disabled?: boolean;
  locale?: 'en' | 'zh';
}

const MODES: {
  id: GenerateMode;
  icon: typeof LayoutGrid;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
}[] = [
  {
    id: 'compact',
    icon: LayoutGrid,
    name: { en: 'Single Image', zh: '一张图' },
    description: { en: 'Quick generation for short content', zh: '适合短内容，快速出图' },
  },
  {
    id: 'detailed',
    icon: Layers,
    name: { en: 'Image Series', zh: '多张图' },
    description: { en: 'Series of images for long articles', zh: '适合长文章，系列图解' },
  },
];

export function ModeSelector({
  value,
  onChange,
  disabled = false,
  locale = 'en',
}: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        {locale === 'zh' ? '生成模式' : 'Generate Mode'}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange(mode.id)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all',
                'hover:border-primary/50 hover:bg-accent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-background'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {mode.name[locale]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mode.description[locale]}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
