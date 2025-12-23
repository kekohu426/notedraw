'use client';

import { shareToPlazaAction } from '@/actions/plaza';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShareToPlazaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle?: string;
  onSuccess?: (slug: string) => void;
}

export function ShareToPlazaDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  onSuccess,
}: ShareToPlazaDialogProps) {
  const t = useTranslations('Plaza.share');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(projectTitle || '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [agreed, setAgreed] = useState(true);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!agreed) {
      toast.error('Please agree to share publicly');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await shareToPlazaAction({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.trim() || undefined,
      });

      if (result?.data?.success && result.data.slug) {
        toast.success(t('success'));
        onOpenChange(false);
        onSuccess?.(result.data.slug);
      } else {
        toast.error(result?.data?.error || t('error'));
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('noteTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('noteTitlePlaceholder')}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('noteDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('noteDescriptionPlaceholder')}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t('tags')}</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('tagsPlaceholder')}
              maxLength={200}
            />
          </div>

          {/* Agreement */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="agreement"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label htmlFor="agreement" className="text-sm cursor-pointer">
              {t('agreement')}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !agreed || !title.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                {t('submit')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
