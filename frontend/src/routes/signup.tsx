import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [
    { title: "Create account — SmartAttendance" },
    { name: "description", content: "Create a SmartAttendance prototype account." },
    { property: "og:title", content: "Create account — SmartAttendance" },
    { property: "og:description", content: "Create a SmartAttendance prototype account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="signup" />,
});
