import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviewsApi, type AdminReview } from '../../services/api';
import {
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Building2,
  AlertCircle,
  Mail,
  Phone,
  Tag,
  Trash2,
} from 'lucide-react';

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.getAll(activeFilter !== 'ALL' ? activeFilter : undefined);
      setReviews(data);
    } catch (e) {
      console.error('Failed to load reviews', e);
      setAlertMessage({ type: 'error', text: 'Failed to load reviews from server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [activeFilter]);

  const handleUpdateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(id);
    setAlertMessage(null);
    try {
      await reviewsApi.updateStatus(id, newStatus);
      setAlertMessage({
        type: 'success',
        text: `Review successfully ${newStatus === 'APPROVED' ? 'approved' : 'rejected'}. Target agent rating recalculated.`,
      });
      await fetchReviews();
    } catch (e) {
      console.error('Failed to update review status', e);
      setAlertMessage({ type: 'error', text: 'Failed to update review status.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to permanently delete this review? This action cannot be undone and will recalculate the agent\'s rating.'
      )
    ) {
      return;
    }
    setActionLoadingId(id);
    setAlertMessage(null);
    try {
      await reviewsApi.delete(id);
      setAlertMessage({
        type: 'success',
        text: 'Review permanently deleted successfully. Target agent rating recalculated.',
      });
      await fetchReviews();
    } catch (e) {
      console.error('Failed to delete review', e);
      setAlertMessage({ type: 'error', text: 'Failed to delete review.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter reviews by search query
  const filteredReviews = reviews.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const reviewerName = r.reviewerName?.toLowerCase() || r.reviewer?.name?.toLowerCase() || '';
    const reviewerUser = r.reviewer?.username?.toLowerCase() || '';
    const reviewerEmail = r.reviewerEmail?.toLowerCase() || r.reviewer?.email?.toLowerCase() || '';
    const reviewerPhone = r.reviewerPhone?.toLowerCase() || '';
    const targetName = r.targetUser?.name?.toLowerCase() || '';
    const targetUser = r.targetUser?.username?.toLowerCase() || '';
    const comment = r.comment.toLowerCase();
    const prop = r.propertyDetails?.toLowerCase() || '';
    const tag = r.experienceTag?.toLowerCase() || '';
    return (
      reviewerName.includes(q) ||
      reviewerUser.includes(q) ||
      reviewerEmail.includes(q) ||
      reviewerPhone.includes(q) ||
      targetName.includes(q) ||
      targetUser.includes(q) ||
      comment.includes(q) ||
      prop.includes(q) ||
      tag.includes(q)
    );
  });

  // Metrics
  const pendingCount = reviews.filter((r) => r.status === 'PENDING').length;
  const approvedCount = reviews.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = reviews.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            <span>Reviews & Ratings Moderation</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {reviews.length} Total
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verify client feedback, moderate pending submissions, and manage authentic ratings across creator profiles.
          </p>
        </div>

        <button
          onClick={() => fetchReviews()}
          disabled={loading}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Alert banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{alertMessage.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Reviews
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground flex items-center gap-2">
            <span>{reviews.length}</span>
            <Star className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Across all profiles</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pending Moderation
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700 flex items-center gap-2">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Awaiting admin action</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">
            {approvedCount}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Live on mobile app</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </div>
          <div className="mt-1.5 text-2xl font-bold text-rose-700">
            {rejectedCount}
          </div>
          <div className="text-[11px] text-rose-700/80 mt-0.5">Hidden from community</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 overflow-x-auto">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeFilter === filter
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filter === 'PENDING' ? `Pending (${pendingCount})` : filter}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by reviewer, agent, comment, or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center px-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
            <Star className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Reviews Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {searchTerm
              ? 'No reviews match your current search query.'
              : `There are currently no reviews in the ${activeFilter.toLowerCase()} tab.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((review) => {
            const isPending = review.status === 'PENDING';
            const isApproved = review.status === 'APPROVED';
            const isProcessing = actionLoadingId === review.id;

            return (
              <div
                key={review.id}
                className="bg-card border border-border/80 rounded-2xl p-5 hover:border-primary/40 hover:shadow-sm transition-all space-y-4"
              >
                {/* Header: Reviewer & Target Profile */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    {review.reviewer?.avatarUrl ? (
                      <img
                        src={review.reviewer.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20">
                        {review.reviewer?.name ? review.reviewer.name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {review.reviewer?.name || 'Verified Client'}
                        <span className="text-xs text-muted-foreground font-normal">
                          (@{review.reviewer?.username || 'user'})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>Reviewed:</span>
                        {review.targetUser ? (
                          <Link
                            to={`/dashboard/users/${review.targetUser.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            {review.targetUser.name} (@{review.targetUser.username})
                          </Link>
                        ) : (
                          <span className="text-foreground">Unknown Agent</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Score & Status Pill */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-700 ml-1">
                        {review.rating}.0
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isApproved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {isPending && <Clock className="h-3 w-3" />}
                      {isApproved && <CheckCircle2 className="h-3 w-3" />}
                      {!isPending && !isApproved && <XCircle className="h-3 w-3" />}
                      {review.status}
                    </span>
                  </div>
                </div>

                {/* Comment & Tags Body */}
                <div className="space-y-2.5">
                  {/* Experience Tag & Property Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    {review.experienceTag && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          review.experienceTag.toLowerCase().includes('not')
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : review.experienceTag.toLowerCase().includes('best') ||
                              review.experienceTag.toLowerCase().includes('expert')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        <Tag className="h-3 w-3" />
                        {review.experienceTag}
                      </span>
                    )}

                    {review.propertyDetails && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-muted/60 text-xs text-muted-foreground border border-border/60">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Property: {review.propertyDetails}</span>
                      </div>
                    )}
                  </div>

                  {/* Comment Text */}
                  <p className="text-sm text-foreground leading-relaxed font-normal">
                    "{review.comment}"
                  </p>

                  {/* Contact Verification Row */}
                  {(review.reviewerEmail || review.reviewerPhone || review.reviewerName) && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                      <span className="font-semibold text-foreground">Verified Contact:</span>
                      {review.reviewerName && (
                        <span className="font-medium text-foreground">{review.reviewerName}</span>
                      )}
                      {review.reviewerEmail && (
                        <a
                          href={`mailto:${review.reviewerEmail}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {review.reviewerEmail}
                        </a>
                      )}
                      {review.reviewerPhone && (
                        <a
                          href={`tel:${review.reviewerPhone}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {review.reviewerPhone}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Date & Action Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  <div>Submitted: {new Date(review.createdAt).toLocaleString()}</div>

                  <div className="flex items-center gap-2">
                    {/* Approve Action */}
                    {!isApproved && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'APPROVED')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                    )}

                    {/* Reject Action */}
                    {review.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'REJECTED')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </button>
                    )}

                    {/* Delete Action */}
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={isProcessing}
                      title="Permanently delete review"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-rose-50 hover:border-rose-200 text-muted-foreground hover:text-rose-700 font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
