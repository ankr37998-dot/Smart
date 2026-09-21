import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [
    { title: "Analytics and reports — SmartAttendance" },
    { name: "description", content: "Explore academic attendance trends and reports." },
    { property: "og:title", content: "Analytics and reports — SmartAttendance" },
    { property: "og:description", content: "Explore academic attendance trends and reports." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="analytics" />,
});
