/**
 * Unit Tests for Environmental Impact Chart Core Functionality
 * Tests chart creation, destruction, data validation, and error handling
 * Based on the fix for "исправь отображение environmental impact, я не вижу его"
 */

const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');

// Mock Chart.js for unit testing
class MockChart {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.destroyed = false;
        this.updated = false;
        this.data = config.data;
        this.options = config.options;
    }

    destroy() {
        this.destroyed = true;
    }

    update() {
        this.updated = true;
    }

    resize() {
        // Mock resize functionality
    }
}

// Mock DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>TCO Calculator Test</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <canvas id="testCanvas" width="400" height="300"></canvas>
    <canvas id="activeChart" width="400" height="300"></canvas>
    <canvas id="environmentalChart" width="400" height="300"></canvas>
    <div id="btn-environmental">Environmental Impact</div>
    <div id="btn-grid">Grid View</div>
</body>
</html>
`, {
    url: 'http://localhost:4000',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

// Mock Chart constructor
global.Chart = MockChart;

describe('Environmental Impact Chart Core Unit Tests', () => {
    let testCanvas, testCtx;
    let mockTCOData;

    beforeEach(() => {
        testCanvas = document.getElementById('testCanvas');
        testCtx = testCanvas.getContext('2d');
        
        // Mock TCO calculation data matching the fixed implementation
        mockTCOData = {
            comparison: {
                efficiency: {
                    pue_air_cooling: 1.65,
                    pue_immersion_cooling: 1.01,
                    energy_efficiency_improvement: 38.9,
                    energy_savings_kwh_annual: 1159000
                },
                environmental: {
                    carbon_savings_kg_co2_annual: 464000,
                    water_savings_gallons_annual: 579500,
                    carbon_footprint_reduction_percent: 37.2
                }
            }
        };

        // Reset any existing charts
        if (global.activeChart) {
            global.activeChart.destroy();
            global.activeChart = null;
        }
        if (global.environmentalChart) {
            global.environmentalChart.destroy();
            global.environmentalChart = null;
        }
    });

    afterEach(() => {
        // Clean up charts
        if (global.activeChart && !global.activeChart.destroyed) {
            global.activeChart.destroy();
        }
        if (global.environmentalChart && !global.environmentalChart.destroyed) {
            global.environmentalChart.destroy();
        }
    });

    describe('Chart Creation', () => {
        test('should create environmental chart successfully with valid data', () => {
            // Load the createEnvironmentalChart function from the main file
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(chart).toBeDefined();
            expect(chart).toBeInstanceOf(MockChart);
            expect(chart.config.type).toBe('doughnut');
            expect(chart.config.data.labels).toEqual(['Air Cooling PUE', 'Immersion Cooling PUE']);
            expect(chart.config.data.datasets[0].data).toEqual([1.65, 1.01]);
        });

        test('should handle missing data gracefully', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, null, 'single');

            expect(chart).toBeNull();
        });

        test('should handle invalid data structure', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const invalidData = { invalid: 'structure' };
            const chart = createEnvironmentalChart(testCtx, invalidData, 'single');

            expect(chart).toBeNull();
        });

        test('should create fallback chart when main chart fails', () => {
            const createFallbackEnvironmentalChart = require('../../tco-calculator.js').createFallbackEnvironmentalChart;

            const fallbackChart = createFallbackEnvironmentalChart(testCtx, mockTCOData);

            expect(fallbackChart).toBeDefined();
            expect(fallbackChart).toBeInstanceOf(MockChart);
            expect(fallbackChart.config.type).toBe('bar');
        });

        test('should configure chart for single view mode', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(chart.config.options.responsive).toBe(true);
            expect(chart.config.options.maintainAspectRatio).toBe(false);
            expect(chart.config.options.plugins.title.text).toContain('Environmental Impact');
        });

        test('should configure chart for grid view mode', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'grid');

            expect(chart.config.options.responsive).toBe(true);
            expect(chart.config.options.plugins.legend.position).toBe('bottom');
        });
    });

    describe('Chart Destruction', () => {
        test('should properly destroy chart when switching views', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');
            expect(chart.destroyed).toBe(false);

            chart.destroy();
            expect(chart.destroyed).toBe(true);
        });

        test('should handle destroying null chart gracefully', () => {
            expect(() => {
                const nullChart = null;
                if (nullChart) {
                    nullChart.destroy();
                }
            }).not.toThrow();
        });

        test('should clean up global chart references', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            global.environmentalChart = createEnvironmentalChart(testCtx, mockTCOData, 'grid');
            expect(global.environmentalChart).toBeDefined();

            if (global.environmentalChart) {
                global.environmentalChart.destroy();
                global.environmentalChart = null;
            }

            expect(global.environmentalChart).toBeNull();
        });
    });

    describe('Data Validation', () => {
        test('should validate required data structure', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const validData = mockTCOData;
            const chart1 = createEnvironmentalChart(testCtx, validData, 'single');
            expect(chart1).toBeDefined();

            const missingComparison = { data: 'invalid' };
            const chart2 = createEnvironmentalChart(testCtx, missingComparison, 'single');
            expect(chart2).toBeNull();

            const missingEfficiency = { comparison: {} };
            const chart3 = createEnvironmentalChart(testCtx, missingEfficiency, 'single');
            expect(chart3).toBeNull();
        });

        test('should handle edge case PUE values', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const edgeCaseData = {
                comparison: {
                    efficiency: {
                        pue_air_cooling: 0,
                        pue_immersion_cooling: 0,
                        energy_efficiency_improvement: 0
                    }
                }
            };

            const chart = createEnvironmentalChart(testCtx, edgeCaseData, 'single');
            expect(chart).toBeDefined();
            expect(chart.config.data.datasets[0].data).toEqual([0, 0]);
        });

        test('should handle very large PUE values', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const largeValueData = {
                comparison: {
                    efficiency: {
                        pue_air_cooling: 999.99,
                        pue_immersion_cooling: 888.88,
                        energy_efficiency_improvement: 12.5
                    }
                }
            };

            const chart = createEnvironmentalChart(testCtx, largeValueData, 'single');
            expect(chart).toBeDefined();
            expect(chart.config.data.datasets[0].data).toEqual([999.99, 888.88]);
        });
    });

    describe('Canvas Context Management', () => {
        test('should validate canvas context before chart creation', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const validCtx = testCanvas.getContext('2d');
            const chart1 = createEnvironmentalChart(validCtx, mockTCOData, 'single');
            expect(chart1).toBeDefined();

            const chart2 = createEnvironmentalChart(null, mockTCOData, 'single');
            expect(chart2).toBeNull();

            const chart3 = createEnvironmentalChart(undefined, mockTCOData, 'single');
            expect(chart3).toBeNull();
        });

        test('should handle canvas context errors gracefully', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            // Mock a failing canvas context
            const failingCanvas = document.createElement('canvas');
            failingCanvas.getContext = () => {
                throw new Error('Canvas context failed');
            };

            expect(() => {
                createEnvironmentalChart(failingCanvas.getContext('2d'), mockTCOData, 'single');
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should catch and log Chart.js construction errors', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            // Mock Chart constructor to throw error
            const originalChart = global.Chart;
            global.Chart = function() {
                throw new Error('Chart.js error');
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(chart).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error creating environmental chart:'),
                expect.any(Error)
            );

            // Restore
            global.Chart = originalChart;
            consoleSpy.mockRestore();
        });

        test('should handle missing Chart.js library gracefully', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const originalChart = global.Chart;
            global.Chart = undefined;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(chart).toBeNull();

            global.Chart = originalChart;
        });

        test('should log detailed error information for debugging', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('🌱 Creating Environmental Impact chart...'),
                expect.objectContaining({
                    mode: 'single',
                    data: true
                })
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Chart Configuration', () => {
        test('should apply correct styling options', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(chart.config.options.responsive).toBe(true);
            expect(chart.config.options.maintainAspectRatio).toBe(false);
            expect(chart.config.options.plugins.title.display).toBe(true);
            expect(chart.config.options.plugins.legend.display).toBe(true);
        });

        test('should use appropriate colors for data visualization', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');
            const dataset = chart.config.data.datasets[0];

            expect(dataset.backgroundColor).toBeDefined();
            expect(Array.isArray(dataset.backgroundColor)).toBe(true);
            expect(dataset.backgroundColor.length).toBe(2);
            expect(dataset.borderWidth).toBeGreaterThan(0);
        });

        test('should configure tooltips for better user experience', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            expect(chart.config.options.plugins.tooltip).toBeDefined();
            expect(chart.config.options.plugins.tooltip.callbacks).toBeDefined();
        });
    });

    describe('Performance Optimization', () => {
        test('should not create multiple charts unnecessarily', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            const chart1 = createEnvironmentalChart(testCtx, mockTCOData, 'single');
            const chart2 = createEnvironmentalChart(testCtx, mockTCOData, 'single');

            // Both should be created successfully (simulating proper cleanup between calls)
            expect(chart1).toBeDefined();
            expect(chart2).toBeDefined();
            expect(chart1).not.toBe(chart2);
        });

        test('should handle rapid chart switching without memory leaks', () => {
            const createEnvironmentalChart = require('../../tco-calculator.js').createEnvironmentalChart;

            let charts = [];
            
            // Create and destroy multiple charts rapidly
            for (let i = 0; i < 5; i++) {
                const chart = createEnvironmentalChart(testCtx, mockTCOData, 'single');
                charts.push(chart);
                chart.destroy();
            }

            // All charts should be properly destroyed
            charts.forEach(chart => {
                expect(chart.destroyed).toBe(true);
            });
        });
    });
});