'use client';

import Container from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LocaleLink } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  Heart,
  Share2,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { Locale } from 'next-intl';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { toast } from 'sonner';

interface NoteCard {
  id: string;
  order: number;
  imageUrl: string | null;
  originalText: string | null;
}

interface NoteDetail {
  id: string;
  title: string | null;
  description: string | null;
  slug: string | null;
  inputText: string;
  visualStyle: string;
  language: string;
  tags: string | null;
  views: number;
  likes: number;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  tagsArray: string[];
  cards: NoteCard[];
}

interface PlazaNoteDetailClientProps {
  locale: Locale;
  note: NoteDetail;
}

export function PlazaNoteDetailClient({ locale, note }: PlazaNoteDetailClientProps) {
  const t = useTranslations('Plaza');
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('detail.shareSuccess'));
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(t('detail.shareSuccess'));
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <Container className="max-w-5xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <LocaleLink href={Routes.Plaza}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('detail.back')}
            </LocaleLink>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {note.isFeatured && (
                  <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('note.featured')}
                  </Badge>
                )}
                <Badge variant="secondary">{t(`styles.${note.visualStyle}`)}</Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {note.title || 'Untitled'}
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('detail.share')}
            </Button>
          </div>

          {/* Description */}
          {note.description && (
            <p className="text-muted-foreground mb-4">{note.description}</p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {note.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(note.publishedAt), 'PPP', { locale: dateLocale })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {note.views} {t('detail.views')}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {note.likes} {t('detail.likes')}
            </span>
          </div>

          {/* Tags */}
          {note.tagsArray.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                {note.tagsArray.map((tag) => (
                  <LocaleLink key={tag} href={`${Routes.Plaza}?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      {tag}
                    </Badge>
                  </LocaleLink>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cards Gallery */}
        <div className="space-y-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {t('detail.cards')}
            <span className="text-sm font-normal text-muted-foreground">
              ({note.cards.length})
            </span>
          </h2>

          <div className="grid gap-6">
            {note.cards
              .sort((a, b) => a.order - b.order)
              .map((card, index) => (
                <Card key={card.id} className="overflow-hidden group">
                  {card.imageUrl && (
                    <div className="relative">
                      <Image
                        src={card.imageUrl}
                        alt={`Card ${index + 1}`}
                        width={1200}
                        height={800}
                        className="w-full h-auto"
                        priority={index === 0}
                      />
                      {/* Download Button (shown on hover) */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(card.imageUrl!, index)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t('detail.download')}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
