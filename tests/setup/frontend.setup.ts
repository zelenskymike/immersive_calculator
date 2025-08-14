/**
 * Frontend-specific test setup configuration
 * Sets up React Testing Library, MSW for API mocking, and component testing utilities
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { TextEncoder, TextDecoder } from 'util';

// Setup MSW server for API mocking
const mockApiHandlers = [
  // Mock calculation endpoint
  rest.post('/api/v1/calculations/calculate', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        calculation_id: 'mock-calculation-id',
        summary: {
          total_tco_savings_5yr: 125000,
          total_capex_savings: 75000,
          total_opex_savings_5yr: 50000,
          roi_percent: 25.5,
          payback_months: 36,
          energy_efficiency_improvement: 35.2,
          cost_per_kw_air_cooling: 2500,
          cost_per_kw_immersion_cooling: 1800,
        },
        breakdown: {
          capex: {
            air_cooling: { total: 300000 },
            immersion_cooling: { total: 225000 },
            savings: 75000,
          },
          opex_annual: [
            {
              year: 1,
              air_cooling: { total: 50000 },
              immersion_cooling: { total: 40000 },
              savings: 10000,
            },
          ],
        },
        environmental: {
          carbon_savings_kg_co2_annual: 15000,
          water_savings_gallons_annual: 25000,
        },
        charts: {
          tco_progression: [
            { year: 1, air_cooling: 350000, immersion_cooling: 265000 },
          ],
          pue_comparison: { air_cooling: 1.45, immersion_cooling: 1.03 },
        },
      })
    );
  }),

  // Mock sharing endpoint
  rest.post('/api/v1/sharing/create', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        share_id: 'mock-share-id',
        share_url: 'https://example.com/shared/mock-share-id',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    );
  }),

  // Mock configuration validation endpoint
  rest.post('/api/v1/calculations/validate', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        valid: true,
        errors: [],
        warnings: [],
      })
    );
  }),

  // Mock health endpoint
  rest.get('/api/v1/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      })
    );
  }),

  // Mock configuration defaults
  rest.get('/api/v1/config/defaults', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        currencies: ['USD', 'EUR', 'SAR', 'AED'],
        regions: ['US', 'EU', 'ME'],
        energy_costs: {
          US: 0.12,
          EU: 0.20,
          ME: 0.08,
        },
      })
    );
  }),
];

export const mockServer = setupServer(...mockApiHandlers);

// Start server before all tests
beforeAll(() => {
  mockServer.listen({
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test
afterEach(() => {
  mockServer.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  mockServer.close();
});

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

// Setup global mocks for frontend-specific APIs
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock window.scroll
Object.defineProperty(window, 'scroll', {
  value: jest.fn(),
  writable: true,
});

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock Chart.js for component testing
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    defaults: {
      responsive: true,
      plugins: {
        title: { display: true },
        legend: { display: true },
      },
    },
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />
  )),
  Bar: jest.fn(({ data, options }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />
  )),
  Pie: jest.fn(({ data, options }) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} />
  )),
}));

// Mock file download utilities
jest.mock('file-saver', () => ({
  saveAs: jest.fn((blob, filename) => {
    console.log(`Mock download: ${filename}`);
  }),
}));

// Mock PDF generation
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    save: jest.fn(),
    addImage: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    internal: {
      pageSize: { width: 210, height: 297 },
    },
  }));
});

// Mock html2canvas
jest.mock('html2canvas', () => {
  return jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock-image-data'),
  });
});

// Frontend-specific test utilities
export const frontendTestUtils = {
  // Component rendering utilities
  renderWithProviders: async (ui: React.ReactElement, options = {}) => {
    const { render } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { BrowserRouter } = await import('react-router-dom');
    const { I18nProvider } = await import('@/i18n/I18nProvider');
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <I18nProvider>
            {children}
          </I18nProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    return render(ui, { wrapper: Wrapper, ...options });
  },

  // Mock user interactions
  createMockUser: () => ({
    type: jest.fn(),
    click: jest.fn(),
    selectOptions: jest.fn(),
    deselectOptions: jest.fn(),
    upload: jest.fn(),
    clear: jest.fn(),
    tab: jest.fn(),
    hover: jest.fn(),
    unhover: jest.fn(),
    paste: jest.fn(),
    keyboard: jest.fn(),
  }),

  // Mock calculation configuration
  createMockConfiguration: (overrides = {}) => ({
    air_cooling: {
      input_method: 'rack_count',
      rack_count: 10,
      power_per_rack_kw: 15,
      hvac_efficiency: 0.85,
      power_distribution_efficiency: 0.95,
      space_efficiency: 0.8,
      ...overrides.air_cooling,
    },
    immersion_cooling: {
      input_method: 'auto_optimize',
      target_power_kw: 150,
      coolant_type: 'synthetic',
      pumping_efficiency: 0.92,
      heat_exchanger_efficiency: 0.95,
      ...overrides.immersion_cooling,
    },
    financial: {
      analysis_years: 5,
      discount_rate: 0.08,
      currency: 'USD',
      region: 'US',
      energy_cost_kwh: 0.12,
      ...overrides.financial,
    },
  }),

  // Mock calculation results
  createMockResults: (overrides = {}) => ({
    calculation_id: 'mock-calc-id',
    configuration_hash: 'mock-hash',
    summary: {
      total_tco_savings_5yr: 125000,
      total_capex_savings: 75000,
      total_opex_savings_5yr: 50000,
      roi_percent: 25.5,
      payback_months: 36,
      energy_efficiency_improvement: 35.2,
      cost_per_kw_air_cooling: 2500,
      cost_per_kw_immersion_cooling: 1800,
      pue_air_cooling: 1.45,
      pue_immersion_cooling: 1.03,
      ...overrides.summary,
    },
    breakdown: {
      capex: {
        air_cooling: { total: 300000, equipment: 200000, installation: 50000, infrastructure: 50000 },
        immersion_cooling: { total: 225000, equipment: 150000, installation: 37500, infrastructure: 30000, coolant: 7500 },
        savings: 75000,
        savings_percent: 25,
      },
      opex_annual: Array.from({ length: 5 }, (_, i) => ({
        year: i + 1,
        air_cooling: { total: 50000 + i * 1000, energy: 35000, maintenance: 10000, labor: 5000 },
        immersion_cooling: { total: 40000 + i * 800, energy: 28000, maintenance: 8000, labor: 4000 },
        savings: 10000 + i * 200,
        savings_percent: 20,
      })),
      ...overrides.breakdown,
    },
    environmental: {
      carbon_savings_kg_co2_annual: 15000,
      water_savings_gallons_annual: 25000,
      energy_savings_kwh_annual: 75000,
      carbon_footprint_reduction_percent: 30,
      ...overrides.environmental,
    },
    charts: {
      tco_progression: Array.from({ length: 5 }, (_, i) => ({
        year: i + 1,
        air_cooling: 350000 + i * 50000,
        immersion_cooling: 265000 + i * 40000,
        savings: 85000 + i * 10000,
        cumulative_savings: (i + 1) * 10000,
      })),
      pue_comparison: { air_cooling: 1.45, immersion_cooling: 1.03 },
      cost_categories: {
        'Equipment': 60,
        'Installation': 15,
        'Infrastructure': 15,
        'Annual Energy': 10,
      },
      ...overrides.charts,
    },
    calculated_at: new Date().toISOString(),
    calculation_version: '1.0',
  }),

  // Form testing utilities
  fillForm: async (formData: Record<string, any>) => {
    const { screen } = await import('@testing-library/react');
    const userEvent = await import('@testing-library/user-event');
    
    for (const [field, value] of Object.entries(formData)) {
      const element = screen.getByTestId(`${field}-input`);
      
      if (element.tagName === 'INPUT' && element.type === 'checkbox') {
        if (value) {
          await userEvent.default.click(element);
        }
      } else if (element.tagName === 'SELECT') {
        await userEvent.default.selectOptions(element, value);
      } else {
        await userEvent.default.clear(element);
        await userEvent.default.type(element, value.toString());
      }
    }
  },

  // Accessibility testing utilities
  checkAccessibility: async (element: HTMLElement) => {
    const { axe, toHaveNoViolations } = await import('jest-axe');
    expect.extend(toHaveNoViolations);
    
    const results = await axe(element);
    expect(results).toHaveNoViolations();
    return results;
  },

  // Language testing utilities
  switchLanguage: async (language: 'en' | 'ar') => {
    const { screen } = await import('@testing-library/react');
    const userEvent = await import('@testing-library/user-event');
    
    const languageButton = screen.getByTestId('language-switcher');
    await userEvent.default.click(languageButton);
    
    const languageOption = screen.getByTestId(`language-option-${language}`);
    await userEvent.default.click(languageOption);
  },

  // Performance testing utilities
  measureComponentRenderTime: async (componentRender: () => void): Promise<number> => {
    const start = performance.now();
    componentRender();
    const end = performance.now();
    return end - start;
  },

  // Mock API server utilities
  mockApiSuccess: (endpoint: string, data: any) => {
    mockServer.use(
      rest.post(endpoint, (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(data));
      })
    );
  },

  mockApiError: (endpoint: string, status: number, message: string) => {
    mockServer.use(
      rest.post(endpoint, (req, res, ctx) => {
        return res(
          ctx.status(status),
          ctx.json({ error: message, status })
        );
      })
    );
  },

  mockApiDelay: (endpoint: string, delay: number) => {
    mockServer.use(
      rest.post(endpoint, (req, res, ctx) => {
        return res(
          ctx.delay(delay),
          ctx.status(200),
          ctx.json({ success: true })
        );
      })
    );
  },

  // Chart testing utilities
  getChartData: (chartElement: HTMLElement): any => {
    const dataAttr = chartElement.getAttribute('data-chart-data');
    return dataAttr ? JSON.parse(dataAttr) : null;
  },

  verifyChartRendered: (testId: string): boolean => {
    try {
      const { screen } = require('@testing-library/react');
      const chart = screen.getByTestId(testId);
      return chart !== null;
    } catch {
      return false;
    }
  },
};

// Add global frontend test utilities
global.frontendTestUtils = frontendTestUtils;

declare global {
  var frontendTestUtils: typeof frontendTestUtils;
}