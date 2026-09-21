import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="SmartAttendance home">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="size-5" />
      </span>
      {!compact && <span><span className="block font-display text-base font-bold leading-tight">SmartAttendance</span><span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Academic Suite</span></span>}
    </Link>
  );
}
