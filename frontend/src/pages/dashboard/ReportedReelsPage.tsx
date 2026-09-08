import React, { useState, useEffect } from 'react';
import {
  reelReportsApi,
  type ReelReportItem,
  type ReelReportsResponse,
} from '../../services/api';
import { ReelPlayerModal, type ReelItem } from '../../components/ui/ReelPlayerModal';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Film,
} from 'lucide-react';

export const ReportedReelsPage: React.FC = () => {
  const [reports, setReports] = useState<ReelReportItem[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);

  // Video modal
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [modalReels, setModalReels] = useState<ReelItem[]>([]);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchReports = async (currentPage = page) => {
    setLoading(true);
    try {
      const res: ReelReportsResponse = await reelReportsApi.getAll({
        page: currentPage,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
      });

      setReports(res.items || []);
      setTotal(res.total || 0);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (e: any) {
      console.error('Failed to load reported reels', e);
      setAlertMessage({
        type: 'error',
        text: e?.response?.data?.message || 'Failed to load reported reels.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchReports(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports(1);
  };

  const handleUpdateStatus = async (
    id: string,
    status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED',
    notes?: string
  ) => {
    setActionLoadingId(id);
    setAlertMessage(null);
    try {
      await reelReportsApi.updateStatus(id, status, notes);
      setAlertMessage({
        type: 'success',
        text: `Report marked as ${status.toLowerCase()}.`,
      });
      await fetchReports(page);
    } catch (e: any) {
      setAlertMessage({
        type: 'error',
        text: e?.response?.data?.message || 'Failed to update report status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTakedown = async (report: ReelReportItem) => {
    const title = report.reel?.title || 'this video';
    if (
      !window.confirm(
        `Are you sure you want to TAKE DOWN "${title}"?\nThis will remove the reel permanently from the public feed and resolve this report.`
      )
    ) {
      return;
    }

    setActionLoadingId(report.id);
    setAlertMessage(null);
    try {
      await reelReportsApi.takedownReel(report.id);
      setAlertMessage({
        type: 'success',
        text: `Reel "${title}" taken down successfully. Report marked as RESOLVED.`,
      });
      await fetchReports(page);
    } catch (e: any) {
      setAlertMessage({
        type: 'error',
        text: e?.response?.data?.message || 'Failed to take down reported reel.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePlayVideo = (report: ReelReportItem) => {
    if (!report.reel) return;

    const reelItem: ReelItem = {
      id: report.reel.id,
      title: report.reel.title,
      caption: report.reel.caption,
      category: report.reel.category,
      videoUrl: report.reel.media?.hlsUrl || report.reel.media?.mp4Url,
      thumbnailUrl: report.reel.media?.thumbnailUrl,
      creator: {
        id: report.reel.creator?.id,
        name: report.reel.creator?.name,
        avatarUrl: report.reel.creator?.avatarUrl,
      },
    };

    setModalReels([reelItem]);
    setSelectedReelIndex(0);
    setIsPlayerOpen(true);
  };

  const getReasonBadge = (reason: string) => {
    const lower = reason.toLowerCase();
    let bg = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (lower.includes('scam') || lower.includes('fraud') || lower.includes('violence')) {
      bg = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    } else if (lower.includes('inappropriate') || lower.includes('sexual')) {
      bg = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    } else if (lower.includes('copyright') || lower.includes('stolen')) {
      bg = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    } else if (lower.includes('spam')) {
      bg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
        {reason}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-pulse" /> Pending Review
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3 h-3" /> Dismissed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Reported Videos Moderation
              </h1>
              <p className="text-xs text-muted-foreground">
                Review flagged user reports, inspect community violations, and take moderation action.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchReports(page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-card border border-border rounded-xl text-foreground hover:bg-muted/60 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm border ${
            alertMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'ALL'
              ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md'
              : 'bg-card/60 border-border hover:bg-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Reports</span>
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{counts.total}</div>
          <span className="text-[11px] text-muted-foreground">All time reports</span>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'PENDING'
              ? 'bg-card border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-card/60 border-border hover:bg-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500">Needs Action</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-500">{counts.pending}</div>
          <span className="text-[11px] text-muted-foreground">Awaiting moderation</span>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'RESOLVED'
              ? 'bg-card border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-card/60 border-border hover:bg-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-500">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-500">{counts.resolved}</div>
          <span className="text-[11px] text-muted-foreground">Action taken</span>
        </div>

        <div
          onClick={() => setStatusFilter('DISMISSED')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'DISMISSED'
              ? 'bg-card border-muted-foreground ring-2 ring-muted/20 shadow-md'
              : 'bg-card/60 border-border hover:bg-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Dismissed</span>
            <XCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{counts.dismissed}</div>
          <span className="text-[11px] text-muted-foreground">No violation found</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search title, reporter, creator, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </form>

        {/* Tab pills */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto">
          {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table / List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading reported videos...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-foreground">No reports found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {statusFilter === 'PENDING'
                ? 'All clear! There are currently no pending video reports awaiting review.'
                : 'No reports matched your current filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Flagged Video</th>
                  <th className="py-3.5 px-4">Violation Reason</th>
                  <th className="py-3.5 px-4">Reporter Info</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((report) => {
                  const hasReel = !!report.reel;
                  const isDeleted = report.reel?.status === 'DELETED';
                  const isActionLoading = actionLoadingId === report.id;

                  return (
                    <tr key={report.id} className="hover:bg-muted/20 transition group">
                      {/* Flagged Video */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex gap-3">
                          {/* Video Thumbnail with Play Button */}
                          <div
                            onClick={() => hasReel && !isDeleted && handlePlayVideo(report)}
                            className={`relative shrink-0 w-20 h-28 rounded-xl overflow-hidden bg-black/30 border border-border/80 ${
                              hasReel && !isDeleted ? 'cursor-pointer group/thumb shadow-sm' : 'opacity-60'
                            }`}
                          >
                            {report.reel?.media?.thumbnailUrl ? (
                              <img
                                src={report.reel.media.thumbnailUrl}
                                alt={report.reel.title}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted/40">
                                <Film className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}

                            {hasReel && !isDeleted && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition duration-200">
                                <div className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow">
                                  <Play className="w-4 h-4 fill-black translate-x-0.5" />
                                </div>
                              </div>
                            )}

                            {isDeleted && (
                              <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center p-1 text-center">
                                <span className="text-[10px] font-bold text-rose-300 uppercase">Taken Down</span>
                              </div>
                            )}
                          </div>

                          {/* Reel Info */}
                          <div className="min-w-0 flex flex-col justify-between py-0.5 max-w-xs sm:max-w-sm">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                  {report.reel?.category || 'Reel'}
                                </span>
                                {isDeleted && (
                                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                    Deleted
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-foreground text-sm line-clamp-2 mt-1">
                                {report.reel?.title || 'Video (Removed)'}
                              </h4>
                            </div>

                            {/* Creator info */}
                            <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/40 text-xs text-muted-foreground">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                {report.reel?.creator?.avatarUrl ? (
                                  <img
                                    src={report.reel.creator.avatarUrl}
                                    alt="Creator"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-primary" />
                                )}
                              </div>
                              <span className="truncate font-medium text-foreground">
                                {report.reel?.creator?.name || 'Unknown Creator'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Violation Reason & User Explanation */}
                      <td className="py-4 px-4 align-top max-w-xs">
                        <div>
                          {getReasonBadge(report.reason)}
                          {report.details ? (
                            <div className="mt-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground/90 font-medium whitespace-pre-wrap line-clamp-3">
                              "{report.details}"
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground italic">No additional details provided.</p>
                          )}

                          {report.adminNotes && (
                            <div className="mt-1.5 text-[11px] text-amber-500/90 font-medium">
                              <span className="font-bold">Admin Note:</span> {report.adminNotes}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Reporter Info */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground text-xs">
                            {report.reporter?.name || 'Anonymous User'}
                          </p>
                          {report.reporter?.email && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {report.reporter.email}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 pt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(report.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>

                      {/* Moderation Actions */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                          {hasReel && !isDeleted && (
                            <button
                              onClick={() => handlePlayVideo(report)}
                              title="Play Video in Player"
                              className="p-2 rounded-xl text-primary hover:bg-primary/10 transition border border-transparent hover:border-primary/20"
                            >
                              <Play className="w-4 h-4 fill-primary" />
                            </button>
                          )}

                          {report.status !== 'RESOLVED' && !isDeleted && hasReel && (
                            <button
                              onClick={() => handleTakedown(report)}
                              disabled={isActionLoading}
                              title="Take Down Video (Removes from Feed & Resolves Report)"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition shadow-sm disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Take Down
                            </button>
                          )}

                          {report.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'DISMISSED', 'Reviewed - no violation.')}
                              disabled={isActionLoading}
                              title="Dismiss Report as Non-Violation"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted text-foreground border border-border hover:bg-muted/80 transition disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              Dismiss
                            </button>
                          )}

                          {report.status === 'PENDING' && isDeleted && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'RESOLVED', 'Reel already deleted.')}
                              disabled={isActionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-foreground">{total}</span> reports
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  fetchReports(newPage);
                }}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2 text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  fetchReports(newPage);
                }}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reel Player Modal */}
      {isPlayerOpen && (
        <ReelPlayerModal
          isOpen={isPlayerOpen}
          onClose={() => setIsPlayerOpen(false)}
          reels={modalReels}
          currentIndex={selectedReelIndex}
          onNavigate={(idx) => setSelectedReelIndex(idx)}
        />
      )}
    </div>
  );
};

export default ReportedReelsPage;
