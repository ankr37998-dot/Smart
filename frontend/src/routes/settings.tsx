import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Profile and settings — SmartAttendance" },
    { name: "description", content: "Manage profile and visual notification preferences." },
    { property: "og:title", content: "Profile and settings — SmartAttendance" },
    { property: "og:description", content: "Manage profile and visual notification preferences." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="settings" />,
});
