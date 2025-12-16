'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';
import type { LeftBrainData } from '@/ai/notedraw/types';

interface StructureEditorProps {
  structures: LeftBrainData[];
  onChange: (structures: LeftBrainData[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  locale?: 'en' | 'zh';
}

interface EditingState {
  cardIndex: number;
  moduleIndex?: number;
  field: 'title' | 'heading' | 'content' | 'keywords';
}

export function StructureEditor({
  structures,
  onChange,
  onConfirm,
  onCancel,
  disabled = false,
  locale = 'zh',
}: StructureEditorProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback((state: EditingState, currentValue: string) => {
    setEditing(state);
    setEditValue(currentValue);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editing) return;

    const newStructures = [...structures];
    const card = { ...newStructures[editing.cardIndex] };

    if (editing.field === 'title') {
      card.title = editValue;
    } else if (editing.moduleIndex !== undefined) {
      const modules = [...card.modules];
      const module = { ...modules[editing.moduleIndex] };

      if (editing.field === 'heading') {
        module.heading = editValue;
      } else if (editing.field === 'content') {
        module.content = editValue;
      } else if (editing.field === 'keywords') {
        module.keywords = editValue.split(',').map(k => k.trim()).filter(Boolean);
      }

      modules[editing.moduleIndex] = module;
      card.modules = modules;
    }

    newStructures[editing.cardIndex] = card;
    onChange(newStructures);
    setEditing(null);
    setEditValue('');
  }, [editing, editValue, structures, onChange]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditValue('');
  }, []);

  const deleteModule = useCallback((cardIndex: number, moduleIndex: number) => {
    const newStructures = [...structures];
    const card = { ...newStructures[cardIndex] };
    card.modules = card.modules.filter((_, i) => i !== moduleIndex);
    newStructures[cardIndex] = card;
    onChange(newStructures);
  }, [structures, onChange]);

  const addModule = useCallback((cardIndex: number) => {
    const newStructures = [...structures];
    const card = { ...newStructures[cardIndex] };
    card.modules = [
      ...card.modules,
      {
        id: String(card.modules.length + 1),
        heading: locale === 'zh' ? '新板块' : 'New Section',
        content: locale === 'zh' ? '点击编辑内容' : 'Click to edit content',
        keywords: [],
      },
    ];
    newStructures[cardIndex] = card;
    onChange(newStructures);
  }, [structures, onChange, locale]);

  const isEditing = (cardIndex: number, moduleIndex?: number, field?: string) => {
    if (!editing) return false;
    if (editing.cardIndex !== cardIndex) return false;
    if (moduleIndex !== undefined && editing.moduleIndex !== moduleIndex) return false;
    if (field && editing.field !== field) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* 顶部说明 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        {locale === 'zh'
          ? '📝 以下是AI拆解的结果，你可以点击编辑任何内容。确认后将生成视觉笔记。'
          : '📝 Below is the AI analysis result. Click to edit any content. Confirm to generate visual notes.'}
      </div>

      {/* 卡片列表 */}
      <div className="space-y-4">
        {structures.map((structure, cardIndex) => (
          <Card key={cardIndex} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0">
                  {locale === 'zh' ? `卡片 ${cardIndex + 1}` : `Card ${cardIndex + 1}`}
                </Badge>

                {isEditing(cardIndex, undefined, 'title') ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <CardTitle
                    className="flex-1 cursor-pointer text-lg hover:text-primary"
                    onClick={() => startEdit({ cardIndex, field: 'title' }, structure.title)}
                  >
                    {structure.title}
                    <Pencil className="ml-2 inline h-3 w-3 opacity-50" />
                  </CardTitle>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="space-y-3">
                {structure.modules.map((module, moduleIndex) => (
                  <div
                    key={module.id}
                    className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/50"
                  >
                    {/* 板块标题 */}
                    <div className="mb-2 flex items-center justify-between">
                      {isEditing(cardIndex, moduleIndex, 'heading') ? (
                        <div className="flex flex-1 items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 text-sm font-medium"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <h4
                          className="cursor-pointer font-medium hover:text-primary"
                          onClick={() =>
                            startEdit({ cardIndex, moduleIndex, field: 'heading' }, module.heading)
                          }
                        >
                          {moduleIndex + 1}. {module.heading}
                          <Pencil className="ml-1 inline h-3 w-3 opacity-50" />
                        </h4>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteModule(cardIndex, moduleIndex)}
                        disabled={structure.modules.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* 内容 */}
                    {isEditing(cardIndex, moduleIndex, 'content') ? (
                      <div className="mb-2 space-y-2">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={saveEdit}>
                            <Check className="mr-1 h-3 w-3" />
                            {locale === 'zh' ? '保存' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            {locale === 'zh' ? '取消' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="mb-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          startEdit({ cardIndex, moduleIndex, field: 'content' }, module.content)
                        }
                      >
                        {module.content}
                        <Pencil className="ml-1 inline h-3 w-3 opacity-50" />
                      </p>
                    )}

                    {/* 关键词 */}
                    {isEditing(cardIndex, moduleIndex, 'keywords') ? (
                      <div className="space-y-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder={locale === 'zh' ? '关键词用逗号分隔' : 'Separate keywords with commas'}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={saveEdit}>
                            <Check className="mr-1 h-3 w-3" />
                            {locale === 'zh' ? '保存' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            {locale === 'zh' ? '取消' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex cursor-pointer flex-wrap gap-1"
                        onClick={() =>
                          startEdit(
                            { cardIndex, moduleIndex, field: 'keywords' },
                            (module.keywords || []).join(', ')
                          )
                        }
                      >
                        {(module.keywords || []).length > 0 ? (
                          module.keywords?.map((keyword, ki) => (
                            <Badge key={ki} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {locale === 'zh' ? '点击添加关键词' : 'Click to add keywords'}
                          </span>
                        )}
                        <Pencil className="ml-1 inline h-3 w-3 opacity-50" />
                      </div>
                    )}
                  </div>
                ))}

                {/* 添加板块按钮 */}
                {structure.modules.length < 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => addModule(cardIndex)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {locale === 'zh' ? '添加板块' : 'Add Section'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 底部操作 */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={disabled}>
          {locale === 'zh' ? '返回修改' : 'Go Back'}
        </Button>
        <Button onClick={onConfirm} disabled={disabled}>
          {locale === 'zh' ? '确认生成图片' : 'Confirm & Generate'}
        </Button>
      </div>
    </div>
  );
}
