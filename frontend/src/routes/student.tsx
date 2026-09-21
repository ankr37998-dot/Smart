import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [
    { title: "Student dashboard — SmartAttendance" },
    { name: "description", content: "Review personal attendance, schedule, and course standing." },
    { property: "og:title", content: "Student dashboard — SmartAttendance" },
    { property: "og:description", content: "Review personal attendance, schedule, and course standing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="student" />,
});
