import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { VideoPlayer } from "./VideoPlayer"
import { reelsApi } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
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
  Pin,
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
  landmark?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  latitude?: number | null
  longitude?: number | null
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const currentReel = reels[currentIndex]

  // Tab State: 'info' or 'comments'
  const [activeDrawerTab, setActiveDrawerTab] = useState<"info" | "comments">(
    "info"
  )

  // Comments State
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newCommentText, setNewCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  )

  const fetchComments = async () => {
    if (!currentReel?.id) return
    setCommentsLoading(true)
    try {
      const res = await reelsApi.getComments(currentReel.id, {
        page: 1,
        limit: 50,
      })
      const list = Array.isArray(res) ? res : res.items || []
      setComments(list)
    } catch (err) {
      console.warn("Failed to load comments", err)
    } finally {
      setCommentsLoading(false)
    }
  }

  // Load comments whenever active reel changes or comments tab is selected
  useEffect(() => {
    if (isOpen && currentReel?.id) {
      fetchComments()
      setReplyToCommentId(null)
      setNewCommentText("")
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
              ? {
                  ...c,
                  replies: [...(c.replies || []), added],
                  repliesCount: (c.repliesCount || 0) + 1,
                }
              : c
          )
        )
      } else {
        setComments((prev) => [added, ...prev])
      }

      setNewCommentText("")
      setReplyToCommentId(null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return
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
      alert(err.response?.data?.message || "Failed to delete comment")
    } finally {
      setDeletingCommentId(null)
    }
  }

  const [pinningCommentId, setPinningCommentId] = useState<string | null>(null)

  const handleTogglePinComment = async (commentId: string) => {
    setPinningCommentId(commentId)
    try {
      await reelsApi.pinComment(commentId)
      await fetchComments()
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update pin status")
    } finally {
      setPinningCommentId(null)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys if user is typing in textarea / input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
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
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/85 p-2 backdrop-blur-md duration-200 fade-in sm:p-4 md:p-6">
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
          <div className="absolute top-1/2 right-4 flex -translate-y-1/2 flex-col gap-3">
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-primary disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/60"
              title="Previous Reel (Up Arrow)"
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === reels.length - 1}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-primary disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/60"
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
                className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveDrawerTab("info")}
                className={`flex cursor-pointer items-center gap-1.5 border-b-2 pb-2 text-xs font-semibold transition ${
                  activeDrawerTab === "info"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>Information</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("comments")}
                className={`flex cursor-pointer items-center gap-1.5 border-b-2 pb-2 text-xs font-semibold transition ${
                  activeDrawerTab === "comments"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Comments ({comments.length})</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeDrawerTab === "info" ? (
              <div className="space-y-4">
                {/* Creator Profile Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 text-sm font-bold text-primary ring-2 ring-primary/20">
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
                  <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
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

                {/* Admin Location & Exact Coordinates Card */}
                <div className="space-y-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Admin GPS & Location Data
                    </span>
                    <span className="rounded border border-primary/20 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary">
                      ADMIN ONLY
                    </span>
                  </div>

                  {currentReel.latitude != null &&
                  currentReel.longitude != null ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5 shadow-xs">
                          <span className="block text-[10px] font-medium text-muted-foreground">
                            Exact Latitude
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground select-all">
                            {Number(currentReel.latitude).toFixed(7)}°
                          </span>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5 shadow-xs">
                          <span className="block text-[10px] font-medium text-muted-foreground">
                            Exact Longitude
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground select-all">
                            {Number(currentReel.longitude).toFixed(7)}°
                          </span>
                        </div>
                      </div>

                      {/* Address / Landmark Breakdown */}
                      <div className="space-y-1 pt-0.5 text-xs text-muted-foreground">
                        {currentReel.landmark && (
                          <div className="flex items-start gap-1">
                            <span className="shrink-0 font-medium text-foreground">
                              Landmark:
                            </span>
                            <span className="text-foreground/90">
                              {currentReel.landmark}
                            </span>
                          </div>
                        )}
                        {(currentReel.city || currentReel.state) && (
                          <div className="flex items-start gap-1">
                            <span className="shrink-0 font-medium text-foreground">
                              City/State:
                            </span>
                            <span className="text-foreground/90">
                              {[currentReel.city, currentReel.state]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {currentReel.location && (
                          <div className="flex items-start gap-1">
                            <span className="shrink-0 font-medium text-foreground">
                              Full Address:
                            </span>
                            <span className="text-foreground/90">
                              {currentReel.location}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {/* <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`https://www.google.com/maps?q=${currentReel.latitude},${currentReel.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg border border-primary/20 transition cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Google Maps
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            const coords = `${Number(currentReel.latitude).toFixed(7)}, ${Number(currentReel.longitude).toFixed(7)}`
                            navigator.clipboard.writeText(coords)
                            setCopiedCoords(true)
                            setTimeout(() => setCopiedCoords(false), 2000)
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:text-primary bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-lg border border-border/60 transition cursor-pointer"
                        >
                          {copiedCoords ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Lat, Long</span>
                            </>
                          )}
                        </button>
                      </div> */}
                    </div>
                  ) : (
                    <div className="py-1 text-xs text-muted-foreground">
                      {currentReel.location ? (
                        <span>
                          Address:{" "}
                          <strong className="text-foreground">
                            {currentReel.location}
                          </strong>{" "}
                          (No GPS coordinates recorded)
                        </span>
                      ) : (
                        <span>
                          No location or GPS coordinates recorded for this
                          video.
                        </span>
                      )}
                    </div>
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
                    className="cursor-pointer p-1 text-muted-foreground transition hover:text-foreground"
                    title="Refresh comments"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${commentsLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>

                {commentsLoading ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="mx-auto mb-1 h-5 w-5 animate-spin text-primary" />
                    <span>Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No comments yet on this reel.
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-border/40">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`space-y-1.5 rounded-lg px-2 py-1.5 pt-2.5 transition-colors ${
                          comment.isPinned
                            ? "border border-primary/20 bg-primary/5"
                            : ""
                        }`}
                      >
                        {comment.isPinned && (
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-primary">
                            <Pin className="h-3 w-3 rotate-45 fill-primary/30" />
                            <span>Pinned by creator</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div
                            onClick={() => {
                              if (comment.userId) {
                                onClose()
                                navigate(`/dashboard/users/${comment.userId}`)
                              }
                            }}
                            className={`flex items-center gap-2 ${comment.userId ? "cursor-pointer group" : ""}`}
                            title={comment.userId ? `View ${comment.userName || "user"}'s profile` : undefined}
                          >
                            {(() => {
                              const avatarSrc =
                                comment.userAvatarUrl ||
                                comment.avatarUrl ||
                                comment.userAvatar ||
                                comment.user?.avatarUrl
                              return (
                                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-border/50 group-hover:border-primary transition-colors">
                                  {avatarSrc && (
                                    <img
                                      src={avatarSrc}
                                      alt={comment.userName || "User"}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        ;(e.currentTarget as HTMLElement).style.display = "none"
                                      }}
                                    />
                                  )}
                                  <span
                                    className={
                                      avatarSrc
                                        ? "absolute inset-0 -z-10 flex items-center justify-center"
                                        : ""
                                    }
                                  >
                                    {comment.userName?.charAt(0)?.toUpperCase() || "U"}
                                  </span>
                                </div>
                              )
                            })()}
                            <div>
                              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                {comment.userName || "User"}
                              </span>
                              {comment.username && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  @{comment.username}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTogglePinComment(comment.id)}
                              disabled={pinningCommentId === comment.id}
                              className={`cursor-pointer p-1 transition ${
                                comment.isPinned
                                  ? "text-primary hover:text-primary/70"
                                  : "text-muted-foreground hover:text-primary"
                              }`}
                              title={
                                comment.isPinned
                                  ? "Unpin comment"
                                  : "Pin comment"
                              }
                            >
                              <Pin
                                className={`h-3 w-3 ${comment.isPinned ? "fill-primary" : ""}`}
                              />
                            </button>

                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="cursor-pointer p-1 text-muted-foreground transition hover:text-destructive"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <p className="pl-9 text-xs leading-relaxed text-foreground/90">
                          {comment.commentText}
                        </p>

                        <div className="flex items-center gap-3 pl-9 text-[10px] text-muted-foreground">
                          <span>
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              setReplyToCommentId(comment.id)
                            }}
                            className="cursor-pointer font-semibold text-primary hover:underline"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 ml-8 space-y-2 border-l-2 border-primary/20 pl-3">
                            {comment.replies.map((reply: any) => {
                              const replyAvatar =
                                reply.userAvatarUrl ||
                                reply.avatarUrl ||
                                reply.userAvatar ||
                                reply.user?.avatarUrl
                              return (
                                <div key={reply.id} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div
                                      onClick={() => {
                                        if (reply.userId) {
                                          onClose()
                                          navigate(`/dashboard/users/${reply.userId}`)
                                        }
                                      }}
                                      className={`flex items-center gap-1.5 ${reply.userId ? "cursor-pointer group" : ""}`}
                                      title={reply.userId ? `View ${reply.userName || "user"}'s profile` : undefined}
                                    >
                                      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[9px] font-bold text-primary border border-border/40 group-hover:border-primary transition-colors">
                                        {replyAvatar && (
                                          <img
                                            src={replyAvatar}
                                            alt={reply.userName || "User"}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                              ;(e.currentTarget as HTMLElement).style.display = "none"
                                            }}
                                          />
                                        )}
                                        <span
                                          className={
                                            replyAvatar
                                              ? "absolute inset-0 -z-10 flex items-center justify-center"
                                              : ""
                                          }
                                        >
                                          {reply.userName?.charAt(0)?.toUpperCase() || "U"}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">
                                        {reply.userName || "Admin"}
                                      </span>
                                      {reply.username && (
                                        <span className="text-[9px] text-muted-foreground">
                                          @{reply.username}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleDeleteComment(reply.id)
                                      }
                                      disabled={deletingCommentId === reply.id}
                                      className="p-0.5 text-muted-foreground hover:text-destructive"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                  <p className="pl-6.5 text-[11px] text-foreground/80">
                                    {reply.commentText}
                                  </p>
                                </div>
                              )
                            })}
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
          <div className="space-y-3 border-t border-border/60 p-4">
            {activeDrawerTab === "comments" ? (
              /* Comment Input Box */
              <form onSubmit={handleAddComment} className="space-y-2">
                {replyToCommentId && (
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 px-2 py-1 text-[10px] text-primary">
                    <span className="flex items-center gap-1 font-semibold">
                      <CornerDownRight className="h-3 w-3" /> Replying to
                      comment
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
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary border border-border/60">
                    {user?.avatarUrl && (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || "You"}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLElement).style.display = "none"
                        }}
                      />
                    )}
                    <span
                      className={
                        user?.avatarUrl
                          ? "absolute inset-0 -z-10 flex items-center justify-center"
                          : ""
                      }
                    >
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
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
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
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
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Copy Stream URL</span>
                  </button>

                  {currentReel.videoUrl && (
                    <a
                      href={currentReel.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex cursor-pointer items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-white"
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
