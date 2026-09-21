import { createFileRoute } from "@tanstack/react-router";
import { SmartPage } from "@/components/smart/smart-page";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [
    { title: "Student records — SmartAttendance" },
    { name: "description", content: "Review student profiles and attendance standing." },
    { property: "og:title", content: "Student records — SmartAttendance" },
    { property: "og:description", content: "Review student profiles and attendance standing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: () => <SmartPage page="students" />,
});
