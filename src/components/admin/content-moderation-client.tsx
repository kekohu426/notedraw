'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  User,
  Calendar,
  Palette,
} from 'lucide-react';
import { getPendingReviewProjectsAction, setProjectPublicStatusAction } from '@/actions/admin-stats';
import Image from 'next/image';

interface Project {
  id: string;
  title: string;
  inputText: string | null;
  visualStyle: string | null;
  isPublic: boolean | null;
  createdAt: Date | null;
  userName: string | null;
  userEmail: string | null;
  coverImage: string | null;
}

const styleLabels: Record<string, string> = {
  sketch: '手绘风',
  business: '商务风',
  cute: '可爱风',
  minimal: '极简风',
  chalkboard: '黑板风',
};

export function ContentModerationClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionProjectId, setActionProjectId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'hide' | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const result = await getPendingReviewProjectsAction();
      if (result?.data?.success && result.data.projects) {
        setProjects(result.data.projects as Project[]);
      }
    } catch (error) {
      console.error('Load projects error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleHideProject = async () => {
    if (!actionProjectId) return;

    try {
      const result = await setProjectPublicStatusAction({
        projectId: actionProjectId,
        isPublic: false,
      });

      if (result?.data?.success) {
        // Remove from list
        setProjects(prev => prev.filter(p => p.id !== actionProjectId));
      }
    } catch (error) {
      console.error('Hide project error:', error);
    } finally {
      setActionProjectId(null);
      setActionType(null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">内容审核</h1>
          <p className="text-muted-foreground">审核用户公开分享的笔记内容</p>
        </div>
        <Button variant="outline" onClick={loadProjects} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">公开笔记</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project List */}
      <Card>
        <CardHeader>
          <CardTitle>公开笔记列表</CardTitle>
          <CardDescription>
            查看和管理用户公开分享的笔记，可以将不适当的内容设为私密
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无公开笔记
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  {/* Cover Image */}
                  <div className="aspect-video bg-muted relative">
                    {project.coverImage ? (
                      <Image
                        src={project.coverImage}
                        alt={project.title || '笔记封面'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        无封面
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Title */}
                    <h3 className="font-medium line-clamp-1">
                      {project.title || '无标题'}
                    </h3>

                    {/* Input Text Preview */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.inputText || '无内容'}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{project.userName || project.userEmail || '匿名'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                      {project.visualStyle && (
                        <div className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          <span>{styleLabels[project.visualStyle] || project.visualStyle}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <a
                          href={`/gallery/${project.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          查看
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setActionProjectId(project.id);
                          setActionType('hide');
                        }}
                      >
                        <EyeOff className="mr-1 h-3 w-3" />
                        隐藏
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hide Confirmation Dialog */}
      <AlertDialog open={actionType === 'hide'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认隐藏笔记</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将把该笔记设为私密，用户可以在个人中心重新公开。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleHideProject}>
              确认隐藏
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
