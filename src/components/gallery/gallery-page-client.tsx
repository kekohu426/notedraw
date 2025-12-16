'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocaleLink } from '@/i18n/navigation';
import {
  Heart,
  Eye,
  Download,
  Share2,
  Loader2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getGalleryProjectsAction, likeProjectAction } from '@/actions/gallery';
import { toast } from 'sonner';

interface GalleryProject {
  id: string;
  title: string | null;
  inputText: string;
  visualStyle: string;
  language: string;
  tags: string | null;
  likes: number;
  views: number;
  createdAt: Date;
  userName: string | null;
  userImage: string | null;
  coverImage: string | null;
}

interface GalleryPageClientProps {
  locale: string;
}

const content = {
  en: {
    title: 'Note Gallery',
    subtitle: 'Discover beautiful visual notes created by our community',
    filterStyle: 'Style',
    filterLanguage: 'Language',
    allStyles: 'All Styles',
    allLanguages: 'All Languages',
    styles: {
      sketch: 'Sketch',
      business: 'Business',
      cute: 'Cute',
      minimal: 'Minimal',
      chalkboard: 'Chalkboard',
    },
    languages: {
      en: 'English',
      zh: 'Chinese',
    },
    noResults: 'No public notes yet. Be the first to share!',
    loading: 'Loading...',
    viewDetails: 'View Details',
    likes: 'likes',
    views: 'views',
  },
  zh: {
    title: '笔记广场',
    subtitle: '发现社区创作的精美视觉笔记',
    filterStyle: '风格',
    filterLanguage: '语言',
    allStyles: '全部风格',
    allLanguages: '全部语言',
    styles: {
      sketch: '手绘风',
      business: '商务风',
      cute: '可爱风',
      minimal: '极简风',
      chalkboard: '黑板风',
    },
    languages: {
      en: '英文',
      zh: '中文',
    },
    noResults: '还没有公开的笔记，成为第一个分享者吧！',
    loading: '加载中...',
    viewDetails: '查看详情',
    likes: '赞',
    views: '浏览',
  },
};

export function GalleryPageClient({ locale }: GalleryPageClientProps) {
  const t = content[locale as 'en' | 'zh'] || content.en;
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const result = await getGalleryProjectsAction({
        page,
        limit: 12,
        style: styleFilter as 'all' | 'sketch' | 'business' | 'cute' | 'minimal' | 'chalkboard',
        language: languageFilter as 'all' | 'en' | 'zh',
      });

      if (result?.data?.success) {
        setProjects(result.data.projects as GalleryProject[]);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Load projects error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [page, styleFilter, languageFilter]);

  const handleLike = async (projectId: string) => {
    try {
      const result = await likeProjectAction({ projectId });
      if (result?.data?.success) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, likes: p.likes + 1 } : p
          )
        );
        toast.success(locale === 'zh' ? '已点赞' : 'Liked!');
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const styleColors: Record<string, string> = {
    sketch: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    business: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cute: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    minimal: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    chalkboard: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  };

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.filterStyle}:</span>
            <Select value={styleFilter} onValueChange={(v) => { setStyleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allStyles}</SelectItem>
                <SelectItem value="sketch">{t.styles.sketch}</SelectItem>
                <SelectItem value="business">{t.styles.business}</SelectItem>
                <SelectItem value="cute">{t.styles.cute}</SelectItem>
                <SelectItem value="minimal">{t.styles.minimal}</SelectItem>
                <SelectItem value="chalkboard">{t.styles.chalkboard}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.filterLanguage}:</span>
            <Select value={languageFilter} onValueChange={(v) => { setLanguageFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allLanguages}</SelectItem>
                <SelectItem value="en">{t.languages.en}</SelectItem>
                <SelectItem value="zh">{t.languages.zh}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t.loading}</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">{t.noResults}</p>
            <Button asChild className="mt-6">
              <LocaleLink href="/notedraw">
                {locale === 'zh' ? '开始创作' : 'Start Creating'}
              </LocaleLink>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-xl"
                >
                  {/* Cover Image */}
                  <LocaleLink href={`/gallery/${project.id}`}>
                    <div className="aspect-[4/3] relative bg-muted">
                      {project.coverImage ? (
                        <Image
                          src={project.coverImage}
                          alt={project.title || 'Visual Note'}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  </LocaleLink>

                  {/* Content */}
                  <div className="p-4">
                    {/* Style badge */}
                    <Badge className={styleColors[project.visualStyle] || ''}>
                      {t.styles[project.visualStyle as keyof typeof t.styles] || project.visualStyle}
                    </Badge>

                    {/* Title */}
                    <h3 className="mt-2 font-medium line-clamp-1">
                      {project.title || project.inputText.slice(0, 30) + '...'}
                    </h3>

                    {/* Tags */}
                    {project.tags && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {project.tags.split(',').slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats & Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {project.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {project.views}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleLike(project.id)}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/${locale}/gallery/${project.id}`
                            );
                            toast.success(locale === 'zh' ? '链接已复制' : 'Link copied!');
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Author */}
                    {project.userName && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        {project.userImage ? (
                          <Image
                            src={project.userImage}
                            alt={project.userName}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-muted" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {project.userName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
