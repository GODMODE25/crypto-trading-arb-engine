import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/edgepilot/pages.tsx";

export const Route = createFileRoute("/_app/orders")({ component: OrdersPage });
