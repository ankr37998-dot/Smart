import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin dashboard — SmartAttendance" },
    { name: "description", content: "Monitor institution attendance, classes, and student activity." },
    { property: "og:title", content: "Admin dashboard — SmartAttendance" },
    { property: "og:description", content: "Monitor institution attendance, classes, and student activity." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="admin" />,
});
