'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Coins,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Plus,
  Minus,
  Eye,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';
import {
  getCreditsStatsAction,
  getUserCreditsListAction,
  getUserCreditDetailsAction,
  adjustUserCreditsAction,
  getCreditTransactionsAction,
} from '@/actions/admin-credits';

interface Stats {
  totalUsersWithCredits: number;
  totalCredits: number;
  todayCreditsAdded: number;
  todayCreditsUsed: number;
  totalTransactions: number;
}

interface UserWithCredits {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  createdAt: Date;
  credits: number;
}

interface CreditTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: Date;
  userName?: string | null;
  userEmail?: string | null;
}

// 交易类型标签
const typeLabels: Record<string, string> = {
  purchase: '购买',
  usage: '消费',
  redemption: '兑换',
  refund: '退款',
  admin_add: '管理员添加',
  admin_deduct: '管理员扣除',
  bonus: '奖励',
  trial: '试用',
  signup: '注册赠送',
};

// 交易类型颜色
const typeColors: Record<string, string> = {
  purchase: 'bg-green-100 text-green-800',
  usage: 'bg-orange-100 text-orange-800',
  redemption: 'bg-blue-100 text-blue-800',
  refund: 'bg-purple-100 text-purple-800',
  admin_add: 'bg-emerald-100 text-emerald-800',
  admin_deduct: 'bg-red-100 text-red-800',
  bonus: 'bg-yellow-100 text-yellow-800',
  trial: 'bg-cyan-100 text-cyan-800',
  signup: 'bg-indigo-100 text-indigo-800',
};

export function CreditsPageClient() {
  // 统计数据
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 用户列表
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userSortBy, setUserSortBy] = useState<'credits' | 'createdAt' | 'name'>('credits');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');

  // 交易记录
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  // 调整积分对话框
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  // 用户详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    user: UserWithCredits;
    transactions: CreditTransaction[];
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const result = await getCreditsStatsAction({});
      if (result?.data?.success) {
        setStats(result.data.stats as Stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
      toast.error('加载统计数据失败');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const result = await getUserCreditsListAction({
        page: userPage,
        pageSize: 20,
        search: userSearch || undefined,
        sortBy: userSortBy,
        sortOrder: userSortOrder,
      });
      if (result?.data?.success) {
        setUsers(result.data.users as UserWithCredits[]);
        setUserTotalPages(result.data.totalPages as number);
      }
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('加载用户列表失败');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userPage, userSearch, userSortBy, userSortOrder]);

  // 加载交易记录
  const loadTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const result = await getCreditTransactionsAction({
        page: txPage,
        pageSize: 50,
      });
      if (result?.data?.success) {
        setTransactions(result.data.transactions as CreditTransaction[]);
        setTxTotalPages(result.data.totalPages as number);
      }
    } catch (error) {
      console.error('Load transactions error:', error);
      toast.error('加载交易记录失败');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [txPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 打开调整积分对话框
  const handleOpenAdjust = (user: UserWithCredits, type: 'add' | 'deduct') => {
    setSelectedUser(user);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustDescription('');
    setAdjustDialogOpen(true);
  };

  // 执行调整积分
  const handleAdjust = async () => {
    if (!selectedUser || !adjustAmount || !adjustDescription) {
      toast.error('请填写完整信息');
      return;
    }

    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的积分数量');
      return;
    }

    setIsAdjusting(true);
    try {
      const result = await adjustUserCreditsAction({
        userId: selectedUser.id,
        amount: adjustType === 'add' ? amount : -amount,
        description: adjustDescription,
      });

      if (result?.data?.success) {
        toast.success(result.data.message);
        setAdjustDialogOpen(false);
        loadUsers();
        loadStats();
        loadTransactions();
      } else {
        toast.error(result?.data?.error || '操作失败');
      }
    } catch (error) {
      console.error('Adjust credits error:', error);
      toast.error('操作失败');
    } finally {
      setIsAdjusting(false);
    }
  };

  // 查看用户详情
  const handleViewDetails = async (user: UserWithCredits) => {
    setIsLoadingDetails(true);
    setDetailDialogOpen(true);

    try {
      const result = await getUserCreditDetailsAction({
        userId: user.id,
        page: 1,
        pageSize: 20,
      });

      if (result?.data?.success) {
        setUserDetails({
          user: result.data.user as UserWithCredits,
          transactions: result.data.transactions as CreditTransaction[],
        });
      } else {
        toast.error(result?.data?.error || '加载失败');
        setDetailDialogOpen(false);
      }
    } catch (error) {
      console.error('Load user details error:', error);
      toast.error('加载用户详情失败');
      setDetailDialogOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 搜索防抖
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    setUserSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setUserPage(1);
    }, 300);
    setSearchTimeout(timeout);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">积分管理</h1>
          <p className="text-sm text-muted-foreground">
            管理用户积分余额和查看交易记录
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadStats();
            loadUsers();
            loadTransactions();
          }}
          disabled={isLoadingStats}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : stats?.totalUsersWithCredits.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">有积分用户</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Coins className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : stats?.totalCredits.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">系统总积分</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : `+${stats?.todayCreditsAdded.toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground">今日增加</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : `-${stats?.todayCreditsUsed.toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground">今日消耗</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <ArrowUpDown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : stats?.totalTransactions.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">总交易数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">用户积分</TabsTrigger>
          <TabsTrigger value="transactions">交易记录</TabsTrigger>
        </TabsList>

        {/* 用户积分列表 */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>用户积分列表</CardTitle>
                  <CardDescription>查看和管理用户积分</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户..."
                      value={userSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <Select
                    value={userSortBy}
                    onValueChange={(v) => setUserSortBy(v as typeof userSortBy)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="排序" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credits">按积分</SelectItem>
                      <SelectItem value="createdAt">按注册时间</SelectItem>
                      <SelectItem value="name">按名称</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead className="text-right">积分余额</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback>
                                  {user.name?.charAt(0) || user.email.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role || 'user'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={user.credits > 0 ? 'text-green-600' : ''}>
                              {user.credits.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                title="查看详情"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenAdjust(user, 'add')}
                                className="text-green-600 hover:text-green-700"
                                title="增加积分"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenAdjust(user, 'deduct')}
                                className="text-red-600 hover:text-red-700"
                                title="扣除积分"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userPage === 1}
                    onClick={() => setUserPage((p) => p - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {userPage} / {userTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userPage === userTotalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易记录 */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>交易记录</CardTitle>
              <CardDescription>所有用户的积分变动记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead className="text-right">积分变动</TableHead>
                      <TableHead>说明</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTransactions ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          暂无交易记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.userName || '-'}</p>
                              <p className="text-xs text-muted-foreground">{tx.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={typeColors[tx.type] || 'bg-gray-100 text-gray-800'}>
                              {typeLabels[tx.type] || tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(tx.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {txTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={txPage === 1}
                    onClick={() => setTxPage((p) => p - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {txPage} / {txTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={txPage === txTotalPages}
                    onClick={() => setTxPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 调整积分对话框 */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustType === 'add' ? (
                <Plus className="h-5 w-5 text-green-600" />
              ) : (
                <Minus className="h-5 w-5 text-red-600" />
              )}
              {adjustType === 'add' ? '增加积分' : '扣除积分'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <span>
                  用户: {selectedUser.name || selectedUser.email}
                  <br />
                  当前积分: {selectedUser.credits.toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>积分数量</Label>
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="请输入积分数量"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>操作原因</Label>
              <Input
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                placeholder="请输入操作原因"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={isAdjusting}
              className={adjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                '确认'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用户详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>用户积分详情</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : userDetails ? (
            <div className="space-y-4">
              {/* 用户信息 */}
              <div className="flex items-center gap-4 p-4 rounded-lg border">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {userDetails.user.name?.charAt(0) || userDetails.user.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{userDetails.user.name || '-'}</p>
                  <p className="text-sm text-muted-foreground">{userDetails.user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {userDetails.user.credits.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">当前积分</p>
                </div>
              </div>

              {/* 交易记录 */}
              <div>
                <h4 className="font-medium mb-2">最近交易记录</h4>
                {userDetails.transactions.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">暂无交易记录</p>
                ) : (
                  <div className="space-y-2">
                    {userDetails.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div>
                          <Badge className={typeColors[tx.type] || 'bg-gray-100 text-gray-800'}>
                            {typeLabels[tx.type] || tx.type}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tx.description || '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
