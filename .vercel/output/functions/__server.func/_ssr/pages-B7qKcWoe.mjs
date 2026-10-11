import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as DEFAULT_CONFIG } from "./config-CVMdV5TK.mjs";
import { a as cn, t as Badge } from "./badge-CgL79NC-.mjs";
import { a as Stat, c as statusTone, l as useDash, n as PageHeader, o as fmtPct, r as Panel, s as fmtTs } from "./use-dashboard-twfLep8B.mjs";
import { t as Button } from "./button-Cx0zbFfK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pages-B7qKcWoe.js
var import_jsx_runtime = require_jsx_runtime();
function DataTable({ columns, rows, empty }) {
	if (!rows.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: empty
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full min-w-[640px] border-collapse text-left text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
				className: "border-b border-border text-[11px] uppercase tracking-[0.12em] text-subtle",
				children: columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "px-2 py-2 font-medium",
					children: c.label
				}, c.key))
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
				className: "border-b border-border/80",
				children: columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					className: cn("max-w-[280px] truncate px-2 py-2.5 text-fg", c.mono && "font-mono text-xs tabular-nums", c.className),
					children: r[c.key] || "—"
				}, c.key))
			}, r.id ?? String(i))) })]
		})
	});
}
function BusyBar({ label }) {
	if (!label) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-4 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-xs text-muted",
		children: ["Working: ", label]
	});
}
function Callout({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-muted",
		children
	});
}
function GateList({ failed }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "space-y-1 font-mono text-xs text-muted",
		children: [
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
		].map((k) => {
			const ok = !failed.includes(k);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: ok ? "text-gain" : "text-loss",
					children: ok ? "pass" : "fail"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: k.replace(/^\d+_/, "").replaceAll("_", " ") })]
			}, k);
		})
	});
}
function OverviewPage() {
	const { data, busy, error, runFixtures, runScan, kill } = useDash();
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted",
		children: "Loading desk…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Capital preservation first",
			title: "Overview",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						onClick: () => void runFixtures(),
						disabled: !!busy,
						children: "Run fixture suite"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						onClick: () => void runScan(),
						disabled: !!busy,
						children: "Scan public books"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "danger",
						onClick: () => void kill(true),
						disabled: !!busy,
						children: "Kill switch"
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BusyBar, { label: busy }),
		error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm text-loss",
			children: error
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, { children: data.disclaimer }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Mode",
					value: data.mode,
					hint: data.killSwitch ? "New orders halted" : "Paper execution allowed"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Paper equity (USDT)",
					value: data.paperEquity,
					hint: "Mark-to-market, simulated"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Live equity (USDT)",
					value: data.liveEquity,
					hint: "No live fills",
					tone: "muted"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Signals stored",
					value: String(data.signalsToday),
					hint: `${data.accepted} accepted · ${data.rejected} rejected`
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Live safety gate (all must pass)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GateList, { failed: data.liveGateFailed })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Venues",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-3",
					children: data.exchanges.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-medium",
								children: e.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted",
								children: [
									"Trading ",
									e.tradingEnabled ? "on" : "off",
									" · key ",
									e.keyConfigured ? "configured" : "not set"
								]
							}),
							e.lastError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-loss",
								children: e.lastError
							}) : null
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: e.status === "ok" ? "ok" : e.status === "error" ? "loss" : "neutral",
							children: e.status
						})]
					}, e.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-xs text-subtle",
					children: ["Last scan: ", fmtTs(data.lastScan)]
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Latest signals",
			className: "mt-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No signals yet. Run the fixture suite.",
				columns: [
					{
						key: "created_at",
						label: "UTC",
						mono: true
					},
					{
						key: "strategy_id",
						label: "Strategy"
					},
					{
						key: "symbol",
						label: "Market"
					},
					{
						key: "status",
						label: "Status"
					},
					{
						key: "expected_profit",
						label: "E[PnL]",
						mono: true
					},
					{
						key: "reasons",
						label: "Reasons"
					}
				],
				rows: data.signals.slice(0, 8)
			})
		})
	] });
}
function StrategiesPage() {
	const { data, busy, setStrategy } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Independent modules",
			title: "Strategies"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BusyBar, { label: busy }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4",
			children: data.strategies.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium tracking-tight",
						children: s.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-2xl text-sm text-muted",
						children: s.notes
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: s.enabled ? "ok" : "neutral",
								children: s.enabled ? "enabled" : "disabled"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: s.paused ? "warn" : "neutral",
								children: s.paused ? "paused" : "running"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: "paper",
								children: "live forced off"
							})
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						onClick: () => void setStrategy(s.id, !s.paused),
						children: s.paused ? "Resume" : "Pause"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => void setStrategy(s.id, void 0, !s.enabled),
						children: s.enabled ? "Disable" : "Enable"
					})]
				})]
			}) }, s.id))
		})
	] });
}
function OpportunitiesPage() {
	const { data } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Expected vs rejected",
			title: "Opportunities & signals"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, { children: "Accepted means the paper path may place simulated legs. Rejected/blocked never become live orders. DEX rows are monitoring only." }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Opportunities",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "Empty. Run fixtures or a market scan.",
				columns: [
					{
						key: "created_at",
						label: "UTC",
						mono: true
					},
					{
						key: "strategy_id",
						label: "Strategy"
					},
					{
						key: "symbol",
						label: "Path"
					},
					{
						key: "status",
						label: "Status"
					},
					{
						key: "expected_profit",
						label: "E[profit]",
						mono: true
					},
					{
						key: "expected_roi",
						label: "E[ROI]",
						mono: true
					},
					{
						key: "explanation",
						label: "Why"
					}
				],
				rows: data.opportunities.map((r) => ({
					...r,
					expected_roi: fmtPct(r.expected_roi),
					status: r.status + (statusTone(r.status) === "ok" ? "" : "")
				}))
			})
		})
	] });
}
function PaperPage() {
	const { data, resetPaper, busy } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Simulated inventory",
			title: "Paper portfolio",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "secondary",
				onClick: () => void resetPaper(),
				disabled: !!busy,
				children: "Reset inventory"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, { children: "Paper balances are not exchange balances. Estimated PnL is not realized banked profit. Live book is separate." }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Paper equity USDT",
				value: data.paperEquity,
				hint: "MTM using last ask or fixture marks"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Open paper orders",
				value: String(data.openPaperOrders)
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Per-venue paper balances",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No paper balances.",
				columns: [
					{
						key: "venue",
						label: "Venue"
					},
					{
						key: "asset",
						label: "Asset"
					},
					{
						key: "free",
						label: "Free",
						mono: true
					},
					{
						key: "locked",
						label: "Locked",
						mono: true
					}
				],
				rows: data.paperBalances
			})
		})
	] });
}
function LivePage() {
	const { data } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Empty until gates pass",
			title: "Live portfolio"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, { children: "Live ledger is isolated from paper. This MVP does not arm HTTP order placement even if you flip config flags. Failed live-gate names are listed below." }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Live equity USDT",
				value: data.liveEquity,
				hint: "No live positions"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Live PnL",
				value: data.livePnl
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Live balances",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No live balances — as designed.",
				columns: [
					{
						key: "venue",
						label: "Venue"
					},
					{
						key: "asset",
						label: "Asset"
					},
					{
						key: "free",
						label: "Free",
						mono: true
					}
				],
				rows: data.liveBalances
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Gate failures",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GateList, { failed: data.liveGateFailed })
		})
	] });
}
function OrdersPage() {
	const { data } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Lifecycle",
			title: "Orders & fills"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Orders",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No orders. A valid fixture spread will create two paper legs.",
				columns: [
					{
						key: "created_at",
						label: "UTC",
						mono: true
					},
					{
						key: "mode",
						label: "Mode"
					},
					{
						key: "venue",
						label: "Venue"
					},
					{
						key: "market",
						label: "Market"
					},
					{
						key: "side",
						label: "Side"
					},
					{
						key: "qty",
						label: "Qty",
						mono: true
					},
					{
						key: "avg_price",
						label: "Avg",
						mono: true
					},
					{
						key: "status",
						label: "Status"
					},
					{
						key: "reject_reason",
						label: "Reject"
					}
				],
				rows: data.orders
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Fills",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No fills yet.",
				columns: [
					{
						key: "ts",
						label: "UTC",
						mono: true
					},
					{
						key: "mode",
						label: "Mode"
					},
					{
						key: "order_id",
						label: "Order"
					},
					{
						key: "qty",
						label: "Qty",
						mono: true
					},
					{
						key: "price",
						label: "Price",
						mono: true
					},
					{
						key: "fee",
						label: "Fee",
						mono: true
					},
					{
						key: "fee_asset",
						label: "Fee asset"
					}
				],
				rows: data.fills
			})
		})
	] });
}
function PnlPage() {
	const { data } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Never mix ledgers",
			title: "PnL & performance"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Paper (simulated)",
				value: data.paperEquity,
				hint: "Equity, not a return promise"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Live (real)",
				value: data.liveEquity,
				hint: "Remains zero until a gated live fill exists"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "PnL records",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No PnL rows yet. Paper fills still move balances — records appear after scans.",
				columns: [
					{
						key: "ts",
						label: "UTC",
						mono: true
					},
					{
						key: "mode",
						label: "Mode"
					},
					{
						key: "kind",
						label: "Kind"
					},
					{
						key: "amount",
						label: "Amount",
						mono: true
					},
					{
						key: "note",
						label: "Note"
					}
				],
				rows: data.pnl
			})
		})
	] });
}
function RiskPage() {
	const { data } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Audit",
			title: "Risk events & logs"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Risk events",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No risk events.",
				columns: [
					{
						key: "ts",
						label: "UTC",
						mono: true
					},
					{
						key: "severity",
						label: "Severity"
					},
					{
						key: "kind",
						label: "Kind"
					},
					{
						key: "message",
						label: "Message"
					}
				],
				rows: data.riskEvents
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "System events",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No system events.",
				columns: [
					{
						key: "ts",
						label: "UTC",
						mono: true
					},
					{
						key: "kind",
						label: "Kind"
					},
					{
						key: "message",
						label: "Message"
					}
				],
				rows: data.systemEvents
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Alerts (deduped)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No alerts.",
				columns: [
					{
						key: "ts",
						label: "UTC",
						mono: true
					},
					{
						key: "kind",
						label: "Kind"
					},
					{
						key: "message",
						label: "Message"
					}
				],
				rows: data.alerts
			})
		})
	] });
}
function ConfigPage() {
	const { data, saveConfig, busy } = useDash();
	if (!data) return null;
	const c = data.config;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Fail closed",
			title: "Configuration"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, { children: [
			"Live confirmation phrase is never shown. Telegram tokens are never stored in this view. Defaults match",
			" ",
			DEFAULT_CONFIG.maxOrderNotional,
			" USDT max order."
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			className: "mt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "grid gap-3 sm:grid-cols-2",
				children: Object.entries(c).filter(([k]) => k !== "liveConfirmationPhrase").map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-[11px] uppercase tracking-[0.12em] text-subtle",
						children: k
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "font-mono text-sm tabular-nums",
						children: String(v)
					})]
				}, k))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					disabled: !!busy,
					onClick: () => void saveConfig({ maxOrderNotional: "50" }),
					children: "Tighten max order to 50 USDT"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					disabled: !!busy,
					onClick: () => void saveConfig({ appMode: "paper" }),
					children: "Force PAPER mode"
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Config audit",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				empty: "No config edits yet.",
				columns: [
					{
						key: "ts",
						label: "UTC",
						mono: true
					},
					{
						key: "field",
						label: "Field"
					},
					{
						key: "old_value",
						label: "From"
					},
					{
						key: "new_value",
						label: "To"
					}
				],
				rows: data.audit
			})
		})
	] });
}
function HealthPage() {
	const { data, runScan, busy } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			kicker: "Readiness",
			title: "System health",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				onClick: () => void runScan(),
				disabled: !!busy,
				children: "Ping venues"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 sm:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Kill switch",
					value: data.killSwitch ? "ARMED" : "clear"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Consecutive errors",
					value: String(data.consecutiveErrors)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Last scan",
					value: data.lastScan ? fmtTs(data.lastScan) : "never"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "mt-4",
			title: "Adapters",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2 text-sm",
				children: data.exchanges.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between gap-3 border-b border-border py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: e.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-xs text-muted",
						children: [e.status, e.lastOk ? ` · ${fmtTs(e.lastOk)}` : ""]
					})]
				}, e.id))
			})
		})
	] });
}
function EmergencyPage() {
	const { data, kill, busy } = useDash();
	if (!data) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		kicker: "Highest priority",
		title: "Emergency controls"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "max-w-xl text-sm text-muted",
			children: "Disable new trading immediately. Open paper/live orders are not market-closed (forced flattening can lock losses). Live cancels run only if a live adapter is later armed."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex flex-wrap gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "danger",
				onClick: () => void kill(true),
				disabled: !!busy || data.killSwitch,
				children: "Disable new trading"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				onClick: () => void kill(false),
				disabled: !!busy || !data.killSwitch,
				children: "Clear kill switch"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-4 font-mono text-xs text-subtle",
			children: [
				"State: ",
				data.killSwitch ? "ARMED" : "clear",
				" · mode ",
				data.mode
			]
		})
	] })] });
}
//#endregion
export { OpportunitiesPage as a, PaperPage as c, StrategiesPage as d, LivePage as i, PnlPage as l, EmergencyPage as n, OrdersPage as o, HealthPage as r, OverviewPage as s, ConfigPage as t, RiskPage as u };
