import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [
    { title: "Attendance management — SmartAttendance" },
    { name: "description", content: "Review and manage visual attendance records." },
    { property: "og:title", content: "Attendance management — SmartAttendance" },
    { property: "og:description", content: "Review and manage visual attendance records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="attendance" />,
});
