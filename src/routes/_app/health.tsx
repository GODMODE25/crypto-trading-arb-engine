import { createFileRoute } from "@tanstack/react-router";
import { HealthPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/health")({ component: HealthPage });
