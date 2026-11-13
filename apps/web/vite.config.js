import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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
    plugins: [react(), tailwindcss()],
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
      rolldownOptions: {
        output: {
          // Groups pull in their dependencies, so the fiber group gets the
          // lowest priority; otherwise it swallows three, and the entry chunk,
          // which imports three, then loads fiber eagerly too.
          codeSplitting: {
            groups: [
              {
                name: "three-vendor",
                test: /\/node_modules\/three\//,
                priority: 3,
              },
              {
                name: "react-vendor",
                test: /\/node_modules\/react(-dom)?\//,
                priority: 2,
              },
              {
                name: "three-fiber-vendor",
                test: /\/node_modules\/@react-three\//,
                priority: 1,
              },
            ],
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
