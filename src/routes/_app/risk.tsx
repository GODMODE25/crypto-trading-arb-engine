import { createFileRoute } from "@tanstack/react-router";
import { RiskPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/risk")({ component: RiskPage });
