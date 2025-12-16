'use client';

import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

const content = {
  en: {
    title: 'See It In Action',
    subtitle: 'Real examples created with NoteDraw',
    styles: [
      { name: 'Sketch', emoji: '✏️', color: 'bg-slate-100 dark:bg-slate-800' },
      { name: 'Business', emoji: '💼', color: 'bg-blue-100 dark:bg-blue-900' },
      { name: 'Cute', emoji: '🌸', color: 'bg-pink-100 dark:bg-pink-900' },
      { name: 'Minimal', emoji: '◻️', color: 'bg-gray-100 dark:bg-gray-800' },
      { name: 'Chalkboard', emoji: '📝', color: 'bg-emerald-100 dark:bg-emerald-900' },
    ],
    cta: 'Try It Free',
    viewGallery: 'View Gallery',
  },
  zh: {
    title: '效果展示',
    subtitle: '使用 NoteDraw 创作的真实案例',
    styles: [
      { name: '手绘风', emoji: '✏️', color: 'bg-slate-100 dark:bg-slate-800' },
      { name: '商务风', emoji: '💼', color: 'bg-blue-100 dark:bg-blue-900' },
      { name: '可爱风', emoji: '🌸', color: 'bg-pink-100 dark:bg-pink-900' },
      { name: '极简风', emoji: '◻️', color: 'bg-gray-100 dark:bg-gray-800' },
      { name: '黑板风', emoji: '📝', color: 'bg-emerald-100 dark:bg-emerald-900' },
    ],
    cta: '免费试用',
    viewGallery: '查看更多',
  },
};

// 示例图片占位（实际应该从数据库或 CMS 获取）
const exampleImages = [
  { id: 1, style: 'sketch', placeholder: true },
  { id: 2, style: 'business', placeholder: true },
  { id: 3, style: 'cute', placeholder: true },
  { id: 4, style: 'minimal', placeholder: true },
  { id: 5, style: 'chalkboard', placeholder: true },
  { id: 6, style: 'sketch', placeholder: true },
];

export default function ExamplesSection() {
  const locale = useLocale() as 'en' | 'zh';
  const t = content[locale] || content.en;

  return (
    <section id="examples" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        {/* Style tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {t.styles.map((style, idx) => (
            <button
              key={idx}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:border-primary ${style.color}`}
            >
              <span>{style.emoji}</span>
              <span className="font-medium">{style.name}</span>
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exampleImages.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-[4/3] rounded-2xl border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02]"
            >
              {img.placeholder ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                  <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {locale === 'zh' ? '示例图片' : 'Example Image'}
                  </span>
                </div>
              ) : (
                // 实际图片
                <div className="absolute inset-0 bg-muted" />
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button variant="secondary" size="sm">
                  {locale === 'zh' ? '查看详情' : 'View Details'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="rounded-xl px-8">
            <LocaleLink href="/notedraw">
              {t.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </LocaleLink>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl px-8">
            <LocaleLink href="/gallery">
              {t.viewGallery}
            </LocaleLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
