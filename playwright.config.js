import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name:'desktop', use:{ viewport:{width:1280,height:1000} } },
    { name:'mobile', use:{ viewport:{width:390,height:844},isMobile:true,hasTouch:true } },
  ],
  webServer: { command:'npm run build && node server.mjs', env:{PORT:'3100'}, url:'http://127.0.0.1:3100', reuseExistingServer:false },
});
