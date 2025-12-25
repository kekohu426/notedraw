import NoteDrawHero from '@/components/blocks/hero/notedraw-hero';
import FeaturesSection from '@/components/blocks/notedraw/features-section';
import HowItWorksSection from '@/components/blocks/notedraw/how-it-works-section';
import ExamplesSection from '@/components/blocks/notedraw/examples-section';
import PricingSection from '@/components/blocks/pricing/pricing';
import CrispChat from '@/components/layout/crisp-chat';
import { SeoHead, getHomePageJsonLd } from '@/components/seo';
import { constructMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

/**
 * https://next-intl.dev/docs/environments/actions-metadata-route-handlers#metadata-api
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return constructMetadata({
    title: t('title'),
    description: t('description'),
    locale,
    pathname: '',
  });
}

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage(props: HomePageProps) {
  const params = await props.params;
  const { locale } = params;

  return (
    <>
      {/* JSON-LD 结构化数据：Organization + SoftwareApplication */}
      <SeoHead jsonLd={getHomePageJsonLd()} />

      <div className="flex flex-col">
        {/* Hero - 核心卖点 */}
        <NoteDrawHero />

        {/* Features - 功能特性 */}
        <FeaturesSection />

        {/* How it works - 工作原理 */}
        <HowItWorksSection />

        {/* Examples - 效果展示 */}
        <ExamplesSection />

        {/* Pricing - 定价 */}
        <PricingSection />

        <CrispChat />
      </div>
    </>
  );
}
