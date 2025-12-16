'use client';

import { useLocale } from 'next-intl';
import {
  Zap,
  Palette,
  Languages,
  Download,
  RefreshCw,
  Layers,
  FileText,
  Link,
  Upload
} from 'lucide-react';

const content = {
  en: {
    title: 'Powerful Features',
    subtitle: 'Everything you need to create stunning visual notes',
    features: [
      {
        icon: Zap,
        title: 'One-Click Generation',
        description: 'Paste text, click generate. AI does the rest in seconds.',
      },
      {
        icon: Palette,
        title: '5 Visual Styles',
        description: 'Sketch, Business, Cute, Minimal, Chalkboard - pick your style.',
      },
      {
        icon: Languages,
        title: 'Bilingual Support',
        description: 'Generate notes in Chinese or English, your choice.',
      },
      {
        icon: RefreshCw,
        title: 'Easy Regeneration',
        description: 'Not satisfied? Regenerate any card with custom prompts.',
      },
      {
        icon: Download,
        title: 'High-Quality Export',
        description: 'Download your visual notes in high resolution.',
      },
      {
        icon: Layers,
        title: 'Multi-Card Output',
        description: 'Long content auto-splits into multiple beautiful cards.',
      },
      {
        icon: FileText,
        title: 'File Upload',
        description: 'Upload .txt or .md files directly.',
      },
      {
        icon: Link,
        title: 'URL Import',
        description: 'Paste a URL and extract content automatically.',
      },
      {
        icon: Upload,
        title: 'Cloud Storage',
        description: 'All your projects saved securely in the cloud.',
      },
    ],
  },
  zh: {
    title: '强大功能',
    subtitle: '创作精美视觉笔记所需的一切',
    features: [
      {
        icon: Zap,
        title: '一键生成',
        description: '粘贴文字，点击生成，AI 秒级完成。',
      },
      {
        icon: Palette,
        title: '5 种视觉风格',
        description: '手绘、商务、可爱、极简、黑板 - 随心选择。',
      },
      {
        icon: Languages,
        title: '中英双语',
        description: '支持生成中文或英文笔记，自由切换。',
      },
      {
        icon: RefreshCw,
        title: '轻松重绘',
        description: '不满意？一键重新生成，支持自定义提示词。',
      },
      {
        icon: Download,
        title: '高清导出',
        description: '下载高分辨率视觉笔记图片。',
      },
      {
        icon: Layers,
        title: '多卡片输出',
        description: '长内容自动拆分成多张精美卡片。',
      },
      {
        icon: FileText,
        title: '文件上传',
        description: '直接上传 .txt 或 .md 文件。',
      },
      {
        icon: Link,
        title: 'URL 导入',
        description: '粘贴网页链接，自动提取内容。',
      },
      {
        icon: Upload,
        title: '云端存储',
        description: '所有项目安全保存在云端。',
      },
    ],
  },
};

export default function FeaturesSection() {
  const locale = useLocale() as 'en' | 'zh';
  const t = content[locale] || content.en;

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.features.map((feature, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
