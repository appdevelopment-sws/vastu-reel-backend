import React, { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Database,
  CheckCircle2,
  Compass,
} from "lucide-react"
import { API_BASE_URL } from "../../services/api"

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, seedAdmin, isAuthenticated } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const from = (location.state as any)?.from?.pathname || "/dashboard"

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please provide both email and password.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Invalid email or password. Please check your credentials."
      setError(Array.isArray(msg) ? msg.join(", ") : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleFillAdmin = () => {
    setEmail("admin@gmail.com")
    setPassword("Admin@123")
    setError(null)
  }

  const handleSeedDatabase = async () => {
    setSeedLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await seedAdmin()
      setSuccessMessage(
        `${res.message || "Seeded successfully!"} Pre-filling admin credentials...`
      )
      setEmail(res.superAdminCredentials?.email || "admin@gmail.com")
      setPassword(res.superAdminCredentials?.password || "Admin@123")
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to seed default admin. Is backend running at " +
            API_BASE_URL +
            "?"
      )
    } finally {
      setSeedLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-chart-1/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Header / Logo */}
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-chart-2 to-chart-1 p-0.5 shadow-lg shadow-primary/25 transition-transform hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-background/90 backdrop-blur-sm">
              <Compass className="h-7 w-7 animate-pulse text-primary" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
            Vastu Video Admin
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your Vastu short-video platform & creator ecosystem
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-border/80 bg-card/80 p-8 shadow-xl backdrop-blur-xl transition-all">
          {/* Status Alerts */}
          {error && (
            <div className="mb-6 flex animate-in items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive fade-in slide-in-from-top-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Authentication failed</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex animate-in items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500 fade-in slide-in-from-top-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Database Seeded</p>
                <p className="text-xs opacity-90">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Admin Email
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-4 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Password
                </label>
              </div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-10 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground transition hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                />
                <span>Remember this device</span>
              </label>

              <button
                type="button"
                onClick={handleFillAdmin}
                className="text-xs font-medium text-primary transition hover:text-primary/80 hover:underline"
              >
                Fill Demo Admin
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Quick Setup & Seed Database Helper */}
          {/* <div className="mt-6 pt-6 border-t border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-chart-2" />
                <span>Backend API: {API_BASE_URL}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seedLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-muted/40 py-2 px-3 text-xs font-medium text-foreground transition hover:bg-muted active:scale-[0.99] disabled:opacity-50"
            >
              {seedLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-chart-1" />
              )}
              <span>Initialize & Seed Admin Credentials</span>
            </button>
          </div> */}
        </div>

        {/* Footer links */}
        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an admin or creator account yet?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  )
}
