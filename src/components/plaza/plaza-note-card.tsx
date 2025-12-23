'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LocaleLink } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { Eye, Heart, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface PlazaNoteCardProps {
  note: {
    id: string;
    title: string | null;
    slug: string | null;
    visualStyle: string;
    views: number;
    likes: number;
    isFeatured: boolean;
    coverImage: string | null;
    tagsArray: string[];
  };
}

export function PlazaNoteCard({ note }: PlazaNoteCardProps) {
  const t = useTranslations('Plaza');

  if (!note.slug) return null;

  return (
    <LocaleLink href={`${Routes.PlazaNote}/${note.slug}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group cursor-pointer">
        {/* Cover Image */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {note.coverImage ? (
            <Image
              src={note.coverImage}
              alt={note.title || 'Note'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-muted-foreground/30 text-6xl">
                {note.visualStyle === 'sketch' && '✏️'}
                {note.visualStyle === 'business' && '💼'}
                {note.visualStyle === 'cute' && '🎀'}
                {note.visualStyle === 'minimal' && '◽'}
                {note.visualStyle === 'chalkboard' && '📝'}
              </div>
            </div>
          )}

          {/* Featured Badge */}
          {note.isFeatured && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('note.featured')}
              </Badge>
            </div>
          )}

          {/* Style Badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              {t(`styles.${note.visualStyle}`)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          {/* Title */}
          <h3 className="font-medium line-clamp-1 mb-2 group-hover:text-primary transition-colors">
            {note.title || 'Untitled'}
          </h3>

          {/* Tags */}
          {note.tagsArray.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {note.tagsArray.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {note.tagsArray.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{note.tagsArray.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {note.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {note.likes}
            </span>
          </div>
        </CardContent>
      </Card>
    </LocaleLink>
  );
}
