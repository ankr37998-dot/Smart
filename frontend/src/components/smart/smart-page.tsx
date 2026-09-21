import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { AppShell } from "./app-shell";
import { Brand } from "./brand";
import { classes, schedule, students } from "./mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiGet, apiPost, clearSession, getUser, setSession } from "@/lib/api";
import { cn } from "@/lib/utils";

type Page =
  | "login"
  | "signup"
  | "admin"
  | "faculty"
  | "student"
  | "attendance"
  | "classes"
  | "students"
  | "analytics"
  | "settings";

const statusClass: Record<string, string> = {
  Present: "bg-success-soft text-success",
  Absent: "bg-danger-soft text-destructive",
  Late: "bg-warning-soft text-warning",
};

function Status({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
        statusClass[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const colors = {
    primary: "bg-secondary text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-destructive",
  };
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg", colors[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p
        className={cn(
          "mt-1 text-xs font-medium",
          tone === "success"
            ? "text-success"
            : tone === "danger"
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      >
        {note}
      </p>
    </div>
  );
}

function PagePanel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function TrendChart({ compact = false }: { compact?: boolean }) {
  const values = [64, 72, 69, 81, 76, 86, 79, 90, 84, 94, 88, 92];
  return (
    <div className={cn("chart-grid flex items-end gap-2 px-1 pt-4", compact ? "h-36" : "h-52")}>
      {values.map((value, i) => (
        <div key={i} className="group flex h-full flex-1 items-end">
          <div
            className={cn(
              "w-full rounded-t-sm transition-opacity group-hover:opacity-75",
              i === values.length - 1 ? "bg-primary" : "bg-primary/65",
            )}
            style={{ height: `${value}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function AttendanceTable({ management = false }: { management?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="table-head border-b border-border">
            <th className="px-5 py-3 font-semibold">Student</th>
            <th className="px-5 py-3 font-semibold">Course</th>
            <th className="px-5 py-3 font-semibold">Time</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Attendance</th>
            <th className="px-5 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-muted/60">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-secondary font-display text-xs font-bold text-primary">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span>
                    <span className="block font-semibold">{student.name}</span>
                    <span className="text-xs text-muted-foreground">{student.id}</span>
                  </span>
                </div>
              </td>
              <td className="px-5 py-3 text-muted-foreground">{student.course}</td>
              <td className="px-5 py-3 text-muted-foreground">{student.time}</td>
              <td className="px-5 py-3">
                <Status value={student.status} />
              </td>
              <td className="px-5 py-3 font-semibold">{student.attendance}</td>
              <td className="px-5 py-3 text-right">
                <Button variant={management ? "outline" : "ghost"} size="sm">
                  {management ? <Pencil /> : <Eye />}
                  {management ? "Edit" : "View"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleList() {
  return (
    <div className="space-y-3 p-5">
      {schedule.map((item) => (
        <div key={item.time} className="flex gap-3">
          <span className="w-11 pt-2 text-xs font-semibold text-primary">{item.time}</span>
          <div className="flex-1 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminDashboard() {
  const user = getUser();
  return (
    <AppShell title={`Good morning, ${user?.name ?? "Admin"}`} eyebrow="Admin overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total students"
          value="2,847"
          note="▲ 4.2% vs last term"
          icon={Users}
          tone="primary"
        />
        <Metric
          label="Attendance rate"
          value="91.4%"
          note="▲ 1.8% this week"
          icon={TrendingUp}
          tone="success"
        />
        <Metric label="Active classes" value="128" note="12 scheduled today" icon={BookOpen} />
        <Metric
          label="Absent today"
          value="163"
          note="▼ 3.1% vs average"
          icon={UserCheck}
          tone="danger"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <PagePanel
          title="Today's attendance"
          subtitle="Live session log · 12 classes"
          className="xl:col-span-2"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/attendance">View all</Link>
            </Button>
          }
        >
          <AttendanceTable />
        </PagePanel>
        <div className="space-y-6">
          <PagePanel title="Attendance snapshot" subtitle="Today">
            <div className="space-y-4 p-5">
              {[
                ["Present", 91, "success"],
                ["Late", 5, "warning"],
                ["Absent", 4, "destructive"],
              ].map(([label, val, color]) => (
                <div key={String(label)}>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <b>{val}%</b>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        color === "success"
                          ? "bg-success"
                          : color === "warning"
                            ? "bg-warning"
                            : "bg-destructive",
                      )}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PagePanel>
          <PagePanel title="Upcoming classes">
            <ScheduleList />
          </PagePanel>
        </div>
      </div>
    </AppShell>
  );
}

function FacultyDashboard() {
  const user = getUser();
  return (
    <AppShell
      title={`Welcome back, ${user?.name ?? "Faculty"}`}
      eyebrow="Teaching workspace"
      action={
        <Button asChild>
          <Link to="/attendance">
            <CalendarCheck />
            Record attendance
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="My classes" value="6" note="3 scheduled today" icon={BookOpen} />
        <Metric label="Students" value="184" note="Across all courses" icon={Users} />
        <Metric
          label="Average attendance"
          value="93.2%"
          note="▲ 2.4% this month"
          icon={TrendingUp}
          tone="success"
        />
        <Metric
          label="Needs review"
          value="12"
          note="Below 75% attendance"
          icon={BellRing}
          tone="warning"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <PagePanel
          title="Attendance trend"
          subtitle="Your courses · Last 12 weeks"
          className="p-0 xl:col-span-2"
        >
          <div className="p-5">
            <TrendChart />
          </div>
        </PagePanel>
        <PagePanel title="Today's schedule">
          <ScheduleList />
        </PagePanel>
      </div>
      <PagePanel
        title="Students needing attention"
        subtitle="Attendance below the recommended threshold"
      >
        <AttendanceTable />
      </PagePanel>
    </AppShell>
  );
}

function StudentDashboard() {
  const user = getUser();
  return (
    <AppShell
      title={`Welcome back, ${user?.name ?? "Student"}`}
      eyebrow="Student overview"
      action={
        <Button variant="outline">
          <Download />
          Statement
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Overall attendance"
          value="94.6%"
          note="Above required 75%"
          icon={CheckCircle2}
          tone="success"
        />
        <Metric label="Classes today" value="4" note="Next at 11:00" icon={Clock3} />
        <Metric label="Courses" value="6" note="24 credits enrolled" icon={BookOpen} />
        <Metric
          label="Days absent"
          value="3"
          note="This semester"
          icon={CalendarCheck}
          tone="warning"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <PagePanel title="Course attendance" subtitle="Current semester" className="xl:col-span-2">
          <div className="divide-y divide-border">
            {classes.map((course, i) => (
              <div className="flex items-center gap-4 p-5" key={course.code}>
                <span className="grid size-10 place-items-center rounded-lg bg-secondary font-display text-xs font-bold text-primary">
                  {course.code.split(" ")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <p className="truncate font-semibold">{course.name}</p>
                    <p className="font-display font-bold">{[96, 92, 89, 94][i]}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${[96, 92, 89, 94][i]}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PagePanel>
        <PagePanel title="Today's schedule">
          <ScheduleList />
        </PagePanel>
      </div>
    </AppShell>
  );
}

function Toolbar({ placeholder = "Search records…" }: { placeholder?: string }) {
  return (
    <div className="flex flex-1 flex-wrap gap-2">
      <label className="flex min-w-52 flex-1 items-center gap-2 rounded-md border border-input px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          className="border-0 px-0 shadow-none focus-visible:ring-0"
          placeholder={placeholder}
        />
      </label>
      <Button variant="outline">
        <Filter />
        Filter
      </Button>
      <Button variant="outline">
        <Download />
        Export
      </Button>
    </div>
  );
}

function AttendancePage() {
  const [active, setActive] = useState("All");
  return (
    <AppShell
      title="Attendance management"
      eyebrow="Daily operations"
      action={
        <Button>
          <Plus />
          Record attendance
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Present today"
          value="2,604"
          note="91.4% of students"
          icon={CheckCircle2}
          tone="success"
        />
        <Metric
          label="Late arrivals"
          value="80"
          note="2.8% of students"
          icon={Clock3}
          tone="warning"
        />
        <Metric label="Absent" value="163" note="5.8% of students" icon={UserCheck} tone="danger" />
      </div>
      <PagePanel
        title="Attendance records"
        subtitle="Monday, 21 September 2026"
        action={
          <div className="flex gap-2">
            {["All", "Present", "Late", "Absent"].map((v) => (
              <Button
                key={v}
                size="sm"
                variant={active === v ? "default" : "ghost"}
                onClick={() => setActive(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        }
      >
        <div className="border-b border-border p-4">
          <Toolbar placeholder="Search student or course…" />
        </div>
        <AttendanceTable management />
      </PagePanel>
    </AppShell>
  );
}

function ClassesPage() {
  return (
    <AppShell
      title="Class management"
      eyebrow="Academic catalog"
      action={
        <Button>
          <Plus />
          New class
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Active classes" value="128" note="Across 12 departments" icon={BookOpen} />
        <Metric
          label="Faculty assigned"
          value="74"
          note="98% allocation"
          icon={GraduationCap}
          tone="success"
        />
        <Metric
          label="Sessions today"
          value="36"
          note="4 currently active"
          icon={Clock3}
          tone="warning"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Toolbar placeholder="Search classes or faculty…" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.concat(classes.slice(0, 2)).map((course, i) => (
          <article className="panel p-5" key={`${course.code}-${i}`}>
            <div className="flex items-start justify-between">
              <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-primary">
                {course.code}
              </span>
              <Button variant="ghost" size="icon" aria-label="Edit class">
                <Pencil />
              </Button>
            </div>
            <h2 className="mt-4 font-display text-lg font-bold">{course.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{course.faculty}</p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Clock3 className="size-4" />
                {course.schedule}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4" />
                {course.room}
              </p>
              <p className="flex items-center gap-2">
                <Users className="size-4" />
                {course.students} enrolled
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Attendance</span>
              <b className="text-success">{course.rate}</b>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}

function StudentsPage() {
  return (
    <AppShell
      title="Student records"
      eyebrow="Registry"
      action={
        <Button>
          <Plus />
          Add student
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Enrolled students" value="2,847" note="2026–27 academic year" icon={Users} />
        <Metric
          label="Good standing"
          value="2,612"
          note="91.7% of students"
          icon={ShieldCheck}
          tone="success"
        />
        <Metric
          label="Attendance alerts"
          value="84"
          note="Requires follow-up"
          icon={BellRing}
          tone="warning"
        />
      </div>
      <PagePanel title="Student directory" subtitle="All active academic records">
        <div className="border-b border-border p-4">
          <Toolbar placeholder="Search name, ID, or course…" />
        </div>
        <AttendanceTable />
      </PagePanel>
    </AppShell>
  );
}

function AnalyticsPage() {
  return (
    <AppShell
      title="Analytics & reports"
      eyebrow="Institution insights"
      action={
        <Button>
          <Download />
          Export report
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Average attendance"
          value="91.4%"
          note="▲ 1.8% vs last term"
          icon={TrendingUp}
          tone="success"
        />
        <Metric label="Classes analyzed" value="128" note="12 departments" icon={BookOpen} />
        <Metric
          label="At-risk students"
          value="84"
          note="2.9% of enrollment"
          icon={Users}
          tone="warning"
        />
        <Metric label="Reports generated" value="42" note="This semester" icon={FileText} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <PagePanel
          title="Institution attendance"
          subtitle="Weekly average · Current semester"
          className="xl:col-span-2"
        >
          <div className="p-5">
            <TrendChart />
          </div>
        </PagePanel>
        <PagePanel title="By status" subtitle="Current semester">
          <div className="space-y-5 p-5">
            {[
              ["Present", 91, "success"],
              ["Late", 5, "warning"],
              ["Absent", 4, "destructive"],
            ].map(([l, v, c]) => (
              <div key={String(l)}>
                <div className="flex justify-between text-sm">
                  <span>{l}</span>
                  <b>{v}%</b>
                </div>
                <div className="mt-2 h-3 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-3 rounded-full",
                      c === "success"
                        ? "bg-success"
                        : c === "warning"
                          ? "bg-warning"
                          : "bg-destructive",
                    )}
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PagePanel>
      </div>
      <PagePanel title="Recent reports" subtitle="Prepared mock documents">
        <div className="divide-y divide-border">
          {[
            "Semester attendance summary",
            "At-risk student review",
            "Department comparison",
            "Weekly compliance report",
          ].map((r, i) => (
            <div key={r} className="flex items-center gap-4 p-4">
              <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
                <FileText className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{r}</p>
                <p className="text-xs text-muted-foreground">
                  Generated {i + 1} day{i ? "s" : ""} ago · PDF
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Download ${r}`}>
                <Download />
              </Button>
            </div>
          ))}
        </div>
      </PagePanel>
    </AppShell>
  );
}

function SettingsPage() {
  return (
    <AppShell title="Profile & settings" eyebrow="Account">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <section className="panel h-fit p-6 text-center">
          <span className="mx-auto grid size-24 place-items-center rounded-full bg-primary-deep font-display text-2xl font-bold text-primary-foreground">
            RO
          </span>
          <h2 className="mt-4 font-display text-xl font-bold">Dr. Rachel Okafor</h2>
          <p className="text-sm text-muted-foreground">Administrator · Computer Science</p>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-5 text-sm">
            <div>
              <b className="block text-lg">8</b>
              <span className="text-xs text-muted-foreground">Years</span>
            </div>
            <div>
              <b className="block text-lg">128</b>
              <span className="text-xs text-muted-foreground">Classes</span>
            </div>
          </div>
        </section>
        <div className="space-y-6">
          <PagePanel
            title="Personal information"
            subtitle="Update the details shown across the academic suite"
          >
            <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
              {[
                ["First name", "Rachel"],
                ["Last name", "Okafor"],
                ["Email", "r.okafor@northbridge.edu"],
                ["Department", "Computer Science"],
              ].map(([l, v]) => (
                <label className="space-y-2" key={l}>
                  <span className="field-label">{l}</span>
                  <Input defaultValue={v} />
                </label>
              ))}
              <div className="sm:col-span-2">
                <Button>Save changes</Button>
              </div>
            </form>
          </PagePanel>
          <PagePanel title="Notifications" subtitle="Choose which updates appear in this prototype">
            <div className="divide-y divide-border">
              {[
                ["Attendance alerts", "Notify when a student falls below 75%"],
                ["Daily summaries", "Receive an end-of-day attendance digest"],
                ["Class reminders", "Remind me before scheduled classes"],
              ].map(([l, d], i) => (
                <div className="flex items-center justify-between gap-4 p-5" key={l}>
                  <div>
                    <p className="font-semibold">{l}</p>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </div>
                  <Switch defaultChecked={i !== 2} />
                </div>
              ))}
            </div>
          </PagePanel>
        </div>
      </div>
    </AppShell>
  );
}

function AuthPage({ signup = false }: { signup?: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) return;

    if (user.role === "admin") navigate({ to: "/admin" });
    else if (user.role === "faculty") navigate({ to: "/faculty" });
    else if (user.role === "student") navigate({ to: "/student" });
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (signup) {
        await apiPost("/api/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });

        setError("Account created. Please sign in with your new credentials.");
        setForm({ name: "", email: "", password: "", role: "student" });
      } else {
        const response = await apiPost<{
          token: string;
          user: { role: string; name: string; email: string };
        }>("/api/auth/login", { email: form.email, password: form.password });

        if (response.user.role !== form.role) {
          throw new Error(`You are not registered as a ${form.role}.`);
        }

        setSession(response.token, response.user);

        if (response.user.role === "admin") navigate({ to: "/admin" });
        else if (response.user.role === "faculty") navigate({ to: "/faculty" });
        else navigate({ to: "/student" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: "admin", email: "admin@example.com", password: "admin123", label: "Admin" },
    { role: "faculty", email: "faculty@example.com", password: "faculty123", label: "Faculty" },
    { role: "student", email: "student@example.com", password: "student123", label: "Student" },
  ];

  return (
    <div className="auth-page antialiased">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🎓</div>
          <div>
            <h1 className="auth-title">Smart Attendance</h1>
            <p className="auth-subtitle">Secure biometric &amp; QR attendance for campus.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {signup && (
            <div className="form-group">
              <label htmlFor="fullName">Full name</label>
              <Input
                id="fullName"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. Rachel Okafor"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="student">🎓 Student</option>
              <option value="faculty">👨‍🏫 Faculty</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="name@college.edu"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary full-width" disabled={loading}>
              {loading
                ? signup
                  ? "Creating account..."
                  : "Signing in..."
                : signup
                  ? "Create account"
                  : "Sign In →"}
            </button>
          </div>

          <div className="demo-logins-bar">
            <div className="demo-logins-title">Quick Demo Login</div>
            <div className="demo-pills-list">
              {demoAccounts.map(({ role, email, password, label }) => (
                <button
                  key={role}
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role, email, password }));
                    setError("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SmartPage({ page }: { page: Page }) {
  if (page === "login") return <AuthPage />;
  if (page === "signup") return <AuthPage signup />;

  const pages: Record<Exclude<Page, "login" | "signup">, ReactNode> = {
    admin: <AdminDashboard />,
    faculty: <FacultyDashboard />,
    student: <StudentDashboard />,
    attendance: <AttendancePage />,
    classes: <ClassesPage />,
    students: <StudentsPage />,
    analytics: <AnalyticsPage />,
    settings: <SettingsPage />,
  };

  return pages[page];
}
