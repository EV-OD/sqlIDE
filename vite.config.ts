import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => {
  // dynamic import to ensure correct interop with CJS/ESM plugin exports
  const monacoModule = await import("vite-plugin-monaco-editor");
  // Resolve factory function or plugin object across various interop shapes
  let factoryCandidate: any = (monacoModule && (monacoModule as any).default)
    ? (monacoModule as any).default
    : monacoModule;

  let monacoPlugin: any;
  if (typeof factoryCandidate === "function") {
    monacoPlugin = factoryCandidate();
  } else if (factoryCandidate && typeof factoryCandidate === "object") {
    // some packages export the plugin object directly
    monacoPlugin = factoryCandidate;
  } else if (factoryCandidate && (factoryCandidate as any).default && typeof (factoryCandidate as any).default === "function") {
    monacoPlugin = (factoryCandidate as any).default();
  } else {
    throw new Error("Could not resolve monaco editor plugin factory from module");
  }

  return {
    plugins: [react(), monacoPlugin],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
