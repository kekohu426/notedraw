'use client';

import { useLocale } from 'next-intl';
import { Brain, Palette, Pencil, ArrowRight, CheckCircle2 } from 'lucide-react';

const content = {
  en: {
    title: 'How It Works',
    subtitle: 'Three AI experts work together to create your visual notes',
    steps: [
      {
        icon: Brain,
        emoji: '🧠',
        title: 'Organizer',
        subtitle: 'Content Analysis',
        description: 'Our AI Organizer reads your text and extracts the key concepts, main points, and logical structure.',
        details: [
          'Identifies core themes',
          'Extracts key points',
          'Builds content hierarchy',
        ],
      },
      {
        icon: Palette,
        emoji: '🎨',
        title: 'Designer',
        subtitle: 'Visual Layout',
        description: 'The Designer plans the visual layout, choosing icons, colors, and composition that best represent your content.',
        details: [
          'Plans visual hierarchy',
          'Selects matching icons',
          'Designs composition',
        ],
      },
      {
        icon: Pencil,
        emoji: '✏️',
        title: 'Painter',
        subtitle: 'Image Generation',
        description: 'Finally, the Painter brings it all together, generating beautiful hand-drawn style visual notes.',
        details: [
          'Applies chosen style',
          'Renders high-quality images',
          'Adds finishing touches',
        ],
      },
    ],
  },
  zh: {
    title: '工作原理',
    subtitle: '三位 AI 专家协同工作，为你创作视觉笔记',
    steps: [
      {
        icon: Brain,
        emoji: '🧠',
        title: '整理师',
        subtitle: '内容分析',
        description: '我们的 AI 整理师阅读你的文本，提取关键概念、要点和逻辑结构。',
        details: [
          '识别核心主题',
          '提取关键要点',
          '构建内容层次',
        ],
      },
      {
        icon: Palette,
        emoji: '🎨',
        title: '设计师',
        subtitle: '视觉布局',
        description: '设计师规划视觉布局，选择最能表达内容的图标、颜色和构图。',
        details: [
          '规划视觉层次',
          '匹配相关图标',
          '设计整体构图',
        ],
      },
      {
        icon: Pencil,
        emoji: '✏️',
        title: '绘图师',
        subtitle: '图片生成',
        description: '最后，绘图师将一切融合，生成精美的手绘风格视觉笔记。',
        details: [
          '应用选定风格',
          '渲染高清图片',
          '添加最终润色',
        ],
      },
    ],
  },
};

export default function HowItWorksSection() {
  const locale = useLocale() as 'en' | 'zh';
  const t = content[locale] || content.en;

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 hidden lg:block" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-4">
            {t.steps.map((step, idx) => (
              <div key={idx} className="relative">
                {/* Arrow between steps on mobile */}
                {idx < t.steps.length - 1 && (
                  <div className="flex justify-center py-4 lg:hidden">
                    <ArrowRight className="h-6 w-6 text-primary rotate-90" />
                  </div>
                )}

                <div className="relative bg-card rounded-2xl border p-8 shadow-sm hover:shadow-lg transition-shadow">
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                      <span className="text-4xl">{step.emoji}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="text-sm text-primary font-medium">{step.subtitle}</p>
                    <p className="mt-4 text-muted-foreground">{step.description}</p>
                  </div>

                  {/* Details */}
                  <ul className="mt-6 space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
