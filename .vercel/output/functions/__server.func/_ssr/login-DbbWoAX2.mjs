import { C as require_jsx_runtime, x as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn } from "./client-IWHfIGH2.mjs";
import { t as GROK_PROVIDERS } from "./server-CfQ2xCJS.mjs";
import { r as SignInGate, t as Badge } from "./badge-CgL79NC-.mjs";
import { t as Button } from "./button-Cx0zbFfK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DbbWoAX2.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-dvh bg-bg px-6 py-10 text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex w-full max-w-md flex-col gap-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-[var(--radius-xl)] border border-border bg-surface p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] uppercase tracking-[0.18em] text-subtle",
								children: "Private desk"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: "paper",
								children: "PAPER"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-2 text-2xl font-semibold tracking-tight",
							children: "EdgePilot"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Owner sign-in. Paper trading only until every live safety gate is satisfied. No profit is guaranteed. You can lose money."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignInGate, {
							fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-6 space-y-2",
								children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "secondary",
									className: "w-full",
									onClick: () => signIn(p.providerId, { callbackURL: "/" }),
									children: ["Continue with ", p.label]
								}, p.providerId))
							}),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-3 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-[var(--radius-md)] border border-border bg-surface p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-fg",
								children: "Paper first"
							}), "Default mode is PAPER. Live HTTP orders stay disarmed in this version."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-[var(--radius-md)] border border-border bg-surface p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-fg",
								children: "Fees, buffer, depth"
							}), "Spreads and triangles are measured after taker fees, slippage, and an uncertainty buffer — not on mid-price fiction."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-[var(--radius-md)] border border-border bg-surface p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-fg",
								children: "Thirteen live gates"
							}), "Kill switch, notional caps, clock sync, confirmation phrase, and more. Any fail blocks live."]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-subtle",
					children: "Simulated paper results are not real performance. DEX discrepancies are monitoring only. UTC clocks."
				})
			]
		})
	});
}
//#endregion
export { Login as component };
