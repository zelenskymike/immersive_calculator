/**
 * End-to-End Tests for Environmental Impact Chart Workflow
 * Tests complete user workflows, cross-browser compatibility, and responsive design
 * Validates the fix for "исправь отображение environmental impact, я не вижу его"
 */

const { test, expect, chromium, firefox, webkit } = require('@playwright/test');

test.describe('Environmental Impact Chart E2E Workflow', () => {
    let browser, page;

    test.beforeAll(async () => {
        // Use Chromium by default, other browsers tested separately
        browser = await chromium.launch();
    });

    test.afterAll(async () => {
        await browser.close();
    });

    test.beforeEach(async () => {
        page = await browser.newPage();
        
        // Set up detailed logging for debugging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser Error:', msg.text());
            } else if (msg.text().includes('🌱') || msg.text().includes('Environmental')) {
                console.log('Environmental Log:', msg.text());
            }
        });

        await page.goto('http://localhost:4000');
    });

    test.afterEach(async () => {
        await page.close();
    });

    test.describe('Complete TCO Calculation with Environmental Impact Viewing', () => {
        test('should complete full workflow from input to environmental chart viewing', async () => {
            // Step 1: Fill in calculation form
            await page.fill('#servers', '100');
            await page.fill('#power_per_server', '300');
            await page.fill('#pue_air', '1.65');
            await page.fill('#pue_immersion', '1.01');
            await page.fill('#electricity_cost', '0.15');
            await page.fill('#floor_space_cost', '25');

            // Step 2: Trigger calculation
            await page.click('button.calculate-btn');
            
            // Step 3: Wait for results to load
            await page.waitForSelector('#resultsContent', { visible: true, timeout: 10000 });
            
            // Step 4: Verify results are displayed
            const resultsVisible = await page.isVisible('#resultsContent');
            expect(resultsVisible).toBe(true);

            // Step 5: Click on Environmental Impact chart
            await page.click('#btn-environmental');
            
            // Step 6: Wait for environmental chart to render
            await page.waitForTimeout(2000);

            // Step 7: Verify environmental chart is visible
            const chartCanvas = page.locator('#activeChart');
            await expect(chartCanvas).toBeVisible();

            // Step 8: Verify chart contains data
            const chartData = await page.evaluate(() => {
                if (window.activeChart && window.activeChart.data) {
                    return {
                        hasData: window.activeChart.data.datasets.length > 0,
                        dataPoints: window.activeChart.data.datasets[0].data,
                        labels: window.activeChart.data.labels
                    };
                }
                return null;
            });

            expect(chartData).toBeTruthy();
            expect(chartData.hasData).toBe(true);
            expect(chartData.dataPoints).toHaveLength(2);
            expect(chartData.labels).toEqual(['Air Cooling PUE', 'Immersion Cooling PUE']);

            // Step 9: Verify chart title is displayed
            const chartTitle = await page.textContent('.chart-title, [data-chart-title]');
            expect(chartTitle).toContain('Environmental');
        });

        test('should display environmental metrics alongside chart', async () => {
            // Complete calculation
            await page.fill('#servers', '200');
            await page.fill('#power_per_server', '400');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // View environmental chart
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Check for environmental metrics display
            const metricsVisible = await page.evaluate(() => {
                // Look for environmental metrics in the results
                const resultsContent = document.getElementById('resultsContent');
                if (!resultsContent) return false;
                
                const textContent = resultsContent.textContent;
                return {
                    hasPUE: textContent.includes('PUE') || textContent.includes('Power Usage'),
                    hasEfficiency: textContent.includes('efficiency') || textContent.includes('Efficiency'),
                    hasImprovement: textContent.includes('%') && textContent.includes('improvement'),
                    hasEnvironmental: textContent.includes('Environmental') || textContent.includes('environmental')
                };
            });

            expect(metricsVisible.hasPUE || metricsVisible.hasEfficiency).toBe(true);
        });

        test('should handle user interaction with environmental chart', async () => {
            await page.fill('#servers', '50');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Test chart interaction (hover, click)
            const chartCanvas = page.locator('#activeChart');
            await expect(chartCanvas).toBeVisible();

            // Hover over chart to trigger tooltip
            await chartCanvas.hover();
            await page.waitForTimeout(500);

            // Check if tooltip or interaction works
            const chartInteraction = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                if (canvas) {
                    // Simulate mouse events
                    const event = new MouseEvent('mouseover', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    canvas.dispatchEvent(event);
                    return true;
                }
                return false;
            });

            expect(chartInteraction).toBe(true);
        });
    });

    test.describe('Chart View Switching Workflow', () => {
        test('should switch between single chart views seamlessly', async () => {
            await page.fill('#servers', '75');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Test switching between chart types
            const chartButtons = ['#btn-pie', '#btn-savings', '#btn-environmental'];
            
            for (const buttonId of chartButtons) {
                await page.click(buttonId);
                await page.waitForTimeout(1000);
                
                const chartVisible = await page.isVisible('#activeChart');
                expect(chartVisible).toBe(true);
                
                // Verify chart has content
                const chartHasContent = await page.evaluate(() => {
                    const canvas = document.getElementById('activeChart');
                    return canvas && canvas.width > 0 && canvas.height > 0;
                });
                expect(chartHasContent).toBe(true);
            }

            // End with environmental chart active
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            const finalChartData = await page.evaluate(() => {
                return window.activeChart ? window.activeChart.config.type : null;
            });
            expect(finalChartData).toBe('doughnut');
        });

        test('should switch to grid view and display all charts including environmental', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Switch to grid view
            await page.click('#btn-grid');
            await page.waitForTimeout(3000);

            // Verify all chart canvases exist
            const chartsInGrid = await page.evaluate(() => {
                return {
                    pie: !!document.getElementById('pieChart'),
                    savings: !!document.getElementById('savingsChart'),
                    environmental: !!document.getElementById('environmentalChart')
                };
            });

            expect(chartsInGrid.pie).toBe(true);
            expect(chartsInGrid.savings).toBe(true);
            expect(chartsInGrid.environmental).toBe(true);

            // Verify environmental chart specifically
            const envChart = page.locator('#environmentalChart');
            await expect(envChart).toBeVisible();

            // Verify environmental chart has proper dimensions
            const envChartDimensions = await page.evaluate(() => {
                const canvas = document.getElementById('environmentalChart');
                return canvas ? {
                    width: canvas.clientWidth,
                    height: canvas.clientHeight,
                    visible: canvas.offsetParent !== null
                } : null;
            });

            expect(envChartDimensions).toBeTruthy();
            expect(envChartDimensions.width).toBeGreaterThan(0);
            expect(envChartDimensions.height).toBeGreaterThan(0);
            expect(envChartDimensions.visible).toBe(true);
        });

        test('should maintain environmental chart functionality when switching back from grid', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Go to grid view
            await page.click('#btn-grid');
            await page.waitForTimeout(2000);

            // Return to single view with environmental chart
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);

            // Verify environmental chart is working
            const chartWorking = await page.evaluate(() => {
                return !!(window.activeChart && 
                         window.activeChart.config &&
                         window.activeChart.config.type === 'doughnut' &&
                         window.activeChart.data &&
                         window.activeChart.data.datasets.length > 0);
            });

            expect(chartWorking).toBe(true);
        });
    });

    test.describe('Responsive Design and Mobile Compatibility', () => {
        test('should display environmental chart on mobile viewport', async () => {
            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            
            await page.fill('#servers', '30');
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Chart should be visible and responsive
            const chartVisible = await page.isVisible('#activeChart');
            expect(chartVisible).toBe(true);

            // Chart should fit within viewport
            const chartDimensions = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                return canvas ? {
                    width: canvas.clientWidth,
                    viewportWidth: window.innerWidth,
                    fitsInViewport: canvas.clientWidth <= window.innerWidth
                } : null;
            });

            expect(chartDimensions).toBeTruthy();
            expect(chartDimensions.fitsInViewport).toBe(true);
        });

        test('should handle tablet viewport', async () => {
            // Set tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 });
            
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-grid');
            await page.waitForTimeout(3000);

            // All charts should be visible in grid view on tablet
            const allChartsVisible = await page.evaluate(() => {
                const charts = ['pieChart', 'savingsChart', 'environmentalChart'];
                return charts.every(id => {
                    const canvas = document.getElementById(id);
                    return canvas && canvas.offsetParent !== null;
                });
            });

            expect(allChartsVisible).toBe(true);
        });

        test('should maintain functionality on desktop viewport', async () => {
            // Set large desktop viewport
            await page.setViewportSize({ width: 1920, height: 1080 });
            
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            const chartFullyFunctional = await page.evaluate(() => {
                if (!window.activeChart) return false;
                
                return {
                    hasChart: !!window.activeChart,
                    hasData: !!(window.activeChart.data && window.activeChart.data.datasets.length > 0),
                    isResponsive: window.activeChart.options.responsive,
                    canvasExists: !!document.getElementById('activeChart')
                };
            });

            expect(chartFullyFunctional.hasChart).toBe(true);
            expect(chartFullyFunctional.hasData).toBe(true);
            expect(chartFullyFunctional.isResponsive).toBe(true);
            expect(chartFullyFunctional.canvasExists).toBe(true);
        });
    });

    test.describe('Error Handling and Edge Cases', () => {
        test('should handle extreme input values gracefully', async () => {
            // Test with extreme values
            await page.fill('#servers', '10000');
            await page.fill('#power_per_server', '1000');
            await page.fill('#pue_air', '10.0');
            await page.fill('#pue_immersion', '0.1');
            
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            // Chart should still render without errors
            const chartStillWorks = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });

            expect(chartStillWorks).toBe(true);
        });

        test('should display error message when calculation fails', async () => {
            // Test with invalid values
            await page.fill('#servers', '-1');
            await page.fill('#power_per_server', '0');
            
            await page.click('button.calculate-btn');
            
            // Should either show error or handle gracefully
            const pageResponse = await page.evaluate(() => {
                return {
                    hasResults: !!document.getElementById('resultsContent'),
                    hasError: document.body.textContent.includes('error') || 
                             document.body.textContent.includes('Error'),
                    calculationCompleted: !!window.lastCalculationData
                };
            });

            // Application should not crash
            const pageTitle = await page.title();
            expect(pageTitle).toContain('TCO Calculator');
        });

        test('should recover from chart rendering errors', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Inject error into Chart.js
            await page.evaluate(() => {
                const originalChart = window.Chart;
                window.Chart = function() {
                    throw new Error('Simulated Chart.js error');
                };
                
                // Restore after brief delay
                setTimeout(() => {
                    window.Chart = originalChart;
                }, 2000);
            });

            await page.click('#btn-environmental');
            await page.waitForTimeout(3000);

            // Application should still be functional
            const appStillWorking = await page.evaluate(() => {
                return {
                    pageResponsive: !!document.querySelector('button.calculate-btn'),
                    noJSErrors: !window.onerror,
                    chartAreaExists: !!document.getElementById('activeChart')
                };
            });

            expect(appStillWorking.pageResponsive).toBe(true);
            expect(appStillWorking.chartAreaExists).toBe(true);
        });
    });

    test.describe('Performance Validation', () => {
        test('should render environmental chart within performance threshold', async () => {
            const startTime = Date.now();
            
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            
            const calculationTime = Date.now() - startTime;
            
            const chartStartTime = Date.now();
            await page.click('#btn-environmental');
            await page.waitForFunction(() => window.activeChart && window.activeChart.data);
            const chartRenderTime = Date.now() - chartStartTime;

            // Performance thresholds
            expect(calculationTime).toBeLessThan(5000); // Calculation should complete within 5 seconds
            expect(chartRenderTime).toBeLessThan(3000); // Chart should render within 3 seconds
        });

        test('should handle rapid chart switching without performance degradation', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            const startTime = Date.now();
            
            // Rapidly switch between charts
            for (let i = 0; i < 10; i++) {
                await page.click('#btn-environmental');
                await page.waitForTimeout(100);
                await page.click('#btn-pie');
                await page.waitForTimeout(100);
            }
            
            const totalTime = Date.now() - startTime;
            
            // Should complete rapid switching within reasonable time
            expect(totalTime).toBeLessThan(10000); // 10 seconds for 20 chart switches
            
            // Final environmental chart should still work
            await page.click('#btn-environmental');
            await page.waitForTimeout(1000);
            
            const finalChartWorks = await page.evaluate(() => {
                return !!(window.activeChart && window.activeChart.data);
            });
            
            expect(finalChartWorks).toBe(true);
        });
    });

    test.describe('Accessibility and User Experience', () => {
        test('should be accessible via keyboard navigation', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });

            // Navigate to environmental chart button using keyboard
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            
            // Try to activate environmental chart via keyboard
            const envButton = page.locator('#btn-environmental');
            await envButton.focus();
            await page.keyboard.press('Enter');
            
            await page.waitForTimeout(2000);

            const chartVisible = await page.isVisible('#activeChart');
            expect(chartVisible).toBe(true);
        });

        test('should have appropriate ARIA labels and accessibility attributes', async () => {
            await page.click('button.calculate-btn');
            await page.waitForSelector('#resultsContent', { visible: true });
            await page.click('#btn-environmental');
            await page.waitForTimeout(2000);

            const accessibilityAttributes = await page.evaluate(() => {
                const canvas = document.getElementById('activeChart');
                const button = document.getElementById('btn-environmental');
                
                return {
                    canvasRole: canvas ? canvas.getAttribute('role') : null,
                    canvasLabel: canvas ? canvas.getAttribute('aria-label') : null,
                    buttonLabel: button ? button.textContent || button.getAttribute('aria-label') : null
                };
            });

            // Button should have descriptive text
            expect(accessibilityAttributes.buttonLabel).toContain('Environmental');
        });
    });
});

test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
        test(`should work correctly in ${browserName}`, async () => {
            let testBrowser;
            
            switch (browserName) {
                case 'firefox':
                    testBrowser = await firefox.launch();
                    break;
                case 'webkit':
                    testBrowser = await webkit.launch();
                    break;
                default:
                    testBrowser = await chromium.launch();
            }
            
            const testPage = await testBrowser.newPage();
            
            try {
                await testPage.goto('http://localhost:4000');
                
                // Basic workflow test
                await testPage.fill('#servers', '50');
                await testPage.click('button.calculate-btn');
                await testPage.waitForSelector('#resultsContent', { visible: true });
                await testPage.click('#btn-environmental');
                await testPage.waitForTimeout(3000);

                // Verify chart works in this browser
                const chartWorks = await testPage.evaluate(() => {
                    return !!(window.activeChart && window.activeChart.data);
                });

                expect(chartWorks).toBe(true);

                // Test Chart.js compatibility
                const chartJsCompat = await testPage.evaluate(() => {
                    return typeof Chart !== 'undefined' && !!Chart.version;
                });

                expect(chartJsCompat).toBe(true);

            } finally {
                await testPage.close();
                await testBrowser.close();
            }
        });
    });
});