import { createFileRoute } from "@tanstack/react-router";
import { StrategiesPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/strategies")({ component: StrategiesPage });
