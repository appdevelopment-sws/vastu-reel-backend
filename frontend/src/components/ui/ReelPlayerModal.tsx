import React, { useEffect } from "react"
import { VideoPlayer } from "./VideoPlayer"
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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4 md:p-6">
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-primary disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/60"
              title="Previous Reel (Up Arrow)"
            >
              <ChevronUp className="h-5 w-5" />
            </button>

            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === reels.length - 1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-primary disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/60"
              title="Next Reel (Down Arrow)"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right / Metadata and Info Drawer */}
        <div className="hidden w-80 flex-col justify-between border-l border-border/80 bg-card p-6 md:flex lg:w-96">
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Header: Close Button & Counter */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Reel {currentIndex + 1} of {reels.length}
              </span>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Creator Profile Info */}
            <div className="flex items-center gap-3">
              <img
                src={
                  currentReel.creator?.avatarUrl ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                }
                alt={creatorName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20"
              />
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
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">
                {currentReel.title || "Untitled Reel"}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {currentReel.description ||
                  currentReel.caption ||
                  "No additional caption provided for this reel."}
              </p>
            </div>

            {/* Badges / Taxonomy Info */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentReel.category && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Layers className="h-3 w-3" />
                  {currentReel.category}
                </span>
              )}
              {currentReel.subCategory && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {currentReel.subCategory}
                </span>
              )}
              {currentReel.propertyType && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                  <Building className="h-3 w-3" />
                  {currentReel.propertyType}
                </span>
              )}
              {currentReel.element && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <Compass className="h-3 w-3" />
                  {currentReel.element}
                </span>
              )}
              {currentReel.location && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
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
                  {currentReel.commentsCount || 0}
                </p>
              </div>
            </div>

            {/* Upload Date & Status */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
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

          {/* Footer Actions */}
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Copy Stream URL</span>
              </button>

              {currentReel.videoUrl && (
                <a
                  href={currentReel.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Reel</span>
              </button>
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
