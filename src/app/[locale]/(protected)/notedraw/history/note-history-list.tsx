'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, Trash2, Plus, ImageIcon, Clock, CheckCircle, XCircle, Loader2, Calendar, FileText, Share2, Globe, GlobeLock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getUserProjectsAction, deleteProjectAction } from '@/actions/notedraw';
import { removeFromPlazaAction } from '@/actions/plaza';
import { LocaleLink } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { ResultGallery } from '@/components/notedraw/ResultGallery';
import { ShareToPlazaDialog } from '@/components/plaza/share-to-plaza-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NoteCard {
  id: string;
  order: number;
  originalText?: string;
  prompt?: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

interface NoteProject {
  id: string;
  title: string | null;
  inputText: string;
  language: string;
  visualStyle: string;
  status: string;
  errorMessage: string | null;
  isPublic: boolean;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    cards: number;
  };
  cards: NoteCard[];
}

interface NoteHistoryListProps {
  locale: 'en' | 'zh';
}

export function NoteHistoryList({ locale }: NoteHistoryListProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<NoteProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareProjectId, setShareProjectId] = useState<string | null>(null);
  const [shareProjectTitle, setShareProjectTitle] = useState<string>('');
  const [removingFromPlazaId, setRemovingFromPlazaId] = useState<string | null>(null);

  const t = {
    en: {
      empty: 'No notes yet',
      emptyDescription: 'Create your first visual note to get started',
      createFirst: 'Create Your First Note',
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this project?',
      deleteSuccess: 'Project deleted successfully',
      deleteFail: 'Failed to delete project',
      view: 'View in Studio',
      viewOriginal: 'View Original Text',
      originalText: 'Original Text',
      close: 'Close',
      cards: (count: number) => `${count} cards`,
      status: {
        draft: 'Draft',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
      },
      cancel: 'Cancel',
      confirm: 'Delete',
      historyTitle: 'Note History',
      createNew: 'Create New Note',
      redirecting: 'Redirecting to Studio for editing...',
      shareToPlaza: 'Share to Plaza',
      removeFromPlaza: 'Remove from Plaza',
      removeConfirm: 'Remove this note from the plaza?',
      removeSuccess: 'Note removed from plaza',
      removeFail: 'Failed to remove from plaza',
      publicNote: 'Shared publicly',
      privateNote: 'Private note',
      viewInPlaza: 'View in Plaza',
    },
    zh: {
      empty: '暂无笔记',
      emptyDescription: '创建您的第一个视觉笔记开始使用',
      createFirst: '创建第一个笔记',
      delete: '删除',
      deleteConfirm: '确定要删除这个项目吗？',
      deleteSuccess: '项目删除成功',
      deleteFail: '删除项目失败',
      view: '进入工作室编辑',
      viewOriginal: '查看原文',
      originalText: '原始内容',
      close: '关闭',
      cards: (count: number) => `${count} 张卡片`,
      status: {
        draft: '草稿',
        processing: '处理中',
        completed: '已完成',
        failed: '失败',
      },
      cancel: '取消',
      confirm: '删除',
      historyTitle: '笔记历史',
      createNew: '创建新笔记',
      redirecting: '正在跳转到工作室进行编辑...',
      shareToPlaza: '分享到广场',
      removeFromPlaza: '从广场移除',
      removeConfirm: '确定要从广场移除这个笔记吗？',
      removeSuccess: '笔记已从广场移除',
      removeFail: '从广场移除失败',
      publicNote: '已公开分享',
      privateNote: '私密笔记',
      viewInPlaza: '在广场查看',
    },
  };

  const texts = t[locale];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const result = await getUserProjectsAction();
      if (result?.data?.success && result.data.projects) {
        setProjects(result.data.projects as unknown as NoteProject[]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId);
    try {
      const result = await deleteProjectAction({ projectId });
      if (result?.data?.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        toast.success(texts.deleteSuccess);
      } else {
        throw new Error(result?.data?.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(texts.deleteFail);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (projectId: string) => {
    toast.info(texts.redirecting);
    router.push(`/notedraw/${projectId}`);
  };

  const handleOpenShareDialog = (project: NoteProject) => {
    setShareProjectId(project.id);
    setShareProjectTitle(project.title || project.inputText.slice(0, 30));
    setShareDialogOpen(true);
  };

  const handleShareSuccess = (slug: string) => {
    // Update the project in the list to reflect it's now public
    setProjects(prev => prev.map(p =>
      p.id === shareProjectId ? { ...p, isPublic: true, slug } : p
    ));
    setShareDialogOpen(false);
    setShareProjectId(null);
  };

  const handleRemoveFromPlaza = async (projectId: string) => {
    setRemovingFromPlazaId(projectId);
    try {
      const result = await removeFromPlazaAction({ projectId });
      if (result?.data?.success) {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, isPublic: false, slug: null } : p
        ));
        toast.success(texts.removeSuccess);
      } else {
        throw new Error(result?.data?.error || 'Remove failed');
      }
    } catch (error) {
      console.error('Remove from plaza error:', error);
      toast.error(texts.removeFail);
    } finally {
      setRemovingFromPlazaId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h3 className="mb-2 text-lg font-semibold">{texts.empty}</h3>
        <p className="mb-6 text-sm text-muted-foreground">{texts.emptyDescription}</p>
        <Button asChild>
          <LocaleLink href={Routes.NoteDraw}>
            <Plus className="mr-2 h-4 w-4" />
            {texts.createFirst}
          </LocaleLink>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {texts.historyTitle}
        </h2>
        <Button asChild>
          <LocaleLink href={Routes.NoteDraw}>
            <Plus className="mr-2 h-4 w-4" />
            {texts.createNew}
          </LocaleLink>
        </Button>
      </div>

      {/* Project List */}
      <div className="space-y-12">
        {projects.map((project) => (
          <div key={project.id} className="space-y-4 border-b pb-12 last:border-0 last:pb-0">
            {/* Project Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">
                    {project.title || project.inputText.slice(0, 30) + '...'}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="default" size="sm" onClick={() => handleEdit(project.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  {texts.view}
                </Button>

                {/* Share/Remove from Plaza Button */}
                {project.status === 'completed' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {project.isPublic ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-green-600"
                                disabled={removingFromPlazaId === project.id}
                              >
                                {removingFromPlazaId === project.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Globe className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{texts.removeFromPlaza}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {texts.removeConfirm}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{texts.cancel}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveFromPlaza(project.id)}>
                                  {texts.confirm}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenShareDialog(project)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {project.isPublic ? texts.publicNote : texts.shareToPlaza}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* View in Plaza Button */}
                {project.isPublic && project.slug && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <LocaleLink href={`${Routes.PlazaNote}/${project.slug}`} target="_blank">
                            <Eye className="h-4 w-4" />
                          </LocaleLink>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{texts.viewInPlaza}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" title={texts.viewOriginal}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{texts.originalText}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md border p-4 bg-muted/50 text-sm whitespace-pre-wrap">
                      {project.inputText}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="secondary">{texts.close}</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deletingId === project.id}
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{texts.delete}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {texts.deleteConfirm}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{texts.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(project.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {texts.confirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Images Gallery */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <ResultGallery
                cards={project.cards}
                locale={locale}
                // Passing edit handlers that redirect to studio
                onRegenerateWithPrompt={(cardId, prompt) => handleEdit(project.id)}
                onRegenerate={(cardId) => handleEdit(project.id)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Share to Plaza Dialog */}
      {shareProjectId && (
        <ShareToPlazaDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          projectId={shareProjectId}
          projectTitle={shareProjectTitle}
          onSuccess={handleShareSuccess}
        />
      )}
    </div>
  );
}
