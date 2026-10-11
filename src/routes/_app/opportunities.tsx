import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/opportunities")({ component: OpportunitiesPage });
