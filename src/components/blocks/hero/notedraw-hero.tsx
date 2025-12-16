'use client';

import { AnimatedGroup } from '@/components/tailark/motion/animated-group';
import { TextEffect } from '@/components/tailark/motion/text-effect';
import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { ArrowRight, Sparkles, Brain, Palette, Pencil } from 'lucide-react';
import { useLocale } from 'next-intl';
import Image from 'next/image';

const transitionVariants = {
  item: {
    hidden: { opacity: 0, y: 12, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', bounce: 0.3, duration: 1.5 },
    },
  },
};

const content = {
  en: {
    badge: 'AI Visual Note Generator',
    title: 'Transform Text into Visual Notes',
    subtitle: 'with AI Magic',
    description: 'Paste any text, article, or notes. Our AI team of Organizer, Designer, and Painter will transform them into beautiful hand-drawn style visual notes in seconds.',
    cta: 'Start Creating',
    secondary: 'View Examples',
    features: [
      { icon: Brain, label: 'Organizer', desc: 'Analyzes content structure' },
      { icon: Palette, label: 'Designer', desc: 'Plans visual layout' },
      { icon: Pencil, label: 'Painter', desc: 'Creates beautiful sketches' },
    ],
  },
  zh: {
    badge: 'AI 视觉笔记生成器',
    title: '一键文字变手绘',
    subtitle: 'AI 魔法',
    description: '粘贴任意文本、文章或笔记。我们的 AI 团队——整理师、设计师、绘图师，将在几秒内把它们转换成精美的手绘风格视觉笔记。',
    cta: '开始创作',
    secondary: '查看案例',
    features: [
      { icon: Brain, label: '整理师', desc: '分析内容结构' },
      { icon: Palette, label: '设计师', desc: '设计视觉布局' },
      { icon: Pencil, label: '绘图师', desc: '绘制精美图片' },
    ],
  },
};

export default function NoteDrawHero() {
  const locale = useLocale() as 'en' | 'zh';
  const t = content[locale] || content.en;

  return (
    <main id="hero" className="overflow-hidden">
      {/* Background gradient */}
      <div
        aria-hidden
        className="absolute inset-0 isolate opacity-65 contain-strict"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <section className="relative">
        <div className="pt-16 pb-20 lg:pt-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              {/* Badge */}
              <AnimatedGroup variants={transitionVariants}>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-sm px-4 py-1.5 mb-8">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t.badge}</span>
                </div>
              </AnimatedGroup>

              {/* Title */}
              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                as="h1"
                className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
              >
                {t.title}
              </TextEffect>

              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                delay={0.2}
                as="span"
                className="block mt-2 text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl xl:text-7xl"
              >
                {t.subtitle}
              </TextEffect>

              {/* Description */}
              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                delay={0.5}
                as="p"
                className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground"
              >
                {t.description}
              </TextEffect>

              {/* CTA Buttons */}
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                    },
                  },
                  ...transitionVariants,
                }}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <div className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5">
                  <Button asChild size="lg" className="rounded-xl px-8 text-base">
                    <LocaleLink href="/notedraw">
                      {t.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </LocaleLink>
                  </Button>
                </div>
                <Button asChild size="lg" variant="outline" className="rounded-xl px-8">
                  <LocaleLink href="#examples">
                    {t.secondary}
                  </LocaleLink>
                </Button>
              </AnimatedGroup>

              {/* AI Team Features */}
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: { staggerChildren: 0.1, delayChildren: 1 },
                    },
                  },
                  ...transitionVariants,
                }}
                className="mt-16 flex flex-wrap justify-center gap-6 lg:gap-12"
              >
                {t.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-2xl border bg-card/50 backdrop-blur-sm px-6 py-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{feature.label}</div>
                      <div className="text-sm text-muted-foreground">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </AnimatedGroup>
            </div>

            {/* Demo Image Placeholder */}
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: { delayChildren: 1.2 },
                  },
                },
                ...transitionVariants,
              }}
              className="mt-16"
            >
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
                <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-4 shadow-2xl">
                  <div className="aspect-[16/9] rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                    {/* 这里可以放产品截图或演示动画 */}
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">✏️ 🎨 📝</div>
                      <p className="text-muted-foreground">
                        {locale === 'zh' ? '产品演示区域' : 'Product Demo Area'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </div>
      </section>
    </main>
  );
}
