import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  UserCircle,
  Settings,
  LogOut,
  Target,
  Shield,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", adminOnly: false },
  { icon: Users, label: "Leads", href: "/leads", adminOnly: false },
  { icon: Kanban, label: "Pipeline", href: "/pipeline", adminOnly: false },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", adminOnly: false },
  { icon: UserCircle, label: "Reps", href: "/reps", adminOnly: true },
  { icon: Target, label: "Onboarding", href: "/onboarding", adminOnly: false },
  { icon: Settings, label: "Settings", href: "/settings", adminOnly: true },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAdmin, logout, idleWarning, extendSession } = useAuth();

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col text-sidebar-foreground">
        <div className="py-3 flex items-center justify-center border-b border-sidebar-border">
          <img
            src={`${import.meta.env.BASE_URL}clearpay-logo.png`}
            alt="ClearPay Merchant Solutions"
            className="w-full h-auto px-0"
            style={{ filter: "invert(1) hue-rotate(180deg)" }}
          />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNav.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                    isActive
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {item.adminOnly && (
                    <Shield className="w-3 h-3 ml-auto text-primary/60" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {idleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Clock className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-white text-lg font-semibold">Still there?</h2>
              <p className="text-zinc-400 text-sm">
                You'll be signed out in 2 minutes due to inactivity. Click below to stay logged in.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => logout()}
              >
                Sign Out
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-black font-semibold"
                onClick={extendSession}
              >
                Stay Logged In
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
