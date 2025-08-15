/**
 * Global test setup configuration
 * Sets up common testing utilities and environment for all test suites
 */

import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

// Global test utilities
global.testUtils = {
  // Mock console methods for cleaner test output
  mockConsole: () => {
    const originalConsole = { ...console };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    
    return originalConsole;
  },
  
  // Restore console methods
  restoreConsole: () => {
    jest.restoreAllMocks();
  },
  
  // Wait for async operations
  waitForAsync: (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test data
  generateTestId: (prefix: string = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Mock performance.now for consistent timing tests
  mockPerformanceNow: () => {
    const mockNow = jest.fn();
    let time = 0;
    mockNow.mockImplementation(() => {
      time += 16.67; // ~60fps
      return time;
    });
    Object.defineProperty(performance, 'now', {
      writable: true,
      value: mockNow,
    });
    return mockNow;
  },
};

// Global test constants
global.testConstants = {
  PERFORMANCE_THRESHOLDS: {
    CALCULATION_TIME_MS: 1000,
    PAGE_LOAD_TIME_MS: 2000,
    CHART_RENDER_TIME_MS: 500,
    API_RESPONSE_TIME_MS: 200,
  },
  
  VALIDATION_LIMITS: {
    RACK_COUNT: { MIN: 1, MAX: 1000 },
    POWER_PER_RACK: { MIN: 0.5, MAX: 50 },
    TOTAL_POWER: { MIN: 1, MAX: 50000 },
    ANALYSIS_YEARS: { MIN: 1, MAX: 10 },
  },
  
  CURRENCIES: ['USD', 'EUR', 'SAR', 'AED'],
  REGIONS: ['US', 'EU', 'ME'],
  LOCALES: ['en', 'ar'],
};

// Enhanced error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, just log
});

// Mock timers configuration
jest.useFakeTimers({
  legacyFakeTimers: false,
  advanceTimers: false,
});

// Default timeout for all tests
jest.setTimeout(10000);

// Mock global objects that might not be available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock canvas context for chart testing
const mockCanvasContext = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Add custom matchers for better test assertions
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidCurrency(received: string) {
    const validCurrencies = ['USD', 'EUR', 'SAR', 'AED'];
    const pass = validCurrencies.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid currency`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid currency (${validCurrencies.join(', ')})`,
        pass: false,
      };
    }
  },
  
  toHaveValidTCOStructure(received: any) {
    const requiredProperties = ['summary', 'breakdown', 'environmental', 'charts', 'calculation_id'];
    const pass = requiredProperties.every(prop => received && typeof received === 'object' && prop in received);
    
    if (pass) {
      return {
        message: () => `expected object not to have valid TCO structure`,
        pass: true,
      };
    } else {
      const missing = requiredProperties.filter(prop => !(prop in received));
      return {
        message: () => `expected object to have valid TCO structure, missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },
  
  toBePositiveFinancialValue(received: number) {
    const pass = typeof received === 'number' && received > 0 && Number.isFinite(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a positive financial value`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a positive finite number`,
        pass: false,
      };
    }
  },
});

// Setup performance monitoring for tests
if (typeof performance !== 'undefined') {
  // Clear any existing performance marks
  if (performance.clearMarks) {
    performance.clearMarks();
  }
  if (performance.clearMeasures) {
    performance.clearMeasures();
  }
}

// Export test utilities for use in individual test files
export { };

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toBeValidCurrency(): R;
      toHaveValidTCOStructure(): R;
      toBePositiveFinancialValue(): R;
    }
  }
  
  interface TestUtils {
    mockConsole: () => typeof console;
    restoreConsole: () => void;
    waitForAsync: (ms?: number) => Promise<void>;
    generateTestId: (prefix?: string) => string;
    mockPerformanceNow: () => jest.MockedFunction<() => number>;
  }
  
  interface TestConstants {
    PERFORMANCE_THRESHOLDS: {
      CALCULATION_TIME_MS: number;
      PAGE_LOAD_TIME_MS: number;
      CHART_RENDER_TIME_MS: number;
      API_RESPONSE_TIME_MS: number;
    };
    VALIDATION_LIMITS: {
      RACK_COUNT: { MIN: number; MAX: number };
      POWER_PER_RACK: { MIN: number; MAX: number };
      TOTAL_POWER: { MIN: number; MAX: number };
      ANALYSIS_YEARS: { MIN: number; MAX: number };
    };
    CURRENCIES: string[];
    REGIONS: string[];
    LOCALES: string[];
  }
  
  var testUtils: TestUtils;
  var testConstants: TestConstants;
}