import { defineConfig, devices } from '@playwright/test';

// The smoke test runs against the production build served by `vite preview`,
// so it exercises the same bundle that gets deployed.
// Set CHROMIUM_PATH to use a pre-installed Chromium instead of Playwright's
// managed download (e.g. CHROMIUM_PATH=/opt/pw-browsers/chromium).
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/timeline/',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Software WebGL so the three.js canvas renders in headless Chromium.
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-375',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/timeline/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
