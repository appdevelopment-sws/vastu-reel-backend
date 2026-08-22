import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi, API_BASE_URL } from '../../services/api';
import {
  User,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [address, setAddress] = useState(user?.address || '');
  const [password, setPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await authApi.updateProfile({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        address: address.trim() || undefined,
        password: password.trim() || undefined,
      });

      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile settings';
      setMessage({ type: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Settings & Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your administrator account credentials and backend connection parameters
        </p>
      </div>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <p className="font-semibold">{message.text}</p>
        </div>
      )}

      {/* Profile Form */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span>Admin Profile Information</span>
        </h2>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Change Password (Leave blank to keep current)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Address / City
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backend API Configuration Info */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-500" />
          <span>Backend URL Configuration</span>
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Environment variable: <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">VITE_API_URL</code>
        </p>

        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">Active Base Endpoint:</span>
            <span className="font-bold text-foreground font-mono">{API_BASE_URL}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">API Swagger Documentation:</span>
            <a
              href={`${API_BASE_URL}/api/docs`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-mono"
            >
              {API_BASE_URL}/api/docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
