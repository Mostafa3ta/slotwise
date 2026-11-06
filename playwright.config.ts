import { defineConfig, devices } from '@playwright/test'

// End-to-end tests (npm run test:e2e) drive a real browser against the app.
// Locally they use the dev server on http://localhost:3000 (started for you if it isn't running).
// To test a deployed build instead: BASE_URL=https://<your-url> npm run test:e2e
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL, navigationTimeout: 60_000, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
})
