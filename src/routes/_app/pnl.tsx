import { createFileRoute } from "@tanstack/react-router";
import { PnlPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/pnl")({ component: PnlPage });
