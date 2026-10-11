import { C as require_jsx_runtime, g as Outlet } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as RedirectToSignIn, o as useCurrentUserState } from "./_ssr/badge-CgL79NC-.mjs";
import { i as Shell, t as DashboardContext, u as useDashboard } from "./_ssr/use-dashboard-twfLep8B.mjs";
import { n as Route$16 } from "./_ssr/router-D5wGankw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app-CubD1qBQ.js
var import_jsx_runtime = require_jsx_runtime();
function AppLayout() {
	const { initial, loadError } = Route$16.useLoaderData();
	const { user, isPending } = useCurrentUserState();
	const dash = useDashboard(initial);
	if (dash.unauthorized || !isPending && !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardContext.Provider, {
		value: dash,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
			dash: dash.data,
			children: [loadError && !dash.data?.signalsToday ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 text-sm text-loss",
				children: loadError
			}) : null, dash.error && !dash.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-loss",
				children: dash.error
			}) : dash.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-[0.18em] text-subtle",
					children: "Capital preservation first"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-2xl font-semibold tracking-tight",
					children: "Overview"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Loading desk. Simulated paper results are not real performance. No strategy guarantees profit."
				})
			] })]
		})
	});
}
//#endregion
export { AppLayout as component };
