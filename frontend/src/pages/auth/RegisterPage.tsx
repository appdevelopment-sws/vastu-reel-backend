import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Compass,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  Calendar,
  MapPin,
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Video,
  UserCheck,
} from "lucide-react"

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    age: "",
    address: "",
    roleName: "CREATOR", // Default to creator or admin
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !formData.name ||
      !formData.username ||
      !formData.email ||
      !formData.password
    ) {
      setError(
        "Please fill in all required fields (Name, Username, Email, Password)."
      )
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await register({
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        address: formData.address.trim() || undefined,
        roleName: formData.roleName,
      })

      navigate("/dashboard", { replace: true })
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please check your details."
      setError(Array.isArray(msg) ? msg.join(", ") : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Ambient background decoration */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-chart-2/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-chart-2 to-chart-1 p-0.5 shadow-lg shadow-primary/25">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-background/90 backdrop-blur-sm">
              <Compass className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
            Join Vastu Platform
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create an Admin or Creator account to start publishing & managing
            Vastu content
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-border/80 bg-card/80 p-8 shadow-xl backdrop-blur-xl transition-all">
          {error && (
            <div className="mb-6 flex animate-in items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive fade-in slide-in-from-top-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Unable to register</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Account Role Selector */}
            <div className="grid grid-cols-3 gap-2 pb-2">
              {[
                {
                  id: "CREATOR",
                  label: "Creator",
                  icon: Video,
                  desc: "Upload reels",
                },
                { id: "ADMIN", label: "Admin", icon: Shield, desc: "Moderate" },
                { id: "USER", label: "User", icon: UserCheck, desc: "Viewer" },
              ].map((role) => {
                const Icon = role.icon
                const isSelected = formData.roleName === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({ ...p, roleName: role.id }))
                    }
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                        : "border-border bg-background/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="mb-1 h-5 w-5" />
                    <span className="text-xs font-bold">{role.label}</span>
                    <span className="text-[10px] opacity-70">{role.desc}</span>
                  </button>
                )
              })}
            </div>

            {/* Name & Username Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Full Name *
                </label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Acharya Sharma"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-4 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Username *
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 text-xs font-bold text-muted-foreground">
                    @
                  </span>
                  <input
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="vastu_expert"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-4 pl-8 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Email & Password Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Email Address *
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="acharya@vastu.com"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-4 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Password *
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-10 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Details Row (Phone, Age, Address) */}
            <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Phone (Optional)
                </label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-3 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Age (Optional)
                </label>
                <div className="relative mt-1.5">
                  <Calendar className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    name="age"
                    type="number"
                    min={18}
                    max={120}
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="30"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-3 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  City / Location
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Delhi, India"
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pr-3 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          Already registered as an Admin or Creator?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  )
}
