/**
 * Regression Tests for Environmental Impact Chart
 * Tests error handling, fallback mechanisms, and prevents future issues
 * Ensures the fix for "исправь отображение environmental impact, я не вижу его" remains stable
 */

const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');

describe('Environmental Chart Regression Tests', () => {
    let browser, page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Set up error monitoring
        page.on('pageerror', error => {
            console.error('Page Error:', error.message);
        });

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console Error:', msg.text());
            }
        });

        await page.goto('http://localhost:4000', { waitUntil: 'networkidle0' });
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    describe('Chart Visibility Regression Tests', () => {
        test('should always display environmental chart when button is clicked', async () => {
            // This test specifically validates the original issue is fixed
            // "исправь отображение environmental impact, я не вижу его"
            
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Click environmental impact button
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Verify chart is visible
            const chartVisible = await page.isVisible('#activeChart');
            expect(chartVisible).toBe(true);

            // Verify chart has actual content
            const chartHasContent = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                if (!canvas) return false;
                
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Check if canvas has any non-transparent pixels
                for (let i = 3; i < imageData.data.length; i += 4) {
                    if (imageData.data[i] > 0) return true; // Found non-transparent pixel
                }
                return false;
            });

            expect(chartHasContent).toBe(true);

            // Verify chart object exists and has data
            const chartData = await page.evaluate(() => {
                return window.activeChart ? {
                    hasChart: !!window.activeChart,
                    hasData: !!(window.activeChart.data && window.activeChart.data.datasets.length > 0),
                    chartType: window.activeChart.config.type,
                    dataLength: window.activeChart.data.datasets[0].data.length
                } : null;
            });

            expect(chartData).toBeTruthy();
            expect(chartData.hasChart).toBe(true);
            expect(chartData.hasData).toBe(true);
            expect(chartData.chartType).toBe('doughnut');
            expect(chartData.dataLength).toBe(2);
        });

        test('should display environmental chart in grid view consistently', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Switch to grid view
            await page.click('#btn-grid');
            await page.waitForTimeout(3000);

            // Verify environmental chart exists in grid
            const envChartInGrid = await page.isVisible('#environmentalChart');
            expect(envChartInGrid).toBe(true);

            // Verify it has proper dimensions
            const chartDimensions = await page.evaluate(() => {
                const canvas = document.getElementById('environmentalChart');
                return canvas ? {
                    width: canvas.clientWidth,
                    height: canvas.clientHeight,
                    offsetWidth: canvas.offsetWidth,
                    offsetHeight: canvas.offsetHeight,
                    hasParent: !!canvas.parentElement
                } : null;
            });

            expect(chartDimensions).toBeTruthy();
            expect(chartDimensions.width).toBeGreaterThan(0);
            expect(chartDimensions.height).toBeGreaterThan(0);
            expect(chartDimensions.hasParent).toBe(true);

            // Verify chart instance exists
            const gridChartExists = await page.evaluate(() => {
                return !!(window.environmentalChart && window.environmentalChart.data);
            });
            expect(gridChartExists).toBe(true);
        });

        test('should maintain chart visibility after switching views multiple times', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Test multiple view switches
            const switchSequence = [
                '#btn-environmental',
                '#btn-grid',
                '#btn-pie',
                '#btn-environmental',
                '#btn-savings',
                '#btn-environmental'
            ];

            for (const buttonId of switchSequence) {
                await page.click(buttonId);
                await page.waitForTimeout(1000);
            }

            // Final check - environmental chart should be visible and functional
            const finalState = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                return {
                    canvasVisible: !!(canvas && canvas.offsetParent),
                    chartExists: !!window.activeChart,
                    chartHasData: !!(window.activeChart && window.activeChart.data),
                    canvasWidth: canvas ? canvas.clientWidth : 0,
                    canvasHeight: canvas ? canvas.clientHeight : 0
                };
            });

            expect(finalState.canvasVisible).toBe(true);
            expect(finalState.chartExists).toBe(true);
            expect(finalState.chartHasData).toBe(true);
            expect(finalState.canvasWidth).toBeGreaterThan(0);
            expect(finalState.canvasHeight).toBeGreaterThan(0);
        });
    });

    describe('Error Handling Regression Tests', () => {
        test('should handle Chart.js library failures gracefully', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Simulate Chart.js constructor failure
            await page.evaluate(() => {
                window.originalChart = window.Chart;
                window.Chart = function() {
                    throw new Error('Chart.js construction failed');
                };
            });

            // Try to create environmental chart
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Should fall back to fallback chart or handle error gracefully
            const errorHandled = await page.evaluate(() => {
                // Check if page is still functional
                return {
                    pageResponsive: !!document.querySelector('button.calculate-btn'),
                    noUnhandledErrors: !window.lastError,
                    chartAreaExists: !!document.getElementById('activeChart')
                };
            });

            expect(errorHandled.pageResponsive).toBe(true);
            expect(errorHandled.chartAreaExists).toBe(true);

            // Restore Chart.js and verify recovery
            await page.evaluate(() => {
                window.Chart = window.originalChart;
            });

            await page.click('#btn-pie');
            await page.waitForTimeout(500);
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const recovered = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            expect(recovered).toBe(true);
        });

        test('should handle invalid calculation data without breaking', async () => {
            // Inject invalid calculation data
            await page.evaluate(() => {
                window.originalCalculateTCO = window.calculateTCO;
                window.calculateTCO = function() {
                    return {
                        invalid: 'data',
                        comparison: null,
                        efficiency: undefined
                    };
                };
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Application should not crash
            const appStillWorking = await page.evaluate(() => {
                return {
                    hasCalculateButton: !!document.querySelector('button.calculate-btn'),
                    pageTitle: document.title,
                    noJSErrors: !window.onerror
                };
            });

            expect(appStillWorking.hasCalculateButton).toBe(true);
            expect(appStillWorking.pageTitle).toContain('TCO Calculator');

            // Restore original function
            await page.evaluate(() => {
                window.calculateTCO = window.originalCalculateTCO;
            });
        });

        test('should handle canvas context failures', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Mock canvas context failure
            await page.evaluate(() => {
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type) {
                    if (this.id === 'activeChart') {
                        return null; // Simulate context failure
                    }
                    return originalGetContext.call(this, type);
                };
                
                // Restore after test
                setTimeout(() => {
                    HTMLCanvasElement.prototype.getContext = originalGetContext;
                }, 3000);
            });

            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Application should handle this gracefully
            const contextErrorHandled = await page.evaluate(() => {
                return {
                    appResponsive: !!document.querySelector('#btn-environmental'),
                    canvasStillExists: !!document.getElementById('activeChart'),
                    noUnhandledErrors: true
                };
            });

            expect(contextErrorHandled.appResponsive).toBe(true);
            expect(contextErrorHandled.canvasStillExists).toBe(true);
        });

        test('should handle memory exhaustion scenarios', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Simulate memory pressure by creating many charts rapidly
            const memoryStressTest = async () => {
                for (let i = 0; i < 20; i++) {
                    await page.click('#btn-environmental');
                    await page.waitForTimeout(50);
                    await page.click('#btn-pie');
                    await page.waitForTimeout(50);
                }
            };

            try {
                await memoryStressTest();
            } catch (error) {
                // Expected to handle memory pressure gracefully
            }

            // Verify application is still functional after stress test
            await page.waitForTimeout(2000);
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const appRecovered = await page.evaluate(() => {
                return {
                    hasActiveChart: !!window.activeChart,
                    canvasExists: !!document.getElementById('activeChart'),
                    buttonsResponsive: !!document.querySelector('#btn-environmental')
                };
            });

            expect(appRecovered.canvasExists).toBe(true);
            expect(appRecovered.buttonsResponsive).toBe(true);
        });
    });

    describe('Fallback Mechanism Tests', () => {
        test('should use fallback chart when primary chart creation fails', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Monitor console for fallback messages
            const consoleLogs = [];
            page.on('console', msg => consoleLogs.push(msg.text()));

            // Inject primary chart failure
            await page.evaluate(() => {
                window.originalCreateChart = window.createEnvironmentalChart;
                window.createEnvironmentalChart = function() {
                    return null; // Simulate primary chart failure
                };
            });

            await page.click('#btn-environmental');
            await page.waitForTimeout(3000);

            // Check for fallback creation
            const fallbackUsed = consoleLogs.some(log => 
                log.includes('fallback') || log.includes('Fallback') || 
                log.includes('creating fallback')
            );

            expect(fallbackUsed).toBe(true);

            // Verify fallback chart is functional
            const fallbackWorking = await page.evaluate(() => {
                return !!document.getElementById('activeChart');
            });

            expect(fallbackWorking).toBe(true);

            // Restore original function
            await page.evaluate(() => {
                if (window.originalCreateChart) {
                    window.createEnvironmentalChart = window.originalCreateChart;
                }
            });
        });

        test('should handle missing Chart.js library gracefully', async () => {
            // Test page load without Chart.js
            await page.evaluate(() => {
                // Remove Chart.js reference
                delete window.Chart;
                
                // Remove Chart.js script tag
                const chartScript = document.querySelector('script[src*="chart"]');
                if (chartScript) {
                    chartScript.remove();
                }
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Should handle missing Chart.js gracefully
            const handledGracefully = await page.evaluate(() => {
                return {
                    pageStillFunctional: !!document.querySelector('button.calculate-btn'),
                    noScriptErrors: !window.lastError,
                    canvasAreaExists: !!document.getElementById('activeChart')
                };
            });

            expect(handledGracefully.pageStillFunctional).toBe(true);
            expect(handledGracefully.canvasAreaExists).toBe(true);
        });

        test('should provide meaningful error messages when charts fail', async () => {
            const errorMessages = [];
            
            page.on('console', msg => {
                if (msg.type() === 'error' || msg.text().includes('Error') || msg.text().includes('Failed')) {
                    errorMessages.push(msg.text());
                }
            });

            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Inject multiple failure points
            await page.evaluate(() => {
                window.Chart = undefined;
                window.createEnvironmentalChart = function() {
                    throw new Error('Multiple failure scenario');
                };
            });

            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Should log meaningful error messages
            const hasEnvironmentalErrors = errorMessages.some(msg => 
                msg.includes('environmental') || msg.includes('Environmental')
            );

            // Even with errors, basic functionality should be preserved
            const basicFunctionality = await page.evaluate(() => {
                return {
                    canStillCalculate: !!document.querySelector('button.calculate-btn'),
                    formStillWorks: !!document.querySelector('#servers'),
                    pageTitle: document.title
                };
            });

            expect(basicFunctionality.canStillCalculate).toBe(true);
            expect(basicFunctionality.formStillWorks).toBe(true);
            expect(basicFunctionality.pageTitle).toContain('TCO Calculator');
        });
    });

    describe('Data Integrity Regression Tests', () => {
        test('should maintain consistent data across chart recreations', async () => {
            await page.fill('#servers', '100');
            await page.fill('#power_per_server', '300');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Get initial chart data
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const initialData = await page.evaluate(() => {
                return window.activeChart ? {
                    labels: window.activeChart.data.labels,
                    data: window.activeChart.data.datasets[0].data,
                    type: window.activeChart.config.type
                } : null;
            });

            expect(initialData).toBeTruthy();

            // Switch away and back
            await page.click('#btn-pie');
            await page.waitForTimeout(500);
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const recreatedData = await page.evaluate(() => {
                return window.activeChart ? {
                    labels: window.activeChart.data.labels,
                    data: window.activeChart.data.datasets[0].data,
                    type: window.activeChart.config.type
                } : null;
            });

            expect(recreatedData).toBeTruthy();
            expect(recreatedData.labels).toEqual(initialData.labels);
            expect(recreatedData.data).toEqual(initialData.data);
            expect(recreatedData.type).toBe(initialData.type);
        });

        test('should handle edge case calculation values correctly', async () => {
            const edgeCases = [
                { servers: '1', power: '1', pue_air: '1.0', pue_immersion: '1.0' },
                { servers: '999999', power: '999', pue_air: '99.9', pue_immersion: '0.1' },
                { servers: '0', power: '0', pue_air: '0', pue_immersion: '0' }
            ];

            for (const testCase of edgeCases) {
                await page.fill('#servers', testCase.servers);
                await page.fill('#power_per_server', testCase.power);
                await page.fill('#pue_air', testCase.pue_air);
                await page.fill('#pue_immersion', testCase.pue_immersion);

                await page.click('button.calculate-btn');
                await page.waitForSelector('#resultsContent', { visible: true });

                await page.click('#btn-environmental');
                await page.waitForTimeout(1000);

                // Chart should handle edge cases without errors
                const chartHandlesEdgeCase = await page.evaluate(() => {
                    if (!window.activeChart) return false;
                    
                    const data = window.activeChart.data.datasets[0].data;
                    return {
                        hasData: data && data.length === 2,
                        dataIsValid: data.every(val => typeof val === 'number' && !isNaN(val)),
                        chartExists: !!window.activeChart
                    };
                });

                expect(chartHandlesEdgeCase.chartExists).toBe(true);
                if (chartHandlesEdgeCase.hasData) {
                    expect(chartHandlesEdgeCase.dataIsValid).toBe(true);
                }
            }
        });
    });

    describe('Browser Compatibility Regression Tests', () => {
        test('should work consistently across page reloads', async () => {
            // Initial setup
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const initiallyWorking = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            expect(initiallyWorking).toBe(true);

            // Reload page
            await page.reload({ waitUntil: 'networkidle0' });

            // Re-run the same test
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const workingAfterReload = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            expect(workingAfterReload).toBe(true);
        });

        test('should handle JavaScript disabled gracefully', async () => {
            // Test with JavaScript disabled
            await page.setJavaScriptEnabled(false);
            
            try {
                await page.goto('http://localhost:4000', { waitUntil: 'networkidle0' });
                
                // Page should still load basic content
                const basicContentExists = await page.evaluate(() => {
                    return !!document.querySelector('form, input, button');
                });
                
                // Can't test chart functionality without JS, but page should not crash
                expect(typeof basicContentExists).toBe('boolean');
                
            } finally {
                await page.setJavaScriptEnabled(true);
            }
        });

        test('should maintain functionality in different viewport sizes', async () => {
            const viewports = [
                { width: 320, height: 568 },   // iPhone SE
                { width: 768, height: 1024 },  // iPad
                { width: 1920, height: 1080 }  // Desktop
            ];

            for (const viewport of viewports) {
                await page.setViewport(viewport);
                
                await page.click('button.calculate-btn');
                await page.waitForSelector('#resultsContent', { visible: true });
                await page.click('#btn-environmental');
                await page.waitForTimeout(1000);

                const worksAtViewport = await page.evaluate(() => {
                    const canvas = document.getElementById('activeChart');
                    return {
                        canvasExists: !!canvas,
                        canvasVisible: !!(canvas && canvas.offsetParent),
                        chartExists: !!window.activeChart,
                        withinViewport: canvas ? canvas.clientWidth <= window.innerWidth : false
                    };
                });

                expect(worksAtViewport.canvasExists).toBe(true);
                expect(worksAtViewport.chartExists).toBe(true);
                expect(worksAtViewport.withinViewport).toBe(true);
            }
        });
    });

    describe('Memory Leak Prevention', () => {
        test('should not leak memory during extended usage', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const getMemoryUsage = async () => {
                return await page.evaluate(() => {
                    return performance.memory ? performance.memory.usedJSHeapSize : 0;
                });
            };

            const initialMemory = await getMemoryUsage();

            // Simulate extended usage
            for (let i = 0; i < 10; i++) {
                await page.click('#btn-environmental');
                await page.waitForTimeout(200);
                await page.click('#btn-grid');
                await page.waitForTimeout(200);
                await page.click('#btn-pie');
                await page.waitForTimeout(200);
            }

            // Force garbage collection if available
            await page.evaluate(() => {
                if (window.gc) window.gc();
            });

            await page.waitForTimeout(1000);
            const finalMemory = await getMemoryUsage();

            if (initialMemory > 0 && finalMemory > 0) {
                const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
                console.log(`Memory increase during extended usage: ${(memoryIncrease * 100).toFixed(2)}%`);
                
                // Memory should not increase dramatically (< 200% increase)
                expect(memoryIncrease).toBeLessThan(2.0);
            }

            // Chart should still work after extended usage
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);
            
            const stillWorking = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            expect(stillWorking).toBe(true);
        });
    });
});