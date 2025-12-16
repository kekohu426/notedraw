'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Link, Loader2, X, FileText, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchUrlContentAction } from '@/actions/notedraw';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseFile } from '@/lib/file-parsers';

// URL 正则表达式
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

const MAX_LENGTH = 5000;
const ACCEPTED_FILE_TYPES = ['.txt', '.md', '.docx', '.pdf'];

export type InputTab = 'text' | 'url' | 'file';

interface ContentAreaProps {
  activeTab: InputTab;
  inputText: string;
  onInputTextChange: (value: string) => void;
  disabled?: boolean;
  locale?: 'en' | 'zh';
  onExtractStart?: () => void;
  onExtractEnd?: () => void;
}

interface ExtractedContent {
  title?: string;
  source?: string;
  content: string;
  wordCount: number;
}

interface UploadedFile {
  name: string;
  content: string;
  wordCount: number;
}

export function ContentArea({
  activeTab,
  inputText,
  onInputTextChange,
  disabled = false,
  locale = 'en',
  onExtractStart,
  onExtractEnd,
}: ContentAreaProps) {
  // URL Tab 状态
  const [urlValue, setUrlValue] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File Tab 状态
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理 URL 提取
  const handleFetchUrl = useCallback(async (url?: string) => {
    const targetUrl = url || urlValue.trim();
    if (!targetUrl) {
      toast.error(locale === 'zh' ? '请输入 URL' : 'Please enter a URL');
      return;
    }

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
        const content = result.data.content;
        onInputTextChange(content);

        // 提取域名作为来源
        const urlObj = new URL(formattedUrl);
        setExtractedContent({
          title: result.data.title || urlObj.hostname,
          source: urlObj.hostname,
          content: content,
          wordCount: content.length,
        });

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
  }, [urlValue, onInputTextChange, locale, onExtractStart, onExtractEnd]);

  // URL 输入变化时自动检测
  const handleUrlInputChange = useCallback((newUrl: string) => {
    setUrlValue(newUrl);
    // 当URL改变时，清除提取的内容状态，允许重新提取
    if (extractedContent) {
      setExtractedContent(null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedUrl = newUrl.trim();
    if (trimmedUrl && URL_REGEX.test(trimmedUrl)) {
      debounceTimerRef.current = setTimeout(() => {
        handleFetchUrl(trimmedUrl);
      }, 800);
    }
  }, [handleFetchUrl, extractedContent]);

  // 处理文件读取
  const handleFile = useCallback(async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isValidType = ACCEPTED_FILE_TYPES.some(ext => fileName.endsWith(ext));

    if (!isValidType) {
      toast.error(
        locale === 'zh'
          ? '只支持 .txt, .md, .docx, .pdf 文件'
          : 'Only .txt, .md, .docx, .pdf files are supported'
      );
      return;
    }

    setIsProcessingFile(true);
    onExtractStart?.();

    try {
      const content = await parseFile(file);
      let finalContent = content;

      if (content.length > MAX_LENGTH) {
        toast.warning(
          locale === 'zh'
            ? `文件内容已截断至 ${MAX_LENGTH.toLocaleString()} 字符`
            : `File content truncated to ${MAX_LENGTH.toLocaleString()} characters`
        );
        finalContent = content.slice(0, MAX_LENGTH);
      }

      onInputTextChange(finalContent);
      setUploadedFile({
        name: file.name,
        content: finalContent,
        wordCount: finalContent.length,
      });

      toast.success(
        locale === 'zh'
          ? `已加载: ${file.name}`
          : `Loaded: ${file.name}`
      );
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error(
        locale === 'zh'
          ? '文件解析失败'
          : 'Failed to parse file'
      );
    } finally {
      setIsProcessingFile(false);
      onExtractEnd?.();
    }
  }, [onInputTextChange, locale, onExtractStart, onExtractEnd]);

  // 拖拽事件
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

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  }, [handleFile]);

  // 清理
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 清除 URL 提取内容
  const handleClearUrl = useCallback(() => {
    setUrlValue('');
    setExtractedContent(null);
    onInputTextChange('');
  }, [onInputTextChange]);

  // 清除文件
  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    onInputTextChange('');
  }, [onInputTextChange]);

  const charCount = inputText.length;

  // 文本 Tab
  if (activeTab === 'text') {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {locale === 'zh' ? '输入或粘贴你的笔记内容' : 'Enter or paste your note content'}
          </span>
          <span className="text-xs text-muted-foreground">
            {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
          </span>
        </div>
        <Textarea
          value={inputText}
          onChange={(e) => onInputTextChange(e.target.value)}
          disabled={disabled}
          placeholder={
            locale === 'zh'
              ? '在这里输入或粘贴你的笔记内容...\n\n支持各种文本格式，AI 将自动分析并生成视觉笔记。'
              : 'Enter or paste your note content here...\n\nSupports various text formats, AI will analyze and generate visual notes.'
          }
          className="flex-1 resize-none text-base leading-relaxed"
        />
      </div>
    );
  }

  // URL Tab
  if (activeTab === 'url') {
    return (
      <div className="flex h-full flex-col p-6">
        {/* URL 输入框 */}
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                value={urlValue}
                onChange={(e) => handleUrlInputChange(e.target.value)}
                placeholder={locale === 'zh' ? '粘贴网页链接...' : 'Paste URL...'}
                disabled={isLoadingUrl || disabled}
                className="pl-9 pr-8"
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
                  onClick={() => {
                    setUrlValue('');
                    setExtractedContent(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={() => handleFetchUrl()}
              disabled={isLoadingUrl || !urlValue.trim() || disabled || !!extractedContent}
            >
              {isLoadingUrl ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {locale === 'zh' ? '读取中' : 'Loading'}
                </>
              ) : extractedContent ? (
                locale === 'zh' ? '已提取' : 'Extracted'
              ) : (
                locale === 'zh' ? '提取' : 'Extract'
              )}
            </Button>
          </div>
        </div>

        {/* 提取结果预览 */}
        {extractedContent ? (
          <div className="flex-1 flex flex-col rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">{locale === 'zh' ? '已提取内容' : 'Content Extracted'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearUrl}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="font-medium truncate">{extractedContent.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {extractedContent.source} · {extractedContent.wordCount.toLocaleString()} {locale === 'zh' ? '字' : 'chars'}
              </p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {extractedContent.content}
              </p>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Link className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">
              {locale === 'zh' ? '粘贴网页链接' : 'Paste a URL'}
            </p>
            <p className="text-sm mt-1">
              {locale === 'zh'
                ? 'AI 将自动提取网页内容并在此处显示预览'
                : 'AI will extract web content and show preview here'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // File Tab
  if (activeTab === 'file') {
    return (
      <div className="flex h-full flex-col p-6">
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isProcessingFile}
        />

        {uploadedFile ? (
          // 已上传文件预览
          <div className="flex-1 flex flex-col rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">{locale === 'zh' ? '已读取文件' : 'File Loaded'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearFile}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-medium truncate">{uploadedFile.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {uploadedFile.wordCount.toLocaleString()} {locale === 'zh' ? '字' : 'chars'}
              </p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {uploadedFile.content}
              </p>
            </ScrollArea>
          </div>
        ) : (
          // 上传区域
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={isProcessingFile ? undefined : handleUploadClick}
            className={cn(
              'flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
              isProcessingFile && 'cursor-wait opacity-70 hover:bg-transparent hover:border-muted-foreground/25'
            )}
          >
            {isProcessingFile ? (
              <>
                <Loader2 className="h-12 w-12 mb-4 animate-spin text-primary" />
                <p className="text-lg font-medium">
                  {locale === 'zh' ? '正在解析文件...' : 'Parsing file...'}
                </p>
              </>
            ) : (
              <>
                <Upload className={cn(
                  'h-12 w-12 mb-4',
                  isDragging ? 'text-primary' : 'text-muted-foreground/50'
                )} />
                <p className="text-lg font-medium">
                  {isDragging
                    ? (locale === 'zh' ? '释放以上传' : 'Drop to upload')
                    : (locale === 'zh' ? '拖拽文件到这里' : 'Drag file here')
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {locale === 'zh' ? '或点击选择文件' : 'or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  {locale === 'zh' ? '支持 .txt, .md, .docx, .pdf 格式' : 'Supports .txt, .md, .docx, .pdf files'}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
