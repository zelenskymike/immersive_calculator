/**
 * Playwright Global Teardown
 * Cleans up test environment after all E2E tests complete
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright Global Teardown...');
  
  const startTime = Date.now();
  
  try {
    // 1. Cleanup test database
    await cleanupTestDatabase();
    
    // 2. Cleanup test Redis
    await cleanupTestRedis();
    
    // 3. Generate test summary
    await generateTestSummary();
    
    // 4. Cleanup temporary files
    await cleanupTemporaryFiles();
    
    // 5. Archive test artifacts if needed
    await archiveTestArtifacts();
    
    console.log(`✅ Global teardown completed in ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw during teardown to avoid masking test failures
  }
}

async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...');
  
  try {
    // Clean up test data but keep schema for potential debugging
    execSync('npm run db:reset', {
      cwd: './packages/backend',
      stdio: 'pipe', // Suppress output during cleanup
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/tco_calculator_test',
      },
    });
    
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.warn('⚠️ Test database cleanup failed:', error.message);
    // Don't throw - database cleanup is not critical for teardown
  }
}

async function cleanupTestRedis() {
  console.log('🗂️ Cleaning up test Redis...');
  
  try {
    const { createClient } = await import('redis');
    const client = createClient({
      url: process.env.TEST_REDIS_URL || 'redis://localhost:6380/1',
    });
    
    await client.connect();
    await client.flushDb();
    await client.disconnect();
    
    console.log('✅ Test Redis cleanup complete');
  } catch (error) {
    console.warn('⚠️ Test Redis cleanup failed:', error.message);
    // Don't throw - Redis cleanup is not critical
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(testResultsDir)) {
      console.log('ℹ️ No test results directory found, skipping summary');
      return;
    }
    
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: !!process.env.CI,
      },
      testRun: {
        duration: Date.now() - (global as any).testStartTime || 0,
        parallelWorkers: config.workers,
        retries: config.retries,
      },
      artifacts: {
        screenshots: 0,
        videos: 0,
        traces: 0,
        reports: 0,
      },
    };
    
    // Count artifacts
    const artifactDirs = ['screenshots', 'videos', 'traces'];
    artifactDirs.forEach(dirName => {
      const dirPath = path.join(testResultsDir, dirName);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        summary.artifacts[dirName as keyof typeof summary.artifacts] = files.length;
      }
    });
    
    // Count HTML reports
    const reportDir = path.join(process.cwd(), 'playwright-report');
    if (fs.existsSync(reportDir)) {
      const reportFiles = fs.readdirSync(reportDir).filter(file => file.endsWith('.html'));
      summary.artifacts.reports = reportFiles.length;
    }
    
    // Check for test results JSON
    const resultsFile = path.join(testResultsDir, 'results.json');
    if (fs.existsSync(resultsFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        summary.testRun = {
          ...summary.testRun,
          totalTests: results.suites?.reduce((total: number, suite: any) => 
            total + (suite.specs?.length || 0), 0) || 0,
          passed: results.suites?.reduce((total: number, suite: any) => 
            total + (suite.specs?.filter((spec: any) => spec.ok).length || 0), 0) || 0,
          failed: results.suites?.reduce((total: number, suite: any) => 
            total + (suite.specs?.filter((spec: any) => !spec.ok).length || 0), 0) || 0,
        };
      } catch (error) {
        console.warn('⚠️ Could not parse test results:', error.message);
      }
    }
    
    // Write summary
    const summaryFile = path.join(testResultsDir, 'test-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    // Log summary
    console.log('📈 Test Run Summary:');
    console.log(`  Environment: ${summary.environment.platform} ${summary.environment.arch}`);
    console.log(`  Node.js: ${summary.environment.nodeVersion}`);
    console.log(`  CI: ${summary.environment.ci ? 'Yes' : 'No'}`);
    
    if (summary.testRun.totalTests) {
      console.log(`  Total Tests: ${summary.testRun.totalTests}`);
      console.log(`  Passed: ${summary.testRun.passed}`);
      console.log(`  Failed: ${summary.testRun.failed}`);
      console.log(`  Success Rate: ${((summary.testRun.passed / summary.testRun.totalTests) * 100).toFixed(1)}%`);
    }
    
    console.log(`  Duration: ${Math.round(summary.testRun.duration / 1000)}s`);
    console.log('  Artifacts:');
    console.log(`    Screenshots: ${summary.artifacts.screenshots}`);
    console.log(`    Videos: ${summary.artifacts.videos}`);
    console.log(`    Traces: ${summary.artifacts.traces}`);
    console.log(`    Reports: ${summary.artifacts.reports}`);
    
    console.log('✅ Test summary generated');
  } catch (error) {
    console.warn('⚠️ Test summary generation failed:', error.message);
  }
}

async function cleanupTemporaryFiles() {
  console.log('🗑️ Cleaning up temporary files...');
  
  try {
    const tempFiles = [
      path.join(process.cwd(), 'test-results', 'auth-state.json'),
      path.join(process.cwd(), 'test-results', 'test-data.json'),
    ];
    
    tempFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn(`⚠️ Could not delete ${filePath}:`, error.message);
        }
      }
    });
    
    console.log('✅ Temporary files cleanup complete');
  } catch (error) {
    console.warn('⚠️ Temporary files cleanup failed:', error.message);
  }
}

async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');
  
  try {
    // Only archive on CI or if explicitly requested
    const shouldArchive = process.env.CI || process.env.ARCHIVE_TEST_RESULTS === 'true';
    
    if (!shouldArchive) {
      console.log('ℹ️ Skipping artifact archiving (not on CI)');
      return;
    }
    
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const playwrightReportDir = path.join(process.cwd(), 'playwright-report');
    
    if (!fs.existsSync(testResultsDir) && !fs.existsSync(playwrightReportDir)) {
      console.log('ℹ️ No artifacts to archive');
      return;
    }
    
    // Create archive directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(process.cwd(), 'archived-test-results', `run-${timestamp}`);
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // Copy test results
    if (fs.existsSync(testResultsDir)) {
      execSync(`cp -r "${testResultsDir}" "${path.join(archiveDir, 'test-results')}"`, {
        stdio: 'pipe',
      });
    }
    
    // Copy playwright report
    if (fs.existsSync(playwrightReportDir)) {
      execSync(`cp -r "${playwrightReportDir}" "${path.join(archiveDir, 'playwright-report')}"`, {
        stdio: 'pipe',
      });
    }
    
    console.log(`✅ Test artifacts archived to: ${archiveDir}`);
    
    // Clean up old archives (keep only last 10)
    const archiveParentDir = path.join(process.cwd(), 'archived-test-results');
    if (fs.existsSync(archiveParentDir)) {
      const archives = fs.readdirSync(archiveParentDir)
        .filter(name => name.startsWith('run-'))
        .sort()
        .reverse();
      
      if (archives.length > 10) {
        const oldArchives = archives.slice(10);
        oldArchives.forEach(archiveName => {
          const archivePath = path.join(archiveParentDir, archiveName);
          try {
            execSync(`rm -rf "${archivePath}"`, { stdio: 'pipe' });
            console.log(`🗑️ Removed old archive: ${archiveName}`);
          } catch (error) {
            console.warn(`⚠️ Could not remove old archive ${archiveName}:`, error.message);
          }
        });
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Test artifact archiving failed:', error.message);
  }
}

export default globalTeardown;