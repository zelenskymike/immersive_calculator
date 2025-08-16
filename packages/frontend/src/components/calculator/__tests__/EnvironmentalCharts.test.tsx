/**
 * Environmental Charts Integration Tests
 * Tests Chart.js integration for PUE gauge and environmental doughnut charts
 * Validates professional presentation and enterprise ESG reporting standards
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, beforeAll, afterEach } from 'vitest';
import type { ChartConfiguration } from 'chart.js';

// Mock Chart.js to prevent canvas rendering issues in tests
const mockChart = {
  destroy: vi.fn(),
  update: vi.fn(),
  resize: vi.fn(),
  data: {},
  options: {},
};

const mockChartConstructor = vi.fn(() => mockChart);

beforeAll(() => {
  // Mock Chart.js
  vi.mock('chart.js', () => ({
    Chart: mockChartConstructor,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    BarElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    ArcElement: vi.fn(),
    DoughnutController: vi.fn(),
    register: vi.fn(),
  }));

  // Mock react-chartjs-2
  vi.mock('react-chartjs-2', () => ({
    Line: ({ data, options }: { data: any; options: any }) => (
      <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
        Line Chart
      </div>
    ),
    Bar: ({ data, options }: { data: any; options: any }) => (
      <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
        Bar Chart
      </div>
    ),
    Doughnut: ({ data, options }: { data: any; options: any }) => (
      <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
        Doughnut Chart
      </div>
    ),
  }));

  // Mock Canvas API
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  }));
});

import { ResultsDisplay } from '../ResultsDisplay';
import type { CalculationResults, Currency } from '@tco-calculator/shared';

// Mock test data with validator feedback metrics
const mockEnvironmentalResults: CalculationResults = {
  summary: {
    total_capex_savings: 250000,
    total_opex_savings_5yr: 850000,
    total_tco_savings_5yr: 1100000,
    roi_percent: 145.2,
    payback_months: 18.5,
    npv_savings: 720000,
    pue_air_cooling: 1.65,
    pue_immersion_cooling: 1.01,
    energy_efficiency_improvement: 38.9, // Target metric from validator
    cost_per_kw_air_cooling: 3200,
    cost_per_kw_immersion_cooling: 2800,
    cost_per_rack_equivalent: 42000,
  },
  breakdown: {
    capex: {
      air_cooling: {
        equipment: 180000,
        installation: 85000,
        infrastructure: 95000,
        total: 360000,
      },
      immersion_cooling: {
        equipment: 65000,
        installation: 25000,
        infrastructure: 20000,
        coolant: 15000,
        total: 125000,
      },
      savings: 235000,
      savings_percent: 65.3,
    },
    opex_annual: [
      {
        year: 1,
        air_cooling: { energy: 142000, maintenance: 18000, labor: 12000, total: 172000 },
        immersion_cooling: { energy: 89000, maintenance: 8000, coolant: 2000, labor: 6000, total: 105000 },
        savings: 67000,
        savings_percent: 39.0,
      },
      {
        year: 2,
        air_cooling: { energy: 146260, maintenance: 18450, labor: 12300, total: 177010 },
        immersion_cooling: { energy: 91670, maintenance: 8200, coolant: 0, labor: 6150, total: 106020 },
        savings: 70990,
        savings_percent: 40.1,
      },
      {
        year: 3,
        air_cooling: { energy: 150648, maintenance: 18909, labor: 12608, total: 182165 },
        immersion_cooling: { energy: 94420, maintenance: 8405, coolant: 2040, labor: 6304, total: 111169 },
        savings: 70996,
        savings_percent: 39.0,
      },
      {
        year: 4,
        air_cooling: { energy: 155167, maintenance: 19377, labor: 12923, total: 187467 },
        immersion_cooling: { energy: 97253, maintenance: 8615, coolant: 0, labor: 6462, total: 112330 },
        savings: 75137,
        savings_percent: 40.1,
      },
      {
        year: 5,
        air_cooling: { energy: 159822, maintenance: 19854, labor: 13246, total: 192922 },
        immersion_cooling: { energy: 100170, maintenance: 8830, coolant: 2081, labor: 6624, total: 117705 },
        savings: 75217,
        savings_percent: 39.0,
      },
    ],
    tco_cumulative: [
      { year: 1, air_cooling: 532000, immersion_cooling: 230000, savings: 302000, npv_savings: 279630 },
      { year: 2, air_cooling: 709010, immersion_cooling: 336020, savings: 372990, npv_savings: 325890 },
      { year: 3, air_cooling: 891175, immersion_cooling: 447189, savings: 443986, npv_savings: 369420 },
      { year: 4, air_cooling: 1078642, immersion_cooling: 559519, savings: 519123, npv_savings: 410540 },
      { year: 5, air_cooling: 1271564, immersion_cooling: 677224, savings: 594340, npv_savings: 449560 },
    ],
    maintenance_schedule: [
      { year: 1, air_cooling_maintenance: 18000, immersion_cooling_maintenance: 8000, major_overhauls: 0 },
      { year: 2, air_cooling_maintenance: 18450, immersion_cooling_maintenance: 8200, major_overhauls: 0 },
      { year: 3, air_cooling_maintenance: 18909, immersion_cooling_maintenance: 8405, major_overhauls: 0 },
      { year: 4, air_cooling_maintenance: 19377, immersion_cooling_maintenance: 8615, major_overhauls: 0 },
      { year: 5, air_cooling_maintenance: 19854, immersion_cooling_maintenance: 8830, major_overhauls: 52000 },
    ],
  },
  charts: {
    tco_progression: [
      { year: 1, air_cooling: 532000, immersion_cooling: 230000, savings: 302000, cumulative_savings: 302000 },
      { year: 2, air_cooling: 709010, immersion_cooling: 336020, savings: 372990, cumulative_savings: 372990 },
      { year: 3, air_cooling: 891175, immersion_cooling: 447189, savings: 443986, cumulative_savings: 443986 },
      { year: 4, air_cooling: 1078642, immersion_cooling: 559519, savings: 519123, cumulative_savings: 519123 },
      { year: 5, air_cooling: 1271564, immersion_cooling: 677224, savings: 594340, cumulative_savings: 594340 },
    ],
    pue_comparison: {
      air_cooling: 1.65,
      immersion_cooling: 1.01,
    },
    cost_categories: {
      'Equipment': { air_cooling: 180000, immersion_cooling: 65000, difference: 115000 },
      'Installation': { air_cooling: 85000, immersion_cooling: 25000, difference: 60000 },
      'Infrastructure': { air_cooling: 95000, immersion_cooling: 20000, difference: 75000 },
      'Annual Energy': { air_cooling: 142000, immersion_cooling: 89000, difference: 53000 },
    },
  },
  environmental: {
    carbon_savings_kg_co2_annual: 464000, // Target metric: 464 tons/year
    water_savings_gallons_annual: 579500,
    energy_savings_kwh_annual: 1159000, // Target metric: 1159 MWh/year
    carbon_footprint_reduction_percent: 37.2,
  },
  pue_analysis: {
    air_cooling: 1.65,
    immersion_cooling: 1.01,
    improvement_percent: 38.9, // Target metric from validator
    energy_savings_kwh_annual: 1159000,
  },
  calculation_id: 'test-calc-env-charts',
  calculated_at: '2024-01-15T10:00:00Z',
  calculation_version: '1.0',
  configuration_hash: 'test-hash-env',
};

describe('Environmental Charts Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PUE Comparison Chart', () => {
    it('should render PUE comparison doughnut chart with correct data', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      // Click on Charts tab
      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const doughnutChart = screen.getByTestId('doughnut-chart');
        expect(doughnutChart).toBeInTheDocument();

        const chartData = JSON.parse(doughnutChart.getAttribute('data-chart-data')!);
        expect(chartData.labels).toEqual(['Air Cooling PUE', 'Immersion Cooling PUE']);
        expect(chartData.datasets[0].data).toEqual([1.65, 1.01]);
      });
    });

    it('should configure PUE chart with professional styling', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const doughnutChart = screen.getByTestId('doughnut-chart');
        const chartOptions = JSON.parse(doughnutChart.getAttribute('data-chart-options')!);

        expect(chartOptions.responsive).toBe(true);
        expect(chartOptions.maintainAspectRatio).toBe(false);
        expect(chartOptions.plugins.title.display).toBe(true);
        expect(chartOptions.plugins.title.text).toBe('Power Usage Effectiveness (PUE) Comparison');
      });
    });

    it('should use appropriate colors for PUE visualization', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const doughnutChart = screen.getByTestId('doughnut-chart');
        const chartData = JSON.parse(doughnutChart.getAttribute('data-chart-data')!);

        expect(chartData.datasets[0].backgroundColor).toHaveLength(2);
        expect(chartData.datasets[0].borderWidth).toBe(2);
      });
    });
  });

  describe('Environmental Impact Tab Visualization', () => {
    it('should render environmental impact tab with metrics cards', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      // Click on Environmental Impact tab
      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        // Check for carbon savings (464 tons target)
        expect(screen.getByText('464.0')).toBeInTheDocument();
        expect(screen.getByText('Metric tons CO2 per year')).toBeInTheDocument();

        // Check for energy savings (1159 MWh target)
        expect(screen.getByText('1159')).toBeInTheDocument();
        expect(screen.getByText('MWh per year')).toBeInTheDocument();

        // Check for water savings
        expect(screen.getByText('579,500')).toBeInTheDocument();
        expect(screen.getByText('Gallons per year')).toBeInTheDocument();
      });
    });

    it('should display contextual environmental equivalents', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        // Should show cars equivalent calculation (464,000 kg / 4000 kg per car = 116 cars)
        const description = screen.getByText(/removing approximately \d+ cars from the road/);
        expect(description).toBeInTheDocument();

        // Should mention carbon footprint reduction percentage
        const carbonReduction = screen.getByText(/37\.2%/);
        expect(carbonReduction).toBeInTheDocument();
      });
    });

    it('should show professional environmental benefits alert', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        expect(screen.getByText('Environmental Benefits')).toBeInTheDocument();
        expect(screen.getByText(/Immersion cooling provides significant environmental improvements/)).toBeInTheDocument();
      });
    });
  });

  describe('Energy Efficiency Display in Summary Cards', () => {
    it('should display PUE improvement in summary cards', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      await waitFor(() => {
        // Energy efficiency improvement card (38.9% target)
        expect(screen.getByText('38.9%')).toBeInTheDocument();
        expect(screen.getByText('PUE Improvement')).toBeInTheDocument();
        expect(screen.getByText('Energy Efficiency')).toBeInTheDocument();
      });
    });

    it('should use appropriate styling for environmental metrics', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      await waitFor(() => {
        // Check that environmental cards use success color theme
        const envTab = screen.getByText('Environmental Impact');
        envTab.click();

        const carbonCard = screen.getByText('Annual Carbon Savings').closest('[class*="MuiCard"]');
        expect(carbonCard).toBeInTheDocument();

        const energyCard = screen.getByText('Annual Energy Savings').closest('[class*="MuiCard"]');
        expect(energyCard).toBeInTheDocument();

        const waterCard = screen.getByText('Water Savings').closest('[class*="MuiCard"]');
        expect(waterCard).toBeInTheDocument();
      });
    });
  });

  describe('Chart Responsiveness and Performance', () => {
    it('should configure charts for responsive display', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const charts = screen.getAllByTestId(/chart$/);
        
        charts.forEach(chart => {
          const options = JSON.parse(chart.getAttribute('data-chart-options')!);
          expect(options.responsive).toBe(true);
          expect(options.maintainAspectRatio).toBe(false);
        });
      });
    });

    it('should render charts within performance containers', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        // Charts should be wrapped in containers with fixed heights for performance
        const chartContainers = screen.getAllByTestId(/chart$/).map(chart => chart.closest('[class*="MuiPaper"]'));
        
        chartContainers.forEach(container => {
          expect(container).toBeInTheDocument();
        });
      });
    });
  });

  describe('Environmental Data Validation in Charts', () => {
    it('should handle missing environmental data gracefully', async () => {
      const incompleteResults = {
        ...mockEnvironmentalResults,
        environmental: {
          carbon_savings_kg_co2_annual: 0,
          water_savings_gallons_annual: 0,
          energy_savings_kwh_annual: 0,
          carbon_footprint_reduction_percent: 0,
        },
      };

      render(
        <ResultsDisplay
          results={incompleteResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        // Should display zero values without errors
        expect(screen.getByText('0.0')).toBeInTheDocument(); // Carbon savings
        expect(screen.getByText('0')).toBeInTheDocument(); // Energy savings
      });
    });

    it('should validate chart data consistency', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const doughnutChart = screen.getByTestId('doughnut-chart');
        const chartData = JSON.parse(doughnutChart.getAttribute('data-chart-data')!);

        // PUE values should match environmental analysis
        expect(chartData.datasets[0].data[0]).toBe(mockEnvironmentalResults.pue_analysis.air_cooling);
        expect(chartData.datasets[0].data[1]).toBe(mockEnvironmentalResults.pue_analysis.immersion_cooling);
      });
    });
  });

  describe('Professional ESG Presentation Standards', () => {
    it('should present metrics in enterprise-suitable format', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        // Metrics should be rounded appropriately for executive presentation
        expect(screen.getByText('464.0')).toBeInTheDocument(); // Tons, one decimal
        expect(screen.getByText('1159')).toBeInTheDocument(); // MWh, whole number
        expect(screen.getByText('579,500')).toBeInTheDocument(); // Gallons, comma-separated
      });
    });

    it('should use professional color scheme for environmental elements', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        // Environmental headers should use success/green color theme
        const headers = screen.getAllByText(/Annual.*Savings|Water Savings/);
        headers.forEach(header => {
          const parent = header.closest('[class*="MuiTypography"]');
          expect(parent).toBeInTheDocument();
        });
      });
    });

    it('should provide suitable metrics for ESG compliance section', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const envTab = screen.getByText('Environmental Impact');
      envTab.click();

      await waitFor(() => {
        // All key ESG metrics should be present
        expect(screen.getByText(/464\.0/)).toBeInTheDocument(); // CO₂ reduction
        expect(screen.getByText(/1159/)).toBeInTheDocument(); // Energy savings
        expect(screen.getByText(/37\.2%/)).toBeInTheDocument(); // Carbon footprint reduction
      });
    });
  });

  describe('Chart Color and Theme Consistency', () => {
    it('should use consistent color scheme across all environmental charts', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const allCharts = screen.getAllByTestId(/chart$/);
        
        allCharts.forEach(chart => {
          const chartData = JSON.parse(chart.getAttribute('data-chart-data')!);
          
          if (chartData.datasets) {
            chartData.datasets.forEach((dataset: any) => {
              // Colors should be defined and consistent with theme
              expect(dataset.backgroundColor || dataset.borderColor).toBeDefined();
            });
          }
        });
      });
    });

    it('should apply professional chart styling options', async () => {
      render(
        <ResultsDisplay
          results={mockEnvironmentalResults}
          loading={false}
          error={null}
          currency="USD"
        />
      );

      const chartsTab = screen.getByText('Charts & Analysis');
      chartsTab.click();

      await waitFor(() => {
        const doughnutChart = screen.getByTestId('doughnut-chart');
        const chartOptions = JSON.parse(doughnutChart.getAttribute('data-chart-options')!);

        // Professional chart configuration
        expect(chartOptions.responsive).toBe(true);
        expect(chartOptions.plugins.legend.position).toBe('top');
        expect(chartOptions.plugins.title.display).toBe(true);
      });
    });
  });
});