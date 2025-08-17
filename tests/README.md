# Environmental Impact Chart Test Suite

## Overview

This comprehensive test suite validates the Environmental Impact chart display fix in the TCO Calculator application. It ensures the resolution of the original issue "исправь отображение environmental impact, я не вижу его" (fix the environmental impact display, I can't see it) and prevents future regressions.

## Test Suite Components

### 1. Unit Tests (`/unit/`)
- **File**: `environmental-chart-core.test.js`
- **Focus**: Chart creation, destruction, data validation, and error handling
- **Framework**: Jest with DOM mocking
- **Coverage**: Chart.js integration, canvas context management, edge cases

### 2. Integration Tests (`/integration/`)
- **File**: `environmental-chart-integration.test.js`
- **Focus**: Chart switcher functionality, single vs grid view, API integration
- **Framework**: Jest with Puppeteer
- **Coverage**: Chart system integration, data processing, rendering lifecycle

### 3. End-to-End Tests (`/e2e/`)
- **File**: `environmental-impact-workflow.spec.js`
- **Focus**: Complete user workflows, cross-browser compatibility, responsive design
- **Framework**: Playwright
- **Coverage**: Full user journey validation, mobile compatibility, accessibility

### 4. Performance Tests (`/performance/`)
- **File**: `environmental-chart-performance.test.js`
- **Focus**: Chart rendering speed, memory usage, resource loading efficiency
- **Framework**: Jest with Puppeteer performance monitoring
- **Coverage**: Performance benchmarks, memory leak detection, stress testing

### 5. Regression Tests (`/regression/`)
- **File**: `environmental-chart-regression.test.js`
- **Focus**: Error handling, fallback mechanisms, preventing future issues
- **Framework**: Jest with Puppeteer
- **Coverage**: Error recovery, data integrity, browser compatibility

### 6. Manual Testing (`/manual/`)
- **File**: `environmental-chart-manual-testing.md`
- **Focus**: Human validation procedures and comprehensive testing checklist
- **Framework**: Manual testing procedures
- **Coverage**: User experience validation, visual quality assessment, accessibility testing

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install puppeteer jest @playwright/test

# Ensure TCO Calculator is running
# Start the application at http://localhost:4000
node tco-calculator.js
```

### Run All Tests
```bash
# Execute the complete test suite
node tests/run-environmental-tests.js
```

### Run Specific Test Categories
```bash
# Unit tests only
node tests/run-environmental-tests.js --category=unit

# Integration tests only
node tests/run-environmental-tests.js --category=integration

# End-to-end tests only
node tests/run-environmental-tests.js --category=e2e

# Performance tests only
node tests/run-environmental-tests.js --category=performance

# Regression tests only
node tests/run-environmental-tests.js --category=regression
```

### Debug Mode
```bash
# Run with verbose output and browser visibility
node tests/run-environmental-tests.js --debug
```

### Individual Test Execution
```bash
# Run specific test files
npx jest tests/unit/environmental-chart-core.test.js
npx jest tests/integration/environmental-chart-integration.test.js
npx playwright test tests/e2e/environmental-impact-workflow.spec.js
```

## Test Results and Reporting

### Automated Reports
After test execution, reports are generated in `./test-results/`:
- `environmental-test-report.html` - Detailed visual report
- `environmental-test-report.json` - Raw test data
- `environmental-test-summary.txt` - Text summary

### Coverage Reports
Coverage reports are generated for unit and integration tests:
- `./test-results/coverage-unit/` - Unit test coverage
- `./test-results/coverage-integration/` - Integration test coverage

### Performance Metrics
Performance tests generate baseline metrics for:
- Chart creation time (< 2 seconds)
- Memory usage (< 50MB increase)
- Rendering performance (> 30 FPS)
- Page load time (< 10 seconds)

## Test Configuration

### Environment Configuration
Edit `tests/environmental-test-suite.config.js` to modify:
- Test timeouts and retries
- Browser configurations
- Performance thresholds
- Coverage requirements
- Reporting formats

### Test Data
Default test scenarios include:
- Standard calculation (100 servers, 300W each)
- Edge cases (minimal, extreme, invalid values)
- Performance stress tests

## Validation Criteria

### Fix Validation Success Criteria
The Environmental Impact chart display fix is considered successful when:

✅ **Core Functionality**
- Environmental chart displays when button is clicked
- Chart shows correct PUE comparison data (Air vs Immersion cooling)
- Chart works in both single and grid views
- Chart switching is smooth and reliable

✅ **Visual Quality**
- Professional color scheme and typography
- Clear, readable labels and values
- Appropriate chart type (doughnut) for data representation
- Responsive design across all device sizes

✅ **Performance**
- Chart creation time < 2 seconds
- Memory usage remains stable
- No performance degradation during extended use
- Cross-browser compatibility maintained

✅ **Error Handling**
- Graceful handling of invalid data
- Fallback mechanisms for Chart.js failures
- Recovery from JavaScript errors
- Meaningful error messages for users

✅ **Accessibility**
- Keyboard navigation support
- Screen reader compatibility
- Appropriate ARIA labels
- Focus management

## Troubleshooting

### Common Issues

#### Test Environment Setup
```bash
# If TCO Calculator is not running
node tco-calculator.js

# If dependencies are missing
npm install puppeteer jest @playwright/test

# If browser issues occur
npx playwright install
```

#### Test Execution Problems
```bash
# Clear previous test results
rm -rf test-results/

# Run with increased timeout
node tests/run-environmental-tests.js --debug

# Run single category to isolate issues
node tests/run-environmental-tests.js --category=unit
```

#### Browser Compatibility Issues
```bash
# Test specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Information

#### Enable Verbose Logging
```bash
# Set debug environment
export DEBUG=true
export LOG_LEVEL=debug
node tests/run-environmental-tests.js
```

#### Console Monitoring
When running tests, monitor browser console for:
- `🌱 Creating Environmental Impact chart...` - Chart creation start
- `📊 Environmental chart created successfully` - Successful creation
- `❌ Error creating environmental chart:` - Creation errors
- `🗑️ Destroying environmental chart` - Chart cleanup

## Contributing to Test Suite

### Adding New Tests
1. Follow the existing test structure and naming conventions
2. Use the shared configuration from `environmental-test-suite.config.js`
3. Include appropriate error handling and cleanup
4. Document test purpose and expected outcomes

### Test Categories Guidelines
- **Unit Tests**: Focus on individual functions and components
- **Integration Tests**: Test component interactions and data flow
- **E2E Tests**: Validate complete user workflows
- **Performance Tests**: Measure and benchmark performance metrics
- **Regression Tests**: Prevent known issues from reoccurring

### Manual Testing Updates
Update `manual/environmental-chart-manual-testing.md` when:
- New features are added
- UI changes affect user workflows
- New browsers or devices need testing
- Accessibility requirements change

## Success Metrics

### Test Suite Health
- **Coverage**: > 80% for unit and integration tests
- **Performance**: All performance thresholds met
- **Reliability**: < 1% flaky test rate
- **Execution Time**: Complete suite < 10 minutes

### Environmental Chart Fix Validation
- **Visibility**: 100% test pass rate for chart display tests
- **Functionality**: All chart interactions work correctly
- **Performance**: Chart rendering meets defined thresholds
- **Compatibility**: Works across all supported browsers and devices

## Support and Documentation

### Additional Resources
- [TCO Calculator Documentation](../README.md)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Playwright Testing Guide](https://playwright.dev/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/)

### Contact and Support
For issues with the test suite or environmental chart functionality:
1. Check this documentation and troubleshooting section
2. Review test execution logs and error messages
3. Validate test environment setup and dependencies
4. Run individual test categories to isolate issues

---

## Test Suite Validation Summary

**Original Issue**: "исправь отображение environmental impact, я не вижу его"

**Fix Status**: ✅ RESOLVED - Environmental Impact chart is now fully functional and visible

**Test Coverage**: Comprehensive validation across all scenarios including:
- Chart creation and destruction
- Single and grid view functionality
- Cross-browser compatibility
- Responsive design
- Performance optimization
- Error handling and recovery
- User accessibility
- Regression prevention

**Quality Assurance**: This test suite ensures the environmental impact chart fix remains stable and continues working properly in future releases.