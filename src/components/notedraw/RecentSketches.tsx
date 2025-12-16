'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Clock, ArrowRight, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { getUserProjectsAction } from '@/actions/notedraw';

interface RecentProject {
  id: string;
  inputText: string;
  createdAt: Date;
  cards: Array<{
    id: string;
    imageUrl: string | null;
  }>;
}

interface RecentSketchesProps {
  locale?: 'en' | 'zh';
  maxItems?: number;
}

export function RecentSketches({ locale = 'en', maxItems = 4 }: RecentSketchesProps) {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    try {
      setIsLoading(true);
      const result = await getUserProjectsAction();
      if (result?.data?.success && result.data.projects) {
        // 只取有图片的项目，最多显示 maxItems 个
        const projectsWithImages = (result.data.projects as unknown as RecentProject[])
          .filter(p => p.cards.some(c => c.imageUrl))
          .slice(0, maxItems);
        setProjects(projectsWithImages);
      }
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{locale === 'zh' ? '最近生成' : 'Recent Sketches'}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{locale === 'zh' ? '最近生成' : 'Recent Sketches'}</span>
        </div>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
          <LocaleLink href="/notedraw/history">
            {locale === 'zh' ? '查看全部' : 'View All'}
            <ArrowRight className="ml-1 h-3 w-3" />
          </LocaleLink>
        </Button>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-4 gap-2">
        {projects.map((project) => {
          const firstImage = project.cards.find(c => c.imageUrl);
          return (
            <LocaleLink
              key={project.id}
              href={`/notedraw/${project.id}`}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted ring-offset-background transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2"
            >
              {firstImage?.imageUrl ? (
                <Image
                  src={firstImage.imageUrl}
                  alt={project.inputText.slice(0, 30)}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
              {/* 悬浮遮罩 */}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            </LocaleLink>
          );
        })}
      </div>
    </div>
  );
}
