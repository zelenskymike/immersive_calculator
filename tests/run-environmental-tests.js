#!/usr/bin/env node

/**
 * Environmental Impact Chart Test Runner
 * Comprehensive test execution script for the environmental chart display fix
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./environmental-test-suite.config.js');

class EnvironmentalTestRunner {
    constructor() {
        this.results = {
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                startTime: null,
                endTime: null,
                duration: 0
            },
            categories: {},
            performance: {},
            coverage: {},
            errors: []
        };
    }

    async run() {
        console.log('🧪 Environmental Impact Chart Test Suite');
        console.log('=' * 50);
        console.log(`Version: ${config.version}`);
        console.log(`Description: ${config.description}`);
        console.log('');

        this.results.summary.startTime = new Date();

        try {
            // Validate environment
            await this.validateEnvironment();

            // Setup test environment
            await this.setupTestEnvironment();

            // Run test categories
            await this.runTestCategories();

            // Generate reports
            await this.generateReports();

        } catch (error) {
            console.error('❌ Test suite execution failed:', error.message);
            this.results.errors.push(error.message);
            process.exit(1);
        } finally {
            this.results.summary.endTime = new Date();
            this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;
            await this.printSummary();
        }
    }

    async validateEnvironment() {
        console.log('🔍 Validating test environment...');

        // Check if TCO Calculator is running
        try {
            const response = await this.checkUrl(config.environment.baseUrl);
            if (!response) {
                throw new Error(`TCO Calculator not accessible at ${config.environment.baseUrl}`);
            }
            console.log('✅ TCO Calculator is accessible');
        } catch (error) {
            console.log('❌ TCO Calculator not running, attempting to start...');
            // Could implement auto-start logic here
            throw new Error('Please start the TCO Calculator server first');
        }

        // Check Node.js version
        const nodeVersion = process.version;
        console.log(`✅ Node.js version: ${nodeVersion}`);

        // Check if required packages are available
        const requiredPackages = ['puppeteer', 'jest', '@playwright/test'];
        for (const pkg of requiredPackages) {
            try {
                require.resolve(pkg);
                console.log(`✅ ${pkg} is available`);
            } catch (error) {
                console.log(`❌ ${pkg} is not installed`);
                throw new Error(`Please install ${pkg}: npm install ${pkg}`);
            }
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');

        // Create test results directory
        const resultsDir = config.reporting.outputDir;
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
            console.log(`✅ Created results directory: ${resultsDir}`);
        }

        // Set environment variables
        process.env.NODE_ENV = 'test';
        process.env.TEST_BASE_URL = config.environment.baseUrl;
        process.env.TEST_TIMEOUT = config.environment.timeout;

        console.log('✅ Test environment configured');
    }

    async runTestCategories() {
        console.log('🏃‍♂️ Running test categories...');

        const categories = Object.keys(config.testCategories);
        
        for (const category of categories) {
            console.log(`\n📋 Running ${category} tests...`);
            
            try {
                const result = await this.runCategory(category);
                this.results.categories[category] = result;
                
                this.results.summary.total += result.total;
                this.results.summary.passed += result.passed;
                this.results.summary.failed += result.failed;
                this.results.summary.skipped += result.skipped;

                if (result.failed > 0) {
                    console.log(`❌ ${category} tests failed: ${result.failed}/${result.total}`);
                } else {
                    console.log(`✅ ${category} tests passed: ${result.passed}/${result.total}`);
                }

            } catch (error) {
                console.error(`❌ Error running ${category} tests:`, error.message);
                this.results.errors.push(`${category}: ${error.message}`);
            }
        }
    }

    async runCategory(category) {
        const categoryConfig = config.testCategories[category];
        const testPattern = categoryConfig.pattern;
        
        return new Promise((resolve, reject) => {
            let command, args;

            if (categoryConfig.framework === 'jest') {
                command = 'npx';
                args = [
                    'jest',
                    testPattern,
                    '--json',
                    '--outputFile', `${config.reporting.outputDir}/${category}-results.json`,
                    '--testTimeout', categoryConfig.timeout.toString()
                ];

                if (categoryConfig.coverage) {
                    args.push('--coverage');
                    args.push('--coverageDirectory', `${config.reporting.outputDir}/coverage-${category}`);
                }

            } else if (categoryConfig.framework === 'playwright') {
                command = 'npx';
                args = [
                    'playwright',
                    'test',
                    testPattern,
                    '--reporter=json',
                    `--output-dir=${config.reporting.outputDir}/${category}`,
                    `--timeout=${categoryConfig.timeout}`
                ];

                if (config.environment.headless) {
                    args.push('--headed=false');
                }
            }

            const testProcess = spawn(command, args, {
                stdio: ['inherit', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            let stdout = '';
            let stderr = '';

            testProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                if (config.debug.enabled) {
                    process.stdout.write(data);
                }
            });

            testProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                if (config.debug.enabled) {
                    process.stderr.write(data);
                }
            });

            testProcess.on('close', (code) => {
                try {
                    const result = this.parseTestResults(category, stdout, code);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse ${category} results: ${error.message}`));
                }
            });

            testProcess.on('error', (error) => {
                reject(new Error(`Failed to run ${category} tests: ${error.message}`));
            });
        });
    }

    parseTestResults(category, stdout, exitCode) {
        // Default result structure
        const result = {
            category,
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            coverage: null
        };

        try {
            if (stdout.includes('{')) {
                // Try to parse JSON output
                const jsonStart = stdout.indexOf('{');
                const jsonOutput = stdout.substring(jsonStart);
                const testResults = JSON.parse(jsonOutput);

                if (testResults.numTotalTests !== undefined) {
                    // Jest format
                    result.total = testResults.numTotalTests;
                    result.passed = testResults.numPassedTests;
                    result.failed = testResults.numFailedTests;
                    result.skipped = testResults.numPendingTests || 0;
                    result.duration = testResults.testResults?.[0]?.perfStats?.runtime || 0;
                } else if (testResults.suites !== undefined) {
                    // Playwright format
                    testResults.suites.forEach(suite => {
                        suite.specs.forEach(spec => {
                            result.total++;
                            if (spec.tests[0].status === 'passed') result.passed++;
                            else if (spec.tests[0].status === 'failed') result.failed++;
                            else result.skipped++;
                        });
                    });
                }
            } else {
                // Fallback: parse text output
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('Tests:')) {
                        const matches = line.match(/(\d+) passed.*?(\d+) failed.*?(\d+) total/);
                        if (matches) {
                            result.passed = parseInt(matches[1]);
                            result.failed = parseInt(matches[2]);
                            result.total = parseInt(matches[3]);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not parse ${category} test results:`, error.message);
            // Use exit code as fallback
            result.failed = exitCode !== 0 ? 1 : 0;
            result.passed = exitCode === 0 ? 1 : 0;
            result.total = 1;
        }

        return result;
    }

    async generateReports() {
        console.log('\n📊 Generating test reports...');

        const reportData = {
            timestamp: new Date().toISOString(),
            config: {
                name: config.name,
                version: config.version,
                environment: config.environment.baseUrl
            },
            summary: this.results.summary,
            categories: this.results.categories,
            performance: this.results.performance,
            errors: this.results.errors
        };

        // Generate JSON report
        const jsonReport = path.join(config.reporting.outputDir, 'environmental-test-report.json');
        fs.writeFileSync(jsonReport, JSON.stringify(reportData, null, 2));
        console.log(`✅ JSON report: ${jsonReport}`);

        // Generate HTML report
        await this.generateHtmlReport(reportData);

        // Generate summary report
        await this.generateSummaryReport(reportData);
    }

    async generateHtmlReport(reportData) {
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Environmental Impact Chart Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .metric.passed { border-left: 5px solid #28a745; }
        .metric.failed { border-left: 5px solid #dc3545; }
        .metric.total { border-left: 5px solid #007bff; }
        .category { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Environmental Impact Chart Test Report</h1>
        <p>Generated: ${reportData.timestamp}</p>
        <p>Environment: ${reportData.config.environment}</p>
        <p>Duration: ${Math.round(reportData.summary.duration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="metric total">
            <h3>Total Tests</h3>
            <div style="font-size: 2em; font-weight: bold;">${reportData.summary.total}</div>
        </div>
        <div class="metric passed">
            <h3>Passed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #28a745;">${reportData.summary.passed}</div>
        </div>
        <div class="metric failed">
            <h3>Failed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #dc3545;">${reportData.summary.failed}</div>
        </div>
    </div>

    <h2>Test Categories</h2>
    ${Object.entries(reportData.categories).map(([category, result]) => `
        <div class="category">
            <h3>${category.toUpperCase()} Tests</h3>
            <p><span class="success">✅ Passed: ${result.passed}</span> | 
               <span class="failure">❌ Failed: ${result.failed}</span> | 
               Total: ${result.total}</p>
        </div>
    `).join('')}

    ${reportData.errors.length > 0 ? `
        <h2>Errors</h2>
        ${reportData.errors.map(error => `<div class="error">${error}</div>`).join('')}
    ` : ''}

    <div style="margin-top: 40px; padding: 20px; background: #e9ecef; border-radius: 5px;">
        <h3>Test Validation Summary</h3>
        <p><strong>Environmental Chart Display Fix Status:</strong> 
           ${reportData.summary.failed === 0 ? 
             '<span class="success">✅ RESOLVED - Environmental impact chart is now fully functional and visible</span>' : 
             '<span class="failure">❌ ISSUES DETECTED - Review failed tests above</span>'
           }</p>
        <p><strong>Original Issue:</strong> "исправь отображение environmental impact, я не вижу его"</p>
        <p><strong>Fix Validation:</strong> ${reportData.summary.passed}/${reportData.summary.total} tests passed</p>
    </div>
</body>
</html>`;

        const htmlReport = path.join(config.reporting.outputDir, 'environmental-test-report.html');
        fs.writeFileSync(htmlReport, htmlTemplate);
        console.log(`✅ HTML report: ${htmlReport}`);
    }

    async generateSummaryReport(reportData) {
        const summaryText = `
Environmental Impact Chart Test Suite Summary
=============================================

Test Execution Details:
- Suite Version: ${reportData.config.version}
- Execution Time: ${new Date(reportData.timestamp).toLocaleString()}
- Environment: ${reportData.config.environment}
- Duration: ${Math.round(reportData.summary.duration / 1000)} seconds

Test Results:
- Total Tests: ${reportData.summary.total}
- Passed: ${reportData.summary.passed}
- Failed: ${reportData.summary.failed}
- Skipped: ${reportData.summary.skipped}
- Success Rate: ${Math.round((reportData.summary.passed / reportData.summary.total) * 100)}%

Category Breakdown:
${Object.entries(reportData.categories).map(([category, result]) => 
    `- ${category.toUpperCase()}: ${result.passed}/${result.total} passed`
).join('\n')}

Environmental Chart Fix Validation:
${reportData.summary.failed === 0 ? 
  '✅ SUCCESS: Environmental impact chart display issue has been resolved' :
  '❌ FAILURE: Issues detected in environmental chart functionality'
}

Original Issue: "исправь отображение environmental impact, я не вижу его"
Fix Status: ${reportData.summary.failed === 0 ? 'RESOLVED' : 'REQUIRES ATTENTION'}

${reportData.errors.length > 0 ? `
Errors Encountered:
${reportData.errors.map(error => `- ${error}`).join('\n')}
` : 'No errors encountered during test execution.'}
`;

        const summaryReport = path.join(config.reporting.outputDir, 'environmental-test-summary.txt');
        fs.writeFileSync(summaryReport, summaryText);
        console.log(`✅ Summary report: ${summaryReport}`);
    }

    async printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 ENVIRONMENTAL IMPACT CHART TEST SUITE SUMMARY');
        console.log('='.repeat(60));
        
        const successRate = Math.round((this.results.summary.passed / this.results.summary.total) * 100);
        const duration = Math.round(this.results.summary.duration / 1000);

        console.log(`📊 Test Results: ${this.results.summary.passed}/${this.results.summary.total} passed (${successRate}%)`);
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`🎯 Success Rate: ${successRate}%`);

        if (this.results.summary.failed === 0) {
            console.log('\n✅ ENVIRONMENTAL CHART FIX VALIDATION: SUCCESS');
            console.log('   The environmental impact chart display issue has been resolved.');
            console.log('   Original issue "исправь отображение environmental impact, я не вижу его" is fixed.');
        } else {
            console.log('\n❌ ENVIRONMENTAL CHART FIX VALIDATION: ISSUES DETECTED');
            console.log(`   ${this.results.summary.failed} test(s) failed - review results for details.`);
        }

        console.log('\n📁 Reports generated in:', config.reporting.outputDir);
        console.log('   - environmental-test-report.html (detailed results)');
        console.log('   - environmental-test-report.json (raw data)');
        console.log('   - environmental-test-summary.txt (summary)');

        if (this.results.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            this.results.errors.forEach(error => console.log(`   - ${error}`));
        }

        console.log('\n' + '='.repeat(60));
    }

    async checkUrl(url) {
        // Simple URL check - in a real implementation, you'd use fetch or similar
        return new Promise((resolve) => {
            const http = require('http');
            const request = http.get(url, (res) => {
                resolve(res.statusCode === 200);
            });
            request.on('error', () => resolve(false));
            request.setTimeout(5000, () => {
                request.destroy();
                resolve(false);
            });
        });
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Environmental Impact Chart Test Runner

Usage: node run-environmental-tests.js [options]

Options:
  --help, -h        Show this help message
  --debug           Enable debug mode with verbose output
  --category=<cat>  Run only specific category (unit, integration, e2e, performance, regression)
  --headless        Run in headless mode (default in CI)
  --coverage        Generate coverage reports for applicable tests

Examples:
  node run-environmental-tests.js                    # Run all tests
  node run-environmental-tests.js --category=unit    # Run only unit tests
  node run-environmental-tests.js --debug            # Run with debug output
  node run-environmental-tests.js --headless         # Run in headless mode
        `);
        process.exit(0);
    }

    // Parse command line arguments
    if (args.includes('--debug')) {
        process.env.DEBUG = 'true';
        config.debug.enabled = true;
    }

    if (args.includes('--headless')) {
        config.environment.headless = true;
    }

    const categoryArg = args.find(arg => arg.startsWith('--category='));
    if (categoryArg) {
        const category = categoryArg.split('=')[1];
        // Filter to run only specified category
        Object.keys(config.testCategories).forEach(cat => {
            if (cat !== category) {
                delete config.testCategories[cat];
            }
        });
        console.log(`Running only ${category} tests...`);
    }

    // Start test execution
    const runner = new EnvironmentalTestRunner();
    runner.run().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = EnvironmentalTestRunner;