'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Cpu, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { LocaleLink } from '@/i18n/navigation';

type ProcessStage = 'idle' | 'extracting' | 'organizing' | 'reviewing' | 'designing' | 'painting' | 'done' | 'error';

interface WorkbenchProps {
  stage: ProcessStage;
  progress?: number;
  currentUnit?: number;
  totalUnits?: number;
  errorMessage?: string;
  projectId?: string | null;
  locale?: 'en' | 'zh';
}

interface WorkflowStep {
  id: string;
  icon: string;
  title: { zh: string; en: string };
  activeText: { zh: string; en: string };
  status: 'waiting' | 'active' | 'completed';
}

export function Workbench({
  stage,
  progress = 0,
  currentUnit = 0,
  totalUnits = 0,
  errorMessage,
  projectId,
  locale = 'en',
}: WorkbenchProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dots, setDots] = useState('');
  const [pulseIndex, setPulseIndex] = useState(0);

  // 动态省略号效果
  useEffect(() => {
    if (stage !== 'idle' && stage !== 'done' && stage !== 'error') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 400);
      return () => clearInterval(interval);
    }
    setDots('');
  }, [stage]);

  // 数据流动画效果
  useEffect(() => {
    if (stage !== 'idle' && stage !== 'done' && stage !== 'error') {
      const interval = setInterval(() => {
        setPulseIndex(prev => (prev + 1) % 3);
      }, 600);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // 工作流步骤定义 - 4个节点
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'extractor',
      icon: '📥',
      title: { zh: '提取器', en: 'Extractor' },
      activeText: { zh: '提取文本内容', en: 'Extracting content' },
      status: stage === 'extracting' ? 'active' :
              ['organizing', 'designing', 'painting', 'done'].includes(stage) ? 'completed' : 'waiting',
    },
    {
      id: 'organizer',
      icon: '🧠',
      title: { zh: '整理师', en: 'Organizer' },
      activeText: { zh: '分析内容结构', en: 'Analyzing structure' },
      status: stage === 'organizing' ? 'active' :
              ['designing', 'painting', 'done'].includes(stage) ? 'completed' : 'waiting',
    },
    {
      id: 'designer',
      icon: '🎨',
      title: { zh: '设计师', en: 'Designer' },
      activeText: { zh: '设计视觉布局', en: 'Designing layout' },
      status: stage === 'designing' ? 'active' :
              ['painting', 'done'].includes(stage) ? 'completed' : 'waiting',
    },
    {
      id: 'painter',
      icon: '✏️',
      title: { zh: '绘图师', en: 'Painter' },
      activeText: { zh: `生成图片${totalUnits > 0 ? ` ${currentUnit}/${totalUnits}` : ''}`, en: `Painting${totalUnits > 0 ? ` ${currentUnit}/${totalUnits}` : ''}` },
      status: stage === 'painting' ? 'active' :
              stage === 'done' ? 'completed' : 'waiting',
    },
  ];

  const stageMessages: Record<ProcessStage, string> = {
    idle: locale === 'zh' ? '准备就绪' : 'Ready',
    extracting: locale === 'zh' ? '正在提取内容' : 'Extracting content',
    organizing: locale === 'zh' ? '正在分析内容' : 'Analyzing content',
    reviewing: locale === 'zh' ? '请确认结构' : 'Please review',
    designing: locale === 'zh' ? '正在设计布局' : 'Designing layout',
    painting: locale === 'zh' ? '正在生成图片' : 'Generating images',
    done: locale === 'zh' ? '✨ 完成！' : '✨ Done!',
    error: errorMessage || (locale === 'zh' ? '出错了' : 'Error'),
  };

  // 始终显示工作台，不再在 idle 时隐藏

  const isProcessing = !['idle', 'done', 'error', 'reviewing'].includes(stage);

  return (
    <div className="space-y-4">
      {/* 头部 - 可折叠 */}
      <Button
        variant="ghost"
        className="w-full justify-between hover:bg-transparent p-0 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            isProcessing ? "bg-primary/10 animate-pulse" : stage === 'done' ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
          )}>
            <Cpu className={cn(
              "h-4 w-4",
              isProcessing ? "text-primary" : stage === 'done' ? "text-green-600" : "text-muted-foreground"
            )} />
          </div>
          <span className="font-medium text-sm">{locale === 'zh' ? 'AI 工作台' : 'AI Workbench'}</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            stage === 'done' ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" :
            stage === 'error' ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" :
            "bg-primary/10 text-primary"
          )}>
            {stageMessages[stage]}{isProcessing ? dots : ''}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="space-y-4">
          {/* 横向工作流展示 */}
          <div className="flex items-center justify-between gap-2 p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* 步骤卡片 */}
                <div className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg flex-1 transition-all duration-300",
                  step.status === 'active' && "bg-primary/10 ring-2 ring-primary/30 shadow-lg shadow-primary/10",
                  step.status === 'completed' && "bg-green-50 dark:bg-green-950/30",
                  step.status === 'waiting' && "opacity-40"
                )}>
                  {/* 图标 */}
                  <div className={cn(
                    "text-2xl transition-transform duration-300",
                    step.status === 'active' && "animate-bounce"
                  )}>
                    {step.icon}
                  </div>
                  {/* 标题 */}
                  <span className={cn(
                    "text-xs font-medium",
                    step.status === 'active' && "text-primary",
                    step.status === 'completed' && "text-green-600 dark:text-green-400"
                  )}>
                    {step.title[locale]}
                  </span>
                  {/* 状态文字 */}
                  <span className="text-[10px] text-muted-foreground h-3">
                    {step.status === 'active' ? step.activeText[locale] + dots :
                     step.status === 'completed' ? (locale === 'zh' ? '✓ 完成' : '✓ Done') : ''}
                  </span>
                  {/* 状态指示器 */}
                  <div className="h-4 flex items-center">
                    {step.status === 'active' && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                    {step.status === 'completed' && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>

                {/* 连接箭头 */}
                {index < workflowSteps.length - 1 && (
                  <div className="flex items-center px-2">
                    <div className={cn(
                      "flex gap-0.5",
                      step.status === 'completed' || (step.status === 'active' && pulseIndex >= index)
                        ? "opacity-100" : "opacity-30"
                    )}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                            step.status === 'completed' ? "bg-green-500" :
                            step.status === 'active' && pulseIndex === i ? "bg-primary scale-125" :
                            "bg-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 进度条 - 只在处理中或完成时显示 */}
          {stage !== 'idle' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {locale === 'zh' ? '整体进度' : 'Overall Progress'}
                </span>
                <div className="flex items-center gap-2">
                  {stage === 'done' && projectId && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                      <LocaleLink href={`/notedraw/${projectId}`}>
                        {locale === 'zh' ? '查看详情' : 'View Details'}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </LocaleLink>
                    </Button>
                  )}
                  <span className="tabular-nums font-medium">{Math.round(progress)}%</span>
                </div>
              </div>
              <Progress
                value={progress}
                className={cn(
                  "h-1.5 transition-all",
                  stage === 'done' && '[&>div]:bg-green-500'
                )}
              />
            </div>
          )}

        </div>
      )}
    </div>
  );
}
