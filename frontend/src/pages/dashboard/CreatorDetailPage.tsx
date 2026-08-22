import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersApi, reelsApi } from '../../services/api';
import { ReelPlayerModal, type ReelItem } from '../../components/ui/ReelPlayerModal';
import {
  ArrowLeft,
  Video,
  Eye,
  Heart,
  MessageCircle,
  Users,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Play,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  BarChart3,
  Film,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export const CreatorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [summaryData, setSummaryData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [reelsLoading, setReelsLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'videos' | 'account'>('analytics');

  // Filters
  const [timeframe, setTimeframe] = useState('28d');
  const [videoStatusFilter, setVideoStatusFilter] = useState('ALL');
  const [videoSearchTerm, setVideoSearchTerm] = useState('');

  // Moderation & Status Actions
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [deletingReelId, setDeletingReelId] = useState<string | null>(null);

  // Video Player Modal State
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  // Failed thumbnail tracker
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

  // 1. Fetch Creator Summary
  const fetchSummary = async () => {
    if (!id) return;
    try {
      const data = await usersApi.getCreatorSummary(id);
      setSummaryData(data);
    } catch (e) {
      console.warn('Failed to load creator summary', e);
    }
  };

  // 2. Fetch Creator Analytics
  const fetchAnalytics = async () => {
    if (!id) return;
    setAnalyticsLoading(true);
    try {
      const data = await usersApi.getCreatorAnalytics(id, { timeframe });
      setAnalyticsData(data);
    } catch (e) {
      console.warn('Failed to load creator analytics', e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // 3. Fetch Creator Reels
  const fetchReels = async () => {
    if (!id) return;
    setReelsLoading(true);
    try {
      const res = await usersApi.getCreatorReels(id, {
        status: videoStatusFilter !== 'ALL' ? videoStatusFilter : undefined,
        search: videoSearchTerm || undefined,
        limit: 50,
      });
      setReels(res.items || []);
    } catch (e) {
      console.warn('Failed to load creator reels', e);
    } finally {
      setReelsLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchAnalytics(), fetchReels()]);
      setLoading(false);
    };
    init();
  }, [id]);

  // Refetch Analytics when timeframe changes
  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [timeframe]);

  // Refetch Reels when filter/search changes
  useEffect(() => {
    if (!loading) {
      fetchReels();
    }
  }, [videoStatusFilter]);

  const handleSearchReels = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReels();
  };

  // Toggle Block / Unblock
  const handleToggleBlock = async () => {
    if (!summaryData?.user) return;
    const user = summaryData.user;

    if (user.isActive) {
      setShowBlockModal(true);
      setBlockReason('');
    } else {
      if (!window.confirm(`Are you sure you want to unblock "${user.name}"?`)) return;
      setStatusUpdating(true);
      try {
        await usersApi.unblock(user.id);
        setSummaryData((prev: any) => ({
          ...prev,
          user: { ...prev.user, isActive: true, status: 'ACTIVE' },
        }));
      } catch (e: any) {
        alert(e.response?.data?.message || 'Failed to unblock creator');
      } finally {
        setStatusUpdating(false);
      }
    }
  };

  const handleConfirmBlock = async () => {
    if (!id) return;
    setStatusUpdating(true);
    try {
      await usersApi.block(id, blockReason);
      setSummaryData((prev: any) => ({
        ...prev,
        user: { ...prev.user, isActive: false, status: 'BLOCKED' },
      }));
      setShowBlockModal(false);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to block creator');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete Reel
  const handleDeleteReel = async (reelId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete video "${title}"?`)) return;
    setDeletingReelId(reelId);
    try {
      await reelsApi.delete(reelId);
      setReels((prev) => prev.filter((r) => r.id !== reelId));
      fetchSummary();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete video');
    } finally {
      setDeletingReelId(null);
    }
  };

  // Open Video Player Modal
  const handlePlayReel = (index: number) => {
    setSelectedReelIndex(index);
    setIsPlayerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading creator profile & analytics...
        </p>
      </div>
    );
  }

  const user = summaryData?.user;
  const stats = summaryData?.stats || {};
  const isBlocked = user?.isActive === false;
  const roleName = user?.roles?.[0] || 'USER';

  // Format reels for the Player Modal
  const modalReelItems: ReelItem[] = reels.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.caption || '',
    category: r.category || 'Vastu',
    subCategory: r.subCategory,
    propertyType: r.propertyType,
    element: r.element,
    location: r.location,
    status: r.status,
    viewsCount: r.viewsCount || 0,
    likesCount: r.likesCount || 0,
    commentsCount: r.commentsCount || 0,
    videoUrl: r.videoUrl || r.hlsMasterPlaylistUrl,
    thumbnailUrl: r.thumbnailUrl,
    createdAt: r.createdAt,
    creator: {
      id: user?.id,
      name: user?.name,
      username: user?.username,
      avatarUrl: undefined,
    },
  }));

  // Max views in chart for relative height scaling
  const chartPoints = analyticsData?.dataPoints || [];
  const maxChartViews = Math.max(...chartPoints.map((p: any) => p.views || 0), 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Back Button & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard/users')}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Users</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchSummary();
              fetchAnalytics();
              fetchReels();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Creator Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Avatar & User Details */}
          <div className="flex items-start gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-amber-500/20 text-xl font-bold text-primary shadow-sm border border-primary/20">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              {roleName === 'CREATOR' && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-500 border-2 border-card flex items-center justify-center shadow-xs">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {user?.name}
                </h1>
                <span className="text-xs text-muted-foreground font-medium">
                  @{user?.username}
                </span>

                {/* Role Pill */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
                    roleName === 'SUPER_ADMIN' || roleName === 'ADMIN'
                      ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      : roleName === 'CREATOR'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {roleName}
                </span>

                {/* Account Status Pill */}
                {!isBlocked ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Active Account</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                    <ShieldAlert className="h-3 w-3" />
                    <span>Blocked / Restricted</span>
                  </span>
                )}
              </div>

              {/* Contact meta */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{user?.phone}</span>
                  </div>
                )}
                {user?.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{user?.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Moderation Buttons */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={handleToggleBlock}
              disabled={statusUpdating}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 ${
                isBlocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white'
              }`}
            >
              {statusUpdating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : isBlocked ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              <span>{isBlocked ? 'Unblock Creator' : 'Block Creator'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Creator High-Level KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Videos */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Uploaded Videos</span>
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {stats.totalReels ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="text-emerald-500 font-semibold">{stats.readyReels ?? 0} Ready</span>
            <span>•</span>
            <span>{stats.processingReels ?? 0} Processing</span>
          </div>
        </div>

        {/* Total Views */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Total Views</span>
            <Eye className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-500">
            {(stats.totalViews ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            ~{(stats.estimatedReach ?? 0).toLocaleString()} Reach
          </div>
        </div>

        {/* Total Likes */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Likes & Loves</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {(stats.totalLikes ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Reel reactions</div>
        </div>

        {/* Total Comments */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Comments</span>
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {(stats.totalComments ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Audience replies</div>
        </div>

        {/* Total Followers */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Followers</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {(stats.followersCount ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Following {stats.followingCount ?? 0}
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Engagement</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-500">
            {stats.engagementRate ?? 0}%
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Avg {stats.avgViewsPerReel ?? 0} views/video
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Creator Analytics & Charts</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'videos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Film className="h-4 w-4" />
            <span>Uploaded Videos Library ({stats.totalReels ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Account Details & Permissions</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Analytics Header & Timeframe Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Performance Telemetry & Growth Trends
              </h2>
              <p className="text-xs text-muted-foreground">
                Granular viewership velocity and reaction history for this creator
              </p>
            </div>

            <div className="flex items-center gap-2 self-start">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="rounded-xl border border-input bg-card py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="28d">Last 28 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Time Series Performance Chart */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Viewership Trajectory</h3>
                <p className="text-xs text-muted-foreground">Daily video impressions over selected timeframe</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                  <span className="text-muted-foreground">Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-muted-foreground">Likes</span>
                </div>
              </div>
            </div>

            {/* Visual Bar / Curve Chart */}
            {analyticsLoading ? (
              <div className="flex h-56 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : chartPoints.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
                No telemetry recorded for this timeframe yet.
              </div>
            ) : (
              <div className="pt-6">
                <div className="flex h-48 items-end gap-2 sm:gap-3 px-2 border-b border-border/80">
                  {chartPoints.map((point: any, idx: number) => {
                    const viewHeightPercent = Math.max(
                      8,
                      Math.round((point.views / maxChartViews) * 100)
                    );
                    const likeHeightPercent = Math.max(
                      4,
                      Math.round((point.likes / maxChartViews) * 100)
                    );

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5 group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="pointer-events-none absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] rounded-lg p-2 shadow-lg border border-border z-20 whitespace-nowrap">
                          <div className="font-bold">{point.label}</div>
                          <div className="text-primary">{point.views} views</div>
                          <div className="text-rose-500">{point.likes} likes</div>
                        </div>

                        {/* Bars */}
                        <div className="w-full max-w-[28px] flex items-end justify-center gap-0.5 h-full">
                          <div
                            style={{ height: `${viewHeightPercent}%` }}
                            className="w-full bg-primary/80 hover:bg-primary rounded-t-md transition-all duration-300"
                          />
                          <div
                            style={{ height: `${likeHeightPercent}%` }}
                            className="w-1.5 bg-rose-500/80 hover:bg-rose-500 rounded-t-sm transition-all duration-300"
                          />
                        </div>

                        {/* Label */}
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                          {point.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Vastu Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Content Categories Breakdown</h3>
                <p className="text-xs text-muted-foreground">Topics and specializations published by creator</p>
              </div>

              <div className="space-y-3.5 pt-2">
                {(analyticsData?.categories || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No categorical data available.
                  </p>
                ) : (
                  (analyticsData?.categories || []).map((cat: any, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-foreground">{cat.category}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{cat.reelsCount} videos</span>
                          <span>•</span>
                          <span className="text-primary font-bold">{cat.views.toLocaleString()} views</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          style={{ width: `${cat.percentage || 15}%` }}
                          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Retention & Moderation Status Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Account Health & Moderation</h3>
                <p className="text-xs text-muted-foreground">Compliance score, strike status, and reach telemetry</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-2.5">
                    {!isBlocked ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-xs font-semibold text-foreground">
                      Account Standing
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      !isBlocked ? 'text-emerald-500' : 'text-destructive'
                    }`}
                  >
                    {!isBlocked ? 'In Good Standing' : 'Blocked by Admin'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">
                      Creator Tier
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-500">
                    {(stats.totalViews ?? 0) > 10000 ? 'Verified Pro Creator' : 'Standard Creator'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Average Video Duration
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    ~28.5 seconds
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOADED VIDEOS GALLERY */}
      {activeTab === 'videos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search & Filter Bar for Creator's Reels */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchReels} className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={videoSearchTerm}
                onChange={(e) => setVideoSearchTerm(e.target.value)}
                placeholder="Search creator's videos by title..."
                className="w-full rounded-xl border border-input bg-card py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={videoStatusFilter}
                onChange={(e) => setVideoStatusFilter(e.target.value)}
                className="rounded-xl border border-input bg-card py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Video Statuses</option>
                <option value="READY">Ready & Published</option>
                <option value="PROCESSING">Processing / Transcoding</option>
                <option value="FAILED">Failed Uploads</option>
              </select>
            </div>
          </div>

          {/* Videos Grid */}
          {reelsLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary" />
              <p className="mt-2 text-xs">Loading video library...</p>
            </div>
          ) : reels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Film className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-bold text-foreground">No videos found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                This creator hasn't published any reels matching your filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {reels.map((reel, index) => {
                const hasValidThumbnail = reel.thumbnailUrl && !failedThumbnails[reel.id];
                const isReady = reel.status === 'READY';

                return (
                  <div
                    key={reel.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    {/* Thumbnail & Video Preview Area */}
                    <div className="relative aspect-9/16 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                      {hasValidThumbnail ? (
                        <img
                          src={reel.thumbnailUrl}
                          alt={reel.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={() => {
                            setFailedThumbnails((prev) => ({ ...prev, [reel.id]: true }));
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <Film className="h-8 w-8 text-primary/40 mb-1" />
                          <span className="text-[11px] font-medium text-slate-400">
                            {reel.category || 'Vastu Video'}
                          </span>
                        </div>
                      )}

                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                      {/* Status Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
                            reel.status === 'READY'
                              ? 'bg-emerald-500/80 text-white'
                              : reel.status === 'PROCESSING'
                              ? 'bg-amber-500/80 text-white animate-pulse'
                              : 'bg-rose-500/80 text-white'
                          }`}
                        >
                          {reel.status}
                        </span>
                      </div>

                      {/* Category Tag */}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white border border-white/10">
                          {reel.category || 'Vastu'}
                        </span>
                      </div>

                      {/* Play Button Overlay */}
                      {isReady && (
                        <button
                          onClick={() => handlePlayReel(index)}
                          className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 cursor-pointer"
                          title="Watch video"
                        >
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </button>
                      )}

                      {/* Bottom Views / Stats on Thumbnail */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5 drop-shadow-md">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{(reel.viewsCount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 drop-shadow-md">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
                            {reel.likesCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {reel.commentsCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-foreground line-clamp-1">
                          {reel.title || 'Untitled Reel'}
                        </h4>
                        {reel.caption && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {reel.caption}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-[10px] text-muted-foreground">
                          {reel.createdAt ? new Date(reel.createdAt).toLocaleDateString() : 'N/A'}
                        </span>

                        <div className="flex items-center gap-1">
                          {isReady && (
                            <button
                              onClick={() => handlePlayReel(index)}
                              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition cursor-pointer"
                              title="Play Video"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReel(reel.id, reel.title)}
                            disabled={deletingReelId === reel.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer disabled:opacity-50"
                            title="Delete Video"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNT & PERMISSIONS */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Account Credentials & Profile Data
              </h2>
              <p className="text-xs text-muted-foreground">
                Internal system details, IDs, and permission controls
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  User ID (UUID)
                </span>
                <div className="font-mono text-xs text-foreground select-all">
                  {user?.id}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Email Address
                </span>
                <div className="text-xs font-semibold text-foreground">
                  {user?.email}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Handle (@username)
                </span>
                <div className="text-xs font-semibold text-foreground">
                  @{user?.username || 'none'}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Contact Phone
                </span>
                <div className="text-xs font-semibold text-foreground">
                  {user?.phone || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Quick Status Control */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Account Moderation Status</h4>
                <p className="text-[11px] text-muted-foreground">
                  Blocking this account disables user login and hides content creation
                </p>
              </div>

              <button
                onClick={handleToggleBlock}
                disabled={statusUpdating}
                className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 ${
                  isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-destructive text-white hover:bg-destructive/90'
                }`}
              >
                {isBlocked ? 'Unblock Creator' : 'Block Creator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Creator Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Block Creator Account</h3>
                <p className="text-xs text-muted-foreground">Restrict login and video publishing</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              Are you sure you want to block <strong className="text-foreground">{user?.name}</strong> (@{user?.username})?
              Their account will be locked immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reason for restriction (Optional)
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Inappropriate content, terms violation..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={statusUpdating}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {statusUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Block</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Streaming Player Modal */}
      <ReelPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        reels={modalReelItems}
        currentIndex={selectedReelIndex}
        onNavigate={(newIdx) => setSelectedReelIndex(newIdx)}
        onDelete={handleDeleteReel}
      />
    </div>
  );
};
