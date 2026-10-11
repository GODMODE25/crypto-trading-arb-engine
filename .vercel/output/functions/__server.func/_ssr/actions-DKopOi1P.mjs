import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-DnkfUTDH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/actions-DKopOi1P.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var bootstrapWorkspace = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("a74ee70d63cd6f5118b81156421501a9b8363f8158d64cd7e0f7d72b7ca92dfb"));
var getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("072c2ca5933fffb51061888f79fe48fd78be8e050e1ea9a4c0f8e5fce55af384"));
var runFixtures = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("5a433fb1f36e7b85d6df8b4b17bbc4dcff4ce864eb8dd36b74b948d2d8fd322b"));
var runMarketScan = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("6b2535002a0802b56067e7f7dfabd35ed5a140f79f9800be7e0e3dbd15c7cccd"));
var toggleKill = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((on) => on).handler(createSsrRpc("94b59287a2b0f33221fe1eeb900e472011b1fcd28e94d34f42164bffd9661174"));
var saveConfigPatch = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((p) => p).handler(createSsrRpc("a59b017c51010b0fc7265a53c97686343b8dfea4f80e842e1f5670c86e41283b"));
var updateStrategy = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((p) => p).handler(createSsrRpc("4aa1c7864536f8d2ec292b1aa06e40ac85cb9530b3619fdc34d80cdfd44a3b87"));
var resetPaperInventory = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("d4a81e259893ded431668675230eeae6f46bdcab719312f39edfb5aef8b5454e"));
//#endregion
export { runFixtures as a, toggleKill as c, resetPaperInventory as i, updateStrategy as l, createSsrRpc as n, runMarketScan as o, getDashboard as r, saveConfigPatch as s, bootstrapWorkspace as t };
