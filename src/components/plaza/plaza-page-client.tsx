'use client';

import { getPlazaNotesAction, getPopularTagsAction } from '@/actions/plaza';
import Container from '@/components/layout/container';
import { PlazaNoteCard } from '@/components/plaza/plaza-note-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LocaleLink, useLocaleRouter } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import type { Locale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface PlazaNote {
  id: string;
  title: string | null;
  description: string | null;
  slug: string | null;
  visualStyle: string;
  tags: string | null;
  views: number;
  likes: number;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  coverImage: string | null;
  tagsArray: string[];
}

interface PlazaPageClientProps {
  locale: Locale;
  initialStyle?: string;
  initialTag?: string;
  initialPage?: number;
}

const VISUAL_STYLES = ['all', 'sketch', 'business', 'cute', 'minimal', 'chalkboard'] as const;

export function PlazaPageClient({
  locale,
  initialStyle,
  initialTag,
  initialPage = 1,
}: PlazaPageClientProps) {
  const t = useTranslations('Plaza');
  const router = useLocaleRouter();

  const [notes, setNotes] = useState<PlazaNote[]>([]);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [style, setStyle] = useState<string>(initialStyle || 'all');
  const [tag, setTag] = useState<string | undefined>(initialTag);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const result = await getPlazaNotesAction({
          page,
          limit: 20,
          style: style === 'all' ? undefined : style,
          tag,
        });

        if (result?.data?.success && result.data.notes) {
          setNotes(result.data.notes as PlazaNote[]);
          setTotalPages(result.data.pagination?.totalPages || 1);
          setTotal(result.data.pagination?.total || 0);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [page, style, tag]);

  // Load popular tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const result = await getPopularTagsAction({});
        if (result?.data?.success && result.data.tags) {
          setPopularTags(result.data.tags);
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };

    loadTags();
  }, []);

  const handleStyleChange = (newStyle: string) => {
    setStyle(newStyle);
    setPage(1);
    // Update URL
    const params = new URLSearchParams();
    if (newStyle !== 'all') params.set('style', newStyle);
    if (tag) params.set('tag', tag);
    router.push(`${Routes.Plaza}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleTagClick = (clickedTag: string) => {
    const newTag = tag === clickedTag ? undefined : clickedTag;
    setTag(newTag);
    setPage(1);
    // Update URL
    const params = new URLSearchParams();
    if (style !== 'all') params.set('style', style);
    if (newTag) params.set('tag', newTag);
    router.push(`${Routes.Plaza}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams();
    if (style !== 'all') params.set('style', style);
    if (tag) params.set('tag', tag);
    if (newPage > 1) params.set('page', String(newPage));
    router.push(`${Routes.Plaza}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="min-h-screen py-8">
      <Container>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Style Filter */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Select value={style} onValueChange={handleStyleChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('styles.all')} />
              </SelectTrigger>
              <SelectContent>
                {VISUAL_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`styles.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tags */}
            {popularTags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {popularTags.slice(0, 10).map(({ tag: tagName }) => (
                  <Badge
                    key={tagName}
                    variant={tag === tagName ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors hover:bg-primary/10"
                    onClick={() => handleTagClick(tagName)}
                  >
                    {tagName}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Active filters */}
          {(style !== 'all' || tag) && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{total} {t('note.views', { count: total }).split(' ')[1]}</span>
              {(style !== 'all' || tag) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStyle('all');
                    setTag(undefined);
                    setPage(1);
                    router.push(Routes.Plaza);
                  }}
                >
                  {t('tags.all')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground mb-6">{t('empty.description')}</p>
            <Button asChild>
              <LocaleLink href={Routes.NoteDraw}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('share.submit')}
              </LocaleLink>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {notes.map((note) => (
                <PlazaNoteCard key={note.id} note={note} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  &larr;
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  &rarr;
                </Button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
