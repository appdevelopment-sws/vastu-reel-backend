import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../services/api';
import { CreateUserModal } from '../../components/ui/CreateUserModal';
import { EditUserModal } from '../../components/ui/EditUserModal';
import {
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Video,
  Eye,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  UserPlus,
  Edit3,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Block Modal State
  const [blockModalUser, setBlockModalUser] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll({
        search: searchTerm || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      const list = Array.isArray(res) ? res : res.items || res.users || [];
      setUsers(list);
    } catch (e) {
      console.warn('Failed to load users', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (user: any) => {
    if (user.isActive) {
      // Open block reason modal
      setBlockModalUser(user);
      setBlockReason('');
    } else {
      // Unblock directly
      if (!window.confirm(`Are you sure you want to unblock "${user.name}"?`)) {
        return;
      }
      setStatusUpdatingId(user.id);
      try {
        await usersApi.unblock(user.id);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, isActive: true, status: 'ACTIVE' } : u
          )
        );
      } catch (e: any) {
        alert(e.response?.data?.message || 'Failed to unblock user');
      } finally {
        setStatusUpdatingId(null);
      }
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockModalUser) return;
    setStatusUpdatingId(blockModalUser.id);
    try {
      await usersApi.block(blockModalUser.id, blockReason);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === blockModalUser.id
            ? { ...u, isActive: false, status: 'BLOCKED' }
            : u
        )
      );
      setBlockModalUser(null);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to block user');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"? This will also remove their uploaded reels.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await usersApi.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const totalCreators = users.filter((u) =>
    (u.roles || []).some((r: any) => (r.name || r) === 'CREATOR') || (u.videoCount ?? 0) > 0
  ).length;

  const totalVideos = users.reduce((sum, u) => sum + (u.videoCount || 0), 0);
  const totalViews = users.reduce((sum, u) => sum + (u.totalViews || 0), 0);
  const totalBlocked = users.filter((u) => u.isActive === false).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Users & Creators Hub</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {users.length} Total Accounts
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor creator activity, view uploaded reels, inspect deep analytics, and manage account statuses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create New User</span>
          </button>

          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Creators
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground flex items-center gap-2">
            <span>{totalCreators}</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active content publishers</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Videos Uploaded
          </div>
          <div className="mt-1.5 text-2xl font-bold text-primary flex items-center gap-2">
            <span>{totalVideos.toLocaleString()}</span>
            <Video className="h-4 w-4" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Across all creators</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Views
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-500 flex items-center gap-2">
            <span>{totalViews.toLocaleString()}</span>
            <Eye className="h-4 w-4" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Platform video streams</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Restricted / Blocked
          </div>
          <div className="mt-1.5 text-2xl font-bold text-destructive flex items-center gap-2">
            <span>{totalBlocked}</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Accounts locked</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, @username, email..."
            className="w-full rounded-xl border border-input bg-card py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-input bg-card py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="BLOCKED">Blocked / Restricted</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-input bg-card py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="CREATOR">Creator</option>
              <option value="USER">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">User / Creator</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Videos Uploaded</th>
                <th className="px-5 py-3.5">Engagement</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs">Loading directory and creator metrics...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleName =
                    u.roles?.[0]?.name ||
                    (typeof u.roles?.[0] === 'string' ? u.roles[0] : 'USER');
                  const isBlocked = u.isActive === false;
                  const videoCount = u.videoCount ?? 0;
                  const totalViewsCount = u.totalViews ?? 0;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/dashboard/users/${u.id}`)}
                    >
                      {/* User Avatar & Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 font-bold text-primary text-sm shadow-xs border border-primary/20">
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            {roleName === 'CREATOR' && (
                              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-card flex items-center justify-center">
                                <Sparkles className="h-2 w-2 text-white" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition flex items-center gap-1.5">
                              <span>{u.name}</span>
                              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-primary" />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              @{u.username || 'unknown'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-4">
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
                      </td>

                      {/* Videos Uploaded Count */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                              videoCount > 0
                                ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                                : 'bg-muted/60 text-muted-foreground border border-border'
                            }`}
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>{videoCount} {videoCount === 1 ? 'Video' : 'Videos'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Engagement */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{totalViewsCount.toLocaleString()} views</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {!isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                              <ShieldAlert className="h-3 w-3" />
                              <span>Blocked</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details button */}
                          <button
                            onClick={() => navigate(`/dashboard/users/${u.id}`)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition cursor-pointer"
                            title="View Creator Analytics & Reels"
                          >
                            Details
                          </button>

                          {/* Edit User button */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                            title="Edit User"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Block / Unblock button */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={statusUpdatingId === u.id}
                            className={`rounded-lg p-1.5 transition cursor-pointer disabled:opacity-50 ${
                              isBlocked
                                ? 'text-emerald-500 hover:bg-emerald-500/10'
                                : 'text-amber-500 hover:bg-amber-500/10'
                            }`}
                            title={isBlocked ? 'Unblock Account' : 'Block Account'}
                          >
                            {statusUpdatingId === u.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : isBlocked ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <ShieldAlert className="h-4 w-4" />
                            )}
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={deletingId === u.id}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer disabled:opacity-50"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchUsers()}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => fetchUsers()}
      />

      {/* Block Account Confirmation Modal */}
      {blockModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Block Creator / User</h3>
                <p className="text-xs text-muted-foreground">Restrict access and disable uploads</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              Are you sure you want to block <strong className="text-foreground">{blockModalUser.name}</strong> (@{blockModalUser.username})?
              They will not be able to log in or publish reels until unblocked.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reason for blocking (Optional)
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Terms violation, spam content, copyright issue..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBlockModalUser(null)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={statusUpdatingId === blockModalUser.id}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {statusUpdatingId === blockModalUser.id && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>Confirm Block</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
