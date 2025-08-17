/**
 * Integration Tests for Environmental Impact Chart System
 * Tests chart switcher, single vs grid view, API integration, and Chart.js library integration
 * Focuses on the fixed environmental impact display functionality
 */

const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');

describe('Environmental Impact Chart Integration Tests', () => {
    let browser, page;
    let server;

    beforeAll(async () => {
        // Start the TCO calculator server for integration testing
        const { spawn } = require('child_process');
        server = spawn('node', ['tco-calculator.js'], {
            stdio: 'pipe',
            env: { ...process.env, PORT: 4001 }
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        if (server) {
            server.kill();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Set up console monitoring
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser Error:', msg.text());
            }
        });

        // Enable verbose logging for chart operations
        await page.evaluateOnNewDocument(() => {
            window.chartDebugLogs = [];
            const originalLog = console.log;
            console.log = (...args) => {
                window.chartDebugLogs.push(args.join(' '));
                originalLog.apply(console, args);
            };
        });

        await page.goto('http://localhost:4001', { waitUntil: 'networkidle0' });
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    describe('Chart Switcher Functionality', () => {
        test('should switch to environmental impact chart in single view', async () => {
            // Trigger calculation first
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Click environmental impact button
            await page.click('#btn-environmental');
            
            // Wait for chart to be created
            await page.waitForTimeout(1000);

            // Verify environmental chart is active
            const activeChart = await page.$('#activeChart');
            expect(activeChart).toBeTruthy();

            // Check that environmental chart creation was logged
            const logs = await page.evaluate(() => window.chartDebugLogs);
            const envChartLogs = logs.filter(log => log.includes('🌱 Creating environmental chart in single view'));
            expect(envChartLogs.length).toBeGreaterThan(0);
        });

        test('should handle chart switching between different chart types', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Test switching between charts
            const chartTypes = ['#btn-pie', '#btn-savings', '#btn-environmental'];
            
            for (const chartButton of chartTypes) {
                await page.click(chartButton);
                await page.waitForTimeout(500);
                
                const activeChart = await page.$('#activeChart');
                expect(activeChart).toBeTruthy();
            }

            // Verify environmental chart is working after switching
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const logs = await page.evaluate(() => window.chartDebugLogs);
            const envLogs = logs.filter(log => log.includes('Environmental') || log.includes('🌱'));
            expect(envLogs.length).toBeGreaterThan(0);
        });

        test('should properly destroy previous charts when switching', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Switch to pie chart first
            await page.click('#btn-pie');
            await page.waitForTimeout(500);

            // Switch to environmental chart
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Check destruction logs
            const logs = await page.evaluate(() => window.chartDebugLogs);
            const destructionLogs = logs.filter(log => log.includes('🗑️ Destroying') || log.includes('destroy'));
            expect(destructionLogs.length).toBeGreaterThan(0);
        });
    });

    describe('Single vs Grid View Integration', () => {
        test('should display environmental chart in grid view', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Switch to grid view
            await page.click('#btn-grid');
            await page.waitForTimeout(2000);

            // Check that environmental chart canvas exists in grid
            const envChart = await page.$('#environmentalChart');
            expect(envChart).toBeTruthy();

            // Verify canvas has proper dimensions
            const dimensions = await page.evaluate(() => {
                const canvas = document.getElementById('environmentalChart');
                return canvas ? {
                    width: canvas.width,
                    height: canvas.height,
                    clientWidth: canvas.clientWidth,
                    clientHeight: canvas.clientHeight
                } : null;
            });

            expect(dimensions).toBeTruthy();
            expect(dimensions.width).toBeGreaterThan(0);
            expect(dimensions.height).toBeGreaterThan(0);
        });

        test('should create all charts simultaneously in grid view', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-grid');
            await page.waitForTimeout(3000);

            // Check that all required canvases exist
            const chartCanvases = await page.evaluate(() => {
                return {
                    pie: !!document.getElementById('pieChart'),
                    savings: !!document.getElementById('savingsChart'),
                    environmental: !!document.getElementById('environmentalChart')
                };
            });

            expect(chartCanvases.pie).toBe(true);
            expect(chartCanvases.savings).toBe(true);
            expect(chartCanvases.environmental).toBe(true);

            // Verify environmental chart creation logs for grid view
            const logs = await page.evaluate(() => window.chartDebugLogs);
            const gridEnvLogs = logs.filter(log => log.includes('🌱 Creating environmental chart in grid view'));
            expect(gridEnvLogs.length).toBeGreaterThan(0);
        });

        test('should handle switching between single and grid views', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Start with environmental chart in single view
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Switch to grid view
            await page.click('#btn-grid');
            await page.waitForTimeout(2000);

            // Switch back to single view with environmental chart
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Verify environmental chart is still functional
            const activeChart = await page.$('#activeChart');
            expect(activeChart).toBeTruthy();

            const logs = await page.evaluate(() => window.chartDebugLogs);
            const envCreationLogs = logs.filter(log => log.includes('🌱 Creating environmental chart'));
            expect(envCreationLogs.length).toBeGreaterThanOrEqual(2); // Once for grid, once for single
        });
    });

    describe('Data Processing and Validation', () => {
        test('should process TCO calculation data for environmental charts', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Get the calculation data used for environmental chart
            const calculationData = await page.evaluate(() => {
                return window.lastCalculationData;
            });

            expect(calculationData).toBeTruthy();
            expect(calculationData.comparison).toBeTruthy();
            expect(calculationData.comparison.efficiency).toBeTruthy();
            expect(calculationData.comparison.efficiency.pue_air_cooling).toBeGreaterThan(0);
            expect(calculationData.comparison.efficiency.pue_immersion_cooling).toBeGreaterThan(0);
        });

        test('should handle invalid calculation data gracefully', async () => {
            // Inject invalid data scenario
            await page.evaluate(() => {
                // Override the calculation function to return invalid data
                window.originalCalculate = window.calculateTCO;
                window.calculateTCO = () => {
                    return { invalid: 'data' };
                };
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Check fallback chart creation
            const logs = await page.evaluate(() => window.chartDebugLogs);
            const fallbackLogs = logs.filter(log => log.includes('Environmental chart creation failed') || log.includes('creating fallback'));
            expect(fallbackLogs.length).toBeGreaterThan(0);

            // Restore original function
            await page.evaluate(() => {
                window.calculateTCO = window.originalCalculate;
            });
        });

        test('should validate PUE data ranges', async () => {
            // Test with extreme PUE values
            await page.evaluate(() => {
                // Fill form with extreme values
                document.getElementById('servers').value = '1000';
                document.getElementById('power_per_server').value = '500';
                document.getElementById('pue_air').value = '5.0';
                document.getElementById('pue_immersion').value = '1.0';
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Check that chart was created with valid data
            const chartData = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                if (canvas && window.activeChart) {
                    return window.activeChart.data;
                }
                return null;
            });

            expect(chartData).toBeTruthy();
            expect(chartData.datasets).toBeTruthy();
            expect(chartData.datasets[0].data).toBeTruthy();
            expect(chartData.datasets[0].data[0]).toBeGreaterThan(0); // Air cooling PUE
            expect(chartData.datasets[0].data[1]).toBeGreaterThan(0); // Immersion cooling PUE
        });
    });

    describe('Chart.js Library Integration', () => {
        test('should verify Chart.js library is loaded and functional', async () => {
            const chartJsAvailable = await page.evaluate(() => {
                return typeof Chart !== 'undefined' && Chart.version;
            });

            expect(chartJsAvailable).toBeTruthy();
        });

        test('should handle Chart.js configuration correctly', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Check Chart.js configuration
            const chartConfig = await page.evaluate(() => {
                if (window.activeChart) {
                    return {
                        type: window.activeChart.config.type,
                        responsive: window.activeChart.config.options.responsive,
                        plugins: Object.keys(window.activeChart.config.options.plugins || {}),
                        datasets: window.activeChart.config.data.datasets.length
                    };
                }
                return null;
            });

            expect(chartConfig).toBeTruthy();
            expect(chartConfig.type).toBe('doughnut');
            expect(chartConfig.responsive).toBe(true);
            expect(chartConfig.plugins).toContain('title');
            expect(chartConfig.plugins).toContain('legend');
            expect(chartConfig.datasets).toBe(1);
        });

        test('should handle Chart.js rendering lifecycle', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Test chart update functionality
            const updateResult = await page.evaluate(() => {
                if (window.activeChart && typeof window.activeChart.update === 'function') {
                    window.activeChart.update();
                    return true;
                }
                return false;
            });

            expect(updateResult).toBe(true);
        });
    });

    describe('Canvas Context and Rendering', () => {
        test('should properly manage canvas context', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const canvasInfo = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    return {
                        hasCanvas: !!canvas,
                        hasContext: !!ctx,
                        width: canvas.width,
                        height: canvas.height,
                        contextType: ctx ? ctx.constructor.name : null
                    };
                }
                return null;
            });

            expect(canvasInfo.hasCanvas).toBe(true);
            expect(canvasInfo.hasContext).toBe(true);
            expect(canvasInfo.width).toBeGreaterThan(0);
            expect(canvasInfo.height).toBeGreaterThan(0);
        });

        test('should handle canvas resize events', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Simulate viewport resize
            await page.setViewport({ width: 800, height: 600 });
            await page.waitForTimeout(500);

            // Chart should still be responsive
            const chartStillExists = await page.evaluate(() => {
                return !!document.getElementById('activeChart') && !!window.activeChart;
            });

            expect(chartStillExists).toBe(true);
        });

        test('should handle multiple canvas contexts in grid view', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-grid');
            await page.waitForTimeout(2000);

            const canvasContexts = await page.evaluate(() => {
                const canvases = ['pieChart', 'savingsChart', 'environmentalChart'];
                return canvases.map(id => {
                    const canvas = document.getElementById(id);
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        return {
                            id,
                            hasCanvas: !!canvas,
                            hasContext: !!ctx,
                            width: canvas.width,
                            height: canvas.height
                        };
                    }
                    return { id, hasCanvas: false };
                });
            });

            canvasContexts.forEach(context => {
                expect(context.hasCanvas).toBe(true);
                if (context.hasCanvas) {
                    expect(context.hasContext).toBe(true);
                    expect(context.width).toBeGreaterThan(0);
                    expect(context.height).toBeGreaterThan(0);
                }
            });
        });
    });

    describe('Error Recovery and Fallback', () => {
        test('should recover from chart creation failures', async () => {
            // Inject Chart.js error
            await page.evaluate(() => {
                const originalChart = window.Chart;
                window.Chart = function() {
                    throw new Error('Simulated Chart.js error');
                };
                
                // Restore after a delay to test fallback
                setTimeout(() => {
                    window.Chart = originalChart;
                }, 1000);
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Check for fallback creation logs
            const logs = await page.evaluate(() => window.chartDebugLogs);
            const fallbackLogs = logs.filter(log => 
                log.includes('Environmental chart creation failed') || 
                log.includes('creating fallback')
            );
            expect(fallbackLogs.length).toBeGreaterThan(0);
        });

        test('should handle canvas context errors gracefully', async () => {
            // Simulate canvas context failure
            await page.evaluate(() => {
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type) {
                    if (this.id === 'activeChart') {
                        return null; // Simulate context failure
                    }
                    return originalGetContext.call(this, type);
                };
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Application should not crash
            const pageTitle = await page.title();
            expect(pageTitle).toContain('TCO Calculator');
        });
    });

    describe('Performance and Memory Management', () => {
        test('should not leak memory when switching charts rapidly', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const initialMemory = await page.evaluate(() => {
                return performance.memory ? performance.memory.usedJSHeapSize : 0;
            });

            // Rapidly switch between charts
            for (let i = 0; i < 10; i++) {
                await page.click('#btn-environmental');
                await page.waitForTimeout(100);
                await page.click('#btn-pie');
                await page.waitForTimeout(100);
            }

            await page.waitForTimeout(1000);

            const finalMemory = await page.evaluate(() => {
                return performance.memory ? performance.memory.usedJSHeapSize : 0;
            });

            // Memory should not increase dramatically
            if (initialMemory > 0 && finalMemory > 0) {
                const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
                expect(memoryIncrease).toBeLessThan(2.0); // Less than 200% increase
            }
        });

        test('should complete chart rendering within reasonable time', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const startTime = Date.now();
            await page.click('#btn-environmental');
            
            // Wait for chart to be fully rendered
            await page.waitForFunction(() => {
                return window.activeChart && window.activeChart.config;
            }, { timeout: 5000 });

            const renderTime = Date.now() - startTime;
            expect(renderTime).toBeLessThan(3000); // Should render within 3 seconds
        });
    });
});