import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Shell } from "@/components/edgepilot/shell.tsx";
import { DashboardContext, useDashboard } from "@/lib/edgepilot/use-dashboard.ts";
import { bootstrapWorkspace, runFixtures } from "@/lib/edgepilot/actions.ts";
import { emptyDashboard, type DashboardDto } from "@/lib/edgepilot/dashboard-dto.ts";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    if (!context.sessionUser) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async (): Promise<{ initial: DashboardDto; loadError: string | null }> => {
    try {
      let dash = await bootstrapWorkspace();
      if (dash.signalsToday === 0) {
        try {
          dash = await runFixtures();
        } catch (e) {
          console.error("[edgepilot] fixture seed", e);
        }
      }
      return { initial: dash, loadError: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "desk load failed";
      console.error("[edgepilot] bootstrap", e);
      if (msg.toLowerCase().includes("unauthorized")) {
        throw redirect({ to: "/login" });
      }
      return { initial: emptyDashboard(), loadError: msg };
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { initial, loadError } = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const dash = useDashboard(initial);

  if (dash.unauthorized || (!isPending && !user)) {
    return <RedirectToSignIn />;
  }

  return (
    <DashboardContext.Provider value={dash}>
      <Shell dash={dash.data}>
        {loadError && !dash.data?.signalsToday ? (
          <p className="mb-4 text-sm text-loss">{loadError}</p>
        ) : null}
        {dash.error && !dash.data ? (
          <p className="text-sm text-loss">{dash.error}</p>
        ) : dash.data ? (
          <Outlet />
        ) : (
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Capital preservation first</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Overview</h1>
            <p className="mt-2 text-sm text-muted">
              Loading desk. Simulated paper results are not real performance. No strategy
              guarantees profit.
            </p>
          </div>
        )}
      </Shell>
    </DashboardContext.Provider>
  );
}
