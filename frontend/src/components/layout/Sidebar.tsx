import React from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Compass,
  LayoutDashboard,
  Film,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  User as UserIcon,
} from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    {
      label: "Overview",
      path: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: "Reels Library",
      path: "/dashboard/reels",
      icon: Film,
      badge: "Live",
    },
    {
      label: "Users & Creators",
      path: "/dashboard/users",
      icon: Users,
      badge: null,
      adminOnly: true,
    },
    {
      label: "Analytics",
      path: "/dashboard/analytics",
      icon: BarChart3,
      badge: null,
    },
    {
      label: "Roles & Access",
      path: "/dashboard/roles",
      icon: ShieldCheck,
      badge: "RBAC",
      adminOnly: true,
    },
    {
      label: "Settings",
      path: "/dashboard/settings",
      icon: Settings,
      badge: null,
    },
  ]

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const primaryRole = user?.roles?.[0] || "USER"

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary via-chart-2 to-chart-1 text-primary-foreground shadow-md shadow-primary/20">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-foreground">
              <span>Vastu</span>
              <span className="font-black text-primary">Reels</span>
            </div>
            <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              Admin Portal
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="px-3 pb-2 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
            Main Menu
          </p>

          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-primary/20"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </NavLink>
              )
            })}
        </div>

        {/* Quick System Badge */}

        {/* User Profile & Logout Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground">
                  {user?.name || "Administrator"}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {primaryRole}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
