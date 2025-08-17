/**
 * Environmental Impact Chart Test Suite Configuration
 * Centralized configuration for all environmental chart tests
 */

module.exports = {
    // Test Suite Information
    name: 'Environmental Impact Chart Test Suite',
    version: '1.0.0',
    description: 'Comprehensive test suite for Environmental Impact chart display fix',
    
    // Test Environment Configuration
    environment: {
        baseUrl: 'http://localhost:4000',
        testPort: 4001,
        headless: process.env.CI === 'true',
        slowMo: process.env.DEBUG === 'true' ? 250 : 0,
        timeout: 30000,
        retries: process.env.CI === 'true' ? 2 : 0
    },

    // Browser Configuration
    browsers: {
        chromium: {
            enabled: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--enable-precise-memory-info',
                '--disable-web-security',
                '--disable-features=TranslateUI'
            ]
        },
        firefox: {
            enabled: true,
            firefoxUserPrefs: {
                'media.navigator.streams.fake': true
            }
        },
        webkit: {
            enabled: true
        }
    },

    // Test Categories
    testCategories: {
        unit: {
            pattern: '**/unit/**/*.test.js',
            framework: 'jest',
            timeout: 5000,
            coverage: true
        },
        integration: {
            pattern: '**/integration/**/*.test.js',
            framework: 'jest',
            timeout: 15000,
            coverage: true
        },
        e2e: {
            pattern: '**/e2e/**/*.spec.js',
            framework: 'playwright',
            timeout: 30000,
            coverage: false
        },
        performance: {
            pattern: '**/performance/**/*.test.js',
            framework: 'jest',
            timeout: 60000,
            coverage: false
        },
        regression: {
            pattern: '**/regression/**/*.test.js',
            framework: 'jest',
            timeout: 30000,
            coverage: false
        }
    },

    // Test Data Configuration
    testData: {
        defaultCalculation: {
            servers: '100',
            power_per_server: '300',
            pue_air: '1.65',
            pue_immersion: '1.01',
            electricity_cost: '0.15',
            floor_space_cost: '25'
        },
        edgeCases: {
            minimal: {
                servers: '1',
                power_per_server: '1',
                pue_air: '1.0',
                pue_immersion: '1.0'
            },
            extreme: {
                servers: '10000',
                power_per_server: '1000',
                pue_air: '10.0',
                pue_immersion: '0.1'
            },
            invalid: {
                servers: '-1',
                power_per_server: '0',
                pue_air: '0',
                pue_immersion: '0'
            }
        }
    },

    // Performance Thresholds
    performance: {
        chartCreationTime: 2000,     // milliseconds
        pageLoadTime: 10000,         // milliseconds
        memoryIncrease: 50,          // MB
        frameRate: 30,               // FPS
        rapidSwitchingTime: 5000     // milliseconds
    },

    // Coverage Configuration
    coverage: {
        threshold: {
            global: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80
            }
        },
        exclude: [
            '**/node_modules/**',
            '**/tests/**',
            '**/coverage/**',
            '**/*.config.js'
        ]
    },

    // Reporting Configuration
    reporting: {
        outputDir: './test-results',
        formats: ['json', 'html', 'lcov'],
        screenshots: {
            mode: 'only-on-failure',
            fullPage: true
        },
        video: {
            mode: 'retain-on-failure',
            size: { width: 1280, height: 720 }
        }
    },

    // Test Selectors (DOM elements)
    selectors: {
        buttons: {
            calculate: 'button.calculate-btn',
            environmental: '#btn-environmental',
            pie: '#btn-pie',
            savings: '#btn-savings',
            grid: '#btn-grid'
        },
        charts: {
            active: '#activeChart',
            environmental: '#environmentalChart',
            pie: '#pieChart',
            savings: '#savingsChart'
        },
        forms: {
            servers: '#servers',
            powerPerServer: '#power_per_server',
            pueAir: '#pue_air',
            pueImmersion: '#pue_immersion',
            electricityCost: '#electricity_cost',
            floorSpaceCost: '#floor_space_cost'
        },
        results: {
            content: '#resultsContent',
            container: '.results-container'
        }
    },

    // Expected Chart Properties
    expectedChart: {
        type: 'doughnut',
        labels: ['Air Cooling PUE', 'Immersion Cooling PUE'],
        datasetCount: 1,
        dataPointCount: 2,
        colors: {
            count: 2,
            borderWidth: 2
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: /Environmental.*Impact/i
                },
                legend: {
                    display: true
                }
            }
        }
    },

    // Debug Configuration
    debug: {
        enabled: process.env.DEBUG === 'true',
        consoleLogging: true,
        screenshotOnError: true,
        savePageHTML: false,
        logLevel: process.env.LOG_LEVEL || 'info'
    },

    // CI/CD Configuration
    ci: {
        enabled: process.env.CI === 'true',
        parallelism: process.env.CI_PARALLEL || 1,
        failFast: false,
        uploadResults: true,
        notifications: {
            slack: process.env.SLACK_WEBHOOK,
            email: process.env.EMAIL_NOTIFICATIONS
        }
    },

    // Accessibility Configuration
    accessibility: {
        enabled: true,
        standards: ['WCAG2A', 'WCAG2AA'],
        rules: {
            'color-contrast': true,
            'keyboard-navigation': true,
            'focus-management': true,
            'aria-labels': true
        }
    },

    // Security Testing
    security: {
        enabled: true,
        checks: [
            'xss-prevention',
            'input-validation',
            'error-information-leakage'
        ]
    },

    // Test Utilities
    utilities: {
        wait: {
            short: 500,
            medium: 1000,
            long: 2000,
            chart: 3000
        },
        retry: {
            attempts: 3,
            delay: 1000
        }
    }
};