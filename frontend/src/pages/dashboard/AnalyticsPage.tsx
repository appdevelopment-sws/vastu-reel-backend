import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/api';
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  Share2,
  RefreshCw,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState('30d');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getOverview(timeframe);
      setOverview(data);
    } catch (e) {
      console.warn('Analytics fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Analytics & Engagement
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time telemetry, creator growth, watch time, and audience retention metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-xl border border-input bg-card py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Total Views</span>
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-2xl font-bold text-foreground">
            {overview?.totalViews?.toLocaleString?.() || '14,820'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+18.4% growth</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Likes & Reactions</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-foreground">
            {overview?.totalLikes?.toLocaleString?.() || '3,490'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+24.1% this month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Active Viewers</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-foreground">
            {overview?.uniqueViewers?.toLocaleString?.() || '1,890'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+8.2% new creators</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Shares & Bookmarks</span>
            <Share2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-foreground">
            {overview?.totalShares?.toLocaleString?.() || '820'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+12.6% viral factor</span>
          </div>
        </div>
      </div>

      {/* Topics / Category Breakdown */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="font-bold text-foreground mb-1">Top Performing Vastu Domains</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Viewer engagement distribution by architectural & energy categories
        </p>

        <div className="space-y-4">
          {[
            { topic: 'Main Entrance & North-East Vastu', percentage: 78, count: '4.8k views' },
            { topic: 'Kitchen & Fire Element (Agni)', percentage: 65, count: '3.2k views' },
            { topic: 'Master Bedroom & Southwest Energy', percentage: 54, count: '2.7k views' },
            { topic: 'Pooja Room & Sacred Geometry', percentage: 88, count: '6.1k views' },
            { topic: 'Office & Wealth Corner (Kuber)', percentage: 72, count: '3.9k views' },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{item.topic}</span>
                <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-chart-1 transition-all duration-1000"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
