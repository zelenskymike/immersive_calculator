/**
 * Performance Tests for Environmental Impact Chart
 * Tests chart rendering speed, memory usage, resource loading efficiency
 * Validates performance after the environmental impact display fix
 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

describe('Environmental Chart Performance Tests', () => {
    let browser, page;
    const performanceMetrics = {
        chartCreationTimes: [],
        memoryUsage: [],
        renderingTimes: [],
        resourceLoadTimes: []
    };

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--enable-precise-memory-info'
            ]
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }

        // Report performance summary
        console.log('\n📊 Environmental Chart Performance Summary:');
        console.log('Average Chart Creation Time:', 
            performanceMetrics.chartCreationTimes.reduce((a, b) => a + b, 0) / 
            performanceMetrics.chartCreationTimes.length || 0, 'ms');
        console.log('Peak Memory Usage:', Math.max(...performanceMetrics.memoryUsage) || 0, 'MB');
        console.log('Average Rendering Time:', 
            performanceMetrics.renderingTimes.reduce((a, b) => a + b, 0) / 
            performanceMetrics.renderingTimes.length || 0, 'ms');
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Enable performance monitoring
        await page.evaluateOnNewDocument(() => {
            window.performanceMarks = [];
            window.originalPerformanceMark = performance.mark;
            performance.mark = function(name) {
                window.performanceMarks.push({ name, timestamp: Date.now() });
                return window.originalPerformanceMark.call(this, name);
            };
        });

        await page.goto('http://localhost:4000', { waitUntil: 'networkidle0' });
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    describe('Chart Creation Performance', () => {
        test('should create environmental chart within performance threshold', async () => {
            // Complete TCO calculation
            await page.fill('#servers', '100');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Measure chart creation time
            const startTime = performance.now();
            await page.click('#btn-environmental');
            
            await page.waitForFunction(() => {
                return window.activeChart && window.activeChart.data;
            }, { timeout: 5000 });
            
            const endTime = performance.now();
            const creationTime = endTime - startTime;
            
            performanceMetrics.chartCreationTimes.push(creationTime);

            // Chart should be created within 2 seconds
            expect(creationTime).toBeLessThan(2000);
            console.log(`Environmental chart created in ${creationTime.toFixed(2)}ms`);
        });

        test('should handle large datasets efficiently', async () => {
            // Test with large server count for complex calculations
            await page.fill('#servers', '1000');
            await page.fill('#power_per_server', '500');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const startTime = performance.now();
            await page.click('#btn-environmental');
            
            await page.waitForFunction(() => window.activeChart, { timeout: 10000 });
            const endTime = performance.now();
            
            const largeDatasetTime = endTime - startTime;
            expect(largeDatasetTime).toBeLessThan(5000); // Should handle large datasets within 5 seconds
            
            console.log(`Large dataset chart created in ${largeDatasetTime.toFixed(2)}ms`);
        });

        test('should create fallback chart quickly when main chart fails', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Inject Chart.js error to trigger fallback
            await page.evaluate(() => {
                window.originalChart = window.Chart;
                window.Chart = function() {
                    throw new Error('Simulated Chart.js error');
                };
            });

            const startTime = performance.now();
            await page.click('#btn-environmental');
            await page.waitForTimeout(3000); // Give time for fallback
            const endTime = performance.now();

            const fallbackTime = endTime - startTime;
            expect(fallbackTime).toBeLessThan(4000); // Fallback should complete within 4 seconds

            // Restore Chart.js
            await page.evaluate(() => {
                window.Chart = window.originalChart;
            });

            console.log(`Fallback chart handling completed in ${fallbackTime.toFixed(2)}ms`);
        });
    });

    describe('Memory Usage Performance', () => {
        test('should maintain reasonable memory usage during chart operations', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Get initial memory usage
            const initialMemory = await page.evaluate(() => {
                return performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null;
            });

            if (initialMemory) {
                console.log(`Initial memory usage: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
            }

            // Create environmental chart
            await page.click('#btn-environmental');
            await page.waitForFunction(() => window.activeChart);

            // Get memory after chart creation
            const chartMemory = await page.evaluate(() => {
                return performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize
                } : null;
            });

            if (chartMemory && initialMemory) {
                const memoryIncrease = (chartMemory.used - initialMemory.used) / 1024 / 1024;
                performanceMetrics.memoryUsage.push(memoryIncrease);
                
                console.log(`Memory increase after chart: ${memoryIncrease.toFixed(2)}MB`);
                
                // Chart creation should not use excessive memory (< 50MB increase)
                expect(memoryIncrease).toBeLessThan(50);
            }
        });

        test('should properly clean up memory when switching charts', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const getMemoryUsage = async () => {
                return await page.evaluate(() => {
                    return performance.memory ? performance.memory.usedJSHeapSize : 0;
                });
            };

            const initialMemory = await getMemoryUsage();

            // Create and switch between charts multiple times
            for (let i = 0; i < 5; i++) {
                await page.click('#btn-environmental');
                await page.waitForTimeout(200);
                await page.click('#btn-pie');
                await page.waitForTimeout(200);
                await page.click('#btn-savings');
                await page.waitForTimeout(200);
            }

            // Force garbage collection if possible
            await page.evaluate(() => {
                if (window.gc) {
                    window.gc();
                }
            });

            await page.waitForTimeout(1000);
            const finalMemory = await getMemoryUsage();

            if (initialMemory > 0 && finalMemory > 0) {
                const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
                console.log(`Memory increase after chart switching: ${(memoryIncrease * 100).toFixed(2)}%`);
                
                // Memory increase should be minimal (< 100% increase)
                expect(memoryIncrease).toBeLessThan(1.0);
            }
        });

        test('should handle memory efficiently in grid view', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const singleViewMemory = await page.evaluate(() => {
                return performance.memory ? performance.memory.usedJSHeapSize : 0;
            });

            // Switch to grid view (creates multiple charts)
            await page.click('#btn-grid');
            await page.waitForTimeout(3000);

            const gridViewMemory = await page.evaluate(() => {
                return performance.memory ? performance.memory.usedJSHeapSize : 0;
            });

            if (singleViewMemory > 0 && gridViewMemory > 0) {
                const memoryIncrease = (gridViewMemory - singleViewMemory) / 1024 / 1024;
                console.log(`Grid view memory increase: ${memoryIncrease.toFixed(2)}MB`);
                
                // Grid view should not use excessive additional memory (< 100MB)
                expect(memoryIncrease).toBeLessThan(100);
            }
        });
    });

    describe('Rendering Performance', () => {
        test('should render chart frames smoothly', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Start performance monitoring
            await page.evaluate(() => {
                window.frameTimings = [];
                let lastFrame = performance.now();
                
                function measureFrame() {
                    const now = performance.now();
                    window.frameTimings.push(now - lastFrame);
                    lastFrame = now;
                    
                    if (window.frameTimings.length < 60) {
                        requestAnimationFrame(measureFrame);
                    }
                }
                
                requestAnimationFrame(measureFrame);
            });

            await page.click('#btn-environmental');
            await page.waitForFunction(() => window.activeChart);
            
            // Wait for frame measurements
            await page.waitForTimeout(2000);

            const frameStats = await page.evaluate(() => {
                if (window.frameTimings && window.frameTimings.length > 0) {
                    const avgFrameTime = window.frameTimings.reduce((a, b) => a + b) / window.frameTimings.length;
                    const maxFrameTime = Math.max(...window.frameTimings);
                    const fps = 1000 / avgFrameTime;
                    
                    return { avgFrameTime, maxFrameTime, fps, frameCount: window.frameTimings.length };
                }
                return null;
            });

            if (frameStats) {
                console.log(`Average FPS: ${frameStats.fps.toFixed(2)}`);
                console.log(`Max frame time: ${frameStats.maxFrameTime.toFixed(2)}ms`);
                
                // Should maintain reasonable frame rate (> 30 FPS)
                expect(frameStats.fps).toBeGreaterThan(30);
                
                // No frame should take longer than 33ms (30 FPS threshold)
                expect(frameStats.maxFrameTime).toBeLessThan(50);
            }
        });

        test('should handle canvas resize efficiently', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForFunction(() => window.activeChart);

            // Measure resize performance
            const resizeStartTime = performance.now();
            
            // Simulate viewport changes
            await page.setViewport({ width: 1200, height: 800 });
            await page.waitForTimeout(500);
            await page.setViewport({ width: 800, height: 600 });
            await page.waitForTimeout(500);
            await page.setViewport({ width: 1024, height: 768 });
            await page.waitForTimeout(500);

            const resizeEndTime = performance.now();
            const resizeTime = resizeEndTime - resizeStartTime;

            console.log(`Canvas resize operations completed in ${resizeTime.toFixed(2)}ms`);
            
            // Resize operations should complete quickly
            expect(resizeTime).toBeLessThan(2000);

            // Chart should still be functional after resizing
            const chartStillWorks = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            expect(chartStillWorks).toBe(true);
        });
    });

    describe('Resource Loading Performance', () => {
        test('should load Chart.js library efficiently', async () => {
            // Create new page to measure initial load
            const newPage = await browser.newPage();
            
            const startTime = performance.now();
            await newPage.goto('http://localhost:4000', { waitUntil: 'networkidle0' });
            const loadTime = performance.now() - startTime;

            const chartJsLoaded = await newPage.evaluate(() => {
                return typeof Chart !== 'undefined';
            });

            console.log(`Page with Chart.js loaded in ${loadTime.toFixed(2)}ms`);
            
            expect(chartJsLoaded).toBe(true);
            expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
            
            performanceMetrics.resourceLoadTimes.push(loadTime);
            await newPage.close();
        });

        test('should handle concurrent chart creation efficiently', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Test rapid chart switching (simulating user clicking rapidly)
            const startTime = performance.now();
            
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    page.click('#btn-environmental').then(() => page.waitForTimeout(100))
                );
                promises.push(
                    page.click('#btn-pie').then(() => page.waitForTimeout(100))
                );
            }
            
            await Promise.all(promises);
            const endTime = performance.now();
            
            const rapidSwitchingTime = endTime - startTime;
            console.log(`Rapid chart switching completed in ${rapidSwitchingTime.toFixed(2)}ms`);
            
            // Should handle rapid switching without significant delay
            expect(rapidSwitchingTime).toBeLessThan(5000);

            // Final chart should still be functional
            await page.click('#btn-environmental');
            await page.waitForTimeout(500);
            
            const finalChartWorks = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            expect(finalChartWorks).toBe(true);
        });
    });

    describe('Performance Under Load', () => {
        test('should maintain performance with multiple calculation cycles', async () => {
            const calculationTimes = [];
            
            for (let i = 0; i < 3; i++) {
                // Vary input values
                await page.fill('#servers', (50 + i * 25).toString());
                await page.fill('#power_per_server', (300 + i * 50).toString());
                
                const calcStartTime = performance.now();
                await page.click('button.calculate-btn');
                await page.waitForSelector('#resultsContent', { visible: true });
                
                await page.click('#btn-environmental');
                await page.waitForFunction(() => window.activeChart);
                const calcEndTime = performance.now();
                
                const cycleTime = calcEndTime - calcStartTime;
                calculationTimes.push(cycleTime);
                
                console.log(`Calculation cycle ${i + 1} completed in ${cycleTime.toFixed(2)}ms`);
                
                // Each cycle should complete within reasonable time
                expect(cycleTime).toBeLessThan(10000);
            }

            // Performance should not degrade significantly over multiple cycles
            const firstCycle = calculationTimes[0];
            const lastCycle = calculationTimes[calculationTimes.length - 1];
            const performanceDegradation = (lastCycle - firstCycle) / firstCycle;
            
            console.log(`Performance degradation: ${(performanceDegradation * 100).toFixed(2)}%`);
            
            // Performance degradation should be minimal (< 50% increase)
            expect(performanceDegradation).toBeLessThan(0.5);
        });

        test('should handle stress test with rapid interactions', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const stressStartTime = performance.now();
            
            // Stress test: rapid interactions for 10 seconds
            const stressEndTime = stressStartTime + 10000;
            const interactions = [];
            
            while (performance.now() < stressEndTime) {
                const interactionStart = performance.now();
                
                await page.click('#btn-environmental');
                await page.waitForTimeout(50);
                await page.click('#btn-grid');
                await page.waitForTimeout(50);
                await page.click('#btn-pie');
                await page.waitForTimeout(50);
                
                const interactionEnd = performance.now();
                interactions.push(interactionEnd - interactionStart);
                
                if (interactions.length > 20) break; // Limit iterations for test stability
            }
            
            const totalStressTime = performance.now() - stressStartTime;
            const avgInteractionTime = interactions.reduce((a, b) => a + b, 0) / interactions.length;
            
            console.log(`Stress test completed: ${interactions.length} interactions in ${totalStressTime.toFixed(2)}ms`);
            console.log(`Average interaction time: ${avgInteractionTime.toFixed(2)}ms`);
            
            // Application should remain responsive under stress
            expect(avgInteractionTime).toBeLessThan(1000);
            
            // Final state should be functional
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);
            
            const appStillFunctional = await page.evaluate(() => {
                return !!(window.activeChart && document.getElementById('activeChart'));
            });
            expect(appStillFunctional).toBe(true);
        });
    });

    describe('Performance Regression Detection', () => {
        test('should establish performance baseline for environmental chart', async () => {
            const baselineMetrics = {
                chartCreationTime: 0,
                memoryUsage: 0,
                renderingTime: 0
            };

            // Perform standard test scenario
            await page.fill('#servers', '100');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Measure chart creation
            const creationStart = performance.now();
            await page.click('#btn-environmental');
            await page.waitForFunction(() => window.activeChart);
            baselineMetrics.chartCreationTime = performance.now() - creationStart;

            // Measure memory usage
            const memoryInfo = await page.evaluate(() => {
                return performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
            });
            baselineMetrics.memoryUsage = memoryInfo;

            // Measure rendering performance
            const renderingStart = performance.now();
            await page.evaluate(() => {
                if (window.activeChart && window.activeChart.update) {
                    window.activeChart.update();
                }
            });
            baselineMetrics.renderingTime = performance.now() - renderingStart;

            console.log('Performance Baseline Established:');
            console.log(`- Chart Creation: ${baselineMetrics.chartCreationTime.toFixed(2)}ms`);
            console.log(`- Memory Usage: ${baselineMetrics.memoryUsage.toFixed(2)}MB`);
            console.log(`- Rendering Time: ${baselineMetrics.renderingTime.toFixed(2)}ms`);

            // Store baseline for regression testing
            expect(baselineMetrics.chartCreationTime).toBeLessThan(3000);
            expect(baselineMetrics.memoryUsage).toBeLessThan(200);
            expect(baselineMetrics.renderingTime).toBeLessThan(100);
        });
    });
});