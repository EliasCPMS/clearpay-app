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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

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
  const { user, isAdmin, logout } = useAuth();

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col text-sidebar-foreground">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight text-white">ClearPay</span>
          </div>
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
    </div>
  );
}
