/**
 * Comprehensive Jest configuration for TCO Calculator
 * Supports unit tests, integration tests, and performance tests with coverage reporting
 */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  // Project configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Default for frontend tests
  
  // Multiple project configurations
  projects: [
    // Backend tests
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/backend/**/*.test.ts'],
      collectCoverageFrom: [
        '<rootDir>/packages/backend/src/**/*.ts',
        '!<rootDir>/packages/backend/src/**/*.d.ts',
        '!<rootDir>/packages/backend/src/**/__tests__/**',
        '!<rootDir>/packages/backend/src/**/*.test.ts',
      ],
      coverageDirectory: '<rootDir>/coverage/backend',
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.setup.ts'],
      moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
      }),
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'packages/backend/tsconfig.json',
        }],
      },
    },
    
    // Frontend tests
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/packages/frontend/**/*.test.tsx', '<rootDir>/packages/frontend/**/*.test.ts'],
      collectCoverageFrom: [
        '<rootDir>/packages/frontend/src/**/*.{ts,tsx}',
        '!<rootDir>/packages/frontend/src/**/*.d.ts',
        '!<rootDir>/packages/frontend/src/**/__tests__/**',
        '!<rootDir>/packages/frontend/src/**/*.test.{ts,tsx}',
        '!<rootDir>/packages/frontend/src/main.tsx',
        '!<rootDir>/packages/frontend/src/vite-env.d.ts',
      ],
      coverageDirectory: '<rootDir>/coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90,
        },
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/frontend.setup.ts'],
      moduleNameMapping: {
        ...pathsToModuleNameMapper(compilerOptions.paths, {
          prefix: '<rootDir>/',
        }),
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'packages/frontend/tsconfig.json',
        }],
      },
      testEnvironmentOptions: {
        customExportConditions: [''],
      },
    },
    
    // Shared package tests
    {
      displayName: 'shared',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/shared/**/*.test.ts'],
      collectCoverageFrom: [
        '<rootDir>/packages/shared/src/**/*.ts',
        '!<rootDir>/packages/shared/src/**/*.d.ts',
        '!<rootDir>/packages/shared/src/**/__tests__/**',
        '!<rootDir>/packages/shared/src/**/*.test.ts',
      ],
      coverageDirectory: '<rootDir>/coverage/shared',
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/shared.setup.ts'],
      moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
      }),
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'packages/shared/tsconfig.json',
        }],
      },
    },
    
    // Performance tests
    {
      displayName: 'performance',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      collectCoverage: false, // Performance tests don't need coverage
      setupFilesAfterEnv: ['<rootDir>/tests/setup/performance.setup.ts'],
      moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
      }),
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
      testTimeout: 30000, // Extended timeout for performance tests
    },
  ],
  
  // Global configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/packages/**/*.{ts,tsx}',
    '!<rootDir>/packages/**/*.d.ts',
    '!<rootDir>/packages/**/__tests__/**',
    '!<rootDir>/packages/**/*.test.{ts,tsx}',
    '!<rootDir>/packages/**/node_modules/**',
  ],
  
  // Combined coverage reporting
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Overall coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/packages/**/*.test.{ts,tsx}',
    '<rootDir>/tests/**/*.test.ts',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/', // E2E tests run separately with Playwright
  ],
  
  // Module resolution
  moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/global.setup.ts'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'TCO Calculator Test Report',
        logoImgPath: undefined,
        inlineSource: false,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: false,
    },
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Handle unhandled promise rejections
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  
  // Snapshot configuration
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Dependency extraction
  dependencyExtractor: undefined,
  
  // Notify configuration for watch mode
  notify: false,
  notifyMode: 'failure-change',
  
  // Bail configuration
  bail: 0, // Don't bail on first failure
  
  // Silent mode
  silent: false,
  
  // Timing information
  logHeapUsage: false,
  detectOpenHandles: true,
  detectLeaks: false,
  
  // Force exit after tests complete
  forceExit: false,
  
  // Random seed for test order
  randomize: false,
  
  // Test name patterns
  testNamePattern: undefined,
  
  // Only changed files in watch mode
  onlyChanged: false,
  onlyFailures: false,
  
  // Pass with no tests
  passWithNoTests: true,
  
  // Update snapshots
  updateSnapshot: false,
  
  // Use stderr for output
  useStderr: false,
  
  // Watch all files
  watchAll: false,
  
  // Watch ignored patterns
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
  ],
};