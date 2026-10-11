import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { EdgeConfig } from "./config.ts";
import type { DashboardDto } from "./dashboard-dto.ts";

export const bootstrapWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardDto> => {
    try {
      const repo = await import("./repo.server.ts");
      await repo.ensureWorkspace(context.userId);
      return repo.loadDashboard(context.userId);
    } catch (e) {
      console.error("[edgepilot] bootstrapWorkspace", e);
      throw e;
    }
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    return repo.loadDashboard(context.userId);
  });

export const runFixtures = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    await repo.runAndPersistFixtures(context.userId);
    return repo.loadDashboard(context.userId);
  });

export const runMarketScan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    await repo.runLiveMarketScan(context.userId);
    return repo.loadDashboard(context.userId);
  });

export const toggleKill = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((on: boolean) => on)
  .handler(async ({ context, data }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    await repo.setKillSwitch(context.userId, data);
    return repo.loadDashboard(context.userId);
  });

export const saveConfigPatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((p: Partial<EdgeConfig>) => p)
  .handler(async ({ context, data }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    await repo.patchConfig(context.userId, data);
    return repo.loadDashboard(context.userId);
  });

export const updateStrategy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((p: { id: string; paused?: boolean; enabled?: boolean }) => p)
  .handler(async ({ context, data }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    await repo.setStrategyFlags(context.userId, data.id, data);
    return repo.loadDashboard(context.userId);
  });

export const resetPaperInventory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardDto> => {
    const repo = await import("./repo.server.ts");
    await repo.resetPaper(context.userId);
    return repo.loadDashboard(context.userId);
  });
