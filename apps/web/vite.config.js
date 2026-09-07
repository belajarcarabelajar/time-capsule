import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load environment variables from the workspace root
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const functionsOrigin =
    env.TIME_CAPSULE_FUNCTIONS_ORIGIN || "http://127.0.0.1:8788";

  return {
    envDir: path.resolve(__dirname, "../.."),
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@time-capsule/ui": path.resolve(
          __dirname,
          "../../packages/ui/src/index.js",
        ),
        "@time-capsule/game-engine": path.resolve(
          __dirname,
          "../../packages/game-engine/src/index.js",
        ),
      },
    },
    build: {
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/@react-three/")) {
              return "three-fiber-vendor";
            }
            if (id.includes("/node_modules/three/")) {
              return "three-vendor";
            }
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/")
            ) {
              return "react-vendor";
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      fs: {
        allow: [path.resolve(__dirname, "../..")],
      },
      proxy: {
        "/api": {
          target: functionsOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
