import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, BookOpen, CalendarCheck, CheckCircle2, Menu, ShieldCheck, Users } from "lucide-react";
import { Brand } from "@/components/smart/brand";
import { Button } from "@/components/ui/button";

const capabilities = [
  { icon: CalendarCheck, title: "Attendance operations", copy: "Review daily records, status, and exceptions in a structured view." },
  { icon: BookOpen, title: "Class management", copy: "Keep schedules, rooms, faculty, and enrollment easy to scan." },
  { icon: BarChart3, title: "Academic insight", copy: "See trends and identify students who may need support." },
];

const roles = [
  { icon: ShieldCheck, title: "Administrators", copy: "Institution-wide metrics and reports", to: "/admin" as const },
  { icon: Users, title: "Faculty", copy: "Class schedules and student follow-up", to: "/faculty" as const },
  { icon: BookOpen, title: "Students", copy: "Personal attendance and course standing", to: "/student" as const },
];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SmartAttendance — Academic attendance, clearly managed" },
    { name: "description", content: "A polished academic attendance management frontend for administrators, faculty, and students." },
    { property: "og:title", content: "SmartAttendance — Academic attendance, clearly managed" },
    { property: "og:description", content: "A polished academic attendance management frontend for administrators, faculty, and students." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Landing,
});

function Landing() {
  return <div className="min-h-screen bg-canvas">
    <header className="border-b border-border bg-surface"><div className="mx-auto flex h-20 max-w-7xl items-center px-5 sm:px-8"><Brand/><nav className="ml-auto hidden items-center gap-8 md:flex"><a href="#capabilities" className="text-sm font-medium text-muted-foreground hover:text-foreground">Platform</a><a href="#roles" className="text-sm font-medium text-muted-foreground hover:text-foreground">For every role</a><Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button><Button asChild><Link to="/signup">Get started</Link></Button></nav><Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Menu"><Menu/></Button></div></header>
    <main>
      <section className="border-b border-border bg-surface"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-24"><div><p className="eyebrow">Built for modern institutions</p><h1 className="mt-4 max-w-2xl font-display text-5xl font-bold leading-[1.06] sm:text-6xl">Academic attendance, clearly managed.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">A composed workspace for administrators, faculty, and students to understand attendance without the clutter.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/admin">Explore the dashboard<ArrowRight/></Link></Button><Button asChild size="lg" variant="outline"><Link to="/login">Sign in</Link></Button></div><div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground"><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success"/>Role-specific views</span><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success"/>Clear reporting</span></div></div><DashboardPreview/></div></section>
      <section id="capabilities" className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="max-w-2xl"><p className="eyebrow">One academic workspace</p><h2 className="mt-2 font-display text-3xl font-bold">The right information, at the right level.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{capabilities.map(({ icon: Icon, title, copy })=><article className="panel p-6" key={title}><span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-5"/></span><h3 className="mt-5 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></article>)}</div></section>
      <section id="roles" className="border-y border-border bg-surface"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center"><div><p className="eyebrow">Designed around responsibility</p><h2 className="mt-2 font-display text-3xl font-bold">Every role sees what matters.</h2><p className="mt-4 max-w-lg text-muted-foreground">Separate, focused views keep institutional oversight, classroom operations, and personal progress clear.</p></div><div className="space-y-3">{roles.map(({ icon: Icon, title, copy, to })=><Link to={to} className="group flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-muted" key={title}><span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-5"/></span><span className="flex-1"><b className="block">{title}</b><span className="text-sm text-muted-foreground">{copy}</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1"/></Link>)}</div></div></section>
    </main>
    <footer className="bg-primary-deep text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8"><Brand/><p className="text-xs text-primary-foreground/65">Frontend prototype · SmartAttendance Academic Suite</p></div></footer>
  </div>;
}

function DashboardPreview(){return <div className="rounded-2xl border border-border bg-canvas p-3 shadow-2xl shadow-primary/10"><div className="rounded-xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Admin dashboard</p><p className="font-display text-lg font-bold">Attendance overview</p></div><span className="rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">91.4% present</span></div><div className="mt-5 grid grid-cols-3 gap-3">{[["2,847","Students"],["128","Classes"],["163","Absent"]].map(([v,l])=><div className="rounded-lg border border-border bg-canvas p-3" key={l}><b className="block font-display text-xl">{v}</b><span className="text-[11px] text-muted-foreground">{l}</span></div>)}</div><div className="chart-grid mt-5 flex h-44 items-end gap-2 rounded-lg border border-border bg-canvas p-4">{[55,68,62,78,72,86,81,92,88,95].map((v,i)=><div key={i} className="flex-1 rounded-t-sm bg-primary/70" style={{height:`${v}%`}}/>)}</div><div className="mt-4 flex items-center gap-3 border-t border-border pt-4"><span className="grid size-9 place-items-center rounded-full bg-secondary text-primary"><Users className="size-4"/></span><div className="flex-1"><p className="text-sm font-semibold">Aisha Malik</p><p className="text-xs text-muted-foreground">Data Structures · 08:57</p></div><span className="rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">Present</span></div></div></div>}
