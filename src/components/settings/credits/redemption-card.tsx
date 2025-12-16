'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';
import { redeemCodeAction, getUserRedemptionsAction } from '@/actions/redemption';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RedemptionHistory {
  id: string;
  code: string;
  type: string;
  value: number;
  redeemedAt: Date;
}

export function RedemptionCard() {
  const t = useTranslations('Dashboard.settings.credits');
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    type?: string;
    value?: number;
  } | null>(null);
  const [history, setHistory] = useState<RedemptionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('请输入兑换码');
      return;
    }

    setIsRedeeming(true);
    setRedeemResult(null);

    try {
      const result = await redeemCodeAction({ code: code.trim() });

      if (result?.data?.success) {
        setRedeemResult({
          success: true,
          message: result.data.message || '兑换成功',
          type: result.data.type,
          value: result.data.value,
        });
        setCode('');
        toast.success(result.data.message);
        // 刷新页面以更新积分显示
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRedeemResult({
          success: false,
          message: result?.data?.error || '兑换失败',
        });
        toast.error(result?.data?.error || '兑换失败');
      }
    } catch (error) {
      console.error('Redeem error:', error);
      setRedeemResult({
        success: false,
        message: '兑换失败，请稍后重试',
      });
      toast.error('兑换失败');
    } finally {
      setIsRedeeming(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const result = await getUserRedemptionsAction();
      if (result?.data?.success && result.data.records) {
        setHistory(result.data.records as RedemptionHistory[]);
      }
    } catch (error) {
      console.error('Load history error:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  const typeLabels: Record<string, string> = {
    credits: '积分',
    membership: '会员',
    trial: '试用',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">兑换码</CardTitle>
          </div>
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleOpenHistory}>
                <History className="mr-1 h-4 w-4" />
                兑换记录
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>兑换记录</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {isLoadingHistory ? (
                  <div className="text-center py-4 text-muted-foreground">
                    加载中...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    暂无兑换记录
                  </div>
                ) : (
                  history.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <code className="text-sm font-mono">{record.code}</code>
                        <div className="text-xs text-muted-foreground">
                          {new Date(record.redeemedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          +{record.value} {typeLabels[record.type] || ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          输入兑换码获取积分或会员权益
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="请输入兑换码"
            className="font-mono"
            disabled={isRedeeming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRedeeming) {
                handleRedeem();
              }
            }}
          />
          <Button onClick={handleRedeem} disabled={isRedeeming || !code.trim()}>
            {isRedeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                兑换中
              </>
            ) : (
              '兑换'
            )}
          </Button>
        </div>

        {redeemResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              redeemResult.success
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {redeemResult.success && <CheckCircle2 className="h-4 w-4" />}
            <span className="text-sm">{redeemResult.message}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          兑换码格式示例：NOTEDRAW-XXXX-XXXX
        </p>
      </CardContent>
    </Card>
  );
}
