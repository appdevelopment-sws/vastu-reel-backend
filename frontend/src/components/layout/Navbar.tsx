import React from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../theme-provider"
import { Menu, Sun, Moon, Search, User as UserIcon } from "lucide-react"

interface NavbarProps {
  onOpenMobileSidebar: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left section: mobile hamburger & search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden w-64 sm:block md:w-80">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reels, users, tags..."
            className="w-full rounded-xl border border-input bg-muted/40 py-1.5 pr-4 pl-9 text-xs text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Right section: System status, notifications, theme toggle & avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend API status tag */}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          className="rounded-xl border border-border/80 bg-background/50 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifications Icon */}
        {/* <button
          title="Notifications"
          className="relative rounded-xl border border-border/80 bg-background/50 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button> */}

        <div className="mx-1 h-5 w-px bg-border" />

        {/* User Mini Card */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-chart-1 text-xs font-bold text-primary-foreground shadow-sm">
            {user?.name ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
          </div>
          <div className="hidden text-left sm:block">
            <p className="max-w-[120px] truncate text-xs leading-tight font-bold text-foreground">
              {user?.name || "Admin"}
            </p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              @{user?.username || "admin"}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
