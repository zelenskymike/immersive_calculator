/**
 * Environmental Display UI/UX Tests
 * Tests professional presentation requirements for environmental impact display
 * Validates responsive design, visual quality, and enterprise ESG reporting standards
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => <div data-testid="line-chart">Line Chart</div>,
  Bar: ({ data, options }: any) => <div data-testid="bar-chart">Bar Chart</div>,
  Doughnut: ({ data, options }: any) => <div data-testid="doughnut-chart">Doughnut Chart</div>,
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

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    success: { main: '#2e7d32' },
    background: { paper: '#ffffff' },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

// Professional-grade environmental results for UI testing
const professionalEnvironmentalResults: CalculationResults = {
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
  calculation_id: 'test-professional-env',
  calculated_at: '2024-01-15T14:30:00Z',
  calculation_version: '1.0',
  configuration_hash: 'professional-hash',
};

describe('Environmental Display UI/UX', () => {
  describe('Professional Visual Presentation', () => {
    it('should display environmental impact tab with professional styling', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      // Navigate to Environmental Impact tab
      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      expect(envTab).toBeInTheDocument();
      
      fireEvent.click(envTab);

      await waitFor(() => {
        // Check for professional environmental benefits alert
        const benefitsAlert = screen.getByText('Environmental Benefits');
        expect(benefitsAlert).toBeInTheDocument();
        
        const alertContainer = benefitsAlert.closest('[class*="MuiAlert"]');
        expect(alertContainer).toBeInTheDocument();
      });
    });

    it('should use green color scheme for environmental metrics', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Environmental metric headers should use success color
        const carbonHeader = screen.getByText('Annual Carbon Savings');
        const energyHeader = screen.getByText('Annual Energy Savings');
        const waterHeader = screen.getByText('Water Savings');

        [carbonHeader, energyHeader, waterHeader].forEach(header => {
          const parentCard = header.closest('[class*="MuiCard"]');
          expect(parentCard).toBeInTheDocument();
        });
      });
    });

    it('should display metrics in enterprise-appropriate format', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Validator target metrics should be displayed professionally
        expect(screen.getByText('464.0')).toBeInTheDocument(); // CO₂ tons/year
        expect(screen.getByText('Metric tons CO2 per year')).toBeInTheDocument();

        expect(screen.getByText('1159')).toBeInTheDocument(); // Energy MWh/year
        expect(screen.getByText('MWh per year')).toBeInTheDocument();

        expect(screen.getByText('579,500')).toBeInTheDocument(); // Water gallons/year
        expect(screen.getByText('Gallons per year')).toBeInTheDocument();
      });
    });

    it('should show contextual equivalents for C-suite understanding', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Should show cars equivalent calculation
        const carsText = screen.getByText(/removing approximately \d+ cars from the road annually/);
        expect(carsText).toBeInTheDocument();

        // Should mention carbon footprint reduction percentage
        const reductionText = screen.getByText(/37\.2%/);
        expect(reductionText).toBeInTheDocument();
      });
    });
  });

  describe('Energy Efficiency Summary Display', () => {
    it('should prominently display PUE improvement in summary cards', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        // Energy efficiency card should be visible
        const efficiencyCard = screen.getByText('Energy Efficiency').closest('[class*="MuiCard"]');
        expect(efficiencyCard).toBeInTheDocument();

        // Should show 38.9% improvement (validator target)
        expect(screen.getByText('38.9%')).toBeInTheDocument();
        expect(screen.getByText('PUE Improvement')).toBeInTheDocument();
      });
    });

    it('should use appropriate color for energy efficiency metrics', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const efficiencyValue = screen.getByText('38.9%');
        expect(efficiencyValue).toBeInTheDocument();
        
        // Value should be styled with theme secondary color
        const valueElement = efficiencyValue.closest('[class*="MuiTypography"]');
        expect(valueElement).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt environmental cards for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });

      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Cards should still be readable on mobile
        const cards = screen.getAllByText(/Annual.*Savings|Water Savings/).map(text => 
          text.closest('[class*="MuiCard"]')
        );
        
        cards.forEach(card => {
          expect(card).toBeInTheDocument();
        });
      });
    });

    it('should maintain readability across different screen sizes', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        Object.defineProperty(window, 'innerWidth', { writable: true, value: viewport.width });
        Object.defineProperty(window, 'innerHeight', { writable: true, value: viewport.height });

        render(
          <TestWrapper>
            <ResultsDisplay
              results={professionalEnvironmentalResults}
              loading={false}
              error={null}
              currency="USD"
            />
          </TestWrapper>
        );

        const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
        fireEvent.click(envTab);

        await waitFor(() => {
          // Key metrics should be visible at all screen sizes
          expect(screen.getByText('464.0')).toBeInTheDocument();
          expect(screen.getByText('1159')).toBeInTheDocument();
          expect(screen.getByText('579,500')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Tab Navigation and Layout', () => {
    it('should provide clear navigation to environmental tab', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      // Environmental tab should be clearly labeled with eco icon
      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      expect(envTab).toBeInTheDocument();

      // Tab should be accessible and clickable
      expect(envTab).toHaveAttribute('role', 'tab');
      
      fireEvent.click(envTab);

      await waitFor(() => {
        const tabPanel = screen.getByRole('tabpanel');
        expect(tabPanel).toBeInTheDocument();
      });
    });

    it('should organize environmental content in logical grid layout', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Three main metric cards should be present
        const carbonCard = screen.getByText('Annual Carbon Savings').closest('[class*="MuiCard"]');
        const energyCard = screen.getByText('Annual Energy Savings').closest('[class*="MuiCard"]');
        const waterCard = screen.getByText('Water Savings').closest('[class*="MuiCard"]');

        [carbonCard, energyCard, waterCard].forEach(card => {
          expect(card).toBeInTheDocument();
        });

        // Context explanation should be present
        const contextText = screen.getByText(/carbon footprint reduction/);
        expect(contextText).toBeInTheDocument();
      });
    });
  });

  describe('ESG Compliance Visual Standards', () => {
    it('should meet enterprise ESG reporting visual standards', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Professional success alert for environmental benefits
        const alert = screen.getByText('Environmental Benefits').closest('[class*="MuiAlert"]');
        expect(alert).toBeInTheDocument();

        // Clear metric categorization
        expect(screen.getByText('Annual Carbon Savings')).toBeInTheDocument();
        expect(screen.getByText('Annual Energy Savings')).toBeInTheDocument();
        expect(screen.getByText('Water Savings')).toBeInTheDocument();

        // Values formatted for executive consumption
        expect(screen.getByText('464.0')).toBeInTheDocument(); // Clear, rounded
        expect(screen.getByText('1159')).toBeInTheDocument(); // Whole numbers
        expect(screen.getByText('579,500')).toBeInTheDocument(); // Comma-separated
      });
    });

    it('should use appropriate typography hierarchy for ESG reporting', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Headers should use appropriate typography
        const headers = screen.getAllByText(/Annual.*Savings|Water Savings/);
        headers.forEach(header => {
          const typography = header.closest('[class*="MuiTypography"]');
          expect(typography).toBeInTheDocument();
        });

        // Values should be prominent
        const values = ['464.0', '1159', '579,500'];
        values.forEach(value => {
          const valueElement = screen.getByText(value);
          expect(valueElement).toBeInTheDocument();
        });
      });
    });

    it('should provide professional context for stakeholder understanding', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Professional description of benefits
        const benefitsText = screen.getByText(/Immersion cooling provides significant environmental improvements/);
        expect(benefitsText).toBeInTheDocument();

        // Contextual equivalents for stakeholder understanding
        const equivalentsText = screen.getByText(/removing approximately \d+ cars from the road annually/);
        expect(equivalentsText).toBeInTheDocument();

        // Carbon footprint percentage for ESG metrics
        const footprintText = screen.getByText(/37\.2%/);
        expect(footprintText).toBeInTheDocument();
      });
    });
  });

  describe('Visual Hierarchy and Information Architecture', () => {
    it('should establish clear visual hierarchy for environmental metrics', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Primary metrics should be in cards
        const primaryMetrics = ['464.0', '1159', '579,500'];
        primaryMetrics.forEach(metric => {
          const metricElement = screen.getByText(metric);
          const card = metricElement.closest('[class*="MuiCard"]');
          expect(card).toBeInTheDocument();
        });

        // Secondary information should be clearly subordinate
        const units = ['Metric tons CO2 per year', 'MWh per year', 'Gallons per year'];
        units.forEach(unit => {
          const unitElement = screen.getByText(unit);
          expect(unitElement).toBeInTheDocument();
        });
      });
    });

    it('should group related environmental information logically', async () => {
      render(
        <TestWrapper>
          <ResultsDisplay
            results={professionalEnvironmentalResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Benefits alert should be at the top
        const alert = screen.getByText('Environmental Benefits');
        expect(alert).toBeInTheDocument();

        // Metric cards should be grouped together
        const cards = screen.getAllByText(/Annual.*Savings|Water Savings/).map(text => 
          text.closest('[class*="MuiCard"]')
        );
        expect(cards).toHaveLength(3);

        // Context explanation should follow metrics
        const context = screen.getByText(/carbon footprint reduction/);
        expect(context).toBeInTheDocument();
      });
    });
  });

  describe('Error States and Edge Cases', () => {
    it('should handle zero environmental impact gracefully', async () => {
      const zeroImpactResults = {
        ...professionalEnvironmentalResults,
        environmental: {
          carbon_savings_kg_co2_annual: 0,
          water_savings_gallons_annual: 0,
          energy_savings_kwh_annual: 0,
          carbon_footprint_reduction_percent: 0,
        },
      };

      render(
        <TestWrapper>
          <ResultsDisplay
            results={zeroImpactResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Should display zero values without breaking layout
        expect(screen.getByText('0.0')).toBeInTheDocument(); // Carbon
        expect(screen.getByText('0')).toBeInTheDocument(); // Energy
      });
    });

    it('should maintain layout integrity with extreme values', async () => {
      const extremeResults = {
        ...professionalEnvironmentalResults,
        environmental: {
          carbon_savings_kg_co2_annual: 999999999, // Very large number
          water_savings_gallons_annual: 123456789,
          energy_savings_kwh_annual: 87654321,
          carbon_footprint_reduction_percent: 95.7,
        },
      };

      render(
        <TestWrapper>
          <ResultsDisplay
            results={extremeResults}
            loading={false}
            error={null}
            currency="USD"
          />
        </TestWrapper>
      );

      const envTab = screen.getByRole('tab', { name: /Environmental Impact/i });
      fireEvent.click(envTab);

      await waitFor(() => {
        // Large numbers should be formatted appropriately
        const carbonValue = screen.getByText('1000000.0'); // Should be converted to tons
        expect(carbonValue).toBeInTheDocument();

        // Layout should not break with large numbers
        const cards = screen.getAllByText(/Annual.*Savings|Water Savings/).map(text => 
          text.closest('[class*="MuiCard"]')
        );
        expect(cards).toHaveLength(3);
      });
    });
  });
});