import React, { useState, useEffect } from "react"
import { reelsApi } from "../../services/api"
import { ReelPlayerModal, type ReelItem } from "../../components/ui/ReelPlayerModal"
import {
  Film,
  Eye,
  Heart,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Play,
  Layers,
  Sparkles,
  Compass,
  MessageCircle,
} from "lucide-react"

export const ReelsPage: React.FC = () => {
  const [reels, setReels] = useState<ReelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Video Player Modal State
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedReelIndex, setSelectedReelIndex] = useState(0)

  // Track failed thumbnail images to show fallbacks
  const [failedThumbnails, setFailedThumbnails] = useState<
    Record<string, boolean>
  >({})

  const fetchReels = async () => {
    setLoading(true)
    try {
      const res = await reelsApi.getFeed({
        page: 1,
        limit: 50,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
      })
      const list = Array.isArray(res) ? res : res.items || res.reels || []
      setReels(list)
    } catch (e) {
      console.warn("Error fetching reels", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReels()
  }, [categoryFilter])

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete reel "${title}"?`)) {
      return
    }
    setDeletingId(id)
    try {
      await reelsApi.delete(id)
      setReels((prev) => prev.filter((r) => r.id !== id))
      if (isPlayerOpen) {
        setIsPlayerOpen(false)
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to delete reel")
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenPlayer = (index: number) => {
    setSelectedReelIndex(index)
    setIsPlayerOpen(true)
  }

  const filteredReels = reels.filter((r) => {
    if (!searchTerm) return true
    const matchTitle = r.title?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchDesc = (r.description || r.caption)
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchCategory = r.category
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchCreator = (r.creator?.name || r.user?.name)
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
    return matchTitle || matchDesc || matchCategory || matchCreator
  })

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Vastu Video Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse, play and inspect short videos, HLS streams & creator metadata
          </p>
        </div>

        <button
          onClick={fetchReels}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reel titles, topics, creators..."
            className="w-full rounded-xl border border-input bg-card py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="living_room">Living Room</option>
            <option value="Home Vastu">Home Vastu</option>
            <option value="Office Vastu">Office Vastu</option>
            <option value="Directions & Elements">Directions & Elements</option>
            <option value="Remedies">Remedies</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>
      </div>

      {/* Reels Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm">Loading reels collection...</p>
        </div>
      ) : filteredReels.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-muted-foreground">
          <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <h3 className="font-bold text-foreground">No Reels Found</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs">
            No video reels uploaded yet matching this filter. Creators can
            publish videos via the mobile app or API.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredReels.map((reel, index) => {
            const hasValidThumbnail =
              reel.thumbnailUrl && !failedThumbnails[reel.id]
            const creatorDisplayName =
              reel.creator?.name || reel.user?.name || "Vastu Advisor"
            const creatorHandle =
              reel.creator?.username || reel.user?.username || "creator"

            return (
              <div
                key={reel.id}
                onClick={() => handleOpenPlayer(index)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl"
              >
                {/* Thumbnail / Video Preview Container (Vertical 9:16) */}
                <div className="relative aspect-[9/14] w-full overflow-hidden bg-zinc-950">
                  {hasValidThumbnail ? (
                    <img
                      src={reel.thumbnailUrl!}
                      alt={reel.title}
                      onError={() =>
                        setFailedThumbnails((prev) => ({
                          ...prev,
                          [reel.id]: true,
                        }))
                      }
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    /* Elegant Fallback Card with Decorative Gradient & Elements */
                    <div className="flex h-full w-full flex-col items-center justify-between bg-gradient-to-br from-zinc-900 via-zinc-950 to-primary/20 p-6 text-center">
                      <div className="flex w-full justify-start">
                        <span className="rounded-lg bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary backdrop-blur-md">
                          {reel.category || "Vastu Tip"}
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/30">
                          <Film className="h-7 w-7" />
                        </div>
                        <h4 className="line-clamp-2 text-xs font-bold text-white/90">
                          {reel.title || "Vastu Video"}
                        </h4>
                        <span className="mt-1 text-[10px] text-white/50">
                          Click to stream HLS video
                        </span>
                      </div>

                      <div className="flex w-full items-center justify-between text-[10px] text-white/60">
                        <span>@{creatorHandle}</span>
                        <span>{reel.status || "READY"}</span>
                      </div>
                    </div>
                  )}

                  {/* Category badge overlay */}
                  {hasValidThumbnail && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                        {reel.category || "Vastu Reel"}
                      </span>
                    </div>
                  )}

                  {/* Element Badge (if present) */}
                  {reel.element && (
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-amber-300 backdrop-blur-md">
                        <Compass className="h-2.5 w-2.5" />
                        {reel.element}
                      </span>
                    </div>
                  )}

                  {/* Interactive Play Button Hover Overlay */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-xs transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 group-hover:scale-110">
                      <Play className="ml-1 h-6 w-6 fill-current" />
                    </div>
                  </div>

                  {/* Delete button overlay on Top Right */}
                  <div
                    className="absolute top-3 right-3 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleDelete(reel.id, reel.title)}
                      disabled={deletingId === reel.id}
                      className="rounded-lg bg-destructive/85 p-2 text-white shadow-md backdrop-blur-sm transition hover:bg-destructive"
                      title="Delete Reel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reel Info Footer */}
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-1 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                    {reel.title || "Untitled Reel"}
                  </h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {reel.description ||
                      reel.caption ||
                      "Short video reel explaining vastu guidelines."}
                  </p>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate text-[11px] font-semibold text-foreground">
                        {creatorDisplayName}
                      </span>
                      <span className="text-[10px] opacity-70">
                        @{creatorHandle}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span
                        className="flex items-center gap-1"
                        title={`${reel.viewsCount || 0} views`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{reel.viewsCount || 0}</span>
                      </span>
                      <span
                        className="flex items-center gap-1"
                        title={`${reel.likesCount || 0} likes`}
                      >
                        <Heart className="h-3.5 w-3.5 text-rose-500" />
                        <span>{reel.likesCount || 0}</span>
                      </span>
                      {reel.commentsCount !== undefined && (
                        <span
                          className="flex items-center gap-1"
                          title={`${reel.commentsCount || 0} comments`}
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-sky-500" />
                          <span>{reel.commentsCount || 0}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Video Streaming Player Modal */}
      <ReelPlayerModal
        isOpen={isPlayerOpen}
        reels={filteredReels}
        currentIndex={selectedReelIndex}
        onClose={() => setIsPlayerOpen(false)}
        onNavigate={(newIndex) => setSelectedReelIndex(newIndex)}
        onDelete={handleDelete}
      />
    </div>
  )
}
export default ReelsPage
