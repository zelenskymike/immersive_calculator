/**
 * Playwright Configuration for TCO Calculator E2E Tests
 * Comprehensive configuration for cross-browser, mobile, and accessibility testing
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Global test timeout
  timeout: 30 * 1000, // 30 seconds per test
  
  // Global setup/teardown timeout
  globalTimeout: 60 * 60 * 1000, // 1 hour for entire test run
  
  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10 * 1000,
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
    
    // Default locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York',
    
    // Color scheme
    colorScheme: 'light',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Custom user agent
    userAgent: 'TCO-Calculator-E2E-Tests/1.0',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright',
    },
  },
  
  // Test output directory
  outputDir: 'test-results',
  
  // Global setup file
  globalSetup: require.resolve('./tests/setup/playwright-global.setup.ts'),
  
  // Global teardown file
  globalTeardown: require.resolve('./tests/setup/playwright-global.teardown.ts'),
  
  // Test projects for multiple browsers and configurations
  projects: [
    // Setup project - runs before all other projects
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'teardown',
    },
    
    // Teardown project - runs after all other projects
    {
      name: 'teardown',
      testMatch: /.*\.teardown\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
      dependencies: ['setup'],
    },
    
    // Tablet
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad Pro'],
      },
      dependencies: ['setup'],
    },
    
    // Accessibility testing with specific configuration
    {
      name: 'accessibility',
      testMatch: /.*accessibility.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Force reduced motion for consistent accessibility testing
        reducedMotion: 'reduce',
        // High contrast mode
        forcedColors: 'active',
      },
      dependencies: ['setup'],
    },
    
    // Performance testing
    {
      name: 'performance',
      testMatch: /.*performance.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Throttle network for performance testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--no-sandbox',
          ],
        },
      },
      dependencies: ['setup'],
    },
    
    // Multi-language testing
    {
      name: 'arabic-rtl',
      testMatch: /.*i18n.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh',
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
    
    // High DPI / Retina displays
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2,
      },
      dependencies: ['setup'],
    },
    
    // Dark mode testing
    {
      name: 'dark-mode',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
    
    // Slow network simulation
    {
      name: 'slow-network',
      testMatch: /.*network.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Simulate slow 3G
        launchOptions: {
          args: [
            '--force-effective-connection-type=3g',
          ],
        },
      },
      dependencies: ['setup'],
    },
  ],
  
  // Web server configuration
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev:backend',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      cwd: './packages/backend',
      timeout: 60 * 1000,
      env: {
        NODE_ENV: 'test',
        PORT: '3001',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/tco_calculator_test',
        REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6380/1',
      },
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: './packages/frontend',
      timeout: 60 * 1000,
      env: {
        NODE_ENV: 'test',
        VITE_API_BASE_URL: 'http://localhost:3001',
        VITE_APP_ENV: 'test',
      },
    },
  ],
  
  // Test metadata
  metadata: {
    'test-type': 'e2e',
    'application': 'tco-calculator',
    'version': '1.0.0',
    'environment': process.env.NODE_ENV || 'test',
  },
});