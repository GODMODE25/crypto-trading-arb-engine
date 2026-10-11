import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/metrics")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "# HELP edgepilot_up 1 if process is serving",
          "# TYPE edgepilot_up gauge",
          "edgepilot_up 1",
          `# HELP edgepilot_scrape_time_seconds`,
          `# TYPE edgepilot_scrape_time_seconds gauge`,
          `edgepilot_scrape_time_seconds ${Date.now() / 1000}`,
        ].join("\n");
        return new Response(body + "\n", {
          headers: { "content-type": "text/plain; version=0.0.4" },
        });
      },
    },
  },
});
