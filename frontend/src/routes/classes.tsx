import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/classes")({
  head: () => ({ meta: [
    { title: "Class management — SmartAttendance" },
    { name: "description", content: "Browse academic classes, schedules, and enrollment." },
    { property: "og:title", content: "Class management — SmartAttendance" },
    { property: "og:description", content: "Browse academic classes, schedules, and enrollment." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="classes" />,
});
