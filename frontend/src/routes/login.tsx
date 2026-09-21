import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Login — SmartAttendance" },
    { name: "description", content: "Sign in to your SmartAttendance academic workspace." },
    { property: "og:title", content: "Login — SmartAttendance" },
    { property: "og:description", content: "Sign in to your SmartAttendance academic workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="login" />,
});
