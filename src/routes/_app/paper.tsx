import { createFileRoute } from "@tanstack/react-router";
import { PaperPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/paper")({ component: PaperPage });
