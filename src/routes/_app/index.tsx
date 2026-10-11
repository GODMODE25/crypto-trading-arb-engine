import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/")({ component: OverviewPage });
