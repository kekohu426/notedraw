/**
 * 动态 OG 图片生成器
 * 用于生成社交分享时的预览图片
 */

import { ImageResponse } from 'next/og';
import { seoConfig } from '@/config/seo.config';

export const runtime = 'edge';

// OG 图片尺寸
export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

export const OG_IMAGE_CONTENT_TYPE = 'image/png';

interface OGImageProps {
  title: string;
  subtitle?: string;
  type?: 'default' | 'blog' | 'note';
}

/**
 * 生成 OG 图片的 ImageResponse
 */
export async function generateOGImage({
  title,
  subtitle,
  type = 'default',
}: OGImageProps): Promise<ImageResponse> {
  const { brand } = seoConfig;

  // 根据类型选择背景色
  const bgGradient = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blog: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    note: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  }[type];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: bgGradient,
          padding: '60px',
        }}
      >
        {/* Logo / Brand Name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: '20px',
              fontSize: '32px',
            }}
          >
            ✏️
          </div>
          <span
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            {brand.name}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: title.length > 40 ? '48px' : '64px',
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '900px',
            margin: 0,
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          {title.length > 80 ? `${title.slice(0, 77)}...` : title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              fontSize: '28px',
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
              maxWidth: '800px',
              marginTop: '24px',
            }}
          >
            {subtitle.length > 100 ? `${subtitle.slice(0, 97)}...` : subtitle}
          </p>
        )}

        {/* Tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {brand.tagline}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
    }
  );
}
