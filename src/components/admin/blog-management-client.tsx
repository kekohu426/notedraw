'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Sparkles,
  Loader2,
  ExternalLink,
  RefreshCw,
  Check,
  Languages,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateBlogAction, listBlogsAction } from '@/actions/blog';

// 分类选项
const CATEGORIES = [
  { value: 'product', label: '产品', labelEn: 'Product' },
  { value: 'news', label: '新闻', labelEn: 'News' },
  { value: 'company', label: '公司', labelEn: 'Company' },
];

// 风格选项
const STYLES = [
  { value: 'professional', label: '专业', labelEn: 'Professional' },
  { value: 'casual', label: '轻松', labelEn: 'Casual' },
  { value: 'tutorial', label: '教程', labelEn: 'Tutorial' },
];

// 语言选项
const LANGUAGES = [
  { value: 'both', label: '中英双语', labelEn: 'Both' },
  { value: 'zh', label: '仅中文', labelEn: 'Chinese Only' },
  { value: 'en', label: '仅英文', labelEn: 'English Only' },
];

interface BlogItem {
  slug: string;
  hasZh: boolean;
}

export function BlogManagementClient() {
  // 列表状态
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 表单状态
  const [topic, setTopic] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['product']);
  const [language, setLanguage] = useState<'both' | 'zh' | 'en'>('both');
  const [style, setStyle] = useState<'professional' | 'casual' | 'tutorial'>('casual');
  const [keywords, setKeywords] = useState('');

  // 加载博客列表
  const loadBlogs = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const result = await listBlogsAction({ page, pageSize: 20 });
      if (result?.data?.success) {
        setBlogs(result.data.blogs as BlogItem[]);
        setTotalPages(result.data.totalPages as number);
      }
    } catch (error) {
      console.error('Load blogs error:', error);
      toast.error('加载博客列表失败');
    } finally {
      setIsLoadingList(false);
    }
  }, [page]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  // 处理分类选择
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 生成博客
  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('请输入文章主题');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('请选择至少一个分类');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateBlogAction({
        topic: topic.trim(),
        categories: selectedCategories,
        language,
        style,
        keywords: keywords.trim() ? keywords.split(',').map(k => k.trim()) : undefined,
      });

      if (result?.data?.success) {
        toast.success(`成功生成 ${result.data.articles?.length || 0} 篇文章`);
        setDialogOpen(false);
        // 重置表单
        setTopic('');
        setKeywords('');
        // 刷新列表
        loadBlogs();
      } else {
        toast.error(result?.data?.error || '生成失败');
      }
    } catch (error) {
      console.error('Generate blog error:', error);
      toast.error('生成博客时出错');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">博客管理</h1>
          <p className="text-sm text-muted-foreground">
            使用 AI 自动生成博客文章，保持站点内容更新
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBlogs}
            disabled={isLoadingList}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                生成新文章
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI 生成博客文章
                </DialogTitle>
                <DialogDescription>
                  输入主题，AI 将自动生成 SEO 友好的博客文章
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* 主题输入 */}
                <div className="space-y-2">
                  <Label htmlFor="topic">文章主题 *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如：视觉笔记的10个使用技巧"
                    disabled={isGenerating}
                  />
                </div>

                {/* 分类选择 */}
                <div className="space-y-2">
                  <Label>分类 *</Label>
                  <div className="flex gap-4">
                    {CATEGORIES.map(cat => (
                      <div key={cat.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${cat.value}`}
                          checked={selectedCategories.includes(cat.value)}
                          onCheckedChange={() => toggleCategory(cat.value)}
                          disabled={isGenerating}
                        />
                        <label
                          htmlFor={`cat-${cat.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {cat.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 语言选择 */}
                <div className="space-y-2">
                  <Label>生成语言</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as typeof language)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 风格选择 */}
                <div className="space-y-2">
                  <Label>写作风格</Label>
                  <Select
                    value={style}
                    onValueChange={(v) => setStyle(v as typeof style)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 关键词 */}
                <div className="space-y-2">
                  <Label htmlFor="keywords">SEO 关键词（可选）</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="用逗号分隔，例如：视觉笔记,学习方法,AI工具"
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    关键词将自然融入文章内容中
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isGenerating}
                >
                  取消
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成文章
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 博客列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            已有文章
          </CardTitle>
          <CardDescription>
            共 {blogs.length} 篇文章（MDX 文件）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无文章，点击上方按钮生成第一篇
            </div>
          ) : (
            <div className="space-y-2">
              {blogs.map((blog) => (
                <div
                  key={blog.slug}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{blog.slug}</span>
                    {blog.hasZh && (
                      <Badge variant="secondary" className="gap-1">
                        <Languages className="h-3 w-3" />
                        双语
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`/blog/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提示说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            生成的文章会自动保存为 MDX 文件到 /content/blog 目录
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            选择"中英双语"会同时生成 .mdx 和 .zh.mdx 两个文件
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            部署到 Vercel 后会自动触发重新构建，文章即刻上线
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            可以手动编辑生成的 MDX 文件进行微调
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
