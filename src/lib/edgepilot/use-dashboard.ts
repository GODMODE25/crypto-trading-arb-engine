import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  bootstrapWorkspace,
  getDashboard,
  resetPaperInventory,
  runFixtures,
  runMarketScan,
  saveConfigPatch,
  toggleKill,
  updateStrategy,
} from "./actions.ts";
import type { DashboardDto } from "./dashboard-dto.ts";
import type { EdgeConfig } from "./config.ts";

export function useDashboard(initial: DashboardDto | null = null) {
  const [data, setData] = useState<DashboardDto | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getDashboard();
      setData(d);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "load failed";
      if (msg.toLowerCase().includes("unauthorized")) setUnauthorized(true);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    if (initial) {
      setData(initial);
      return;
    }
    void (async () => {
      try {
        const d = await bootstrapWorkspace();
        setData(d);
        if (d.signalsToday === 0) {
          try {
            setData(await runFixtures());
          } catch (fe) {
            console.error("[edgepilot] fixtures", fe);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "load failed";
        if (msg.toLowerCase().includes("unauthorized")) setUnauthorized(true);
        setError(msg);
      }
    })();
  }, [initial]);

  useEffect(() => {
    const t = setInterval(() => {
      void getDashboard()
        .then(setData)
        .catch(() => undefined);
    }, 12000);
    return () => clearInterval(t);
  }, []);

  const wrap = useCallback(async (label: string, fn: () => Promise<DashboardDto>) => {
    setBusy(label);
    try {
      const d = await fn();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : label + " failed");
    } finally {
      setBusy(null);
    }
  }, []);

  return {
    data,
    error,
    busy,
    unauthorized,
    reload: load,
    runFixtures: () => wrap("fixtures", () => runFixtures()),
    runScan: () => wrap("scan", () => runMarketScan()),
    kill: (on: boolean) => wrap("kill", () => toggleKill({ data: on })),
    resetPaper: () => wrap("reset", () => resetPaperInventory()),
    saveConfig: (p: Partial<EdgeConfig>) => wrap("save", () => saveConfigPatch({ data: p })),
    setStrategy: (id: string, paused?: boolean, enabled?: boolean) =>
      wrap("strategy", () => updateStrategy({ data: { id, paused, enabled } })),
  };
}

export type DashboardApi = ReturnType<typeof useDashboard>;
export const DashboardContext = createContext<DashboardApi | null>(null);

export function useDash(): DashboardApi {
  const v = useContext(DashboardContext);
  if (!v) throw new Error("DashboardContext missing");
  return v;
}
