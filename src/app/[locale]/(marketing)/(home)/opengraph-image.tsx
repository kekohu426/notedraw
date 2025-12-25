/**
 * 首页动态 OG 图片
 */

import { generateOGImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from '@/lib/seo/og-image';
import { seoConfig } from '@/config/seo.config';

export const runtime = 'edge';
export const alt = 'NoteDraw - AI Visual Note Generator';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image() {
  const { brand } = seoConfig;

  return generateOGImage({
    title: brand.name,
    subtitle: brand.tagline,
    type: 'default',
  });
}
