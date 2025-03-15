import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import tsconfigPath from "vite-tsconfig-paths";

export default defineWorkersConfig({
  plugins: [tsconfigPath()],
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});
