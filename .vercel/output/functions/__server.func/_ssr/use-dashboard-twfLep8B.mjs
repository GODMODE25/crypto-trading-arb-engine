import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react, b as Link, p as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as cn, i as UserButton, o as useCurrentUserState, t as Badge } from "./badge-CgL79NC-.mjs";
import { a as runFixtures, c as toggleKill, i as resetPaperInventory, l as updateStrategy, o as runMarketScan, r as getDashboard, s as saveConfigPatch, t as bootstrapWorkspace } from "./actions-DKopOi1P.mjs";
import { a as Power, c as Gauge, d as Activity, i as Settings2, l as ChartLine, n as TriangleAlert, o as ListOrdered, r as Shield, s as LayoutDashboard, t as Wallet, u as BookOpen } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-dashboard-twfLep8B.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function utcNow() {
	return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").replace("Z", " UTC");
}
function fmtTs(iso) {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso.replace("T", " ").slice(0, 19) + " UTC";
	return d.toISOString().replace("T", " ").replace("Z", " UTC");
}
function fmtPct(raw) {
	const n = Number(raw);
	if (!Number.isFinite(n)) return raw;
	return (n * 100).toFixed(3) + "%";
}
function statusTone(status) {
	const s = status.toLowerCase();
	if (s === "accepted" || s === "filled" || s === "ok") return "ok";
	if (s === "blocked" || s === "partially_filled") return "warn";
	if (s === "rejected" || s === "canceled" || s === "error") return "loss";
	return "neutral";
}
var NAV = [
	{
		to: "/",
		label: "Overview",
		icon: LayoutDashboard
	},
	{
		to: "/strategies",
		label: "Strategies",
		icon: BookOpen
	},
	{
		to: "/opportunities",
		label: "Signals",
		icon: Activity
	},
	{
		to: "/paper",
		label: "Paper book",
		icon: Wallet
	},
	{
		to: "/live",
		label: "Live book",
		icon: Shield
	},
	{
		to: "/orders",
		label: "Orders",
		icon: ListOrdered
	},
	{
		to: "/pnl",
		label: "PnL",
		icon: ChartLine
	},
	{
		to: "/risk",
		label: "Risk & logs",
		icon: TriangleAlert
	},
	{
		to: "/config",
		label: "Config",
		icon: Settings2
	},
	{
		to: "/health",
		label: "Health",
		icon: Gauge
	},
	{
		to: "/emergency",
		label: "Emergency",
		icon: Power
	}
];
function Shell({ children, dash }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { user, isPending } = useCurrentUserState();
	const [clock, setClock] = (0, import_react.useState)("UTC");
	(0, import_react.useEffect)(() => {
		const tick = () => setClock(utcNow());
		tick();
		const t = setInterval(tick, 1e3);
		return () => clearInterval(t);
	}, []);
	const mode = dash?.mode ?? "PAPER";
	const kill = dash?.killSwitch ?? false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "#main",
				className: "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground",
				children: "Skip to content"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 px-4 py-3 md:px-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							className: "flex items-baseline gap-2 no-underline",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-sans text-lg font-semibold tracking-tight text-fg",
								children: "EdgePilot"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden text-[11px] uppercase tracking-[0.18em] text-subtle sm:inline",
								children: "research desk"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: kill ? "halt" : mode === "LIVE ENABLED" ? "live" : "paper",
							children: kill ? "Kill switch on" : mode
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto hidden font-mono text-xs text-muted tabular-nums md:inline",
							children: clock
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ml-auto flex items-center gap-2 md:ml-0",
							children: isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-8 animate-pulse rounded-full bg-surface-2" }) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) : null
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "border-t border-border px-4 py-1.5 text-[11px] text-subtle md:px-6",
					children: "Simulated paper results are not real performance. No strategy guarantees profit. UTC clocks."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-[1440px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "sticky top-[92px] hidden h-[calc(100dvh-92px)] w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-3 md:flex",
					"aria-label": "Desk",
					children: NAV.map((item) => {
						const active = pathname === item.to;
						const Icon = item.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: cn("flex h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm no-underline transition-colors duration-[var(--motion-quick)]", active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-4 shrink-0",
								strokeWidth: 1.75
							}), item.label]
						}, item.to);
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					id: "main",
					className: "min-w-0 flex-1 px-4 py-5 pb-24 md:px-8 md:pb-8",
					children
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-bg md:hidden",
				"aria-label": "Mobile",
				children: [NAV.slice(0, 5).map((item) => {
					const active = pathname === item.to;
					const Icon = item.icon;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.to,
						className: cn("flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] no-underline", active ? "text-fg" : "text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" }), item.label]
					}, item.to);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/emergency",
					className: "flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] text-loss no-underline",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { className: "size-5" }), "Stop"]
				})]
			})
		]
	});
}
function PageHeader({ title, kicker, actions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-6 flex flex-wrap items-end justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [kicker ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-1 text-[11px] uppercase tracking-[0.18em] text-subtle",
			children: kicker
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-semibold tracking-tight md:text-3xl",
			children: title
		})] }), actions]
	});
}
function Panel({ title, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("rounded-[var(--radius-xl)] border border-border bg-surface p-4 md:p-5", className),
		children: [title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mb-3 text-sm font-medium tracking-tight text-muted",
			children: title
		}) : null, children]
	});
}
function Stat({ label, value, hint, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-md)] border border-border bg-bg p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] uppercase tracking-[0.14em] text-subtle",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("mt-2 font-mono text-xl tabular-nums md:text-2xl", tone === "gain" && "text-gain", tone === "loss" && "text-loss", !tone && "text-fg"),
				children: value
			}),
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 text-xs text-muted",
				children: hint
			}) : null
		]
	});
}
function useDashboard(initial = null) {
	const [data, setData] = (0, import_react.useState)(initial);
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [unauthorized, setUnauthorized] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
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
	(0, import_react.useEffect)(() => {
		if (initial) {
			setData(initial);
			return;
		}
		(async () => {
			try {
				const d = await bootstrapWorkspace();
				setData(d);
				if (d.signalsToday === 0) try {
					setData(await runFixtures());
				} catch (fe) {
					console.error("[edgepilot] fixtures", fe);
				}
			} catch (e) {
				const msg = e instanceof Error ? e.message : "load failed";
				if (msg.toLowerCase().includes("unauthorized")) setUnauthorized(true);
				setError(msg);
			}
		})();
	}, [initial]);
	(0, import_react.useEffect)(() => {
		const t = setInterval(() => {
			getDashboard().then(setData).catch(() => void 0);
		}, 12e3);
		return () => clearInterval(t);
	}, []);
	const wrap = (0, import_react.useCallback)(async (label, fn) => {
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
		kill: (on) => wrap("kill", () => toggleKill({ data: on })),
		resetPaper: () => wrap("reset", () => resetPaperInventory()),
		saveConfig: (p) => wrap("save", () => saveConfigPatch({ data: p })),
		setStrategy: (id, paused, enabled) => wrap("strategy", () => updateStrategy({ data: {
			id,
			paused,
			enabled
		} }))
	};
}
var DashboardContext = (0, import_react.createContext)(null);
function useDash() {
	const v = (0, import_react.useContext)(DashboardContext);
	if (!v) throw new Error("DashboardContext missing");
	return v;
}
//#endregion
export { Stat as a, statusTone as c, Shell as i, useDash as l, PageHeader as n, fmtPct as o, Panel as r, fmtTs as s, DashboardContext as t, useDashboard as u };
