import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { t as authMiddleware } from "./middleware-DnkfUTDH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/actions-la8RGkcw.js
var bootstrapWorkspace_createServerFn_handler = createServerRpc({
	id: "a74ee70d63cd6f5118b81156421501a9b8363f8158d64cd7e0f7d72b7ca92dfb",
	name: "bootstrapWorkspace",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => bootstrapWorkspace.__executeServer(opts));
var bootstrapWorkspace = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(bootstrapWorkspace_createServerFn_handler, async ({ context }) => {
	try {
		const repo = await import("./repo.server-DDU2nso3.mjs");
		await repo.ensureWorkspace(context.userId);
		return repo.loadDashboard(context.userId);
	} catch (e) {
		console.error("[edgepilot] bootstrapWorkspace", e);
		throw e;
	}
});
var getDashboard_createServerFn_handler = createServerRpc({
	id: "072c2ca5933fffb51061888f79fe48fd78be8e050e1ea9a4c0f8e5fce55af384",
	name: "getDashboard",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => getDashboard.__executeServer(opts));
var getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getDashboard_createServerFn_handler, async ({ context }) => {
	return (await import("./repo.server-DDU2nso3.mjs")).loadDashboard(context.userId);
});
var runFixtures_createServerFn_handler = createServerRpc({
	id: "5a433fb1f36e7b85d6df8b4b17bbc4dcff4ce864eb8dd36b74b948d2d8fd322b",
	name: "runFixtures",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => runFixtures.__executeServer(opts));
var runFixtures = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(runFixtures_createServerFn_handler, async ({ context }) => {
	const repo = await import("./repo.server-DDU2nso3.mjs");
	await repo.runAndPersistFixtures(context.userId);
	return repo.loadDashboard(context.userId);
});
var runMarketScan_createServerFn_handler = createServerRpc({
	id: "6b2535002a0802b56067e7f7dfabd35ed5a140f79f9800be7e0e3dbd15c7cccd",
	name: "runMarketScan",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => runMarketScan.__executeServer(opts));
var runMarketScan = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(runMarketScan_createServerFn_handler, async ({ context }) => {
	const repo = await import("./repo.server-DDU2nso3.mjs");
	await repo.runLiveMarketScan(context.userId);
	return repo.loadDashboard(context.userId);
});
var toggleKill_createServerFn_handler = createServerRpc({
	id: "94b59287a2b0f33221fe1eeb900e472011b1fcd28e94d34f42164bffd9661174",
	name: "toggleKill",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => toggleKill.__executeServer(opts));
var toggleKill = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((on) => on).handler(toggleKill_createServerFn_handler, async ({ context, data }) => {
	const repo = await import("./repo.server-DDU2nso3.mjs");
	await repo.setKillSwitch(context.userId, data);
	return repo.loadDashboard(context.userId);
});
var saveConfigPatch_createServerFn_handler = createServerRpc({
	id: "a59b017c51010b0fc7265a53c97686343b8dfea4f80e842e1f5670c86e41283b",
	name: "saveConfigPatch",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => saveConfigPatch.__executeServer(opts));
var saveConfigPatch = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((p) => p).handler(saveConfigPatch_createServerFn_handler, async ({ context, data }) => {
	const repo = await import("./repo.server-DDU2nso3.mjs");
	await repo.patchConfig(context.userId, data);
	return repo.loadDashboard(context.userId);
});
var updateStrategy_createServerFn_handler = createServerRpc({
	id: "4aa1c7864536f8d2ec292b1aa06e40ac85cb9530b3619fdc34d80cdfd44a3b87",
	name: "updateStrategy",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => updateStrategy.__executeServer(opts));
var updateStrategy = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((p) => p).handler(updateStrategy_createServerFn_handler, async ({ context, data }) => {
	const repo = await import("./repo.server-DDU2nso3.mjs");
	await repo.setStrategyFlags(context.userId, data.id, data);
	return repo.loadDashboard(context.userId);
});
var resetPaperInventory_createServerFn_handler = createServerRpc({
	id: "d4a81e259893ded431668675230eeae6f46bdcab719312f39edfb5aef8b5454e",
	name: "resetPaperInventory",
	filename: "src/lib/edgepilot/actions.ts"
}, (opts) => resetPaperInventory.__executeServer(opts));
var resetPaperInventory = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(resetPaperInventory_createServerFn_handler, async ({ context }) => {
	const repo = await import("./repo.server-DDU2nso3.mjs");
	await repo.resetPaper(context.userId);
	return repo.loadDashboard(context.userId);
});
//#endregion
export { bootstrapWorkspace_createServerFn_handler, getDashboard_createServerFn_handler, resetPaperInventory_createServerFn_handler, runFixtures_createServerFn_handler, runMarketScan_createServerFn_handler, saveConfigPatch_createServerFn_handler, toggleKill_createServerFn_handler, updateStrategy_createServerFn_handler };
