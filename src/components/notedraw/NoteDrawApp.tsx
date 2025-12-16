'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { StyleSelector } from './StyleSelector';
import { ModeSelector } from './ModeSelector';
import { GenerateButton } from './GenerateButton';
import { Workbench } from './Workbench';
import { ResultGallery } from './ResultGallery';
import { ContentArea, type InputTab } from './ContentArea';
import { createProjectAction, generateNotesAction, regenerateCardAction, regenerateWithPromptAction } from '@/actions/notedraw';
import type { VisualStyle, GenerateMode, AIConfig, LeftBrainData } from '@/ai/notedraw/types';
import { getUserFriendlyError, getErrorIcon } from './error-messages';
import { RecentSketches } from './RecentSketches';

// 默认AI配置
const DEFAULT_AI_CONFIG: AIConfig = {
  apiProvider: 'gemini',
  imageModel: 'gemini-2.0-flash-preview-image-generation',
  textModel: 'glm-4-flash',
  usePlaceholder: false,
  customProvider: undefined,
};

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText, Link, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProcessStage = 'idle' | 'extracting' | 'organizing' | 'designing' | 'painting' | 'done' | 'error';

interface NoteCard {
  id: string;
  order: number;
  originalText?: string;
  structure?: LeftBrainData;
  prompt?: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

interface NoteDrawAppProps {
  locale?: 'en' | 'zh';
  initialCredits?: number;
}

export function NoteDrawApp({ locale = 'en', initialCredits = 0 }: NoteDrawAppProps) {
  // 输入状态
  const [inputText, setInputText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>('sketch');
  const [generateMode, setGenerateMode] = useState<GenerateMode>('detailed');
  const [signature, setSignature] = useState('娇姐手绘整理');
  const [imageLanguage, setImageLanguage] = useState<'zh' | 'en'>(locale);

  // Tab 状态
  const [activeTab, setActiveTab] = useState<InputTab>('text');

  // AI配置（使用默认值）
  const aiConfig = DEFAULT_AI_CONFIG;

  // 处理状态
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [progress, setProgress] = useState(0);
  const [currentUnit, setCurrentUnit] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();

  // 结果状态
  const [projectId, setProjectId] = useState<string | null>(null);
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  // UI状态
  const [settingsOpen, setSettingsOpen] = useState(true); // 默认展开，方便用户配置

  // 重置状态
  const resetState = useCallback(() => {
    setStage('idle');
    setProgress(0);
    setCurrentUnit(0);
    setTotalUnits(0);
    setErrorMessage(undefined);
  }, []);

  // 分析文本（详细模式第一步）
  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) {
      toast.error(locale === 'zh' ? '请输入内容' : 'Please enter some text');
      return;
    }

    try {
      resetState();
      setStage('organizing');
      setProgress(10);

      // 创建项目并获取分析结果
      const createResult = await createProjectAction({
        inputText: inputText.trim(),
        language: imageLanguage,
        visualStyle: selectedStyle,
        generateMode,
        signature,
        aiConfig,
      });

      if (!createResult?.data?.success || !createResult.data.projectId) {
        throw new Error(createResult?.data?.error || 'Failed to create project');
      }

      const newProjectId = createResult.data.projectId;
      setProjectId(newProjectId);
      setProgress(30);

      // 获取分析结果
      const generateResult = await generateNotesAction({
        projectId: newProjectId,
        aiConfig,
      });

      if (!generateResult?.data?.success) {
        throw new Error(generateResult?.data?.error || 'Analysis failed');
      }

      // 直接显示结果
      const resultCards = generateResult.data.cards || [];
      setStage('done');
      setProgress(100);
      setTotalUnits(resultCards.length);
      setCurrentUnit(resultCards.length);
      setCards(resultCards.map((card: NoteCard) => ({
        id: card.id,
        order: card.order,
        originalText: card.originalText,
        prompt: card.prompt,
        imageUrl: card.imageUrl,
        status: card.status,
        errorMessage: card.errorMessage,
      })));
      toast.success(locale === 'zh' ? '生成完成！' : 'Generation complete!');

    } catch (error) {
      console.error('Analysis error:', error);
      setStage('error');
      const friendlyError = getUserFriendlyError(error, locale);
      setErrorMessage(friendlyError);
      toast.error(friendlyError);
    }
  }, [inputText, selectedStyle, generateMode, signature, imageLanguage, locale, resetState, aiConfig]);

  // 精简模式：直接生成
  const handleQuickGenerate = useCallback(async () => {
    if (!inputText.trim()) {
      toast.error(locale === 'zh' ? '请输入内容' : 'Please enter some text');
      return;
    }

    try {
      resetState();
      setStage('organizing');
      setProgress(10);

      const createResult = await createProjectAction({
        inputText: inputText.trim(),
        language: imageLanguage,
        visualStyle: selectedStyle,
        generateMode: 'compact',
        signature,
        aiConfig,
      });

      console.log('🔍 createResult:', createResult);
      console.log('🔍 createResult.data:', createResult?.data);
      console.log('🔍 createResult.validationErrors:', createResult?.validationErrors);
      if (createResult?.validationErrors?.inputText) {
        console.error('🔴 inputText validation error:', createResult.validationErrors.inputText);
      }
      console.log('🔍 createResult.serverError:', createResult?.serverError);
      console.log('🔍 inputText being sent:', { text: inputText, length: inputText.length, trimmed: inputText.trim().length });

      if (!createResult?.data?.success || !createResult.data.projectId) {
        console.error('🔴 Create failed:', {
          hasData: !!createResult?.data,
          success: createResult?.data?.success,
          projectId: createResult?.data?.projectId,
          error: createResult?.data?.error,
        });
        throw new Error(createResult?.data?.error || 'Failed to create project');
      }

      const newProjectId = createResult.data.projectId;
      setProjectId(newProjectId);
      setProgress(30);

      setStage('painting');
      setProgress(50);

      const generateResult = await generateNotesAction({
        projectId: newProjectId,
        aiConfig,
      });

      if (!generateResult?.data?.success) {
        throw new Error(generateResult?.data?.error || 'Generation failed');
      }

      setStage('done');
      setProgress(100);

      const resultCards = generateResult.data.cards || [];
      setTotalUnits(resultCards.length);
      setCurrentUnit(resultCards.length);
      setCards(resultCards.map((card: NoteCard) => ({
        id: card.id,
        order: card.order,
        originalText: card.originalText,
        prompt: card.prompt,
        imageUrl: card.imageUrl,
        status: card.status,
        errorMessage: card.errorMessage,
      })));

      toast.success(locale === 'zh' ? '生成完成！' : 'Generation complete!');

    } catch (error) {
      console.error('Generation error:', error);
      setStage('error');
      const friendlyError = getUserFriendlyError(error, locale);
      setErrorMessage(friendlyError);
      toast.error(friendlyError);
    }
  }, [inputText, selectedStyle, signature, imageLanguage, locale, resetState, aiConfig]);

  // 重新生成单张卡片
  const handleRegenerate = useCallback(async (cardId: string) => {
    setIsRegenerating(cardId);

    try {
      setCards(prev => prev.map(card =>
        card.id === cardId
          ? { ...card, status: 'generating' as const }
          : card
      ));

      const result = await regenerateCardAction({
        cardId,
        aiConfig,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Regeneration failed');
      }

      setCards(prev => prev.map(card =>
        card.id === cardId
          ? {
            ...card,
            status: 'completed' as const,
            imageUrl: result.data?.card?.imageUrl,
            errorMessage: undefined,
          }
          : card
      ));

      toast.success(locale === 'zh' ? '重新生成成功！' : 'Regeneration complete!');

    } catch (error) {
      console.error('Regeneration error:', error);
      const friendlyError = getUserFriendlyError(error, locale);

      setCards(prev => prev.map(card =>
        card.id === cardId
          ? {
            ...card,
            status: 'failed' as const,
            errorMessage: friendlyError,
          }
          : card
      ));

      toast.error(friendlyError);
    } finally {
      setIsRegenerating(null);
    }
  }, [locale, aiConfig]);

  // 使用自定义 Prompt 重新生成
  const handleRegenerateWithPrompt = useCallback(async (cardId: string, customPrompt: string) => {
    setIsRegenerating(cardId);

    try {
      setCards(prev => prev.map(card =>
        card.id === cardId
          ? { ...card, status: 'generating' as const }
          : card
      ));

      const result = await regenerateWithPromptAction({
        cardId,
        customPrompt,
        aiConfig,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Regeneration failed');
      }

      setCards(prev => prev.map(card =>
        card.id === cardId
          ? {
            ...card,
            status: 'completed' as const,
            imageUrl: result.data?.card?.imageUrl,
            prompt: result.data?.card?.prompt,
            errorMessage: undefined,
          }
          : card
      ));

      toast.success(locale === 'zh' ? '重新生成成功！' : 'Regeneration complete!');

    } catch (error) {
      console.error('Regeneration with prompt error:', error);
      const friendlyError = getUserFriendlyError(error, locale);

      setCards(prev => prev.map(card =>
        card.id === cardId
          ? {
            ...card,
            status: 'failed' as const,
            errorMessage: friendlyError,
          }
          : card
      ));

      toast.error(friendlyError);
    } finally {
      setIsRegenerating(null);
    }
  }, [locale, aiConfig]);

  // 新建项目
  const handleNewProject = useCallback(() => {
    setInputText('');
    setCards([]);
    setProjectId(null);
    resetState();
  }, [resetState]);

  const isProcessing = stage === 'extracting' || stage === 'organizing' || stage === 'designing' || stage === 'painting';
  const hasResults = stage === 'done' && cards.length > 0;
  const showInput = stage === 'idle' || stage === 'error' || stage === 'extracting';

  // Tab 配置
  const tabs: { id: InputTab; icon: React.ReactNode; label: { zh: string; en: string } }[] = [
    { id: 'text', icon: <Type className="h-4 w-4" />, label: { zh: '文本', en: 'Text' } },
    { id: 'url', icon: <Link className="h-4 w-4" />, label: { zh: '网页', en: 'URL' } },
    { id: 'file', icon: <FileText className="h-4 w-4" />, label: { zh: '文件', en: 'File' } },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] gap-6 p-4">
      {/* ========== 左侧：Tab 切换和配置 ========== */}
      <div className="flex w-[320px] shrink-0 flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {locale === 'zh' ? '视觉笔记生成器' : 'Visual Note Generator'}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === 'zh'
                  ? '将文字转换为精美的手绘风格视觉笔记'
                  : 'Transform text into beautiful hand-drawn visual notes'}
              </p>
            </div>

            {/* Tab 切换 */}
            <div className="flex rounded-lg border bg-muted/50 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isProcessing}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {tab.icon}
                  {tab.label[locale]}
                </button>
              ))}
            </div>

            {/* 模式选择 */}
            <ModeSelector
              value={generateMode}
              onChange={setGenerateMode}
              disabled={isProcessing}
              locale={locale}
            />

            {/* 可折叠的风格与设置 */}
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted">
                <span>{locale === 'zh' ? '风格与设置' : 'Style & Settings'}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                {/* 风格选择 */}
                <StyleSelector
                  value={selectedStyle}
                  onChange={setSelectedStyle}
                  disabled={isProcessing}
                  locale={locale}
                />

                {/* 图片语言选择 */}
                <div className="space-y-2">
                  <Label className="text-xs">
                    {locale === 'zh' ? '图片文字语言' : 'Image Text Language'}
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImageLanguage('zh')}
                      disabled={isProcessing}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${imageLanguage === 'zh'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                        } disabled:opacity-50`}
                    >
                      中文
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageLanguage('en')}
                      disabled={isProcessing}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${imageLanguage === 'en'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                        } disabled:opacity-50`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* 署名配置 */}
                <div className="space-y-2">
                  <Label htmlFor="signature" className="text-xs">
                    {locale === 'zh' ? '署名（显示在图片右下角）' : 'Signature (bottom-right corner)'}
                  </Label>
                  <Input
                    id="signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={locale === 'zh' ? '娇姐手绘整理' : 'Your signature'}
                    disabled={isProcessing}
                    className="h-8 text-sm"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* 固定在底部的生成按钮 */}
        <div className="shrink-0 border-t bg-background pt-4">
          <GenerateButton
            onClick={generateMode === 'compact' ? handleQuickGenerate : handleAnalyze}
            disabled={!inputText.trim()}
            loading={isProcessing}
            locale={locale}
            estimatedCredits={generateMode === 'compact' ? 6 : 26}
          />
        </div>
      </div>

      {/* ========== 右侧：内容输入/结果展示 ========== */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-muted/30">
        {/* AI 工作台 - 处理中或完成时显示 */}
        {(isProcessing || hasResults) && (
          <div className="shrink-0 border-b bg-background p-4">
            <Workbench
              stage={stage}
              progress={progress}
              currentUnit={currentUnit}
              totalUnits={totalUnits}
              errorMessage={errorMessage}
              projectId={projectId}
              locale={locale}
            />
          </div>
        )}

        {/* 内容区域 */}
        {showInput && !hasResults ? (
          // 输入模式：根据 Tab 显示不同内容
          <ContentArea
            activeTab={activeTab}
            inputText={inputText}
            onInputTextChange={setInputText}
            disabled={isProcessing}
            locale={locale}
            onExtractStart={() => setStage('extracting')}
            onExtractEnd={() => setStage('idle')}
          />
        ) : (
          // 结果模式
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* 错误状态 */}
              {stage === 'error' && errorMessage && (
                <div className="flex h-[400px] flex-col items-center justify-center text-center">
                  <div className="mb-4 text-6xl">{getErrorIcon(errorMessage)}</div>
                  <h3 className="text-lg font-medium text-destructive">
                    {locale === 'zh' ? '出错了' : 'Something went wrong'}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* 最终结果 */}
              {hasResults && (
                <>
                  <ResultGallery
                    cards={cards}
                    onRegenerate={handleRegenerate}
                    onRegenerateWithPrompt={handleRegenerateWithPrompt}
                    isRegenerating={isRegenerating}
                    locale={locale}
                  />

                  {/* 新建按钮 */}
                  <div className="flex justify-center pt-6">
                    <button
                      onClick={handleNewProject}
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {locale === 'zh' ? '创建新笔记' : 'Create New Note'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
