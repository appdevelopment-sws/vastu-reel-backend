import React, { useState, useEffect } from 'react';
import { feedbackApi, type FeedbackItem } from '../../services/api';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Mail,
  Smartphone,
  Trash2,
  Filter,
  Sparkles,
  Check,
  Archive,
  Lightbulb,
  Bug,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'ARCHIVED'
  >('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    TOTAL: 0,
    PENDING: 0,
    REVIEWED: 0,
    RESOLVED: 0,
    ARCHIVED: 0,
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await feedbackApi.getAll({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setFeedbacks(data.items || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load feedback entries', e);
      setAlertMessage({
        type: 'error',
        text: 'Failed to load feedbacks from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [activeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedbacks();
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'ARCHIVED',
    adminNotes?: string
  ) => {
    setActionLoadingId(id);
    setAlertMessage(null);
    try {
      await feedbackApi.updateStatus(id, newStatus, adminNotes);
      setAlertMessage({
        type: 'success',
        text: `Feedback marked as ${newStatus}.`,
      });
      setEditingNoteId(null);
      await fetchFeedbacks();
    } catch (e) {
      console.error('Failed to update feedback status', e);
      setAlertMessage({
        type: 'error',
        text: 'Failed to update feedback status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this feedback entry?')) {
      return;
    }
    setActionLoadingId(id);
    try {
      await feedbackApi.delete(id);
      setAlertMessage({
        type: 'success',
        text: 'Feedback entry deleted successfully.',
      });
      await fetchFeedbacks();
    } catch (e) {
      console.error('Failed to delete feedback', e);
      setAlertMessage({
        type: 'error',
        text: 'Failed to delete feedback entry.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SUGGESTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Lightbulb className="w-3.5 h-3.5" /> Suggestion
          </span>
        );
      case 'BUG_REPORT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Bug className="w-3.5 h-3.5" /> Bug Report
          </span>
        );
      case 'IMPROVEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <TrendingUp className="w-3.5 h-3.5" /> Improvement
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> General
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">
            <Check className="w-3.5 h-3.5" /> Reviewed
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Archive className="w-3.5 h-3.5" /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Feedback & Suggestions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            User feedback, recommendations, ideas, and bug reports collected directly from the mobile app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFeedbacks()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl border border-border disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
            alertMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="p-4 border rounded-2xl bg-card border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Total Received</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.TOTAL}</p>
        </div>
        <div className="p-4 border rounded-2xl bg-card border-border/60">
          <p className="text-xs font-medium text-amber-500">Pending Review</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">{stats.PENDING}</p>
        </div>
        <div className="p-4 border rounded-2xl bg-card border-border/60">
          <p className="text-xs font-medium text-sky-500">Under Review</p>
          <p className="mt-2 text-2xl font-bold text-sky-500">{stats.REVIEWED}</p>
        </div>
        <div className="p-4 border rounded-2xl bg-card border-border/60">
          <p className="text-xs font-medium text-emerald-500">Resolved / Done</p>
          <p className="mt-2 text-2xl font-bold text-emerald-500">{stats.RESOLVED}</p>
        </div>
        <div className="p-4 border rounded-2xl bg-card border-border/60">
          <p className="text-xs font-medium text-zinc-400">Archived</p>
          <p className="mt-2 text-2xl font-bold text-zinc-400">{stats.ARCHIVED}</p>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col gap-4 p-4 border rounded-2xl bg-card/60 border-border/60 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['PENDING', 'ALL', 'REVIEWED', 'RESOLVED', 'ARCHIVED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeFilter === filter
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search feedback or sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-9 pr-4 text-xs font-medium border rounded-xl bg-background border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </form>
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 border rounded-2xl bg-card/40 border-border/40">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">Loading suggestions and feedback...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border rounded-2xl bg-card/40 border-border/40">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No Feedbacks Found</h3>
          <p className="max-w-md mt-1 text-xs text-muted-foreground">
            {activeFilter !== 'ALL'
              ? `No feedbacks currently in ${activeFilter.toLowerCase()} status.`
              : 'No feedback or suggestion messages have been submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {feedbacks.map((item) => (
            <div
              key={item.id}
              className="p-5 transition-all border rounded-2xl bg-card border-border/60 hover:border-border hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* User & Metadata info */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 font-bold rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary border border-primary/20 shrink-0">
                    {item.user?.avatarUrl ? (
                      <img
                        src={item.user.avatarUrl}
                        alt=""
                        className="object-cover w-full h-full rounded-xl"
                      />
                    ) : (
                      (item.user?.name?.[0] || item.contactEmail?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {item.user?.name || 'Anonymous User'}
                      </span>
                      {item.user?.email && (
                        <span className="text-xs text-muted-foreground">
                          ({item.user.email})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      {item.deviceInfo && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Smartphone className="w-3 h-3" />
                          {item.deviceInfo}
                        </span>
                      )}
                      {item.contactEmail && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Mail className="w-3 h-3" />
                          {item.contactEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2">
                  {getTypeBadge(item.type)}
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Feedback Content Box */}
              <div className="p-4 mt-4 text-sm leading-relaxed border rounded-xl bg-secondary/30 border-border/40 text-foreground whitespace-pre-wrap">
                {item.content}
              </div>

              {/* Admin Notes Section */}
              {item.adminNotes && editingNoteId !== item.id && (
                <div className="p-3 mt-3 text-xs border rounded-xl bg-blue-500/5 border-blue-500/20 text-blue-400 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Admin Note: </span>
                    <span>{item.adminNotes}</span>
                  </div>
                </div>
              )}

              {/* Note Editor Modal / Inline */}
              {editingNoteId === item.id && (
                <div className="mt-3 p-3 border rounded-xl bg-background border-border">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Add Admin Note / Resolution Details
                  </label>
                  <textarea
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="E.g. Approved for roadmap, investigated in v1.2..."
                    className="w-full p-2.5 text-xs border rounded-lg bg-card border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingNoteId(null)}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(item.id, item.status, noteText)}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-border/40">
                <div className="flex flex-wrap items-center gap-2">
                  {item.status !== 'REVIEWED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'REVIEWED')}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors border border-sky-500/20"
                    >
                      Mark Reviewed
                    </button>
                  )}
                  {item.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {item.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'ARCHIVED')}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors border border-zinc-500/20"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingNoteId(item.id);
                      setNoteText(item.adminNotes || '');
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                  >
                    {item.adminNotes ? 'Edit Note' : 'Add Note'}
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={actionLoadingId === item.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default FeedbackPage;
