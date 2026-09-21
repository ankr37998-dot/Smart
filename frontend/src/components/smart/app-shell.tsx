import { type ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearSession, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const roleNavs = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Attendance", to: "/attendance", icon: CalendarCheck },
    { label: "Classes", to: "/classes", icon: BookOpen },
    { label: "Student records", to: "/students", icon: Users },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
  ],
  faculty: [
    { label: "Dashboard", to: "/faculty", icon: LayoutDashboard },
    { label: "Attendance", to: "/attendance", icon: CalendarCheck },
    { label: "Classes", to: "/classes", icon: BookOpen },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
  ],
  student: [
    { label: "Dashboard", to: "/student", icon: LayoutDashboard },
    { label: "Attendance", to: "/attendance", icon: CalendarCheck },
    { label: "Classes", to: "/classes", icon: BookOpen },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
  ],
} as const;

export function AppShell({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const user = getUser();
  const role = user?.role ?? "admin";
  const nav = roleNavs[role as keyof typeof roleNavs] ?? roleNavs.admin;
  const userInitials = (user?.name ?? "User")
    .split(" ")
    .map((piece) => piece[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/login" });
  };

  return (
    <div className="app-shell app-shell__layout flex min-h-screen">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "desktop-sidebar sidebar",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <h2>🎓 Smart Attendance</h2>
        <div className="sidebar-content">
          {nav.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn("sidebar-btn", path === to && "active")}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>

        <div className="sidebar-footer">
          <Link to="/settings" className="sidebar-btn" onClick={() => setOpen(false)}>
            <span className="grid size-7 place-items-center rounded-full bg-white/10 text-[0.55rem] font-bold text-white">
              {userInitials}
            </span>
            Profile
          </Link>
          <button type="button" id="logoutBtn" className="sidebar-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="app-shell__main flex-1">
        <div className="desktop-content">
          <section className="desktop-dashboard">
            <div className="main-content">
              <div className="container">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="section-title mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{eyebrow ?? "Overview"}</p>
                  </div>
                  <button type="button" className="btn btn-secondary">
                    This semester
                  </button>
                </div>
                {children}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
