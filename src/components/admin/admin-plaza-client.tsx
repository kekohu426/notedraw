'use client';

import {
  getAdminPlazaNotesAction,
  setFeaturedAction,
  adminRemoveNoteAction,
} from '@/actions/plaza';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { format } from 'date-fns';
import {
  Eye,
  Globe,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PlazaNote {
  id: string;
  userId: string;
  title: string | null;
  slug: string | null;
  visualStyle: string;
  tags: string | null;
  views: number;
  likes: number;
  isPublic: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

type StatusFilter = 'all' | 'public' | 'featured';

export function AdminPlazaClient() {
  const [notes, setNotes] = useState<PlazaNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminPlazaNotesAction({
        page,
        limit: 20,
        status: statusFilter,
      });

      if (result?.data?.success && result.data.notes) {
        setNotes(result.data.notes as PlazaNote[]);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setTotal(result.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [page, statusFilter]);

  const handleSetFeatured = async (projectId: string, isFeatured: boolean) => {
    setActionLoading(projectId);
    try {
      const result = await setFeaturedAction({ projectId, isFeatured });
      if (result?.data?.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === projectId ? { ...n, isFeatured } : n))
        );
        toast.success(isFeatured ? 'Note marked as featured' : 'Featured status removed');
      } else {
        throw new Error(result?.data?.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Set featured error:', error);
      toast.error('Failed to update featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (projectId: string) => {
    setActionLoading(projectId);
    try {
      const result = await adminRemoveNoteAction({ projectId });
      if (result?.data?.success) {
        setNotes((prev) => prev.filter((n) => n.id !== projectId));
        setTotal((prev) => prev - 1);
        toast.success('Note removed from plaza');
      } else {
        throw new Error(result?.data?.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove note');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Plaza Notes
            <Badge variant="secondary">{total}</Badge>
          </CardTitle>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              <SelectItem value="public">Public Only</SelectItem>
              <SelectItem value="featured">Featured Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notes found
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {note.title || 'Untitled'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{note.visualStyle}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {note.isPublic && (
                          <Badge variant="secondary" className="gap-1">
                            <Globe className="h-3 w-3" />
                            Public
                          </Badge>
                        )}
                        {note.isFeatured && (
                          <Badge className="gap-1 bg-amber-500 text-white">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{note.views}</TableCell>
                    <TableCell>{note.likes}</TableCell>
                    <TableCell>
                      {note.publishedAt
                        ? format(new Date(note.publishedAt), 'PP')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === note.id}
                          >
                            {actionLoading === note.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {note.slug && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/plaza/notes/${note.slug}`}
                                target="_blank"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View in Plaza
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {note.isFeatured ? (
                            <DropdownMenuItem
                              onClick={() => handleSetFeatured(note.id, false)}
                            >
                              <StarOff className="h-4 w-4 mr-2" />
                              Remove Featured
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleSetFeatured(note.id, true)}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Mark as Featured
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemove(note.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Plaza
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
