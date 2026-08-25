import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelsApi } from '../../services/api';
import { ReelPlayerModal, type ReelItem } from '../../components/ui/ReelPlayerModal';
import {
  MessageCircle,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Film,
} from 'lucide-react';

export const CommentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Video Player Modal
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);
  const [modalReels, setModalReels] = useState<ReelItem[]>([]);

  const fetchComments = async (currentPage = page) => {
    setLoading(true);
    try {
      const res = await reelsApi.getAllComments({
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });

      const list = Array.isArray(res) ? res : res.items || [];
      setComments(list);
      setTotal(res.total || list.length);
    } catch (e) {
      console.warn('Failed to load comments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchComments(1);
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComments(1);
  };

  const handleDeleteComment = async (id: string, textSnippet: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this comment?\n"${textSnippet.slice(0, 60)}..."`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await reelsApi.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInspectReel = async (reelId: string) => {
    try {
      const reelData = await reelsApi.getById(reelId);
      if (reelData) {
        setModalReels([
          {
            id: reelData.id,
            title: reelData.title,
            description: reelData.caption,
            category: reelData.category,
            viewsCount: reelData.viewsCount || 0,
            likesCount: reelData.likesCount || 0,
            commentsCount: reelData.commentsCount || 0,
            videoUrl: reelData.videoUrl || reelData.hlsMasterPlaylistUrl,
            thumbnailUrl: reelData.thumbnailUrl,
            creator: reelData.creator || reelData.user,
          },
        ]);
        setSelectedReelIndex(0);
        setIsPlayerOpen(true);
      }
    } catch (e) {
      alert('Could not load reel preview.');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Comments & Discussion Moderation</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {total} Total Discussions
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor user comments, filter by Vastu topics, inspect creator reels, and enforce community standards
          </p>
        </div>

        <button
          onClick={() => fetchComments(page)}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Comments
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground flex items-center gap-2">
            <span>{total.toLocaleString()}</span>
            <MessageCircle className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Across all Vastu reels</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Moderation Active
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-500 flex items-center gap-2">
            <span>100% Live</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Instant deletion enabled</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Verified Authors
          </div>
          <div className="mt-1.5 text-2xl font-bold text-primary flex items-center gap-2">
            <span>Verified</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Astrologers & Experts</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Engagement Ratio
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-500 flex items-center gap-2">
            <span>High</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active viewer discussions</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search comment text, author, reel..."
            className="w-full rounded-xl border border-input bg-card py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Vastu Categories</option>
            <option value="living_room">Living Room Vastu</option>
            <option value="Home Vastu">Home Vastu</option>
            <option value="Office Vastu">Office Vastu</option>
            <option value="Remedies">Remedies & Crystals</option>
            <option value="Directions & Elements">Directions & Elements</option>
          </select>
        </div>
      </div>

      {/* Comments Table */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Comment Author</th>
                <th className="px-5 py-3.5">Comment Content</th>
                <th className="px-5 py-3.5">Target Reel</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Posted At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs">Loading user comments feed...</p>
                  </td>
                </tr>
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No comments found matching your search.
                  </td>
                </tr>
              ) : (
                comments.map((comment) => (
                  <tr key={comment.id} className="hover:bg-muted/40 transition-colors">
                    {/* Author Info */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div
                        onClick={() => navigate(`/dashboard/users/${comment.userId}`)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary text-xs border border-primary/20">
                          {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                          {comment.userIsVerified && (
                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center text-white">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-primary transition flex items-center gap-1">
                            <span>{comment.userName}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">@{comment.userHandle}</p>
                        </div>
                      </div>
                    </td>

                    {/* Comment Content */}
                    <td className="px-5 py-4 font-medium text-foreground">
                      <p className="line-clamp-2 max-w-md bg-muted/20 p-2 rounded-xl border border-border/40 text-xs">
                        "{comment.text}"
                      </p>
                    </td>

                    {/* Target Reel */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInspectReel(comment.reelId)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline group text-left"
                        >
                          <Film className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-1 max-w-[160px]">
                            {comment.reelTitle || 'View Video'}
                          </span>
                          <Play className="h-3 w-3 fill-current opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                        {comment.reelCategory}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInspectReel(comment.reelId)}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition cursor-pointer"
                        >
                          Watch Reel
                        </button>

                        <button
                          onClick={() => handleDeleteComment(comment.id, comment.text)}
                          disabled={deletingId === comment.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer disabled:opacity-50"
                          title="Delete Comment"
                        >
                          {deletingId === comment.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
          <div>
            Showing Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{totalPages}</strong> ({total} comments)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newP = Math.max(1, page - 1);
                setPage(newP);
                fetchComments(newP);
              }}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted transition disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => {
                const newP = Math.min(totalPages, page + 1);
                setPage(newP);
                fetchComments(newP);
              }}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted transition disabled:opacity-30 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Reel Player Modal */}
      <ReelPlayerModal
        isOpen={isPlayerOpen}
        reels={modalReels}
        currentIndex={selectedReelIndex}
        onClose={() => setIsPlayerOpen(false)}
        onNavigate={(idx) => setSelectedReelIndex(idx)}
      />
    </div>
  );
};

export default CommentsPage;
