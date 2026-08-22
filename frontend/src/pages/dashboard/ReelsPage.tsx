import React, { useState, useEffect } from "react"
import { reelsApi } from "../../services/api"
import {
  Film,
  Eye,
  Heart,
  Trash2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react"

export const ReelsPage: React.FC = () => {
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    if (!window.confirm(`Delete reel "${title}"?`)) return
    setDeletingId(id)
    try {
      await reelsApi.delete(id)
      setReels((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to delete reel")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredReels = reels.filter((r) => {
    if (!searchTerm) return true
    const matchTitle = r.title?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchDesc = r.description
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
    return matchTitle || matchDesc
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
            Browse, moderate and inspect short videos, playback URLs & metadata
          </p>
        </div>

        <button
          onClick={fetchReels}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reel titles or topics..."
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
            <option value="Home Vastu">Home Vastu</option>
            <option value="Office Vastu">Office Vastu</option>
            <option value="Directions & Elements">Directions & Elements</option>
            <option value="Remedies">Remedies</option>
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
          {filteredReels.map((reel) => (
            <div
              key={reel.id}
              className="group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
            >
              {/* Thumbnail / Video Container */}
              <div className="relative aspect-[9/14] w-full overflow-hidden bg-black/90">
                {reel.thumbnailUrl ? (
                  <img
                    src={reel.thumbnailUrl}
                    alt={reel.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                    <Film className="mb-2 h-10 w-10 text-primary opacity-40" />
                    <span className="text-xs font-semibold">Video Stream</span>
                    <span className="text-[10px] opacity-60">
                      Status: {reel.status || "READY"}
                    </span>
                  </div>
                )}

                {/* Video category badge */}
                <div className="absolute top-3 left-3">
                  <span className="rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    {reel.category || "Vastu Tip"}
                  </span>
                </div>

                {/* Delete button overlay */}
                <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleDelete(reel.id, reel.title)}
                    disabled={deletingId === reel.id}
                    className="rounded-lg bg-destructive/80 p-2 text-white shadow-md backdrop-blur-sm hover:bg-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Reel Info */}
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-1 text-sm font-bold text-foreground">
                  {reel.title || "Untitled Reel"}
                </h3>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {reel.description || "No description"}
                </p>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  <span className="text-[11px] font-semibold text-primary">
                    @{reel.user?.username || "creator"}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {reel.viewsCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />{" "}
                      {reel.likesCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
