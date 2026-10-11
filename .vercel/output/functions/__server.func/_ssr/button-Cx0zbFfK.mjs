import "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as cn } from "./badge-CgL79NC-.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity duration-[var(--motion-quick)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", {
	variants: {
		variant: {
			default: "bg-accent text-accent-foreground hover:opacity-90",
			secondary: "bg-surface text-fg border border-border hover:bg-surface-2",
			ghost: "text-muted hover:text-fg hover:bg-surface",
			danger: "bg-loss text-fg hover:opacity-90",
			outline: "border border-border-strong text-fg bg-transparent hover:bg-surface"
		},
		size: {
			default: "h-11 px-4 text-sm rounded-[var(--radius-sm)]",
			sm: "h-9 px-3 text-xs rounded-[var(--radius-xs)]",
			lg: "h-12 px-5 text-sm rounded-[var(--radius-md)]",
			icon: "size-11 rounded-[var(--radius-sm)]"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
//#endregion
export { Button as t };
