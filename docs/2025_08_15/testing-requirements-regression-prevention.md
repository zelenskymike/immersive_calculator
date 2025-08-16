# Testing Requirements for Regression Prevention

## Testing Framework Overview

This document defines comprehensive testing requirements to prevent regression of the `isPositive` undefined variable bug and ensure robust error handling for the TCO Calculator. The testing strategy covers unit tests, integration tests, error condition testing, and production monitoring validation.

## Test Coverage Requirements

### Coverage Targets
- **Overall Code Coverage**: 95% minimum
- **Error Handling Paths**: 100% coverage required
- **Template Literal Generation**: 100% coverage required
- **Critical Business Logic**: 100% coverage required
- **API Endpoints**: 95% coverage minimum

### Coverage Exclusions
- Third-party library code
- Console logging statements
- Development-only code paths
- Configuration and environment setup

## Unit Testing Requirements

### UT-001: Variable Safety Testing
**Description**: Test all variable declarations and null-safe access patterns  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Variable Safety
describe('Variable Safety', () => {
    describe('safeGet utility', () => {
        test('should return value for valid nested path', () => {
            const data = { a: { b: { c: 'value' } } };
            expect(safeGet(data, 'a.b.c')).toBe('value');
        });

        test('should return default for undefined path', () => {
            const data = { a: { b: {} } };
            expect(safeGet(data, 'a.b.c', 'default')).toBe('default');
        });

        test('should handle null intermediate values', () => {
            const data = { a: null };
            expect(safeGet(data, 'a.b.c', 'default')).toBe('default');
        });

        test('should handle undefined object', () => {
            expect(safeGet(undefined, 'a.b.c', 'default')).toBe('default');
        });

        test('should handle null object', () => {
            expect(safeGet(null, 'a.b.c', 'default')).toBe('default');
        });
    });

    describe('validateDisplayVariables', () => {
        test('should pass with valid complete data', () => {
            const validData = {
                comparison: {
                    savings: {
                        totalSavings: 10000,
                        annualSavings: 2000,
                        roiPercent: 15.5,
                        paybackYears: 3.2
                    }
                },
                parameters: { analysisYears: 5 },
                airCooling: { costs: { totalTCO: 50000 } },
                immersionCooling: { costs: { totalTCO: 40000 } }
            };

            expect(() => validateDisplayVariables(validData)).not.toThrow();
        });

        test('should throw ValidationError for missing required fields', () => {
            const invalidData = {
                comparison: { savings: {} },
                parameters: { analysisYears: 5 }
            };

            expect(() => validateDisplayVariables(invalidData))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid types', () => {
            const invalidData = {
                comparison: {
                    savings: {
                        totalSavings: 'not-a-number',
                        annualSavings: 2000,
                        roiPercent: 15.5,
                        paybackYears: 3.2
                    }
                },
                parameters: { analysisYears: 5 }
            };

            expect(() => validateDisplayVariables(invalidData))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for out-of-range values', () => {
            const invalidData = {
                comparison: {
                    savings: {
                        totalSavings: 1e15, // Too large
                        annualSavings: 2000,
                        roiPercent: 15.5,
                        paybackYears: 3.2
                    }
                },
                parameters: { analysisYears: 0 } // Too small
            };

            expect(() => validateDisplayVariables(invalidData))
                .toThrow(ValidationError);
        });
    });
});
```

### UT-002: Template Generation Testing
**Description**: Test all template literal generation functions for error handling  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Template Generation
describe('Template Generation', () => {
    describe('createSafeTemplateVariables', () => {
        test('should create variables from valid data', () => {
            const validData = {
                comparison: {
                    savings: {
                        totalSavings: 10000,
                        annualSavings: 2000,
                        roiPercent: 15.5,
                        paybackYears: 3.2
                    }
                },
                parameters: { analysisYears: 5 },
                airCooling: { costs: { totalTCO: 50000 } },
                immersionCooling: { costs: { totalTCO: 40000 } }
            };

            const variables = createSafeTemplateVariables(validData);

            expect(variables.isPositive).toBe(true);
            expect(variables.totalSavings).toBe(10000);
            expect(variables.totalSavingsFormatted).toBe('10,000');
            expect(variables.savingsIcon).toBe('💰');
            expect(variables.savingsLabel).toBe('Total Savings');
            expect(variables.currencyPrefix).toBe('$');
        });

        test('should handle negative savings correctly', () => {
            const dataWithLoss = {
                comparison: {
                    savings: {
                        totalSavings: -5000,
                        annualSavings: -1000,
                        roiPercent: -10,
                        paybackYears: 0
                    }
                },
                parameters: { analysisYears: 5 },
                airCooling: { costs: { totalTCO: 40000 } },
                immersionCooling: { costs: { totalTCO: 45000 } }
            };

            const variables = createSafeTemplateVariables(dataWithLoss);

            expect(variables.isPositive).toBe(false);
            expect(variables.totalSavings).toBe(-5000);
            expect(variables.totalSavingsFormatted).toBe('5,000');
            expect(variables.savingsIcon).toBe('💸');
            expect(variables.savingsLabel).toBe('Additional Cost');
            expect(variables.currencyPrefix).toBe('-$');
        });

        test('should return fallback variables on validation error', () => {
            const invalidData = { invalid: 'data' };

            const variables = createSafeTemplateVariables(invalidData);

            expect(variables.isPositive).toBe(false);
            expect(variables.totalSavings).toBe(0);
            expect(variables.savingsIcon).toBe('⚠️');
            expect(variables.savingsLabel).toBe('Calculation Error');
        });
    });

    describe('generateSavingsHighlight', () => {
        test('should generate HTML with positive savings', () => {
            const vars = {
                savingsIcon: '💰',
                savingsLabel: 'Total Savings',
                currencyPrefix: '$',
                totalSavingsFormatted: '10,000',
                analysisYears: 5,
                yearSuffix: 's',
                roiPercent: 15.5,
                paybackYears: 3.2
            };

            const html = generateSavingsHighlight(vars);

            expect(html).toContain('💰 Total Savings');
            expect(html).toContain('$10,000');
            expect(html).toContain('Over 5 years');
            expect(html).toContain('ROI: 15.5%');
            expect(html).toContain('Payback: 3.2 years');
        });

        test('should generate HTML with negative savings', () => {
            const vars = {
                savingsIcon: '💸',
                savingsLabel: 'Additional Cost',
                currencyPrefix: '-$',
                totalSavingsFormatted: '5,000',
                analysisYears: 1,
                yearSuffix: '',
                roiPercent: -10,
                paybackYears: 0
            };

            const html = generateSavingsHighlight(vars);

            expect(html).toContain('💸 Additional Cost');
            expect(html).toContain('-$5,000');
            expect(html).toContain('Over 1 year');
            expect(html).toContain('ROI: -10%');
        });

        test('should return fallback template on error', () => {
            // Force an error by passing invalid variables
            const invalidVars = null;

            const html = generateSavingsHighlight(invalidVars);

            expect(html).toContain('Calculation Error');
            expect(html).toContain('Unable to Calculate');
        });
    });
});
```

### UT-003: Error Handling Testing
**Description**: Test all error conditions and exception handling paths  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Error Handling
describe('Error Handling', () => {
    describe('Custom Error Types', () => {
        test('ValidationError should include context', () => {
            const context = { field: 'totalSavings', value: 'invalid' };
            const error = new ValidationError('Test validation error', context);

            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Test validation error');
            expect(error.context).toEqual(context);
            expect(error.timestamp).toBeDefined();
        });

        test('DOMError should include element reference', () => {
            const element = { id: 'testElement' };
            const error = new DOMError('DOM operation failed', element);

            expect(error.name).toBe('DOMError');
            expect(error.element).toEqual(element);
        });

        test('TemplateError should include template and variables', () => {
            const template = 'test template';
            const variables = { test: 'value' };
            const error = new TemplateError('Template generation failed', template, variables);

            expect(error.name).toBe('TemplateError');
            expect(error.template).toBe(template);
            expect(error.variables).toEqual(variables);
        });
    });

    describe('Error Reporting', () => {
        test('reportCriticalError should sanitize sensitive data', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const context = {
                user: { password: 'secret123', email: 'test@example.com' },
                config: { apiKey: 'key123', database: 'safe-value' }
            };

            reportCriticalError('testFunction', new Error('Test error'), context);

            const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
            expect(loggedData.context.user.password).toBe('[REDACTED]');
            expect(loggedData.context.config.apiKey).toBe('[REDACTED]');
            expect(loggedData.context.config.database).toBe('safe-value');

            consoleSpy.mockRestore();
        });
    });
});
```

## Integration Testing Requirements

### IT-001: End-to-End API Testing
**Description**: Test complete API request/response cycles with error conditions  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: API Integration
describe('API Integration', () => {
    let server;
    let request;

    beforeAll(() => {
        server = createServer(0);
        server.listen();
        const port = server.address().port;
        request = supertest(`http://localhost:${port}`);
    });

    afterAll(() => {
        server.close();
    });

    describe('POST /api/calculate', () => {
        test('should handle valid calculation request', async () => {
            const validRequest = {
                airRacks: 10,
                airPowerPerRack: 20,
                airRackCost: 50000,
                airPUE: 1.8,
                immersionTanks: 9,
                immersionPowerPerTank: 23,
                immersionTankCost: 80000,
                immersionPUE: 1.1,
                analysisYears: 5,
                electricityPrice: 0.12,
                discountRate: 5,
                maintenanceCost: 3
            };

            const response = await request
                .post('/api/calculate')
                .send(validRequest)
                .expect(200);

            expect(response.body).toHaveProperty('comparison');
            expect(response.body.comparison).toHaveProperty('savings');
            expect(response.body.comparison.savings).toHaveProperty('totalSavings');
            expect(typeof response.body.comparison.savings.totalSavings).toBe('number');
        });

        test('should handle invalid input gracefully', async () => {
            const invalidRequest = {
                airRacks: 'invalid',
                immersionTanks: -1,
                analysisYears: 0
            };

            const response = await request
                .post('/api/calculate')
                .send(invalidRequest)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
        });

        test('should handle missing required fields', async () => {
            const incompleteRequest = {
                airRacks: 10
                // Missing other required fields
            };

            const response = await request
                .post('/api/calculate')
                .send(incompleteRequest)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('should handle malformed JSON', async () => {
            const response = await request
                .post('/api/calculate')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /', () => {
        test('should serve the main interface', async () => {
            const response = await request
                .get('/')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/html');
            expect(response.text).toContain('TCO Calculator');
            expect(response.text).toContain('displayResults');
        });
    });

    describe('GET /health', () => {
        test('should return health status', async () => {
            const response = await request
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memory');
            expect(response.body).toHaveProperty('tests');
        });
    });
});
```

### IT-002: Frontend Integration Testing
**Description**: Test client-side functionality and error handling  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Frontend Integration
describe('Frontend Integration', () => {
    let dom;
    let window;

    beforeEach(() => {
        // Setup JSDOM environment
        dom = new JSDOM(htmlContent, {
            url: 'http://localhost:4000',
            pretendToBeVisual: true,
            resources: 'usable'
        });
        window = dom.window;
        global.window = window;
        global.document = window.document;
        global.navigator = window.navigator;
        global.localStorage = window.localStorage;
        global.fetch = jest.fn();
    });

    afterEach(() => {
        dom.window.close();
    });

    describe('displayResults function', () => {
        test('should handle valid calculation results', () => {
            const validResult = {
                comparison: {
                    savings: {
                        totalSavings: 10000,
                        annualSavings: 2000,
                        roiPercent: 15.5,
                        paybackYears: 3.2
                    }
                },
                parameters: { analysisYears: 5 },
                airCooling: {
                    equipment: { count: 10 },
                    costs: { totalTCO: 50000, capex: 500000, annualOpex: 20000 }
                },
                immersionCooling: {
                    equipment: { count: 9 },
                    costs: { totalTCO: 40000, capex: 720000, annualOpex: 18000 }
                }
            };

            // Mock DOM elements
            document.body.innerHTML = `
                <div id="savingsHighlight"></div>
                <div id="resultsGrid"></div>
            `;

            expect(() => displayResults(validResult)).not.toThrow();

            const savingsElement = document.getElementById('savingsHighlight');
            const resultsElement = document.getElementById('resultsGrid');

            expect(savingsElement.innerHTML).toContain('Total Savings');
            expect(savingsElement.innerHTML).toContain('$10,000');
            expect(resultsElement.innerHTML).toContain('Air Cooling System');
            expect(resultsElement.innerHTML).toContain('Immersion Cooling');
        });

        test('should handle missing DOM elements gracefully', () => {
            const validResult = {
                comparison: { savings: { totalSavings: 10000 } },
                parameters: { analysisYears: 5 }
            };

            // Don't create DOM elements
            document.body.innerHTML = '';

            expect(() => displayResults(validResult)).not.toThrow();
        });

        test('should handle malformed data gracefully', () => {
            const malformedData = {
                comparison: { savings: {} }, // Missing totalSavings
                parameters: {}
            };

            document.body.innerHTML = `
                <div id="savingsHighlight"></div>
                <div id="resultsGrid"></div>
            `;

            expect(() => displayResults(malformedData)).not.toThrow();

            const savingsElement = document.getElementById('savingsHighlight');
            expect(savingsElement.innerHTML).toContain('Calculation Error');
        });

        test('should handle null/undefined data', () => {
            document.body.innerHTML = `
                <div id="savingsHighlight"></div>
                <div id="resultsGrid"></div>
            `;

            expect(() => displayResults(null)).not.toThrow();
            expect(() => displayResults(undefined)).not.toThrow();
            expect(() => displayResults({})).not.toThrow();
        });
    });

    describe('calculateTCO function', () => {
        test('should handle successful API response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    comparison: { savings: { totalSavings: 10000 } }
                })
            });

            document.body.innerHTML = `
                <input id="airRacks" value="10">
                <input id="immersionTanks" value="9">
                <input id="analysisYears" value="5">
                <input id="electricityPrice" value="0.12">
                <input id="discountRate" value="5">
                <input id="maintenanceCost" value="3">
                <input id="airPowerPerRack" value="20">
                <input id="airRackCost" value="50000">
                <input id="airPUE" value="1.8">
                <input id="immersionPowerPerTank" value="23">
                <input id="immersionTankCost" value="80000">
                <input id="immersionPUE" value="1.1">
                <div id="results"></div>
                <div id="loadingIndicator"></div>
                <div id="resultsContent"></div>
                <div id="savingsHighlight"></div>
                <div id="resultsGrid"></div>
            `;

            await calculateTCO();

            expect(global.fetch).toHaveBeenCalledWith('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.stringContaining('"airRacks":10')
            });
        });

        test('should handle API errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

            document.body.innerHTML = `
                <input id="airRacks" value="10">
                <input id="immersionTanks" value="9">
                <input id="analysisYears" value="5">
                <input id="electricityPrice" value="0.12">
                <input id="discountRate" value="5">
                <input id="maintenanceCost" value="3">
                <input id="airPowerPerRack" value="20">
                <input id="airRackCost" value="50000">
                <input id="airPUE" value="1.8">
                <input id="immersionPowerPerTank" value="23">
                <input id="immersionTankCost" value="80000">
                <input id="immersionPUE" value="1.1">
                <div id="results"></div>
                <div id="loadingIndicator"></div>
                <div id="resultsContent"></div>
            `;

            await calculateTCO();

            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('Calculation Error')
            );

            alertSpy.mockRestore();
        });
    });
});
```

## Error Condition Testing Requirements

### ECT-001: Boundary Value Testing
**Description**: Test edge cases and boundary conditions that could trigger errors  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Boundary Values
describe('Boundary Value Testing', () => {
    const boundaryTestCases = [
        // Edge case values
        { name: 'Zero values', data: { totalSavings: 0, analysisYears: 1 } },
        { name: 'Negative values', data: { totalSavings: -1000000, analysisYears: 1 } },
        { name: 'Very large values', data: { totalSavings: 1e10, analysisYears: 20 } },
        { name: 'Minimum analysis years', data: { totalSavings: 10000, analysisYears: 1 } },
        { name: 'Maximum analysis years', data: { totalSavings: 10000, analysisYears: 20 } },
        
        // Floating point edge cases
        { name: 'Very small decimal', data: { totalSavings: 0.01, analysisYears: 1 } },
        { name: 'Infinity', data: { totalSavings: Infinity, analysisYears: 5 } },
        { name: 'Negative Infinity', data: { totalSavings: -Infinity, analysisYears: 5 } },
        { name: 'NaN', data: { totalSavings: NaN, analysisYears: 5 } },
        
        // String edge cases
        { name: 'Empty string', data: { totalSavings: '', analysisYears: 5 } },
        { name: 'Numeric string', data: { totalSavings: '10000', analysisYears: 5 } },
        { name: 'Non-numeric string', data: { totalSavings: 'not-a-number', analysisYears: 5 } },
        
        // Object edge cases
        { name: 'Null totalSavings', data: { totalSavings: null, analysisYears: 5 } },
        { name: 'Undefined totalSavings', data: { totalSavings: undefined, analysisYears: 5 } },
        { name: 'Array totalSavings', data: { totalSavings: [10000], analysisYears: 5 } },
        { name: 'Object totalSavings', data: { totalSavings: { value: 10000 }, analysisYears: 5 } }
    ];

    test.each(boundaryTestCases)('should handle $name gracefully', ({ data }) => {
        const fullData = {
            comparison: { savings: data },
            parameters: { analysisYears: data.analysisYears },
            airCooling: { costs: { totalTCO: 50000 }, equipment: { count: 10 } },
            immersionCooling: { costs: { totalTCO: 40000 }, equipment: { count: 9 } }
        };

        expect(() => {
            const variables = createSafeTemplateVariables(fullData);
            const html = generateSavingsHighlight(variables);
            expect(typeof html).toBe('string');
            expect(html.length).toBeGreaterThan(0);
        }).not.toThrow();
    });
});
```

### ECT-002: Data Structure Corruption Testing
**Description**: Test handling of corrupted or incomplete data structures  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Data Corruption
describe('Data Structure Corruption Testing', () => {
    const corruptionTestCases = [
        {
            name: 'Missing comparison object',
            data: { airCooling: {}, immersionCooling: {}, parameters: {} }
        },
        {
            name: 'Missing savings object',
            data: { comparison: {}, parameters: {} }
        },
        {
            name: 'Circular reference',
            data: (() => {
                const obj = { comparison: { savings: {} } };
                obj.comparison.savings.self = obj;
                return obj;
            })()
        },
        {
            name: 'Very deep nesting',
            data: (() => {
                let deep = {};
                let current = deep;
                for (let i = 0; i < 100; i++) {
                    current.next = {};
                    current = current.next;
                }
                current.comparison = { savings: { totalSavings: 10000 } };
                return deep;
            })()
        },
        {
            name: 'Mixed type arrays',
            data: {
                comparison: { savings: [null, 'string', 10000, { totalSavings: 5000 }] }
            }
        },
        {
            name: 'Function in data',
            data: {
                comparison: { savings: { totalSavings: () => 10000 } }
            }
        },
        {
            name: 'Symbol in data',
            data: {
                comparison: { savings: { totalSavings: Symbol('test') } }
            }
        }
    ];

    test.each(corruptionTestCases)('should handle $name gracefully', ({ data }) => {
        expect(() => {
            displayResults(data);
        }).not.toThrow();
    });
});
```

## Performance Testing Requirements

### PT-001: Load Testing
**Description**: Validate performance under concurrent load conditions  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Performance
describe('Performance Testing', () => {
    test('should handle concurrent calculations', async () => {
        const validRequest = {
            airRacks: 10,
            immersionTanks: 9,
            analysisYears: 5,
            electricityPrice: 0.12,
            discountRate: 5,
            maintenanceCost: 3,
            airPowerPerRack: 20,
            airRackCost: 50000,
            airPUE: 1.8,
            immersionPowerPerTank: 23,
            immersionTankCost: 80000,
            immersionPUE: 1.1
        };

        const concurrentRequests = Array(50).fill().map(() => 
            request(app)
                .post('/api/calculate')
                .send(validRequest)
        );

        const responses = await Promise.all(concurrentRequests);

        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('comparison');
        });
    });

    test('should complete calculations within time limits', async () => {
        const startTime = Date.now();
        
        const result = calculateTCO({
            airRacks: 100,
            immersionTanks: 90,
            analysisYears: 10,
            electricityPrice: 0.12,
            discountRate: 5,
            maintenanceCost: 3,
            airPowerPerRack: 20,
            airRackCost: 50000,
            airPUE: 1.8,
            immersionPowerPerTank: 23,
            immersionTankCost: 80000,
            immersionPUE: 1.1
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(100); // Should complete in < 100ms
        expect(result).toHaveProperty('comparison');
    });

    test('should handle memory-intensive operations', () => {
        const largeDataSet = Array(1000).fill().map((_, i) => ({
            calculation: calculateTCO({
                airRacks: i + 1,
                immersionTanks: i + 1,
                analysisYears: 5,
                electricityPrice: 0.12,
                discountRate: 5,
                maintenanceCost: 3,
                airPowerPerRack: 20,
                airRackCost: 50000,
                airPUE: 1.8,
                immersionPowerPerTank: 23,
                immersionTankCost: 80000,
                immersionPUE: 1.1
            })
        }));

        expect(largeDataSet).toHaveLength(1000);
        expect(largeDataSet[999].calculation).toHaveProperty('comparison');
    });
});
```

## Monitoring and Alerting Tests

### MAT-001: Error Tracking Validation
**Description**: Test error tracking and alerting systems  
**Implementation Requirements**:

```javascript
// REQUIRED TEST SUITE: Monitoring
describe('Monitoring and Alerting', () => {
    describe('ErrorTracker', () => {
        let errorTracker;

        beforeEach(() => {
            errorTracker = new ErrorTracker();
        });

        test('should track and categorize errors', () => {
            const validationError = new ValidationError('Test validation error');
            const domError = new DOMError('Test DOM error');
            const referenceError = new ReferenceError('Test reference error');

            errorTracker.trackError(validationError);
            errorTracker.trackError(domError);
            errorTracker.trackError(referenceError);

            const summary = errorTracker.getErrorSummary();
            
            expect(summary.total).toBe(3);
            expect(summary.critical).toBe(1); // ReferenceError
            expect(summary.medium).toBe(2); // ValidationError, DOMError
        });

        test('should detect high frequency errors', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const error = new Error('Repeated error');
            
            // Trigger the same error 11 times
            for (let i = 0; i < 11; i++) {
                errorTracker.trackError(error);
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('ALERT [HIGH_FREQUENCY_ERROR]'),
                expect.any(Object)
            );

            consoleSpy.mockRestore();
        });

        test('should maintain error history limits', () => {
            // Add 1500 errors (more than the 1000 limit)
            for (let i = 0; i < 1500; i++) {
                errorTracker.trackError(new Error(`Error ${i}`));
            }

            expect(errorTracker.errors).toHaveLength(1000);
            expect(errorTracker.errors[0].message).toContain('Error 500'); // Should start from 500
        });
    });

    describe('PerformanceMonitor', () => {
        let performanceMonitor;

        beforeEach(() => {
            performanceMonitor = new PerformanceMonitor();
        });

        test('should track request performance', () => {
            const startTime = Date.now();
            const endTime = startTime + 150; // 150ms request

            performanceMonitor.recordRequest(startTime, endTime, '/api/calculate', 200);

            const stats = performanceMonitor.getPerformanceStats();
            
            expect(stats.count).toBe(1);
            expect(stats.average).toBe(150);
            expect(stats.median).toBe(150);
        });

        test('should alert on slow requests', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const startTime = Date.now();
            const endTime = startTime + 6000; // 6 second request

            performanceMonitor.recordRequest(startTime, endTime, '/api/calculate', 200);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Slow response detected:',
                expect.objectContaining({ duration: 6000 })
            );

            consoleSpy.mockRestore();
        });
    });
});
```

## Continuous Integration Requirements

### CI-001: Automated Test Execution
**Description**: All tests must run automatically on code changes  
**Implementation Requirements**:

```yaml
# REQUIRED: .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run error condition tests
        run: npm run test:errors
        
      - name: Run performance tests
        run: npm run test:performance
        
      - name: Generate coverage report
        run: npm run coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v1
        
      - name: Quality gate
        run: |
          COVERAGE=$(npm run coverage:check | grep "All files" | awk '{print $10}' | sed 's/%//')
          if [ "$COVERAGE" -lt "95" ]; then
            echo "Coverage $COVERAGE% is below required 95%"
            exit 1
          fi
```

### CI-002: Pre-deployment Validation
**Description**: Comprehensive validation before production deployment  
**Implementation Requirements**:

```yaml
# REQUIRED: Pre-deployment checks
pre-deployment:
  runs-on: ubuntu-latest
  needs: test
  steps:
    - name: Start test server
      run: |
        node tco-calculator.js &
        sleep 5
        
    - name: Health check validation
      run: |
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)
        if [ "$response" != "200" ]; then
          echo "Health check failed with status $response"
          exit 1
        fi
        
    - name: Calculation endpoint validation
      run: |
        response=$(curl -s -X POST http://localhost:4000/api/calculate \
          -H "Content-Type: application/json" \
          -d '{"airRacks":10,"immersionTanks":9,"analysisYears":5,"electricityPrice":0.12,"discountRate":5,"maintenanceCost":3}')
        
        if ! echo "$response" | jq -e '.comparison.savings.totalSavings' > /dev/null; then
          echo "Calculation endpoint validation failed"
          exit 1
        fi
        
    - name: Error handling validation
      run: |
        response=$(curl -s -X POST http://localhost:4000/api/calculate \
          -H "Content-Type: application/json" \
          -d '{"invalid":"data"}')
        
        if ! echo "$response" | jq -e '.error' > /dev/null; then
          echo "Error handling validation failed"
          exit 1
        fi
```

## Test Data Management

### TDM-001: Test Data Sets
**Description**: Standardized test data for consistent testing  
**Implementation Requirements**:

```javascript
// REQUIRED: test/fixtures/testData.js
const testDataSets = {
    valid: {
        standard: {
            airRacks: 10,
            airPowerPerRack: 20,
            airRackCost: 50000,
            airPUE: 1.8,
            immersionTanks: 9,
            immersionPowerPerTank: 23,
            immersionTankCost: 80000,
            immersionPUE: 1.1,
            analysisYears: 5,
            electricityPrice: 0.12,
            discountRate: 5,
            maintenanceCost: 3
        },
        minimal: {
            airRacks: 1,
            immersionTanks: 1,
            analysisYears: 1,
            electricityPrice: 0.05,
            discountRate: 0,
            maintenanceCost: 1
        },
        maximal: {
            airRacks: 1000,
            airPowerPerRack: 100,
            airRackCost: 500000,
            airPUE: 3.0,
            immersionTanks: 500,
            immersionPowerPerTank: 200,
            immersionTankCost: 1000000,
            immersionPUE: 1.0,
            analysisYears: 20,
            electricityPrice: 1.0,
            discountRate: 30,
            maintenanceCost: 15
        }
    },
    invalid: {
        missingFields: {
            airRacks: 10
            // Other required fields missing
        },
        outOfRange: {
            airRacks: -1,
            immersionTanks: 1001,
            analysisYears: 25,
            electricityPrice: -0.1,
            discountRate: 50,
            maintenanceCost: 20
        },
        wrongTypes: {
            airRacks: 'ten',
            immersionTanks: null,
            analysisYears: undefined,
            electricityPrice: 'expensive',
            discountRate: [5],
            maintenanceCost: { value: 3 }
        }
    },
    expectedResults: {
        standard: {
            comparison: {
                savings: {
                    totalSavings: expect.any(Number),
                    annualSavings: expect.any(Number),
                    roiPercent: expect.any(Number),
                    paybackYears: expect.any(Number)
                }
            },
            airCooling: {
                costs: {
                    totalTCO: expect.any(Number),
                    capex: expect.any(Number),
                    annualOpex: expect.any(Number)
                }
            },
            immersionCooling: {
                costs: {
                    totalTCO: expect.any(Number),
                    capex: expect.any(Number),
                    annualOpex: expect.any(Number)
                }
            }
        }
    }
};

module.exports = testDataSets;
```

## Success Criteria

### Primary Testing Objectives
- [ ] **100% error path coverage** for template literal generation
- [ ] **Zero unhandled exceptions** in all test scenarios
- [ ] **95% overall code coverage** with comprehensive test suite
- [ ] **Performance benchmarks met** for all operations

### Quality Gates
- [ ] All unit tests passing with 0 failures
- [ ] All integration tests validating API functionality
- [ ] All error condition tests proving graceful degradation
- [ ] Performance tests confirming acceptable response times
- [ ] Monitoring tests validating error tracking systems

### Regression Prevention
- [ ] Specific test cases for the `isPositive` variable bug
- [ ] Template literal safety tests for all similar patterns
- [ ] Data validation tests for all input scenarios
- [ ] Error boundary tests for all critical functions

---

*Testing Requirements completed on: 2025-08-15*  
*All analysis and documentation complete for TCO Calculator production bug*