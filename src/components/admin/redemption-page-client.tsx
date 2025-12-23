'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Copy, RefreshCw, Ban, Check, Eye, Loader2 } from 'lucide-react';
import {
  createRedemptionCodesAction,
  getRedemptionCodesAction,
  updateRedemptionCodeAction,
  getCodeRedemptionsAction,
} from '@/actions/redemption';

interface RedemptionCode {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

interface RedemptionRecord {
  id: string;
  codeId: string;
  userId: string;
  code: string;
  type: string;
  value: number;
  redeemedAt: Date;
  userName: string | null;
  userEmail: string | null;
}

export function RedemptionPageClient() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  // 详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<RedemptionCode | null>(null);
  const [redemptionRecords, setRedemptionRecords] = useState<RedemptionRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // 创建表单状态
  const [formData, setFormData] = useState({
    type: 'credits' as 'credits' | 'membership' | 'trial',
    value: 100,
    description: '',
    maxUses: 1,
    count: 1,
    expiresAt: '',
  });

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const result = await getRedemptionCodesAction();
      if (result?.data?.success && result.data.codes) {
        setCodes(result.data.codes as RedemptionCode[]);
      }
    } catch (error) {
      console.error('Load codes error:', error);
      toast.error('加载兑换码失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createRedemptionCodesAction({
        type: formData.type,
        value: formData.value,
        description: formData.description || undefined,
        maxUses: formData.maxUses,
        count: formData.count,
        expiresAt: formData.expiresAt || undefined,
      });

      if (result?.data?.success && result.data.codes) {
        setNewCodes(result.data.codes);
        toast.success(result.data.message);
        loadCodes();
      } else {
        toast.error(result?.data?.error || '创建失败');
      }
    } catch (error) {
      console.error('Create codes error:', error);
      toast.error('创建兑换码失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const result = await updateRedemptionCodeAction({ id, isActive: !isActive });
      if (result?.data?.success) {
        toast.success(isActive ? '已禁用' : '已启用');
        loadCodes();
      }
    } catch (error) {
      console.error('Toggle active error:', error);
      toast.error('操作失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(newCodes.join('\n'));
    toast.success('已复制所有兑换码');
  };

  // 查看使用详情
  const handleViewDetails = async (code: RedemptionCode) => {
    setSelectedCode(code);
    setDetailDialogOpen(true);
    setIsLoadingRecords(true);

    try {
      const result = await getCodeRedemptionsAction({ codeId: code.id });
      if (result?.data?.success) {
        setRedemptionRecords(result.data.records as RedemptionRecord[]);
      } else {
        toast.error('加载使用记录失败');
      }
    } catch (error) {
      console.error('Load records error:', error);
      toast.error('加载使用记录失败');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const typeLabels: Record<string, string> = {
    credits: '积分',
    membership: '会员',
    trial: '试用',
  };

  const typeColors: Record<string, string> = {
    credits: 'bg-blue-100 text-blue-800',
    membership: 'bg-purple-100 text-purple-800',
    trial: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">兑换码管理</h1>
          <p className="text-muted-foreground">管理内测期间的兑换码</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCodes} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                生成兑换码
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>生成兑换码</DialogTitle>
                <DialogDescription>
                  创建新的兑换码，可批量生成
                </DialogDescription>
              </DialogHeader>

              {newCodes.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">生成的兑换码</span>
                      <Button variant="outline" size="sm" onClick={copyAllCodes}>
                        <Copy className="mr-1 h-3 w-3" />
                        复制全部
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {newCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => copyToClipboard(code)}
                        >
                          <code className="text-sm font-mono">{code}</code>
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setNewCodes([]);
                        setShowCreateDialog(false);
                      }}
                    >
                      完成
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>类型</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) =>
                          setFormData({ ...formData, type: v as typeof formData.type })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credits">积分</SelectItem>
                          <SelectItem value="membership">会员天数</SelectItem>
                          <SelectItem value="trial">试用天数</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {formData.type === 'credits' ? '积分数量' : '天数'}
                      </Label>
                      <Input
                        type="number"
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: parseInt(e.target.value) || 0 })
                        }
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>每码使用次数</Label>
                      <Input
                        type="number"
                        value={formData.maxUses}
                        onChange={(e) =>
                          setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })
                        }
                        min={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>生成数量</Label>
                      <Input
                        type="number"
                        value={formData.count}
                        onChange={(e) =>
                          setFormData({ ...formData, count: parseInt(e.target.value) || 1 })
                        }
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>过期时间（可选）</Label>
                    <Input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) =>
                        setFormData({ ...formData, expiresAt: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>备注（可选）</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="内部备注，如：内测用户A"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      取消
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                      {isCreating ? '生成中...' : '生成'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">总兑换码</div>
          <div className="text-2xl font-bold">{codes.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">已使用</div>
          <div className="text-2xl font-bold">
            {codes.filter((c) => c.usedCount > 0).length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">已禁用</div>
          <div className="text-2xl font-bold">
            {codes.filter((c) => !c.isActive).length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">总发放积分</div>
          <div className="text-2xl font-bold">
            {codes
              .filter((c) => c.type === 'credits')
              .reduce((sum, c) => sum + c.value * c.usedCount, 0)}
          </div>
        </div>
      </div>

      {/* 兑换码列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>兑换码</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>值</TableHead>
              <TableHead>使用情况</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  暂无兑换码
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono">{code.code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={typeColors[code.type]}>
                      {typeLabels[code.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{code.value}</TableCell>
                  <TableCell>
                    {code.usedCount} / {code.maxUses}
                  </TableCell>
                  <TableCell>
                    {code.isActive ? (
                      <Badge variant="outline" className="text-green-600">
                        <Check className="mr-1 h-3 w-3" />
                        启用
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">
                        <Ban className="mr-1 h-3 w-3" />
                        禁用
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {code.expiresAt
                      ? new Date(code.expiresAt).toLocaleDateString('zh-CN')
                      : '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {code.description || '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(code.createdAt).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {code.usedCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(code)}
                          title="查看使用记录"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(code.id, code.isActive)}
                      >
                        {code.isActive ? '禁用' : '启用'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 使用记录详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>使用记录详情</DialogTitle>
            <DialogDescription>
              {selectedCode && (
                <span>
                  兑换码: <code className="font-mono bg-muted px-1 rounded">{selectedCode.code}</code>
                  <br />
                  类型: {typeLabels[selectedCode.type]} {selectedCode.value}
                  {' | '}使用: {selectedCode.usedCount} / {selectedCode.maxUses}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingRecords ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : redemptionRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无使用记录
            </div>
          ) : (
            <div className="space-y-3">
              {redemptionRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{record.userName || '未知用户'}</p>
                    <p className="text-sm text-muted-foreground">{record.userEmail}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={typeColors[record.type]}>
                      +{record.value} {typeLabels[record.type]}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(record.redeemedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
