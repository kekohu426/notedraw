'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, RefreshCw, ZoomIn, ChevronLeft, ChevronRight, X, Edit3, FileArchive, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface NoteCard {
  id: string;
  order: number;
  originalText?: string;
  prompt?: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

interface ResultGalleryProps {
  cards: NoteCard[];
  onRegenerate?: (cardId: string) => void;
  onRegenerateWithPrompt?: (cardId: string, customPrompt: string) => void;
  isRegenerating?: string | null;
  locale?: 'en' | 'zh';
}

export function ResultGallery({
  cards,
  onRegenerate,
  onRegenerateWithPrompt,
  isRegenerating,
  locale = 'en',
}: ResultGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState<NoteCard | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [confirmRegenCard, setConfirmRegenCard] = useState<NoteCard | null>(null);
  const [isDownloadingLongImage, setIsDownloadingLongImage] = useState(false);

  const t = {
    en: {
      editPrompt: 'Edit Prompt',
      editDescription: 'Modify the prompt below and regenerate the image',
      prompt: 'Prompt',
      cancel: 'Cancel',
      regenerate: 'Regenerate',
      adjust: 'Adjust',
      confirmTitle: 'Confirm Regeneration',
      confirmDescription: 'This will consume 5 credits. Are you sure you want to regenerate this image?',
      confirm: 'Confirm',
    },
    zh: {
      editPrompt: '我来调整',
      editDescription: '修改下方的提示词，然后重新生成图片',
      prompt: '提示词',
      cancel: '取消',
      regenerate: '重新生成',
      adjust: '调整',
      confirmTitle: '确认重新生成',
      confirmDescription: '将消耗 5 积分，确定要重新生成这张图片吗？',
      confirm: '确认',
    },
  };

  const texts = t[locale];

  const openEditDialog = (card: NoteCard) => {
    setEditingCard(card);
    setCustomPrompt(card.prompt || '');
  };

  const closeEditDialog = () => {
    setEditingCard(null);
    setCustomPrompt('');
  };

  const handleRegenerateWithPrompt = () => {
    if (editingCard && customPrompt.trim() && onRegenerateWithPrompt) {
      onRegenerateWithPrompt(editingCard.id, customPrompt.trim());
      closeEditDialog();
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visual-note-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDownloadAll = async () => {
    const completedCards = cards.filter(c => c.status === 'completed' && c.imageUrl);
    for (let i = 0; i < completedCards.length; i++) {
      await handleDownload(completedCards[i].imageUrl!, completedCards[i].order);
      // 添加延迟避免浏览器阻止多次下载
      if (i < completedCards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // 下载长图（拼接所有图片为一张垂直长图）
  const handleDownloadLongImage = async () => {
    const completedCards = cards.filter(c => c.status === 'completed' && c.imageUrl);
    if (completedCards.length === 0) return;

    setIsDownloadingLongImage(true);

    try {
      // 加载所有图片
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      };

      const images = await Promise.all(
        completedCards.map(card => loadImage(card.imageUrl!))
      );

      // 计算画布尺寸 - 使用第一张图的宽度，高度为所有图片高度之和
      const width = images[0].naturalWidth;
      const totalHeight = images.reduce((sum, img) => {
        // 按比例缩放高度
        const scaledHeight = (img.naturalHeight / img.naturalWidth) * width;
        return sum + scaledHeight;
      }, 0);

      // 创建画布
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // 绘制白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, totalHeight);

      // 依次绘制每张图片
      let y = 0;
      for (const img of images) {
        const scaledHeight = (img.naturalHeight / img.naturalWidth) * width;
        ctx.drawImage(img, 0, y, width, scaledHeight);
        y += scaledHeight;
      }

      // 导出为PNG并下载
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `visual-notes-long-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to create long image:', error);
    } finally {
      setIsDownloadingLongImage(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;
    const completedCards = cards.filter(c => c.status === 'completed' && c.imageUrl);
    const newIndex = direction === 'prev'
      ? (lightboxIndex - 1 + completedCards.length) % completedCards.length
      : (lightboxIndex + 1) % completedCards.length;
    setLightboxIndex(newIndex);
  };

  const completedCount = cards.filter(c => c.status === 'completed').length;

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 标题和批量操作 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {locale === 'zh' ? '生成结果' : 'Generated Notes'}
          {completedCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({completedCount}/{cards.length})
            </span>
          )}
        </h3>
        {completedCount > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadAll}>
              <FileArchive className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '批量下载' : 'Download All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLongImage}
              disabled={isDownloadingLongImage}
            >
              {isDownloadingLongImage ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              {locale === 'zh' ? '长图下载' : 'Long Image'}
            </Button>
          </div>
        )}
      </div>

      {/* 卡片网格 - 调整为更紧凑的布局，图片更小 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((card, index) => (
          <Card key={card.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              {/* 图片区域 - 使用3:2比例，更紧凑 */}
              <div className="relative aspect-[4/3] bg-muted cursor-pointer group" onClick={() => card.status === 'completed' && card.imageUrl && openLightbox(index)}>
                {card.status === 'pending' && (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      {locale === 'zh' ? '等待中...' : 'Waiting...'}
                    </span>
                  </div>
                )}

                {card.status === 'generating' && (
                  <div className="flex h-full items-center justify-center">
                    <div className="space-y-2 text-center">
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {locale === 'zh' ? '生成中...' : 'Generating...'}
                      </span>
                    </div>
                  </div>
                )}

                {card.status === 'completed' && card.imageUrl && (
                  <>
                    <Image
                      src={card.imageUrl}
                      alt={`Visual note ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                    {/* 悬浮操作按钮 - 鼠标悬停时显示 */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(index);
                        }}
                        className="bg-white/90 hover:bg-white"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(card.imageUrl!, index);
                        }}
                        className="bg-white/90 hover:bg-white"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {onRegenerateWithPrompt && card.prompt && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(card);
                          }}
                          disabled={isRegenerating === card.id}
                          title={texts.adjust}
                          className="bg-white/90 hover:bg-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                      {onRegenerate && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmRegenCard(card);
                          }}
                          disabled={isRegenerating === card.id}
                          className="bg-white/90 hover:bg-white"
                        >
                          <RefreshCw className={cn(
                            "h-4 w-4",
                            isRegenerating === card.id && "animate-spin"
                          )} />
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {card.status === 'failed' && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                    <span className="text-sm text-destructive text-center">
                      {card.errorMessage || (locale === 'zh' ? '生成失败' : 'Generation failed')}
                    </span>
                    {onRegenerate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRegenCard(card)}
                        disabled={isRegenerating === card.id}
                      >
                        <RefreshCw className={cn(
                          "mr-2 h-4 w-4",
                          isRegenerating === card.id && "animate-spin"
                        )} />
                        {locale === 'zh' ? '重试' : 'Retry'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* 卡片底部信息 - 更紧凑 */}
              <div className="border-t p-2">
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {card.originalText || `${locale === 'zh' ? '卡片' : 'Card'} ${index + 1}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox 弹窗 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* 上一张 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox('prev');
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          {/* 图片 */}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {cards.filter(c => c.status === 'completed' && c.imageUrl)[lightboxIndex]?.imageUrl && (
              <Image
                src={cards.filter(c => c.status === 'completed' && c.imageUrl)[lightboxIndex].imageUrl!}
                alt={`Visual note ${lightboxIndex + 1}`}
                width={1024}
                height={1024}
                className="max-h-[90vh] w-auto object-contain"
              />
            )}
          </div>

          {/* 下一张 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox('next');
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* 计数器 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
            {lightboxIndex + 1} / {cards.filter(c => c.status === 'completed' && c.imageUrl).length}
          </div>
        </div>
      )}

      {/* 编辑 Prompt 弹窗 */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{texts.editPrompt}</DialogTitle>
            <DialogDescription>{texts.editDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{texts.prompt}</label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={8}
                placeholder={locale === 'zh' ? '输入提示词...' : 'Enter your prompt...'}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleRegenerateWithPrompt}
              disabled={!customPrompt.trim() || isRegenerating === editingCard?.id}
            >
              {isRegenerating === editingCard?.id ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {locale === 'zh' ? '生成中...' : 'Generating...'}
                </>
              ) : (
                texts.regenerate
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新生成确认弹窗 */}
      <Dialog open={!!confirmRegenCard} onOpenChange={(open) => !open && setConfirmRegenCard(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{texts.confirmTitle}</DialogTitle>
            <DialogDescription>{texts.confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRegenCard(null)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={() => {
                if (confirmRegenCard && onRegenerate) {
                  onRegenerate(confirmRegenCard.id);
                  setConfirmRegenCard(null);
                }
              }}
              disabled={isRegenerating === confirmRegenCard?.id}
            >
              {isRegenerating === confirmRegenCard?.id ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {locale === 'zh' ? '生成中...' : 'Generating...'}
                </>
              ) : (
                texts.confirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
