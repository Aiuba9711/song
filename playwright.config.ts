import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test", override: false, quiet: true });

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
// Permite usar um Chromium já instalado (ex.: containers/CI): CHROMIUM_PATH=/caminho/chrome
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL,
    locale: "pt-MZ",
    timezoneId: "Africa/Maputo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
    { name: "android", use: { ...devices["Pixel 7"], launchOptions } },
  ],
  webServer: {
    // BD de teste preparada ANTES do build (as páginas públicas são pré-renderizadas).
    command: `npx tsx scripts/e2e-prepare.ts && npx next build && npx next start -p ${PORT}`,
    url: `${baseURL}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      APP_URL: baseURL,
      DATABASE_URL: process.env.DATABASE_URL!,
      APP_SECRET: process.env.APP_SECRET!,
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR ?? "./storage-test",
      EMAIL_DRIVER: "console",
      // Todos os testes usam o mesmo IP; aumenta os limites sem os desligar.
      RATE_LIMIT_SCALE: "50",
      // Assistente de IA em modo de demonstração (regras locais, sem rede nem chaves).
      AI_PROVIDER: process.env.E2E_AI_PROVIDER ?? "mock",
      // Simula um provedor externo para testar o pedido de consentimento.
      AI_MOCK_EXTERNAL: "1",
    },
  },
});
