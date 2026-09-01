import React, { useState, useEffect, useMemo } from 'react';
import { analyticsApi } from '../../services/api';
import { ReelPlayerModal, type ReelItem } from '../../components/ui/ReelPlayerModal';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  RefreshCw,
  Play,
  Film,
  Activity,
  Clock,
  MapPin,
  Compass,
  PieChart,
  ArrowUpDown,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<string>('28d');
  const [chartMetric, setChartMetric] = useState<'all' | 'views' | 'likes' | 'comments'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'likes' | 'comments' | 'engagement_rate'>('views');

  const [overview, setOverview] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topReels, setTopReels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Video Player Modal State
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [overviewRes, chartRes, topReelsRes, catRes, audRes] = await Promise.allSettled([
        analyticsApi.getPlatformOverview(timeframe),
        analyticsApi.getPlatformChart(chartMetric === 'all' ? 'views' : chartMetric, timeframe),
        analyticsApi.getPlatformTopReels(timeframe, 10, sortBy),
        analyticsApi.getPlatformCategories(timeframe),
        analyticsApi.getPlatformAudience(timeframe),
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (chartRes.status === 'fulfilled') setChartData(chartRes.value?.dataPoints || []);
      if (topReelsRes.status === 'fulfilled') setTopReels(topReelsRes.value?.items || []);
      if (catRes.status === 'fulfilled') setCategories(catRes.value?.categories || []);
      if (audRes.status === 'fulfilled') setAudience(audRes.value);

      setLastUpdated(new Date());
    } catch (e) {
      console.warn('Analytics fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, sortBy]);

  const modalReelItems: ReelItem[] = useMemo(() => {
    return topReels.map((r) => ({
      id: r.id,
      title: r.title,
      caption: r.caption,
      category: r.category,
      viewsCount: r.viewsCount,
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      videoUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl,
      creator: r.creator,
    }));
  }, [topReels]);

  const handlePlayTopReel = (index: number) => {
    setSelectedReelIndex(index);
    setIsPlayerOpen(true);
  };

  // Helper for trend badge
  const renderTrend = (growth?: number, label = 'vs previous period') => {
    if (growth === undefined || growth === null || isNaN(growth)) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Minus className="h-3.5 w-3.5" />
          <span>0.0% {label}</span>
        </div>
      );
    }

    if (growth > 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>+{growth.toFixed(1)}% {label}</span>
        </div>
      );
    }

    if (growth < 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
          <TrendingDown className="h-3.5 w-3.5" />
          <span>{growth.toFixed(1)}% {label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Minus className="h-3.5 w-3.5" />
        <span>0.0% {label}</span>
      </div>
    );
  };

  // Dynamic max value calculation for chart scaling
  const maxViewsInChart = useMemo(() => {
    if (chartData.length === 0) return 10;
    const maxVal = Math.max(
      ...chartData.map((d) => {
        if (chartMetric === 'views') return d.views || 0;
        if (chartMetric === 'likes') return d.likes || 0;
        if (chartMetric === 'comments') return d.comments || 0;
        return Math.max(d.views || 0, d.likes || 0, d.comments || 0);
      }),
      10
    );
    return maxVal;
  }, [chartData, chartMetric]);

  const totalPeriodViews = useMemo(() => {
    return chartData.reduce((sum, d) => sum + (d.views || 0), 0);
  }, [chartData]);

  const totalPeriodLikes = useMemo(() => {
    return chartData.reduce((sum, d) => sum + (d.likes || 0), 0);
  }, [chartData]);

  const totalPeriodComments = useMemo(() => {
    return chartData.reduce((sum, d) => sum + (d.comments || 0), 0);
  }, [chartData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Platform Analytics & Intelligence
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live DB Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            System-wide audience reach, engagement velocity, ranked reels, topic distribution, and regional insights
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-xl border border-input bg-card py-2 px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none transition shadow-xs cursor-pointer"
          >
            <option value="7d">Last 7 Days</option>
            <option value="28d">Last 28 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition cursor-pointer disabled:opacity-60"
            title={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${loading || refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards (6 dynamic metrics) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Video Views */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 hover:border-primary/40 transition">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Video Views</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.views?.total?.toLocaleString?.() ?? overview?.totalViews?.toLocaleString?.() ?? 0}
          </div>
          {renderTrend(overview?.views?.growthPercentage)}
          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/50 truncate">
            All-time: {overview?.views?.allTimeTotal?.toLocaleString?.() || 0} views
          </div>
        </div>

        {/* Likes & Reactions */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Likes & Reactions</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.likes?.total?.toLocaleString?.() ?? 0}
          </div>
          {renderTrend(overview?.likes?.growthPercentage)}
          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/50 truncate">
            Audience appreciation
          </div>
        </div>

        {/* Total Comments */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 hover:border-sky-500/40 transition">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Comments</span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.comments?.total?.toLocaleString?.() ?? 0}
          </div>
          {renderTrend(overview?.comments?.growthPercentage)}
          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/50 truncate">
            Community discussions
          </div>
        </div>

        {/* Bookmarks / Saves */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Saves & Bookmarks</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Bookmark className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.bookmarks?.total?.toLocaleString?.() ?? 0}
          </div>
          {renderTrend(overview?.bookmarks?.growthPercentage)}
          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/50 truncate">
            High-intent remedy saves
          </div>
        </div>

        {/* Platform Engagement Rate */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Engagement Rate</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.engagementRate?.rate ?? 0}%
          </div>
          {renderTrend(overview?.engagementRate?.growthPercentage)}
          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/50 truncate">
            {(
              (overview?.likes?.total || 0) +
              (overview?.comments?.total || 0) +
              (overview?.bookmarks?.total || 0)
            ).toLocaleString()}{' '}
            total interactions
          </div>
        </div>

        {/* Users & Creators */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.totalUsers?.toLocaleString?.() ?? 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="text-primary font-semibold">{overview?.totalCreators || 0}</span> Creators
            <span>•</span>
            <span className="text-foreground font-semibold">{overview?.totalReels || 0}</span> Reels
          </div>
          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/50 truncate">
            {overview?.uniqueViewers ? `${overview.uniqueViewers.toLocaleString()} unique viewers` : 'Registered platform members'}
          </div>
        </div>
      </div>

      {/* Viewership Trajectory & Velocity Chart */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Platform Viewership & Engagement Velocity</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Time-series distribution across the selected {timeframe === '7d' ? '7 days' : timeframe === '28d' ? '28 days' : timeframe === '90d' ? '90 days' : 'all-time'} window
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Toggle Buttons */}
            <div className="flex rounded-xl border border-border bg-muted/30 p-0.5 text-xs">
              <button
                onClick={() => setChartMetric('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMetric === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setChartMetric('views')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMetric === 'views' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Views
              </button>
              <button
                onClick={() => setChartMetric('likes')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMetric === 'likes' ? 'bg-rose-500 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Likes
              </button>
              <button
                onClick={() => setChartMetric('comments')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMetric === 'comments' ? 'bg-sky-500 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Comments
              </button>
            </div>

            {/* Total Period Summary Pill */}
            <div className="hidden md:flex items-center gap-3 text-xs bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
              <span className="text-muted-foreground font-medium">
                Period Total: <strong className="text-foreground">{totalPeriodViews.toLocaleString()}</strong> views,{' '}
                <strong className="text-rose-500">{totalPeriodLikes.toLocaleString()}</strong> likes,{' '}
                <strong className="text-sky-500">{totalPeriodComments.toLocaleString()}</strong> comments
              </span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-xs text-muted-foreground gap-2">
            <Film className="h-8 w-8 text-muted-foreground/40" />
            <span>No telemetry recorded for this timeframe yet.</span>
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex h-56 items-end gap-1.5 sm:gap-3 px-2 border-b border-border/80">
              {chartData.map((point: any, idx: number) => {
                const viewVal = point.views || 0;
                const likeVal = point.likes || 0;
                const commentVal = point.comments || 0;

                const viewHeight = Math.max(viewVal > 0 ? 8 : 2, Math.round((viewVal / maxViewsInChart) * 100));
                const likeHeight = Math.max(likeVal > 0 ? 6 : 2, Math.round((likeVal / maxViewsInChart) * 100));
                const commentHeight = Math.max(commentVal > 0 ? 4 : 2, Math.round((commentVal / maxViewsInChart) * 100));

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end"
                  >
                    {/* Hover Tooltip */}
                    <div className="pointer-events-none absolute -top-20 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[11px] rounded-xl p-2.5 shadow-xl border border-border z-30 whitespace-nowrap">
                      <div className="font-bold border-b border-border/60 pb-1 mb-1">{point.label}</div>
                      <div className="text-primary font-semibold">{viewVal.toLocaleString()} views</div>
                      <div className="text-rose-500 font-semibold">{likeVal.toLocaleString()} likes</div>
                      <div className="text-sky-500 font-semibold">{commentVal.toLocaleString()} comments</div>
                      {point.followers > 0 && (
                        <div className="text-indigo-400 font-semibold">+{point.followers} new members</div>
                      )}
                    </div>

                    {/* Bar columns */}
                    <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-full">
                      {(chartMetric === 'all' || chartMetric === 'views') && (
                        <div
                          style={{ height: `${viewHeight}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 shadow-xs ${
                            viewVal > 0 ? 'bg-primary/85 hover:bg-primary' : 'bg-muted/40'
                          }`}
                        />
                      )}
                      {(chartMetric === 'all' || chartMetric === 'likes') && (
                        <div
                          style={{ height: `${likeHeight}%` }}
                          className={`rounded-t-sm transition-all duration-300 ${
                            chartMetric === 'all' ? 'w-1.5 sm:w-2' : 'w-full'
                          } ${likeVal > 0 ? 'bg-rose-500/85 hover:bg-rose-500' : 'bg-muted/30'}`}
                        />
                      )}
                      {(chartMetric === 'all' || chartMetric === 'comments') && chartMetric === 'comments' && (
                        <div
                          style={{ height: `${commentHeight}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            commentVal > 0 ? 'bg-sky-500/85 hover:bg-sky-500' : 'bg-muted/30'
                          }`}
                        />
                      )}
                    </div>

                    {/* Date label */}
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground font-medium">Views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-muted-foreground font-medium">Likes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span className="text-muted-foreground font-medium">Comments</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Section: Top Ranked Reels vs Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranked Top Reels */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                <span>Top Performing Vastu Reels</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Ranked by real database metrics and viewer interaction
              </p>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-border bg-muted/40 py-1 px-2 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
              >
                <option value="views">Sort by Views</option>
                <option value="likes">Sort by Likes</option>
                <option value="comments">Sort by Comments</option>
                <option value="engagement_rate">Sort by Engagement %</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-1 max-h-[460px] overflow-y-auto pr-1">
            {topReels.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Film className="h-8 w-8 text-muted-foreground/30" />
                <span>No published reels found for this timeframe.</span>
              </div>
            ) : (
              topReels.map((reel, idx) => (
                <div
                  key={reel.id}
                  onClick={() => handlePlayTopReel(idx)}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 hover:bg-card hover:border-primary/40 hover:shadow-xs transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      #{reel.rank || idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition">
                        {reel.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate">
                        by @{reel.creator?.username || reel.creator?.name || 'creator'} •{' '}
                        <span className="font-medium text-foreground/80">{reel.category}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{(reel.viewsCount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{reel.likesCount || 0} likes</span>
                        <span>•</span>
                        <span>{reel.engagementRate || 0}% rate</span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition">
                      <Play className="h-2.5 w-2.5 fill-current" /> Play
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Topics Breakdown */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-500" />
                <span>Vastu Domains & Category Share</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Distribution computed across all active published reels
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
              {categories.length} Categories
            </span>
          </div>

          <div className="space-y-4 pt-1 max-h-[460px] overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Compass className="h-8 w-8 text-muted-foreground/30" />
                <span>No category metrics recorded yet.</span>
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{cat.category}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{cat.reelCount} reels</span>
                      <span>•</span>
                      <span className="text-primary font-bold">{cat.views.toLocaleString()} views</span>
                      <span className="text-xs text-foreground/80">({cat.sharePercentage}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-700"
                      style={{ width: `${Math.max(2, cat.sharePercentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audience Insights & Regional Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Viewing Hours (IST) */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Peak Viewing Hours (IST)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Dynamic activity timestamps grouped by time window
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {(!audience?.peakViewingHours || audience.peakViewingHours.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No audience timestamps recorded for this timeframe.
              </div>
            ) : (
              audience.peakViewingHours.map((slot: any, idx: number) => {
                const isPeak = slot.activityLevel?.includes('Peak');
                const isHigh = slot.activityLevel?.includes('High');

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                      isPeak
                        ? 'border-primary/50 bg-primary/5'
                        : isHigh
                        ? 'border-border/80 bg-muted/30'
                        : 'border-border/40 bg-muted/15'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground block">{slot.timeSlot}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {slot.count !== undefined ? `${slot.count} events` : 'Recorded events'}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isPeak
                          ? 'bg-primary/20 text-primary'
                          : isHigh
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {slot.activityLevel} ({slot.percentage}%)
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Audience Geographic Regions */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500" />
              <span>Top Geographic Regions</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Dynamically derived from user profiles and reel locations
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {(!audience?.topGeographicRegions || audience.topGeographicRegions.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <MapPin className="h-6 w-6 text-muted-foreground/30" />
                <span>No location telemetry recorded in selected timeframe.</span>
              </div>
            ) : (
              audience.topGeographicRegions.map((geo: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{geo.region}</span>
                    <span className="text-muted-foreground">
                      {geo.count ? `${geo.count} (${geo.percentage}%)` : `${geo.percentage}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-700"
                      style={{ width: `${Math.max(2, geo.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform Engagement Composition */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-500" />
              <span>Engagement Composition</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribution of interaction types across all reels
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {(!audience?.engagementBreakdown || audience.engagementBreakdown.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No engagement interactions recorded yet.
              </div>
            ) : (
              audience.engagementBreakdown.map((item: any, idx: number) => {
                const colorMap = [
                  'from-primary to-primary/80',
                  'from-rose-500 to-rose-400',
                  'from-sky-500 to-sky-400',
                  'from-purple-500 to-purple-400',
                ];
                const bgGradient = colorMap[idx % colorMap.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground">{item.name}</span>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>{item.count?.toLocaleString() || 0}</span>
                        <span>({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${bgGradient} transition-all duration-700`}
                        style={{ width: `${Math.max(1, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Reel Player Modal for Top Reels */}
      <ReelPlayerModal
        isOpen={isPlayerOpen}
        reels={modalReelItems}
        currentIndex={selectedReelIndex}
        onClose={() => setIsPlayerOpen(false)}
        onNavigate={(newIdx) => setSelectedReelIndex(newIdx)}
      />
    </div>
  );
};

export default AnalyticsPage;
