import React, { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import {
  usersApi,
  reelsApi,
  activityApi,
  API_BASE_URL,
} from "../../services/api"
import {
  Users,
  Film,
  Eye,
  TrendingUp,
  Shield,
  ArrowUpRight,
  Database,
  ExternalLink,
  Activity,
  RefreshCw,
} from "lucide-react"
import { Link } from "react-router-dom"

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth()

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    totalReels: 0,
    totalViews: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentReels, setRecentReels] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch users
      let usersList: any[] = []
      try {
        const usersRes = await usersApi.getAll()
        usersList = Array.isArray(usersRes)
          ? usersRes
          : usersRes.items || usersRes.users || []
        setRecentUsers(usersList.slice(0, 5))
      } catch (e) {
        console.warn("Users fetch error", e)
      }

      // 2. Fetch reels
      let reelsList: any[] = []
      try {
        const feedRes = await reelsApi.getFeed({ page: 1, limit: 10 })
        reelsList = Array.isArray(feedRes)
          ? feedRes
          : feedRes.items || feedRes.reels || []
        setRecentReels(reelsList.slice(0, 4))
      } catch (e) {
        console.warn("Reels fetch error", e)
      }

      // 3. Fetch activity logs
      try {
        const actRes = await activityApi.getGlobalActivity(1, 6)
        const actList = Array.isArray(actRes)
          ? actRes
          : actRes.items || actRes.data || []
        setActivities(actList)
      } catch (e) {
        console.warn("Activity fetch error", e)
      }

      // Compute stats
      const creatorsCount = usersList.filter((u: any) =>
        u.roles?.some((r: any) =>
          typeof r === "string" ? r === "CREATOR" : r.name === "CREATOR"
        )
      ).length

      const totalViewsCount = reelsList.reduce(
        (acc: number, item: any) => acc + (item.viewsCount || item.views || 0),
        0
      )

      setStats({
        totalUsers: usersList.length,
        totalCreators: creatorsCount,
        totalReels: reelsList.length,
        totalViews: totalViewsCount,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      change: "+12% this week",
      icon: Users,
      color: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-500",
    },
    {
      title: "Active Creators",
      value: stats.totalCreators,
      change: "Vastu Masters",
      icon: Shield,
      color: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-500",
    },
    {
      title: "Vastu Video",
      value: stats.totalReels,
      change: "Published Videos",
      icon: Film,
      color: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-500",
    },
    {
      title: "Total Impressions",
      value: stats.totalViews.toLocaleString(),
      change: "Views & Interactions",
      icon: Eye,
      color: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-500",
    },
  ]

  return (
    <div className="animate-in space-y-8 duration-500 fade-in">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-primary/10 via-chart-2/10 to-background p-6 backdrop-blur-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
                {user?.roles?.[0] || "ADMINISTRATOR"}
              </span>
              <span className="text-xs text-muted-foreground">
                • Vastu Video Ecosystem
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {user?.name || "Administrator"}! 👋
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Monitor creator reels, user engagement, transcoding pipelines, and
              platform insights in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`}
              />
              <span>Refresh Metrics</span>
            </button>

            {/* <a
              href={`${API_BASE_URL}/api/docs`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Swagger API Docs</span>
            </a> */}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {card.title}
                </span>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${card.color} ${card.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {loading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    card.value
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{card.change}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2-Column Content Grid: Users & Reels vs System Status & Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Reels & Creators */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Users / Creators */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="font-bold text-foreground">
                  Recent Accounts & Creators
                </h3>
                <p className="text-xs text-muted-foreground">
                  Latest registered members and astrologers
                </p>
              </div>
              <Link
                to="/dashboard/users"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>View All</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-border/40">
              {recentUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No registered users found yet.
                </div>
              ) : (
                recentUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {u.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {u.roles?.[0]?.name || u.roles?.[0] || "USER"}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          u.isActive !== false
                            ? "bg-emerald-500"
                            : "bg-destructive"
                        }`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Reel Feed Preview */}
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h3 className="font-bold text-foreground">
                Latest Reels Uploads
              </h3>
              <p className="text-xs text-muted-foreground">
                Vastu short videos published by creators
              </p>
            </div>
            <Link
              to="/dashboard/reels"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Browse Reels</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {recentReels.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                No reels published yet. Upload your first reel from the mobile
                app or API!
              </div>
            ) : (
              recentReels.map((reel) => (
                <div
                  key={reel.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3.5 transition hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="line-clamp-1 text-xs font-bold text-foreground">
                      {reel.title || "Untitled Vastu Reel"}
                    </h4>
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {reel.category || "General"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {reel.description || "No description provided"}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    <span>By @{reel.user?.username || "creator"}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {reel.viewsCount || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Right Col: Backend Environment Status & Activity Feed */}
      </div>
    </div>
  )
}
