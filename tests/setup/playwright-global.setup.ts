/**
 * Playwright Global Setup
 * Sets up test environment, database, and authentication before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright Global Setup...');
  
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const startTime = Date.now();
  
  try {
    // 1. Setup test database
    await setupTestDatabase();
    
    // 2. Setup test Redis
    await setupTestRedis();
    
    // 3. Wait for services to be ready
    await waitForServices(baseURL);
    
    // 4. Setup test data
    await setupTestData();
    
    // 5. Setup authentication state (if needed)
    await setupAuthenticationState(config);
    
    // 6. Create test screenshots directory
    await setupTestDirectories();
    
    // 7. Log environment information
    await logEnvironmentInfo();
    
    console.log(`✅ Global setup completed in ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  try {
    // Reset test database
    execSync('npm run db:reset', {
      cwd: './packages/backend',
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/tco_calculator_test',
      },
    });
    
    // Run migrations
    execSync('npm run db:migrate', {
      cwd: './packages/backend',
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/tco_calculator_test',
      },
    });
    
    // Seed test data
    execSync('npm run db:seed', {
      cwd: './packages/backend',
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/tco_calculator_test',
      },
    });
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

async function setupTestRedis() {
  console.log('🗄️ Setting up test Redis...');
  
  try {
    // Clear test Redis database
    const { createClient } = await import('redis');
    const client = createClient({
      url: process.env.TEST_REDIS_URL || 'redis://localhost:6380/1',
    });
    
    await client.connect();
    await client.flushDb();
    await client.disconnect();
    
    console.log('✅ Test Redis setup complete');
  } catch (error) {
    console.warn('⚠️ Redis setup failed (continuing without Redis):', error.message);
    // Don't throw - Redis is optional for most tests
  }
}

async function waitForServices(baseURL: string) {
  console.log('⏳ Waiting for services to be ready...');
  
  const maxAttempts = 60; // 60 seconds
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      // Check frontend
      const frontendResponse = await fetch(baseURL);
      if (!frontendResponse.ok) {
        throw new Error(`Frontend not ready: ${frontendResponse.status}`);
      }
      
      // Check backend health
      const backendResponse = await fetch(`${baseURL.replace(':3000', ':3001')}/api/v1/health`);
      if (!backendResponse.ok) {
        throw new Error(`Backend not ready: ${backendResponse.status}`);
      }
      
      console.log('✅ All services are ready');
      return;
      
    } catch (error) {
      attempts++;
      console.log(`⏳ Services not ready yet (attempt ${attempts}/${maxAttempts}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Services did not become ready within timeout period');
}

async function setupTestData() {
  console.log('📝 Setting up test data...');
  
  try {
    // Create test calculation data
    const testCalculations = [
      {
        name: 'Small Data Center',
        configuration: {
          air_cooling: {
            input_method: 'rack_count',
            rack_count: 10,
            power_per_rack_kw: 15,
          },
          immersion_cooling: {
            input_method: 'auto_optimize',
            target_power_kw: 150,
          },
          financial: {
            analysis_years: 5,
            currency: 'USD',
            region: 'US',
          },
        },
      },
      {
        name: 'Medium Data Center',
        configuration: {
          air_cooling: {
            input_method: 'rack_count',
            rack_count: 50,
            power_per_rack_kw: 15,
          },
          immersion_cooling: {
            input_method: 'auto_optimize',
            target_power_kw: 750,
          },
          financial: {
            analysis_years: 5,
            currency: 'EUR',
            region: 'EU',
          },
        },
      },
    ];
    
    // Save test data to file for use in tests
    const testDataDir = path.join(process.cwd(), 'test-results');
    const testDataFile = path.join(testDataDir, 'test-data.json');
    
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    fs.writeFileSync(testDataFile, JSON.stringify(testCalculations, null, 2));
    
    console.log('✅ Test data setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    // Don't throw - test data is not critical
  }
}

async function setupAuthenticationState(config: FullConfig) {
  console.log('🔐 Setting up authentication state...');
  
  try {
    // For now, the TCO calculator doesn't require authentication
    // This is a placeholder for future authentication requirements
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to app
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
    await page.goto(baseURL);
    
    // Wait for app to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Save authentication state (currently just session data)
    const storageState = await context.storageState();
    const authFile = path.join(process.cwd(), 'test-results', 'auth-state.json');
    
    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
    
    await browser.close();
    
    console.log('✅ Authentication state saved');
  } catch (error) {
    console.warn('⚠️ Authentication setup failed (continuing without auth state):', error.message);
    // Don't throw - auth is not currently required
  }
}

async function setupTestDirectories() {
  console.log('📁 Setting up test directories...');
  
  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'playwright-report',
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  console.log('✅ Test directories created');
}

async function logEnvironmentInfo() {
  console.log('ℹ️ Environment Information:');
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log(`  Working Directory: ${process.cwd()}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  CI: ${process.env.CI ? 'Yes' : 'No'}`);
  
  // Log important environment variables
  const importantEnvVars = [
    'PLAYWRIGHT_BASE_URL',
    'TEST_DATABASE_URL',
    'TEST_REDIS_URL',
    'VITE_API_BASE_URL',
  ];
  
  console.log('  Environment Variables:');
  importantEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive information
      const maskedValue = value.includes('://') && value.includes('@') 
        ? value.replace(/(:\/\/)([^@]+)(@)/, '$1***$3')
        : value;
      console.log(`    ${varName}: ${maskedValue}`);
    }
  });
}

export default globalSetup;