import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/faculty")({
  head: () => ({ meta: [
    { title: "Faculty dashboard — SmartAttendance" },
    { name: "description", content: "Manage today's classes and student attendance." },
    { property: "og:title", content: "Faculty dashboard — SmartAttendance" },
    { property: "og:description", content: "Manage today's classes and student attendance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="faculty" />,
});
