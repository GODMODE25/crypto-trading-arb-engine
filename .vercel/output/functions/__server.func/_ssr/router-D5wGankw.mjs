import { o as __toESM } from "../_runtime.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { C as require_jsx_runtime, J as redirect, S as useRouter, Z as require_react, _ as lazyRouteComponent, d as Scripts, f as HeadContent, g as Outlet, h as createRouter, v as createFileRoute, y as createRootRouteWithContext } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { n as DEFAULT_CONFIG } from "./config-CVMdV5TK.mjs";
import { L as string, N as number, P as object, R as union, j as literal } from "../_libs/@better-auth/core+[...].mjs";
import { n as auth } from "./server-CfQ2xCJS.mjs";
import { a as runFixtures, n as createSsrRpc, t as bootstrapWorkspace } from "./actions-DKopOi1P.mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-D5wGankw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-loss",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold tracking-tight",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: errorMessage(error)
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-BmDU92xO.css";
var APP_NAME = "EdgePilot";
var fetchSessionUser = createServerFn({ method: "GET" }).handler(createSsrRpc("2c4985e96c199268f7f639534cb5e8e31d6b19d43286bf77416413db60ffde26"));
var Route$17 = createRootRouteWithContext()({
	beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Private research desk for crypto paper trading. No profit guarantee. Capital preservation first."
			},
			{
				name: "theme-color",
				content: "#09090b"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
			}
		]
	}),
	component: RootComponent
});
function RootComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-bg text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	});
}
var EMPTY_LIVE_GATES = [
	"1_app_mode_live",
	"2_live_trading_enabled",
	"3_strategy_live_enabled",
	"4_exchange_trading_enabled",
	"5_api_key_configured",
	"6_no_withdrawal_permission",
	"7_max_order_notional_set",
	"8_max_daily_loss_set",
	"9_risk_engine_healthy",
	"10_market_data_fresh",
	"11_clock_sync",
	"12_confirmation_phrase",
	"13_kill_switch_off"
];
function emptyDashboard(patch = {}) {
	return {
		mode: "PAPER",
		killSwitch: false,
		lastScan: null,
		paperEquity: "0.00",
		liveEquity: "0.00",
		paperPnl: "est. vs seed — see PnL page",
		livePnl: "0.00 (no live trades)",
		openPaperOrders: 0,
		signalsToday: 0,
		accepted: 0,
		rejected: 0,
		riskCount: 0,
		consecutiveErrors: 0,
		liveGateFailed: EMPTY_LIVE_GATES.filter((k) => k !== "7_max_order_notional_set" && k !== "8_max_daily_loss_set" && k !== "13_kill_switch_off"),
		strategies: [
			{
				id: "spread",
				name: "Multi-CEX inventory spread",
				kind: "spread",
				enabled: true,
				paused: false,
				liveEnabled: false,
				notes: "Paper trader. Pre-funded inventory on Binance and Bybit. No transfers."
			},
			{
				id: "triangle",
				name: "Binance triangular scanner",
				kind: "triangle",
				enabled: true,
				paused: false,
				liveEnabled: false,
				notes: "USDT triangles on Binance spot. Paper only by default."
			},
			{
				id: "dex_monitor",
				name: "CEX/DEX discrepancy monitor",
				kind: "dex_monitor",
				enabled: true,
				paused: false,
				liveEnabled: false,
				notes: "MONITORING ONLY. Never executes swaps."
			}
		],
		exchanges: [{
			id: "binance",
			name: "Binance Spot",
			status: "idle",
			lastError: null,
			lastOk: null,
			tradingEnabled: false,
			keyConfigured: false
		}, {
			id: "bybit",
			name: "Bybit Spot",
			status: "idle",
			lastError: null,
			lastOk: null,
			tradingEnabled: false,
			keyConfigured: false
		}],
		signals: [],
		opportunities: [],
		orders: [],
		fills: [],
		paperBalances: [],
		liveBalances: [],
		pnl: [],
		riskEvents: [],
		systemEvents: [],
		alerts: [],
		audit: [],
		config: {
			...DEFAULT_CONFIG,
			liveConfirmationPhrase: ""
		},
		disclaimer: "No strategy guarantees profit. Paper results are simulated. Live trading is disabled unless every safety gate passes. You can lose money.",
		...patch
	};
}
var $$splitComponentImporter$12 = () => import("../_app-CubD1qBQ.mjs");
var Route$16 = createFileRoute("/_app")({
	beforeLoad: async ({ context }) => {
		if (!context.sessionUser) throw redirect({ to: "/login" });
	},
	loader: async () => {
		try {
			let dash = await bootstrapWorkspace();
			if (dash.signalsToday === 0) try {
				dash = await runFixtures();
			} catch (e) {
				console.error("[edgepilot] fixture seed", e);
			}
			return {
				initial: dash,
				loadError: null
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : "desk load failed";
			console.error("[edgepilot] bootstrap", e);
			if (msg.toLowerCase().includes("unauthorized")) throw redirect({ to: "/login" });
			return {
				initial: emptyDashboard(),
				loadError: msg
			};
		}
	},
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./login-DbbWoAX2.mjs");
var Route$15 = createFileRoute("/login")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("../_app-C7qI9w2d.mjs");
var Route$14 = createFileRoute("/_app/")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./config-Cc35kiH2.mjs");
var Route$13 = createFileRoute("/_app/config")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./emergency-3HyjS8XV.mjs");
var Route$12 = createFileRoute("/_app/emergency")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./health-RAGbf_78.mjs");
var Route$11 = createFileRoute("/_app/health")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./live-ChO8e9lv.mjs");
var Route$10 = createFileRoute("/_app/live")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./opportunities-DRVbImVm.mjs");
var Route$9 = createFileRoute("/_app/opportunities")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./orders-B63DJShn.mjs");
var Route$8 = createFileRoute("/_app/orders")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./paper-DCh7aCri.mjs");
var Route$7 = createFileRoute("/_app/paper")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./pnl-gKk6b51C.mjs");
var Route$6 = createFileRoute("/_app/pnl")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./risk-DlHA75Io.mjs");
var Route$5 = createFileRoute("/_app/risk")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./strategies-CdKfYM88.mjs");
var Route$4 = createFileRoute("/_app/strategies")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var Route$3 = createFileRoute("/api/health")({ server: { handlers: { GET: async () => Response.json({
	ok: true,
	service: "edgepilot",
	ts: (/* @__PURE__ */ new Date()).toISOString()
}) } } });
var Route$2 = createFileRoute("/api/metrics")({ server: { handlers: { GET: async () => {
	const body = [
		"# HELP edgepilot_up 1 if process is serving",
		"# TYPE edgepilot_up gauge",
		"edgepilot_up 1",
		`# HELP edgepilot_scrape_time_seconds`,
		`# TYPE edgepilot_scrape_time_seconds gauge`,
		`edgepilot_scrape_time_seconds ${Date.now() / 1e3}`
	].join("\n");
	return new Response(body + "\n", { headers: { "content-type": "text/plain; version=0.0.4" } });
} } } });
var Route$1 = createFileRoute("/api/ready")({ server: { handlers: { GET: async () => {
	try {
		const { getSql } = await import("./db-DA8X68-y.mjs").then((n) => n.t).then((n) => n.t);
		await (await getSql())`select 1 as ok`;
		return Response.json({
			ready: true,
			ts: (/* @__PURE__ */ new Date()).toISOString()
		});
	} catch (e) {
		return Response.json({
			ready: false,
			error: e instanceof Error ? e.message : "db"
		}, { status: 503 });
	}
} } } });
var Route = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request)
} } });
var AppRoute = Route$16.update({
	id: "/_app",
	getParentRoute: () => Route$17
});
var LoginRoute = Route$15.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$17
});
var AppIndexRoute = Route$14.update({
	id: "/",
	path: "/",
	getParentRoute: () => AppRoute
});
var AppConfigRoute = Route$13.update({
	id: "/config",
	path: "/config",
	getParentRoute: () => AppRoute
});
var AppEmergencyRoute = Route$12.update({
	id: "/emergency",
	path: "/emergency",
	getParentRoute: () => AppRoute
});
var AppHealthRoute = Route$11.update({
	id: "/health",
	path: "/health",
	getParentRoute: () => AppRoute
});
var AppLiveRoute = Route$10.update({
	id: "/live",
	path: "/live",
	getParentRoute: () => AppRoute
});
var AppOpportunitiesRoute = Route$9.update({
	id: "/opportunities",
	path: "/opportunities",
	getParentRoute: () => AppRoute
});
var AppOrdersRoute = Route$8.update({
	id: "/orders",
	path: "/orders",
	getParentRoute: () => AppRoute
});
var AppPaperRoute = Route$7.update({
	id: "/paper",
	path: "/paper",
	getParentRoute: () => AppRoute
});
var AppPnlRoute = Route$6.update({
	id: "/pnl",
	path: "/pnl",
	getParentRoute: () => AppRoute
});
var AppRiskRoute = Route$5.update({
	id: "/risk",
	path: "/risk",
	getParentRoute: () => AppRoute
});
var AppStrategiesRoute = Route$4.update({
	id: "/strategies",
	path: "/strategies",
	getParentRoute: () => AppRoute
});
var ApiHealthRoute = Route$3.update({
	id: "/api/health",
	path: "/api/health",
	getParentRoute: () => Route$17
});
var ApiMetricsRoute = Route$2.update({
	id: "/api/metrics",
	path: "/api/metrics",
	getParentRoute: () => Route$17
});
var ApiReadyRoute = Route$1.update({
	id: "/api/ready",
	path: "/api/ready",
	getParentRoute: () => Route$17
});
var ApiAuthSplatRoute = Route.update({
	id: "/api/auth/$",
	path: "/api/auth/$",
	getParentRoute: () => Route$17
});
var AppRouteChildren = {
	AppConfigRoute,
	AppEmergencyRoute,
	AppHealthRoute,
	AppLiveRoute,
	AppOpportunitiesRoute,
	AppOrdersRoute,
	AppPaperRoute,
	AppPnlRoute,
	AppRiskRoute,
	AppStrategiesRoute,
	AppIndexRoute
};
var rootRouteChildren = {
	AppRoute: AppRoute._addFileChildren(AppRouteChildren),
	LoginRoute,
	ApiHealthRoute,
	ApiMetricsRoute,
	ApiReadyRoute,
	ApiAuthSplatRoute
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent,
		context: { sessionUser: null }
	});
}
//#endregion
export { Route$16 as n, router_exports as t };
