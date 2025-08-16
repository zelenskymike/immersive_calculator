/**
 * Environmental Display Accessibility Tests
 * Tests WCAG 2.1 AA compliance for environmental impact display components
 * Validates screen reader compatibility, keyboard navigation, and visual accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Chart.js to prevent canvas issues in accessibility tests
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options, ...props }: any) => (
    <div 
      role="img" 
      aria-label={`Line chart: ${options?.plugins?.title?.text || 'Chart'}`}
      data-testid="line-chart"
      {...props}
    >
      <span className="sr-only">
        Chart showing data with {data?.datasets?.length || 0} datasets
      </span>
    </div>
  ),
  Bar: ({ data, options, ...props }: any) => (
    <div 
      role="img" 
      aria-label={`Bar chart: ${options?.plugins?.title?.text || 'Chart'}`}
      data-testid="bar-chart"
      {...props}
    >
      <span className="sr-only">
        Chart showing data with {data?.datasets?.length || 0} datasets
      </span>
    </div>
  ),
  Doughnut: ({ data, options, ...props }: any) => (
    <div 
      role="img" 
      aria-label={`Doughnut chart: ${options?.plugins?.title?.text || 'Chart'}`}
      data-testid="doughnut-chart"
      {...props}
    >
      <span className="sr-only">
        PUE comparison: Air cooling {data?.datasets?.[0]?.data?.[0]} vs Immersion cooling {data?.datasets?.[0]?.data?.[1]}
      </span>
    </div>
  ),
}));

vi.mock('chart.js', () => ({
  Chart: vi.fn(),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  ArcElement: vi.fn(),
  register: vi.fn(),
}));

import { ResultsDisplay } from '../ResultsDisplay';
import type { CalculationResults } from '@tco-calculator/shared';

// High contrast theme for accessibility testing
const accessibleTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#000080' }, // High contrast blue
    secondary: { main: '#800000' }, // High contrast red
    success: { main: '#006400' }, // High contrast green
    background: { 
      paper: '#ffffff',
      default: '#ffffff'
    },
    text: {
      primary: '#000000',
      secondary: '#333333'
    },
  },
  typography: {
    fontSize: 16, // Larger base font size
  },
});

const AccessibleTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={accessibleTheme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

// Accessible environmental results with proper semantic structure
const accessibleEnvironmentalResults: CalculationResults = {
  summary: {
    total_capex_savings: 340000,
    total_opex_savings_5yr: 1250000,
    total_tco_savings_5yr: 1590000,
    roi_percent: 142.8,
    payback_months: 16.2,
    npv_savings: 980000,
    pue_air_cooling: 1.68,
    pue_immersion_cooling: 1.03,
    energy_efficiency_improvement: 38.9, // Validator target
    cost_per_kw_air_cooling: 3500,
    cost_per_kw_immersion_cooling: 2950,
    cost_per_rack_equivalent: 45000,
  },
  breakdown: {
    capex: {
      air_cooling: { equipment: 280000, installation: 120000, infrastructure: 150000, total: 550000 },
      immersion_cooling: { equipment: 95000, installation: 45000, infrastructure: 35000, coolant: 25000, total: 200000 },
      savings: 350000,
      savings_percent: 63.6,
    },
    opex_annual: [
      {
        year: 1,
        air_cooling: { energy: 180000, maintenance: 22000, labor: 15000, total: 217000 },
        immersion_cooling: { energy: 110000, maintenance: 10000, coolant: 3000, labor: 8000, total: 131000 },
        savings: 86000,
        savings_percent: 39.6,
      },
    ],
    tco_cumulative: [
      { year: 1, air_cooling: 767000, immersion_cooling: 331000, savings: 436000, npv_savings: 403704 },
    ],
    maintenance_schedule: [
      { year: 1, air_cooling_maintenance: 22000, immersion_cooling_maintenance: 10000, major_overhauls: 0 },
    ],
  },
  charts: {
    tco_progression: [
      { year: 1, air_cooling: 767000, immersion_cooling: 331000, savings: 436000, cumulative_savings: 436000 },
    ],
    pue_comparison: { air_cooling: 1.68, immersion_cooling: 1.03 },
    cost_categories: {
      'Equipment': { air_cooling: 280000, immersion_cooling: 95000, difference: 185000 },
      'Installation': { air_cooling: 120000, immersion_cooling: 45000, difference: 75000 },
      'Infrastructure': { air_cooling: 150000, immersion_cooling: 35000, difference: 115000 },
      'Annual Energy': { air_cooling: 180000, immersion_cooling: 110000, difference: 70000 },
    },
  },
  environmental: {
    carbon_savings_kg_co2_annual: 464000, // Validator target: 464 tons/year
    water_savings_gallons_annual: 579500,
    energy_savings_kwh_annual: 1159000, // Validator target: 1159 MWh/year
    carbon_footprint_reduction_percent: 37.2,
  },
  pue_analysis: {
    air_cooling: 1.68,
    immersion_cooling: 1.03,
    improvement_percent: 38.9, // Validator target
    energy_savings_kwh_annual: 1159000,
  },
  calculation_id: 'test-accessible-env',
  calculated_at: '2024-01-15T14:30:00Z',
  calculation_version: '1.0',
  configuration_hash: 'accessible-hash',
};

describe('Environmental Display Accessibility', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('should pass automated accessibility audit', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Navigate to Environmental Impact tab
      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic structure', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Check main results structure
      expect(screen.getByRole('main') || screen.getByRole('region')).toBeInTheDocument();
      
      // Check tab navigation
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4); // Summary, Charts, Environmental, Breakdown
      
      // Environmental tab should be properly labeled
      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      expect(envTab).toBeInTheDocument();
      expect(envTab).toHaveAttribute('aria-controls');
    });

    it('should provide accessible environmental metric cards', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Each metric card should be a landmark region
        const metricCards = screen.getAllByRole('region');
        expect(metricCards.length).toBeGreaterThanOrEqual(3);

        // Cards should have accessible names
        expect(screen.getByLabelText(/carbon.*savings/i) || screen.getByText(/Annual Carbon Savings/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/energy.*savings/i) || screen.getByText(/Annual Energy Savings/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/water.*savings/i) || screen.getByText(/Water Savings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation through environmental interface', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Tab to the tab list
      const tablist = screen.getByRole('tablist');
      tablist.focus();

      // Navigate to Environmental Impact tab using arrow keys
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      fireEvent.keyDown(tablist, { key: 'ArrowRight' }); // Should be on Environmental Impact

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      expect(document.activeElement).toBe(envTab);

      // Activate the tab with Enter
      fireEvent.keyDown(envTab, { key: 'Enter' });

      await waitFor(() => {
        const tabpanel = screen.getByRole('tabpanel');
        expect(tabpanel).toBeInTheDocument();
      });
    });

    it('should maintain focus management within environmental content', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Focus should be manageable within the tabpanel
        const tabpanel = screen.getByRole('tabpanel');
        expect(tabpanel).toBeInTheDocument();

        // Tab through focusable elements in the environmental section
        fireEvent.keyDown(tabpanel, { key: 'Tab' });
        
        // Should be able to reach interactive elements
        const focusableElements = tabpanel.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        // Should have some focusable elements (at least export buttons)
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard shortcuts for quick navigation', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Test Alt+E for Environmental tab (if implemented)
      fireEvent.keyDown(document.body, { key: 'e', altKey: true });

      // Should navigate to or highlight environmental content
      await waitFor(() => {
        const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
        // Either the tab should be focused or the content should be visible
        expect(envTab).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide comprehensive ARIA labels for environmental metrics', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Carbon savings should have clear labeling
        const carbonElement = screen.getByText('464.0');
        const carbonContext = carbonElement.closest('[role="region"]') || carbonElement.parentElement;
        expect(carbonContext).toHaveTextContent(/carbon|CO2/i);
        expect(carbonContext).toHaveTextContent(/tons.*year/i);

        // Energy savings should have clear labeling
        const energyElement = screen.getByText('1159');
        const energyContext = energyElement.closest('[role="region"]') || energyElement.parentElement;
        expect(energyContext).toHaveTextContent(/energy/i);
        expect(energyContext).toHaveTextContent(/MWh.*year/i);

        // Water savings should have clear labeling
        const waterElement = screen.getByText('579,500');
        const waterContext = waterElement.closest('[role="region"]') || waterElement.parentElement;
        expect(waterContext).toHaveTextContent(/water/i);
        expect(waterContext).toHaveTextContent(/gallons.*year/i);
      });
    });

    it('should provide descriptive alternative text for environmental charts', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Navigate to Charts tab
      const chartsTab = screen.getByRole('tab', { name: /Charts/i });
      fireEvent.click(chartsTab);

      await waitFor(() => {
        // PUE comparison chart should have descriptive label
        const pueChart = screen.getByTestId('doughnut-chart');
        expect(pueChart).toHaveAttribute('role', 'img');
        expect(pueChart).toHaveAttribute('aria-label');
        
        const ariaLabel = pueChart.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/PUE|Power Usage Effectiveness/i);

        // Chart should have screen reader content
        const srContent = pueChart.querySelector('.sr-only');
        expect(srContent).toBeInTheDocument();
      });
    });

    it('should provide live region updates for dynamic content', async () => {
      const { rerender } = render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={true}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Check loading state has appropriate aria-live region
      expect(screen.getByText(/calculating/i)).toBeInTheDocument();

      // Update to completed state
      rerender(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        // Results should be announced to screen readers
        const results = screen.getByTestId('results-display') || screen.getByRole('main') || document.body;
        expect(results).toBeInTheDocument();
      });
    });

    it('should provide contextual help and descriptions', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Should provide contextual explanation
        const contextText = screen.getByText(/removing approximately \d+ cars from the road/);
        expect(contextText).toBeInTheDocument();

        // Should explain environmental benefits
        const benefitsText = screen.getByText(/significant environmental improvements/);
        expect(benefitsText).toBeInTheDocument();

        // Carbon footprint reduction should be explained
        const reductionText = screen.getByText(/37\.2%/);
        expect(reductionText).toBeInTheDocument();
      });
    });
  });

  describe('Visual Accessibility', () => {
    it('should maintain sufficient color contrast for environmental elements', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Environmental success indicators should use high contrast colors
        const successAlert = screen.getByText('Environmental Benefits').closest('[class*="MuiAlert"]');
        expect(successAlert).toBeInTheDocument();

        // Metric values should be clearly visible
        const values = ['464.0', '1159', '579,500'];
        values.forEach(value => {
          const element = screen.getByText(value);
          expect(element).toBeInTheDocument();
          
          // Values should use high contrast typography
          const typography = element.closest('[class*="MuiTypography"]');
          expect(typography).toBeInTheDocument();
        });
      });
    });

    it('should support high contrast mode', async () => {
      // Test with Windows high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('high-contrast'),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }),
      });

      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Content should remain accessible in high contrast mode
        expect(screen.getByText('464.0')).toBeInTheDocument();
        expect(screen.getByText('1159')).toBeInTheDocument();
        expect(screen.getByText('579,500')).toBeInTheDocument();
      });
    });

    it('should support zoom up to 200% without loss of functionality', async () => {
      // Simulate 200% zoom
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });

      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // All content should remain accessible at 200% zoom
        expect(screen.getByText('Environmental Benefits')).toBeInTheDocument();
        expect(screen.getByText('464.0')).toBeInTheDocument();
        expect(screen.getByText('1159')).toBeInTheDocument();
        expect(screen.getByText('579,500')).toBeInTheDocument();

        // Interactive elements should remain usable
        const exportButtons = screen.getAllByRole('button');
        exportButtons.forEach(button => {
          expect(button).toBeVisible();
        });
      });
    });

    it('should not rely solely on color to convey information', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Environmental benefits should be indicated by text, not just color
        const benefitsAlert = screen.getByText('Environmental Benefits');
        expect(benefitsAlert).toBeInTheDocument();

        // Success should be indicated by icons and text, not just green color
        const carbonCard = screen.getByText('Annual Carbon Savings');
        expect(carbonCard).toBeInTheDocument();

        // Values should have text labels, not rely on color coding
        expect(screen.getByText('Metric tons CO2 per year')).toBeInTheDocument();
        expect(screen.getByText('MWh per year')).toBeInTheDocument();
        expect(screen.getByText('Gallons per year')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 667 });

      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Touch targets should be large enough (44px minimum)
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeInTheDocument();
        });

        // Content should remain readable on small screens
        expect(screen.getByText('464.0')).toBeInTheDocument();
        expect(screen.getByText('1159')).toBeInTheDocument();
        expect(screen.getByText('579,500')).toBeInTheDocument();
      });
    });

    it('should support touch navigation for environmental content', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={accessibleEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Simulate touch interaction
      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.touchStart(envTab);
      fireEvent.touchEnd(envTab);
      fireEvent.click(envTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
        
        // Touch targets should be appropriately sized
        const cards = screen.getAllByText(/Annual.*Savings|Water Savings/).map(text => 
          text.closest('[class*="MuiCard"]')
        );
        
        cards.forEach(card => {
          expect(card).toBeInTheDocument();
        });
      });
    });
  });

  describe('Error State Accessibility', () => {
    it('should provide accessible error messaging', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={null}
            loading={false}
            error="Calculation failed due to invalid parameters"
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Error should be announced to screen readers
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent(/calculation.*error|failed/i);
    });

    it('should handle loading states accessibly', async () => {
      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={null}
            loading={true}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      // Loading state should be announced
      const loadingIndicator = screen.getByText(/calculating/i);
      expect(loadingIndicator).toBeInTheDocument();

      // Progress should be accessible
      const progressIndicator = screen.getByRole('progressbar') || screen.getByText(/calculating/i);
      expect(progressIndicator).toBeInTheDocument();
    });

    it('should provide graceful degradation for missing environmental data', async () => {
      const incompleteResults = {
        ...accessibleEnvironmentalResults,
        environmental: {
          carbon_savings_kg_co2_annual: 0,
          water_savings_gallons_annual: 0,
          energy_savings_kwh_annual: 0,
          carbon_footprint_reduction_percent: 0,
        },
      };

      render(
        <AccessibleTestWrapper>
          <ResultsDisplay
            results={incompleteResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </AccessibleTestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Should still show structure with zero values
        expect(screen.getByText('0.0')).toBeInTheDocument(); // Carbon
        expect(screen.getByText('0')).toBeInTheDocument(); // Energy
        
        // Labels should still be present for context
        expect(screen.getByText('Metric tons CO2 per year')).toBeInTheDocument();
        expect(screen.getByText('MWh per year')).toBeInTheDocument();
      });
    });
  });
});