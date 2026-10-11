import { createFileRoute } from "@tanstack/react-router";
import { LivePage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/live")({ component: LivePage });
