'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Upload, ChevronDown, ChevronUp, Link, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fetchUrlContentAction } from '@/actions/notedraw';

// URL 正则表达式
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

const MAX_LENGTH = 5000;
const ACCEPTED_FILE_TYPES = ['.txt', '.md'];

const SAMPLE_TEXT = {
  en: `What is RAG (Retrieval-Augmented Generation)?

RAG is an AI technique that combines retrieval and generation. It works in three steps:

1. Retrieval: When you ask a question, the system searches a knowledge base for relevant information.

2. Augmentation: The retrieved information is added to your question as context.

3. Generation: The AI model uses both the original question and the retrieved context to generate a more accurate, grounded response.

Benefits of RAG:
- Reduces hallucinations by grounding responses in real data
- Allows the model to access up-to-date information
- Can cite sources for transparency`,
  zh: `什么是 RAG（检索增强生成）？

RAG 是一种结合检索和生成的 AI 技术。它分三步工作：

1. 检索：当你提问时，系统会在知识库中搜索相关信息。

2. 增强：检索到的信息被添加到你的问题中作为上下文。

3. 生成：AI 模型使用原始问题和检索到的上下文来生成更准确、有依据的回答。

RAG 的优势：
- 通过将回答建立在真实数据上来减少幻觉
- 允许模型访问最新信息
- 可以引用来源以提高透明度`,
};

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  locale?: 'en' | 'zh';
  onExtractStart?: () => void;
  onExtractEnd?: () => void;
}

export function InputPanel({
  value,
  onChange,
  disabled = false,
  locale = 'en',
  onExtractStart,
  onExtractEnd,
}: InputPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 当内容长度超过阈值时，显示折叠按钮
  const COLLAPSE_THRESHOLD = 300;
  const canCollapse = value.length > COLLAPSE_THRESHOLD;

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleLoadSample = useCallback(() => {
    onChange(SAMPLE_TEXT[locale]);
  }, [onChange, locale]);

  // 处理文件读取
  const handleFile = useCallback((file: File) => {
    const fileName = file.name.toLowerCase();
    const isValidType = ACCEPTED_FILE_TYPES.some(ext => fileName.endsWith(ext));

    if (!isValidType) {
      toast.error(
        locale === 'zh'
          ? '只支持 .txt 和 .md 文件'
          : 'Only .txt and .md files are supported'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content.length > MAX_LENGTH) {
        toast.warning(
          locale === 'zh'
            ? `文件内容已截断至 ${MAX_LENGTH.toLocaleString()} 字符`
            : `File content truncated to ${MAX_LENGTH.toLocaleString()} characters`
        );
        onChange(content.slice(0, MAX_LENGTH));
      } else {
        onChange(content);
        toast.success(
          locale === 'zh'
            ? `已加载: ${file.name}`
            : `Loaded: ${file.name}`
        );
      }
    };
    reader.onerror = () => {
      toast.error(
        locale === 'zh'
          ? '文件读取失败'
          : 'Failed to read file'
      );
    };
    reader.readAsText(file);
  }, [onChange, locale]);

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  // 点击上传
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // 清空 input 以便可以重复选择同一个文件
    e.target.value = '';
  }, [handleFile]);

  // 处理 URL 提取
  const handleFetchUrl = useCallback(async (url?: string) => {
    const targetUrl = url || urlValue.trim();
    if (!targetUrl) {
      toast.error(locale === 'zh' ? '请输入 URL' : 'Please enter a URL');
      return;
    }

    // 验证 URL 格式
    let formattedUrl = targetUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch {
      toast.error(locale === 'zh' ? 'URL 格式无效' : 'Invalid URL format');
      return;
    }

    setIsLoadingUrl(true);
    onExtractStart?.();
    try {
      const result = await fetchUrlContentAction({ url: formattedUrl });

      if (result?.data?.success && result.data.content) {
        onChange(result.data.content);
        setShowUrlInput(false);
        setUrlValue('');
        toast.success(
          locale === 'zh'
            ? (result.data.truncated ? '已提取内容（已截断）' : '已成功提取内容')
            : (result.data.truncated ? 'Content extracted (truncated)' : 'Content extracted successfully')
        );
      } else {
        const errorMsg = result?.data?.error || (locale === 'zh' ? '无法提取内容' : 'Failed to extract content');
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Fetch URL error:', error);
      toast.error(locale === 'zh' ? '网络请求失败' : 'Network request failed');
    } finally {
      setIsLoadingUrl(false);
      onExtractEnd?.();
    }
  }, [urlValue, onChange, locale, onExtractStart, onExtractEnd]);

  // URL 输入变化时自动检测并触发提取
  const handleUrlInputChange = useCallback((newUrl: string) => {
    setUrlValue(newUrl);

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 检测是否是有效的 URL（包含完整域名）
    const trimmedUrl = newUrl.trim();
    if (trimmedUrl && URL_REGEX.test(trimmedUrl)) {
      // 800ms 后自动触发提取
      debounceTimerRef.current = setTimeout(() => {
        handleFetchUrl(trimmedUrl);
      }, 800);
    }
  }, [handleFetchUrl]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const charCount = value.length;
  const isOverLimit = charCount > MAX_LENGTH;

  // 获取摘要文本（折叠时显示）
  const getSummaryText = () => {
    if (value.length <= 100) return value;
    return value.slice(0, 100) + '...';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          {locale === 'zh' ? '输入你的笔记内容' : 'Enter your note content'}
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            disabled={disabled || isLoadingUrl}
          >
            <Link className="mr-1 h-4 w-4" />
            URL
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUploadClick}
            disabled={disabled}
          >
            <Upload className="mr-1 h-4 w-4" />
            {locale === 'zh' ? '上传' : 'Upload'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLoadSample}
            disabled={disabled}
          >
            <FileText className="mr-1 h-4 w-4" />
            {locale === 'zh' ? '示例' : 'Sample'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {locale === 'zh' ? '清空' : 'Clear'}
            </Button>
          )}
        </div>
      </div>

      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* URL 输入区域 */}
      {showUrlInput && (
        <div className="flex gap-2 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1 relative">
            <Input
              type="url"
              value={urlValue}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              placeholder={locale === 'zh' ? '粘贴网页链接，将自动提取内容...' : 'Paste URL, content will be extracted automatically...'}
              disabled={isLoadingUrl}
              className="pr-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoadingUrl) {
                  e.preventDefault();
                  handleFetchUrl();
                }
              }}
            />
            {urlValue && !isLoadingUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setUrlValue('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => handleFetchUrl()}
            disabled={isLoadingUrl || !urlValue.trim()}
          >
            {isLoadingUrl ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                {locale === 'zh' ? '读取中' : 'Loading'}
              </>
            ) : (
              locale === 'zh' ? '提取' : 'Extract'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowUrlInput(false);
              setUrlValue('');
            }}
            disabled={isLoadingUrl}
          >
            {locale === 'zh' ? '取消' : 'Cancel'}
          </Button>
        </div>
      )}

      {/* 折叠/展开区域 */}
      {canCollapse && isCollapsed ? (
        // 折叠状态：显示摘要
        <div
          className="cursor-pointer rounded-md border bg-muted/50 p-3 transition-colors hover:bg-muted"
          onClick={() => setIsCollapsed(false)}
        >
          <p className="text-sm text-muted-foreground line-clamp-2">
            {getSummaryText()}
          </p>
          <div className="mt-2 flex items-center justify-center text-xs text-primary">
            <ChevronDown className="mr-1 h-3 w-3" />
            {locale === 'zh' ? '点击展开编辑' : 'Click to expand'}
          </div>
        </div>
      ) : (
        // 展开状态：显示完整编辑区
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-md transition-all',
            isDragging && 'ring-2 ring-primary ring-offset-2'
          )}
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={
              locale === 'zh'
                ? '粘贴你的文本内容，或者拖拽 .txt / .md 文件到这里...'
                : 'Paste your text content, or drag and drop .txt / .md files here...'
            }
            className={cn(
              'min-h-[120px] max-h-[200px] resize-none',
              isDragging && 'opacity-50'
            )}
          />

          {/* 拖拽覆盖层 */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/10">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-2 text-sm font-medium text-primary">
                  {locale === 'zh' ? '释放以上传文件' : 'Drop to upload'}
                </p>
                <p className="text-xs text-muted-foreground">
                  .txt, .md
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部：字数统计 + 折叠按钮 */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={
            isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
          }
        >
          {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          {isOverLimit && (
            <span className="text-destructive">
              {locale === 'zh' ? '超出字数限制' : 'Exceeds character limit'}
            </span>
          )}
          {canCollapse && !isCollapsed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronUp className="mr-1 h-3 w-3" />
              {locale === 'zh' ? '收起' : 'Collapse'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
