import React, { useState, useEffect } from "react"
import { VideoPlayer } from "./VideoPlayer"
import { reelsApi } from "../../services/api"
import {
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  Layers,
  MapPin,
  Compass,
  Building,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Send,
  RefreshCw,
  CornerDownRight,
  Info,
} from "lucide-react"

export interface ReelItem {
  id: string
  title: string
  caption?: string
  description?: string
  category?: string
  subCategory?: string
  propertyType?: string
  element?: string
  location?: string
  createdAt?: string
  likesCount?: number
  commentsCount?: number
  viewsCount?: string | number
  videoUrl?: string | null
  thumbnailUrl?: string | null
  creator?: {
    id?: string
    name?: string
    username?: string | null
    avatarUrl?: string
    isVerified?: boolean
    title?: string
  }
  user?: {
    id?: string
    name?: string
    username?: string
  }
  status?: string
}

interface ReelPlayerModalProps {
  isOpen: boolean
  reels: ReelItem[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  onDelete?: (id: string, title: string) => void
}

export const ReelPlayerModal: React.FC<ReelPlayerModalProps> = ({
  isOpen,
  reels,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
}) => {
  const currentReel = reels[currentIndex]

  // Tab State: 'info' or 'comments'
  const [activeDrawerTab, setActiveDrawerTab] = useState<'info' | 'comments'>('info')

  // Comments State
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newCommentText, setNewCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  const fetchComments = async () => {
    if (!currentReel?.id) return
    setCommentsLoading(true)
    try {
      const res = await reelsApi.getComments(currentReel.id, { page: 1, limit: 50 })
      const list = Array.isArray(res) ? res : res.items || []
      setComments(list)
    } catch (err) {
      console.warn('Failed to load comments', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  // Load comments whenever active reel changes or comments tab is selected
  useEffect(() => {
    if (isOpen && currentReel?.id) {
      fetchComments()
      setReplyToCommentId(null)
      setNewCommentText('')
    }
  }, [currentReel?.id, isOpen])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || !currentReel?.id) return

    setSubmittingComment(true)
    try {
      const added = await reelsApi.addComment(currentReel.id, {
        text: newCommentText.trim(),
        parentId: replyToCommentId || undefined,
      })

      if (replyToCommentId) {
        // Append reply under parent
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyToCommentId
              ? { ...c, replies: [...(c.replies || []), added], repliesCount: (c.repliesCount || 0) + 1 }
              : c
          )
        )
      } else {
        setComments((prev) => [added, ...prev])
      }

      setNewCommentText('')
      setReplyToCommentId(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return
    setDeletingCommentId(commentId)
    try {
      await reelsApi.deleteComment(commentId)
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r: any) => r.id !== commentId),
          }))
      )
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete comment')
    } finally {
      setDeletingCommentId(null)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys if user is typing in textarea / input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        if (currentIndex < reels.length - 1) {
          onNavigate(currentIndex + 1)
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentIndex, reels.length, onClose, onNavigate])

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen || !currentReel) return null

  const creatorName =
    currentReel.creator?.name ||
    currentReel.user?.name ||
    "Certified Vastu Consultant"
  const creatorUsername =
    currentReel.creator?.username ||
    currentReel.user?.username ||
    "vastu_expert"

  const handleShare = () => {
    if (currentReel.videoUrl) {
      navigator.clipboard.writeText(currentReel.videoUrl)
      alert("Stream URL copied to clipboard!")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Reel Container */}
      <div className="relative z-10 flex h-[90vh] max-h-[860px] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl">
        {/* Left / Video Player Column */}
        <div className="relative flex flex-1 items-center justify-center bg-black">
          <div className="h-full w-full max-w-[480px]">
            <VideoPlayer
              key={currentReel.id}
              src={currentReel.videoUrl}
              poster={currentReel.thumbnailUrl}
              autoPlay={true}
              loop={true}
              aspectRatio="9/16"
              className="h-full w-full"
            />
          </div>

          {/* Quick Reel Navigation Buttons on Video Side */}
          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-3">
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-primary disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/60 cursor-pointer"
              title="Previous Reel (Up Arrow)"
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === reels.length - 1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-primary disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/60 cursor-pointer"
              title="Next Reel (Down Arrow)"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right / Metadata and Moderation Drawer */}
        <div className="hidden w-80 flex-col justify-between border-l border-border/80 bg-card md:flex lg:w-96">
          {/* Header & Drawer Tab Selector */}
          <div className="border-b border-border/60 p-4 pb-0">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Reel {currentIndex + 1} of {reels.length}
              </span>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveDrawerTab('info')}
                className={`flex items-center gap-1.5 pb-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activeDrawerTab === 'info'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>Information</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab('comments')}
                className={`flex items-center gap-1.5 pb-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activeDrawerTab === 'comments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Comments ({comments.length})</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeDrawerTab === 'info' ? (
              <div className="space-y-4">
                {/* Creator Profile Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 font-bold text-primary ring-2 ring-primary/20 text-sm">
                    {creatorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate text-sm font-bold text-foreground">
                        {creatorName}
                      </h4>
                      {currentReel.creator?.isVerified !== false && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{creatorUsername}
                    </p>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground">
                    {currentReel.title || "Untitled Reel"}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {currentReel.description ||
                      currentReel.caption ||
                      "No additional caption provided for this reel."}
                  </p>
                </div>

                {/* Badges / Taxonomy Info */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentReel.category && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                      <Layers className="h-3 w-3" />
                      {currentReel.category}
                    </span>
                  )}
                  {currentReel.subCategory && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[10px] font-medium text-foreground">
                      {currentReel.subCategory}
                    </span>
                  )}
                  {currentReel.propertyType && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[10px] font-medium text-foreground">
                      <Building className="h-3 w-3" />
                      {currentReel.propertyType}
                    </span>
                  )}
                  {currentReel.element && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <Compass className="h-3 w-3" />
                      {currentReel.element}
                    </span>
                  )}
                  {currentReel.location && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {currentReel.location}
                    </span>
                  )}
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Views</span>
                    </div>
                    <p className="mt-1 font-bold text-foreground">
                      {currentReel.viewsCount || 0}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      <span>Likes</span>
                    </div>
                    <p className="mt-1 font-bold text-foreground">
                      {currentReel.likesCount || 0}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5 text-sky-500" />
                      <span>Comments</span>
                    </div>
                    <p className="mt-1 font-bold text-foreground">
                      {comments.length || currentReel.commentsCount || 0}
                    </p>
                  </div>
                </div>

                {/* Upload Date & Status */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  {currentReel.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Uploaded on{" "}
                        {new Date(currentReel.createdAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Comments Section */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Viewer Feedback & Comments
                  </span>
                  <button
                    onClick={fetchComments}
                    className="p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="Refresh comments"
                  >
                    <RefreshCw className={`h-3 w-3 ${commentsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {commentsLoading ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary mb-1" />
                    <span>Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No comments yet on this reel.
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-border/40">
                    {comments.map((comment) => (
                      <div key={comment.id} className="pt-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-foreground">
                                {comment.userName || 'User'}
                              </span>
                              {comment.username && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  @{comment.username}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingCommentId === comment.id}
                            className="p-1 text-muted-foreground hover:text-destructive transition cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <p className="text-xs text-foreground/90 pl-8 leading-relaxed">
                          {comment.commentText}
                        </p>

                        <div className="flex items-center gap-3 pl-8 text-[10px] text-muted-foreground">
                          <span>{new Date(comment.timestamp).toLocaleDateString()}</span>
                          <button
                            onClick={() => {
                              setReplyToCommentId(comment.id)
                            }}
                            className="text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-8 mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
                            {comment.replies.map((reply: any) => (
                              <div key={reply.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] text-foreground">
                                    {reply.userName || 'Admin'}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    disabled={deletingCommentId === reply.id}
                                    className="p-0.5 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-foreground/80">
                                  {reply.commentText}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="border-t border-border/60 p-4 space-y-3">
            {activeDrawerTab === 'comments' ? (
              /* Comment Input Box */
              <form onSubmit={handleAddComment} className="space-y-2">
                {replyToCommentId && (
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 px-2 py-1 text-[10px] text-primary">
                    <span className="flex items-center gap-1 font-semibold">
                      <CornerDownRight className="h-3 w-3" /> Replying to comment
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyToCommentId(null)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment or reply..."
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newCommentText.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              /* Info Tab Actions */
              <>
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-muted cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Copy Stream URL</span>
                  </button>

                  {currentReel.videoUrl && (
                    <a
                      href={currentReel.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                      title="Open video in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {onDelete && (
                  <button
                    onClick={() => {
                      onClose()
                      onDelete(currentReel.id, currentReel.title)
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-white cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Reel</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Close Button Overlay */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
