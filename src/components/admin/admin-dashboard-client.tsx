'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import {
  Users,
  FileImage,
  Globe,
  Ticket,
  TrendingUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { getAdminStatsAction } from '@/actions/admin-stats';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  publicProjects: number;
  totalCards: number;
  totalCodes: number;
  usedCodes: number;
  todayUsers: number;
  todayProjects: number;
}

interface ChartData {
  recentProjects: Array<{ date: string; count: number }>;
  styleDistribution: Array<{ style: string; count: number }>;
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminStatsAction();
      if (result?.data?.success) {
        setStats(result.data.stats as Stats);
        setCharts(result.data.charts as ChartData);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    {
      title: '总用户数',
      value: stats?.totalUsers || 0,
      today: stats?.todayUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: '总项目数',
      value: stats?.totalProjects || 0,
      today: stats?.todayProjects || 0,
      icon: FileImage,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: '公开笔记',
      value: stats?.publicProjects || 0,
      icon: Globe,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: '生成卡片',
      value: stats?.totalCards || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      title: '兑换码总数',
      value: stats?.totalCodes || 0,
      icon: Ticket,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    },
    {
      title: '已使用兑换码',
      value: stats?.usedCodes || 0,
      icon: Ticket,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    },
  ];

  const styleLabels: Record<string, string> = {
    sketch: '手绘风',
    business: '商务风',
    cute: '可爱风',
    minimal: '极简风',
    chalkboard: '黑板风',
  };

  const styleColors: Record<string, string> = {
    sketch: 'bg-slate-500',
    business: 'bg-blue-500',
    cute: 'bg-pink-500',
    minimal: 'bg-gray-500',
    chalkboard: 'bg-emerald-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理面板</h1>
          <p className="text-muted-foreground">系统数据概览</p>
        </div>
        <Button variant="outline" onClick={loadStats} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  {card.today !== undefined && card.today > 0 && (
                    <p className="text-xs text-green-600">+{card.today} 今日</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">近 7 天项目数</CardTitle>
            <CardDescription>每日创建的项目数量</CardDescription>
          </CardHeader>
          <CardContent>
            {charts?.recentProjects && charts.recentProjects.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {charts.recentProjects.map((item, idx) => {
                  const maxCount = Math.max(...charts.recentProjects.map(p => Number(p.count)));
                  const height = maxCount > 0 ? (Number(item.count) / maxCount) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium">{item.count}</span>
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Style Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">风格分布</CardTitle>
            <CardDescription>项目使用的视觉风格统计</CardDescription>
          </CardHeader>
          <CardContent>
            {charts?.styleDistribution && charts.styleDistribution.length > 0 ? (
              <div className="space-y-3">
                {charts.styleDistribution.map((item, idx) => {
                  const total = charts.styleDistribution.reduce((sum, s) => sum + Number(s.count), 0);
                  const percentage = total > 0 ? (Number(item.count) / total) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{styleLabels[item.style] || item.style}</span>
                        <span className="text-muted-foreground">{item.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${styleColors[item.style] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary transition-colors cursor-pointer">
          <LocaleLink href="/admin/users" className="block">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">用户管理</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </LocaleLink>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <LocaleLink href="/admin/redemption" className="block">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-primary" />
                  <span className="font-medium">兑换码管理</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </LocaleLink>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <LocaleLink href="/admin/content" className="block">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="font-medium">内容审核</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </LocaleLink>
        </Card>
      </div>
    </div>
  );
}
