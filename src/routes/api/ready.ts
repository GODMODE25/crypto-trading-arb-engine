import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ready")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          await sql`select 1 as ok`;
          return Response.json({ ready: true, ts: new Date().toISOString() });
        } catch (e) {
          return Response.json(
            { ready: false, error: e instanceof Error ? e.message : "db" },
            { status: 503 },
          );
        }
      },
    },
  },
});
