import { createFileRoute } from "@tanstack/react-router";
import { ConfigPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/config")({ component: ConfigPage });
