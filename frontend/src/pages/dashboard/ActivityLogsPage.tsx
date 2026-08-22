import React, { useState, useEffect } from 'react';
import { activityApi } from '../../services/api';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Film,
  Heart,
  MessageCircle,
  UserCheck,
  UserX,
  UserPlus,
  ShieldAlert,
  Sparkles,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
} from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Log for JSON Metadata modal
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const fetchLogs = async (currentPage = page) => {
    setLoading(true);
    try {
      const res = await activityApi.getAll({
        page: currentPage,
        limit,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        search: searchTerm || undefined,
      });

      const list = Array.isArray(res) ? res : res.items || res.data || [];
      const totalCount = res.total ?? list.length;
      setLogs(list);
      setTotal(totalCount);
    } catch (e) {
      console.warn('Failed to fetch activity logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'REEL_PUBLISHED':
        return {
          label: 'Reel Published',
          icon: Film,
          color: 'bg-primary/10 text-primary border-primary/20',
        };
      case 'LIKE':
        return {
          label: 'Like Reaction',
          icon: Heart,
          color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        };
      case 'COMMENT':
        return {
          label: 'Comment / Reply',
          icon: MessageCircle,
          color: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
        };
      case 'FOLLOW':
        return {
          label: 'New Follower',
          icon: UserCheck,
          color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        };
      case 'USER_REGISTERED':
        return {
          label: 'User Joined',
          icon: UserPlus,
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        };
      case 'USER_BLOCKED':
        return {
          label: 'Account Blocked',
          icon: UserX,
          color: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      case 'USER_UNBLOCKED':
        return {
          label: 'Account Restored',
          icon: ShieldAlert,
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        };
      case 'MENTION':
        return {
          label: 'User Mention',
          icon: Sparkles,
          color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        };
      default:
        return {
          label: type || 'System Event',
          icon: Activity,
          color: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Activity & Audit Logs</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {total} Events Recorded
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time telemetry and audit trail for all video publications, user interactions, and moderation events
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page)}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Telemetry
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground flex items-center gap-2">
            <span>{total.toLocaleString()}</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Platform audit entries</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Streamed
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-500 flex items-center gap-2">
            <span>Active</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Audit logging enabled</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Retention
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground flex items-center gap-2">
            <span>Full History</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Immutable audit storage</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Security Status
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground flex items-center gap-2">
            <span>Compliant</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">RBAC enforced</div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search event messages or users..."
            className="w-full rounded-xl border border-input bg-card py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-input bg-card py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Event Types</option>
            <option value="REEL_PUBLISHED">Reel Publications</option>
            <option value="LIKE">Likes & Reactions</option>
            <option value="COMMENT">Comments & Replies</option>
            <option value="FOLLOW">Follows & Connections</option>
            <option value="USER_REGISTERED">User Registrations</option>
            <option value="USER_BLOCKED">Moderation Blocks</option>
            <option value="USER_UNBLOCKED">Account Restores</option>
            <option value="MENTION">Mentions</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Event Type</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Visibility</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs">Loading activity logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No activity entries found matching your filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getTypeBadge(log.type);
                  const Icon = badge.icon;

                  return (
                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                      {/* Type Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${badge.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Message */}
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <p className="line-clamp-2 max-w-md">{log.message}</p>
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.actorName ? (
                          <span className="font-semibold text-foreground">{log.actorName}</span>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>

                      {/* Global / Personal */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            log.isGlobal
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {log.isGlobal ? 'Global Public' : 'Targeted User'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Details Inspector Button */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                        >
                          <Info className="h-3 w-3 text-primary" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
          <div>
            Showing Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{totalPages}</strong> ({total} total entries)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted transition disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted transition disabled:opacity-30 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Metadata Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-y-auto max-h-[85vh] rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Log Payload Inspector</h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Log ID:
                </span>
                <p className="font-mono text-foreground">{inspectLog.id}</p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Event Type:
                </span>
                <p className="font-bold text-primary">{inspectLog.type}</p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Message:
                </span>
                <p className="text-foreground">{inspectLog.message}</p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Timestamp:
                </span>
                <p className="text-foreground font-mono">
                  {new Date(inspectLog.createdAt).toISOString()}
                </p>
              </div>

              {inspectLog.metadata && (
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Metadata JSON:
                  </span>
                  <pre className="mt-1 max-h-52 overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] text-foreground">
                    {JSON.stringify(inspectLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectLog(null)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ActivityLogsPage;
