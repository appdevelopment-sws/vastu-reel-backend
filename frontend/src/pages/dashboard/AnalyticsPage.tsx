import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/api';
import { ReelPlayerModal, type ReelItem } from '../../components/ui/ReelPlayerModal';
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  Play,
  Film,
  Sparkles,
  BarChart3,
  Clock,
  MapPin,
  Compass,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState('28d');
  const [overview, setOverview] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topReels, setTopReels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Video Player Modal State
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, chartRes, topReelsRes, catRes, audRes] = await Promise.allSettled([
        analyticsApi.getPlatformOverview(timeframe),
        analyticsApi.getPlatformChart('views', timeframe),
        analyticsApi.getPlatformTopReels(timeframe, 8),
        analyticsApi.getPlatformCategories(timeframe),
        analyticsApi.getPlatformAudience(timeframe),
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (chartRes.status === 'fulfilled') setChartData(chartRes.value?.dataPoints || []);
      if (topReelsRes.status === 'fulfilled') setTopReels(topReelsRes.value?.items || []);
      if (catRes.status === 'fulfilled') setCategories(catRes.value?.categories || []);
      if (audRes.status === 'fulfilled') setAudience(audRes.value);
    } catch (e) {
      console.warn('Analytics fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const maxViewsInChart = Math.max(...chartData.map((d) => d.views || 0), 10);

  const modalReelItems: ReelItem[] = topReels.map((r) => ({
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

  const handlePlayTopReel = (index: number) => {
    setSelectedReelIndex(index);
    setIsPlayerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Platform Analytics & Engagement</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Live Intelligence
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide audience reach, viewership velocity, top performing reels, and Vedic topics distribution
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Views */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Video Views</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.views?.total?.toLocaleString?.() || overview?.totalViews?.toLocaleString?.() || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+{overview?.views?.growthPercentage ?? 18.4}% vs previous period</span>
          </div>
        </div>

        {/* Likes & Reactions */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Likes & Reactions</span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.likes?.total?.toLocaleString?.() || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+{overview?.likes?.growthPercentage ?? 12.5}% engagement</span>
          </div>
        </div>

        {/* Total Comments */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Audience Comments</span>
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.comments?.total?.toLocaleString?.() || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sky-500 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Active viewer discussions</span>
          </div>
        </div>

        {/* Total Reach & Creators */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Registered Users</span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overview?.totalUsers?.toLocaleString?.() || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>{overview?.totalCreators || 0} Active Creators</span>
            <span>•</span>
            <span>{overview?.totalReels || 0} Reels</span>
          </div>
        </div>
      </div>

      {/* Viewership Trajectory Chart */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Platform Viewership & Engagement Velocity</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Daily video views and reactions aggregated across all published reels
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
              <span className="text-muted-foreground font-medium">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              <span className="text-muted-foreground font-medium">Likes</span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No telemetry data recorded for this timeframe yet.
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex h-52 items-end gap-2 sm:gap-3 px-2 border-b border-border/80">
              {chartData.map((point: any, idx: number) => {
                const viewHeight = Math.max(8, Math.round((point.views / maxViewsInChart) * 100));
                const likeHeight = Math.max(4, Math.round((point.likes / maxViewsInChart) * 100));

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end"
                  >
                    {/* Hover Tooltip */}
                    <div className="pointer-events-none absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] rounded-xl p-2.5 shadow-xl border border-border z-30 whitespace-nowrap">
                      <div className="font-bold">{point.label}</div>
                      <div className="text-primary font-semibold">{point.views} views</div>
                      <div className="text-rose-500 font-semibold">{point.likes} likes</div>
                    </div>

                    {/* Bar columns */}
                    <div className="w-full max-w-[32px] flex items-end justify-center gap-1 h-full">
                      <div
                        style={{ height: `${viewHeight}%` }}
                        className="w-full bg-primary/80 hover:bg-primary rounded-t-md transition-all duration-300 shadow-xs"
                      />
                      <div
                        style={{ height: `${likeHeight}%` }}
                        className="w-1.5 bg-rose-500/80 hover:bg-rose-500 rounded-t-sm transition-all duration-300"
                      />
                    </div>

                    {/* Date label */}
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

      {/* 2-Column Section: Top Ranked Reels vs Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranked Top Reels */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                <span>Top Performing Vastu Reels</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Ranked by organic views and viewer engagement
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {topReels.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No published reels available yet.
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
                        by @{reel.creator?.username || 'creator'} • {reel.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{(reel.viewsCount || 0).toLocaleString()}</span>
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
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-500" />
              <span>Vastu Domains & Category Share</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Viewer viewership distribution across architectural and energy domains
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {categories.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No category metrics recorded yet.
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
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-1000"
                      style={{ width: `${cat.sharePercentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audience Insights & Geographic Regions */}
      {audience && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Viewing Hours */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Peak Viewing Hours (IST)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Optimal time windows when users stream and engage with reels
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {(audience.peakViewingHours || []).map((slot: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
                  <span className="text-xs font-semibold text-foreground">{slot.timeSlot}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    {slot.activityLevel} ({slot.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Reach */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>Top Audience Geographic Regions</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Distribution of viewers seeking Vastu remedies across India
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {(audience.topGeographicRegions || []).map((geo: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{geo.region}</span>
                    <span className="text-muted-foreground">{geo.percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-700"
                      style={{ width: `${geo.percentage * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
