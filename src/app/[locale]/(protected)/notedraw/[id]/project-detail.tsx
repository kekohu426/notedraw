'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  ImageIcon,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Palette,
  Languages,
  FileText,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getProjectAction, regenerateCardAction } from '@/actions/notedraw';
import { shareToPlazaAction } from '@/actions/plaza';
import { LocaleLink } from '@/i18n/navigation';

interface NoteCard {
  id: string;
  order: number;
  originalText: string | null;
  structure: Record<string, unknown> | null;
  prompt: string | null;
  imageUrl: string | null;
  status: string;
  errorMessage: string | null;
}

interface NoteProject {
  id: string;
  title: string | null;
  inputText: string;
  language: string;
  visualStyle: string;
  generateMode: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  cards: NoteCard[];
}

interface ProjectDetailProps {
  projectId: string;
  locale: 'en' | 'zh';
}

export function ProjectDetail({ projectId, locale }: ProjectDetailProps) {
  const [project, setProject] = useState<NoteProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [regeneratingCardId, setRegeneratingCardId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const t = {
    en: {
      loading: 'Loading project...',
      notFound: 'Project not found',
      backToHistory: 'Back to History',
      projectInfo: 'Project Info',
      createdAt: 'Created',
      style: 'Style',
      language: 'Language',
      mode: 'Mode',
      status: 'Status',
      generatedCards: 'Generated Cards',
      noCards: 'No cards generated yet',
      regenerate: 'Regenerate',
      download: 'Download',
      regenerating: 'Regenerating...',
      regenerateSuccess: 'Card regenerated successfully',
      regenerateFail: 'Failed to regenerate card',
      downloadFail: 'Failed to download image',
      styles: {
        sketch: 'Sketch',
        business: 'Business',
        cute: 'Cute',
        minimal: 'Minimal',
        chalkboard: 'Chalkboard',
      },
      modes: {
        compact: 'Compact',
        detailed: 'Detailed',
      },
      statuses: {
        draft: 'Draft',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
      },
      originalText: 'Original Text',
      prompt: 'Prompt',
      shareToPlaza: 'Share to Plaza',
      sharing: 'Sharing...',
      shareSuccess: 'Successfully shared to plaza!',
      shareFail: 'Failed to share to plaza',
      shareRequireCompleted: 'Only completed projects can be shared',
    },
    zh: {
      loading: '加载项目中...',
      notFound: '项目未找到',
      backToHistory: '返回历史',
      projectInfo: '项目信息',
      createdAt: '创建时间',
      style: '风格',
      language: '语言',
      mode: '模式',
      status: '状态',
      generatedCards: '生成的卡片',
      noCards: '尚未生成卡片',
      regenerate: '重新生成',
      download: '下载',
      regenerating: '重新生成中...',
      regenerateSuccess: '卡片重新生成成功',
      regenerateFail: '重新生成卡片失败',
      downloadFail: '下载图片失败',
      styles: {
        sketch: '手绘风',
        business: '商务风',
        cute: '可爱风',
        minimal: '简约风',
        chalkboard: '黑板风',
      },
      modes: {
        compact: '精简模式',
        detailed: '详细模式',
      },
      statuses: {
        draft: '草稿',
        processing: '处理中',
        completed: '已完成',
        failed: '失败',
      },
      originalText: '原文内容',
      prompt: '生成提示词',
      shareToPlaza: '分享到广场',
      sharing: '分享中...',
      shareSuccess: '成功分享到广场！',
      shareFail: '分享失败',
      shareRequireCompleted: '只有已完成的项目才能分享',
    },
  };

  const texts = t[locale];

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const result = await getProjectAction({ projectId });
      if (result?.data?.success && result.data.project) {
        setProject(result.data.project as unknown as NoteProject);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (cardId: string) => {
    setRegeneratingCardId(cardId);
    try {
      const result = await regenerateCardAction({ cardId });
      if (result?.data?.success && result.data.card) {
        // 更新本地状态
        const cardData = result.data?.card;
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    imageUrl: cardData?.imageUrl || card.imageUrl,
                    status: cardData?.status || card.status,
                    prompt: cardData?.prompt || card.prompt,
                  }
                : card
            ),
          };
        });
        toast.success(texts.regenerateSuccess);
      } else {
        throw new Error(result?.data?.error || 'Regenerate failed');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error(texts.regenerateFail);
    } finally {
      setRegeneratingCardId(null);
    }
  };

  const handleDownload = async (imageUrl: string, cardOrder: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notedraw-card-${cardOrder}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(texts.downloadFail);
    }
  };

  const handleShareToPlaza = async () => {
    if (!project) return;

    if (project.status !== 'completed') {
      toast.error(texts.shareRequireCompleted);
      return;
    }

    setIsSharing(true);
    try {
      // 自动从项目信息生成分享内容
      const title = project.title || project.inputText.slice(0, 50);
      const description = project.inputText.slice(0, 200);
      const tags = project.visualStyle; // 使用视觉风格作为标签

      const result = await shareToPlazaAction({
        projectId: project.id,
        title,
        description,
        tags,
      });

      if (result?.data?.success) {
        toast.success(texts.shareSuccess);
      } else {
        throw new Error(result?.data?.error || 'Share failed');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error(texts.shareFail);
    } finally {
      setIsSharing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h3 className="mb-2 text-lg font-semibold">{texts.notFound}</h3>
        <Button asChild className="mt-4">
          <LocaleLink href="/notedraw/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {texts.backToHistory}
          </LocaleLink>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <LocaleLink href="/notedraw/history">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {texts.backToHistory}
            </LocaleLink>
          </Button>
          <h1
            className="text-lg sm:text-xl font-bold truncate max-w-[300px] sm:max-w-[400px]"
            title={project.title || project.inputText}
          >
            {project.title || (project.inputText.length > 25 ? project.inputText.slice(0, 25) + '...' : project.inputText)}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareToPlaza}
            disabled={project.status !== 'completed' || isSharing}
          >
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {texts.sharing}
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                {texts.shareToPlaza}
              </>
            )}
          </Button>
          <Badge variant={getStatusVariant(project.status)}>
            {getStatusIcon(project.status)}
            <span className="ml-1">
              {texts.statuses[project.status as keyof typeof texts.statuses] || project.status}
            </span>
          </Badge>
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{texts.projectInfo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{texts.createdAt}:</span>
              <span className="text-sm font-medium">
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{texts.style}:</span>
              <span className="text-sm font-medium">
                {texts.styles[project.visualStyle as keyof typeof texts.styles] || project.visualStyle}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{texts.language}:</span>
              <span className="text-sm font-medium">
                {project.language === 'zh' ? '中文' : 'English'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{texts.mode}:</span>
              <span className="text-sm font-medium">
                {texts.modes[project.generateMode as keyof typeof texts.modes] || project.generateMode}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{texts.generatedCards}</h2>

        {project.cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{texts.noCards}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {project.cards.map((card) => (
              <Card key={card.id} className="overflow-hidden">
                {/* Image */}
                <div className="relative aspect-video bg-muted">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={`Card ${card.order}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {card.status === 'processing' ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                  )}
                </div>

                <CardContent className="space-y-3 p-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">#{card.order + 1}</span>
                    <Badge variant={getStatusVariant(card.status)} className="text-xs">
                      {getStatusIcon(card.status)}
                      <span className="ml-1">
                        {texts.statuses[card.status as keyof typeof texts.statuses] || card.status}
                      </span>
                    </Badge>
                  </div>

                  {/* Original Text */}
                  {card.originalText && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{texts.originalText}</p>
                      <p className="line-clamp-3 text-sm">{card.originalText}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRegenerate(card.id)}
                      disabled={regeneratingCardId === card.id}
                    >
                      {regeneratingCardId === card.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {texts.regenerating}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {texts.regenerate}
                        </>
                      )}
                    </Button>
                    {card.imageUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(card.imageUrl!, card.order)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
