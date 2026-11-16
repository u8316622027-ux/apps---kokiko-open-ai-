import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  webServer: {
    command: "python -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173/app/widgets/products.html",
    reuseExistingServer: true,
  },
  use: {
    headless: true,
  },
});
