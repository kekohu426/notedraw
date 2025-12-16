'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';

type AgentStatus = 'waiting' | 'thinking' | 'completed' | 'error';

interface AgentCardProps {
  role: 'organizer' | 'designer' | 'painter';
  status: AgentStatus;
  message?: string;
  locale?: 'en' | 'zh';
}

const AGENT_INFO = {
  organizer: {
    icon: '🧠',
    name: { en: 'Note Organizer', zh: '笔记整理师' },
    description: {
      en: 'Analyzing and structuring your content',
      zh: '分析并结构化你的内容',
    },
  },
  designer: {
    icon: '🎨',
    name: { en: 'Visual Designer', zh: '视觉设计师' },
    description: {
      en: 'Creating visual layout and prompts',
      zh: '创建视觉布局和绘图指令',
    },
  },
  painter: {
    icon: '✏️',
    name: { en: 'Image Painter', zh: '绘图创作师' },
    description: {
      en: 'Generating your visual notes',
      zh: '生成你的视觉笔记',
    },
  },
};

export function AgentCard({
  role,
  status,
  message,
  locale = 'en',
}: AgentCardProps) {
  const agent = AGENT_INFO[role];

  const statusIcon = {
    waiting: <Clock className="h-4 w-4 text-muted-foreground" />,
    thinking: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <Check className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  const statusText = {
    waiting: locale === 'zh' ? '等待中' : 'Waiting',
    thinking: locale === 'zh' ? '处理中' : 'Processing',
    completed: locale === 'zh' ? '完成' : 'Done',
    error: locale === 'zh' ? '失败' : 'Failed',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        status === 'thinking' && 'border-primary bg-primary/5',
        status === 'completed' && 'border-green-500/30 bg-green-500/5',
        status === 'error' && 'border-destructive/30 bg-destructive/5',
        status === 'waiting' && 'border-border bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{agent.icon}</span>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{agent.name[locale]}</h4>
            <div className="flex items-center gap-1.5 text-xs">
              {statusIcon[status]}
              <span
                className={cn(
                  status === 'completed' && 'text-green-500',
                  status === 'error' && 'text-destructive',
                  status === 'thinking' && 'text-primary',
                  status === 'waiting' && 'text-muted-foreground'
                )}
              >
                {statusText[status]}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {message || agent.description[locale]}
          </p>
        </div>
      </div>
    </div>
  );
}
