import { createFileRoute } from "@tanstack/react-router";
import { EmergencyPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/emergency")({ component: EmergencyPage });
