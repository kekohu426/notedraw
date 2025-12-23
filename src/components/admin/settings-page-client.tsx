'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  RefreshCw,
  Bot,
  Coins,
  CreditCard,
  Gauge,
  ToggleLeft,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getAllConfigsAction,
  updateConfigsAction,
  initDefaultConfigsAction,
  type ConfigItem,
  type ConfigCategory,
} from '@/actions/system-config';

// 分类配置
const CATEGORIES: Array<{
  id: ConfigCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: 'ai',
    label: 'AI 模型',
    icon: <Bot className="h-4 w-4" />,
    description: '配置大模型 API 和参数',
  },
  {
    id: 'credits',
    label: '积分规则',
    icon: <Coins className="h-4 w-4" />,
    description: '积分消耗和奖励规则',
  },
  {
    id: 'pricing',
    label: '价格套餐',
    icon: <CreditCard className="h-4 w-4" />,
    description: '积分套餐价格配置',
  },
  {
    id: 'limits',
    label: '生成限制',
    icon: <Gauge className="h-4 w-4" />,
    description: '文本长度和生成限制',
  },
  {
    id: 'features',
    label: '功能开关',
    icon: <ToggleLeft className="h-4 w-4" />,
    description: '开启或关闭系统功能',
  },
  {
    id: 'site',
    label: '站点信息',
    icon: <Globe className="h-4 w-4" />,
    description: '网站名称和联系方式',
  },
];

export function SettingsPageClient() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigCategory>('ai');
  const [modifiedConfigs, setModifiedConfigs] = useState<Map<string, string>>(new Map());
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  // 加载配置
  const loadConfigs = async (autoInit = false) => {
    setIsLoading(true);
    try {
      const result = await getAllConfigsAction();
      if (result?.data?.success && result.data.configs) {
        // 如果配置为空且是首次加载，自动初始化
        if (result.data.configs.length === 0 && !autoInit) {
          console.log('配置为空，自动初始化默认配置...');
          await initConfigs();
          return;
        }
        setConfigs(result.data.configs);
      } else {
        toast.error('加载配置失败');
      }
    } catch (error) {
      console.error('Load configs error:', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化默认配置
  const initConfigs = async () => {
    try {
      const result = await initDefaultConfigsAction();
      if (result?.data?.success) {
        toast.success(result.data.message || '配置已初始化');
        // 重新加载，标记为已初始化避免循环
        loadConfigs(true);
      } else {
        toast.error(result?.data?.error || '初始化失败');
      }
    } catch (error) {
      console.error('Init configs error:', error);
      toast.error('初始化失败');
    }
  };

  useEffect(() => {
    loadConfigs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 获取当前分类的配置
  const categoryConfigs = configs.filter(c => c.category === activeTab);

  // 处理值变更
  const handleValueChange = (configId: string, value: string) => {
    setModifiedConfigs(prev => {
      const next = new Map(prev);
      next.set(configId, value);
      return next;
    });
  };

  // 获取配置的当前值（优先使用修改后的值）
  const getConfigValue = (config: ConfigItem): string => {
    return modifiedConfigs.get(config.id) ?? config.value;
  };

  // 检查是否有未保存的修改
  const hasUnsavedChanges = modifiedConfigs.size > 0;

  // 保存配置
  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      toast.info('没有需要保存的修改');
      return;
    }

    setIsSaving(true);
    try {
      const configsToUpdate = Array.from(modifiedConfigs.entries()).map(([id, value]) => ({
        id,
        value,
      }));

      const result = await updateConfigsAction({ configs: configsToUpdate });
      if (result?.data?.success) {
        toast.success(result.data.message);
        setModifiedConfigs(new Map());
        loadConfigs();
      } else {
        toast.error(result?.data?.error || '保存失败');
      }
    } catch (error) {
      console.error('Save configs error:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 切换密钥显示
  const toggleSecretVisibility = (configId: string) => {
    setShowSecrets(prev => {
      const next = new Set(prev);
      if (next.has(configId)) {
        next.delete(configId);
      } else {
        next.add(configId);
      }
      return next;
    });
  };

  // 渲染配置输入控件
  const renderConfigInput = (config: ConfigItem) => {
    const value = getConfigValue(config);
    const isModified = modifiedConfigs.has(config.id);

    // Boolean 类型使用 Switch
    if (config.valueType === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => handleValueChange(config.id, String(checked))}
          />
          <span className="text-sm text-muted-foreground">
            {value === 'true' ? '开启' : '关闭'}
          </span>
          {isModified && <Badge variant="secondary" className="text-xs">已修改</Badge>}
        </div>
      );
    }

    // JSON 类型使用 Textarea
    if (config.valueType === 'json') {
      return (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(config.id, e.target.value)}
            className="font-mono text-sm min-h-[120px]"
            placeholder="JSON 格式配置"
          />
          {isModified && <Badge variant="secondary" className="text-xs">已修改</Badge>}
        </div>
      );
    }

    // 敏感信息处理
    if (config.isSecret) {
      const isVisible = showSecrets.has(config.id);
      return (
        <div className="flex gap-2">
          <Input
            type={isVisible ? 'text' : 'password'}
            value={value}
            onChange={(e) => handleValueChange(config.id, e.target.value)}
            className="font-mono"
            placeholder="输入 API Key"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleSecretVisibility(config.id)}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {isModified && <Badge variant="secondary" className="text-xs">已修改</Badge>}
        </div>
      );
    }

    // 数字类型
    if (config.valueType === 'number') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(config.id, e.target.value)}
            className="max-w-[200px]"
          />
          {isModified && <Badge variant="secondary" className="text-xs">已修改</Badge>}
        </div>
      );
    }

    // 默认字符串输入
    return (
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => handleValueChange(config.id, e.target.value)}
          placeholder={`输入${config.label || config.key}`}
        />
        {isModified && <Badge variant="secondary" className="text-xs">已修改</Badge>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 如果没有配置项，显示初始化按钮
  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">尚未初始化配置项</p>
        <Button onClick={initConfigs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          初始化默认配置
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统配置</h1>
          <p className="text-muted-foreground">管理系统运行参数和功能开关</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={initConfigs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            同步配置
          </Button>
          <Button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存修改
            {hasUnsavedChanges && (
              <Badge variant="destructive" className="ml-2">
                {modifiedConfigs.size}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* 配置 Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConfigCategory)}>
        <TabsList className="grid grid-cols-6 w-full">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2">
              {cat.icon}
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {cat.icon}
                  {cat.label}
                </CardTitle>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {configs
                  .filter((c) => c.category === cat.id)
                  .map((config) => (
                    <div key={config.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={config.id} className="font-medium">
                          {config.label || config.key}
                        </Label>
                        {config.isSecret && (
                          <Badge variant="outline" className="text-xs">
                            敏感
                          </Badge>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      )}
                      {renderConfigInput(config)}
                    </div>
                  ))}

                {configs.filter((c) => c.category === cat.id).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    该分类暂无配置项
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
