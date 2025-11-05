/* eslint-disable no-undef */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

console.log("Metro config loaded via Node");

const config = getDefaultConfig(__dirname);
const JOSE_BROWSER_ENTRY = path.join(
  path.dirname(require.resolve("jose/package.json")),
  "dist",
  "browser",
  "index.js"
);



const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  // Package exports in `isows` (a `viem`) dependency are incompatible, so they need to be disabled
  if (moduleName === "isows") {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // Package exports in `zustand@4` are incompatible, so they need to be disabled
  if (moduleName.startsWith("zustand")) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // Package exports in `jose` are incompatible, so the browser version is used
  if (moduleName === "jose" || moduleName.startsWith("jose/")) {
    return { type: "sourceFile", filePath: JOSE_BROWSER_ENTRY };
  }

  // The following block is only needed if you are
  // running React Native 0.78 *or older*.
  if (moduleName.startsWith('@privy-io/')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: true,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;
module.exports = withNativeWind(config, { input: "./app/global.css" });
