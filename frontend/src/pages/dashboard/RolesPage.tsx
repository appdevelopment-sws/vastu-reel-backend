import React, { useState, useEffect } from 'react';
import { authApi } from '../../services/api';
import {
  ShieldCheck,
  Key,
  RefreshCw,
  Search,
  Lock,
  Sparkles,
} from 'lucide-react';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [permSearch, setPermSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.allSettled([
        authApi.getRoles(),
        authApi.getPermissions(),
      ]);

      if (rolesRes.status === 'fulfilled') {
        setRoles(Array.isArray(rolesRes.value) ? rolesRes.value : []);
      }
      if (permsRes.status === 'fulfilled') {
        setPermissions(Array.isArray(permsRes.value) ? permsRes.value : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPerms = permissions.filter((p) => {
    if (!permSearch) return true;
    const q = permSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.resource?.toLowerCase().includes(q) ||
      p.action?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Roles & Access Control (RBAC)</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {roles.length} System Roles
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configured system roles, security scopes, and granular capability matrices enforced across all APIs
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh RBAC</span>
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => {
          const isSuper = role.name === 'SUPER_ADMIN';
          const isAdmin = role.name === 'ADMIN';
          const isCreator = role.name === 'CREATOR';

          return (
            <div
              key={role.id}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                    isSuper
                      ? 'bg-purple-500/10 text-purple-500'
                      : isAdmin
                      ? 'bg-blue-500/10 text-blue-500'
                      : isCreator
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <ShieldCheck className="h-5 w-5" />
                </span>

                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                  {role.permissions?.length || 0} permissions
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <span>{role.name}</span>
                  {isCreator && <Sparkles className="h-3 w-3 text-amber-500" />}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {role.description || 'System access level role configuration'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Access Level:</span>
                <span className="font-bold text-foreground">
                  {isSuper ? 'Root Unrestricted' : isAdmin ? 'Full Administrative' : isCreator ? 'Creator & Upload' : 'Standard Viewer'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Explorer */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Granular Platform Permissions Matrix</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Discrete permission scopes validated by backend Guards & NestJS Decorators
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder="Search resource, action, scope..."
              className="w-full rounded-xl border border-input bg-background py-1.5 pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
            <span>Loading permissions catalog...</span>
          </div>
        ) : filteredPerms.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No permissions matching "{permSearch}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPerms.map((perm) => (
              <div
                key={perm.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 hover:bg-card hover:border-primary/30 transition"
              >
                <div className="h-8 w-8 rounded-lg bg-chart-2/10 flex items-center justify-center text-chart-2 shrink-0 mt-0.5">
                  <Key className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{perm.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5 text-primary font-bold">
                      {perm.resource}:{perm.action}
                    </span>
                  </div>
                  {perm.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {perm.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default RolesPage;
