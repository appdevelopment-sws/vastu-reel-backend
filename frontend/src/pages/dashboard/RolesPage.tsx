import React, { useState, useEffect } from 'react';
import { authApi } from '../../services/api';
import { ShieldCheck, Key, RefreshCw } from 'lucide-react';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Roles & Permissions (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground">
            Configured platform roles and granular security capability mappings
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                {role.permissions?.length || 0} permissions
              </span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-foreground">{role.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {role.description || 'System access level role'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Table */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="font-bold text-foreground mb-1">Granular Platform Permissions</h3>
        <p className="text-xs text-muted-foreground mb-4">
          All discrete permission scopes validated by backend Guards & Decorators
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {permissions.map((perm) => (
            <div
              key={perm.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
            >
              <Key className="h-4 w-4 text-chart-2 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{perm.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Scope: {perm.resource}:{perm.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
