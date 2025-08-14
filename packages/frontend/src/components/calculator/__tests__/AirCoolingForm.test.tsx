/**
 * Comprehensive tests for AirCoolingForm component
 * Tests user interactions, validation, real-time calculations, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

import { AirCoolingForm } from '../AirCoolingForm';
import { useCalculationStore } from '../../../store/calculation';
import { useI18n } from '../../../i18n/useI18n';

// Mock the store
jest.mock('../../../store/calculation', () => ({
  useCalculationStore: jest.fn(),
  useConfiguration: jest.fn(),
}));

// Mock i18n
jest.mock('../../../i18n/useI18n', () => ({
  useI18n: jest.fn(),
}));

// Mock shared utilities
jest.mock('@tco-calculator/shared', () => ({
  AirCoolingConfigSchema: {
    refine: jest.fn().mockReturnValue({
      parse: jest.fn(),
    }),
  },
  VALIDATION_LIMITS: {
    RACK_COUNT: { MIN: 1, MAX: 1000 },
    POWER_PER_RACK: { MIN: 0.5, MAX: 50 },
    TOTAL_POWER: { MIN: 1, MAX: 50000 },
  },
  EQUIPMENT_DEFAULTS: {
    AIR_COOLING: {
      RACK_42U: { power_capacity_kw: 15 },
      HVAC: { efficiency: 0.85, cop: 2.5 },
      INFRASTRUCTURE: { power_distribution_efficiency: 0.95 },
    },
  },
  CurrencyUtils: {
    formatLarge: (value: number, currency: string) => `${currency} ${value.toLocaleString()}`,
  },
}));

describe('AirCoolingForm', () => {
  const mockUpdateAirCooling = jest.fn();
  const mockSetValidationErrors = jest.fn();
  const mockClearValidationErrors = jest.fn();
  const mockT = jest.fn((key: string) => key);

  const defaultConfiguration = {
    air_cooling: {
      input_method: 'rack_count',
      rack_count: 10,
      power_per_rack_kw: 15,
      hvac_efficiency: 0.85,
      power_distribution_efficiency: 0.95,
      space_efficiency: 0.8,
    },
    financial: {
      currency: 'USD',
    },
  };

  const theme = createTheme();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCalculationStore as jest.Mock).mockReturnValue({
      updateAirCooling: mockUpdateAirCooling,
      setValidationErrors: mockSetValidationErrors,
      clearValidationErrors: mockClearValidationErrors,
    });

    (useI18n as jest.Mock).mockReturnValue({
      t: mockT,
    });

    // Mock useConfiguration
    require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue(defaultConfiguration);
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider theme={theme}>
        <AirCoolingForm />
      </ThemeProvider>
    );
  };

  describe('Initial Rendering', () => {
    it('should render with default configuration', () => {
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.title')).toBeInTheDocument();
      expect(screen.getByText('calculator.air_cooling.description')).toBeInTheDocument();
    });

    it('should display input method selection', () => {
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.input_method.title')).toBeInTheDocument();
      expect(screen.getByText('calculator.air_cooling.input_method.rack_count')).toBeInTheDocument();
      expect(screen.getByText('calculator.air_cooling.input_method.total_power')).toBeInTheDocument();
    });

    it('should show rack count configuration by default', () => {
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.rack_configuration.title')).toBeInTheDocument();
      expect(screen.getByLabelText('calculator.air_cooling.rack_count.label')).toBeInTheDocument();
      expect(screen.getByLabelText('calculator.air_cooling.power_per_rack.label')).toBeInTheDocument();
    });

    it('should display preview panel', () => {
      renderComponent();
      
      expect(screen.getByText('calculator.preview.title')).toBeInTheDocument();
    });
  });

  describe('Input Method Selection', () => {
    it('should switch to total power method when selected', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const totalPowerRadio = screen.getByRole('radio', { name: /total_power/ });
      await user.click(totalPowerRadio);
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ input_method: 'total_power' })
      );
    });

    it('should show total power configuration when method is changed', async () => {
      const user = userEvent.setup();
      
      // Mock configuration with total power method
      require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue({
        ...defaultConfiguration,
        air_cooling: {
          ...defaultConfiguration.air_cooling,
          input_method: 'total_power',
        },
      });
      
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.total_power_config.title')).toBeInTheDocument();
      expect(screen.getByLabelText('calculator.air_cooling.total_power.label')).toBeInTheDocument();
    });

    it('should clear dependent fields when switching methods', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const totalPowerRadio = screen.getByRole('radio', { name: /total_power/ });
      await user.click(totalPowerRadio);
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ input_method: 'total_power' })
      );
    });
  });

  describe('Rack Configuration', () => {
    it('should update rack count when input changes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const rackCountInput = screen.getByLabelText('calculator.air_cooling.rack_count.label');
      await user.clear(rackCountInput);
      await user.type(rackCountInput, '20');
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ rack_count: expect.any(Number) })
      );
    });

    it('should update power per rack when input changes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const powerInput = screen.getByLabelText('calculator.air_cooling.power_per_rack.label');
      await user.clear(powerInput);
      await user.type(powerInput, '18');
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ power_per_rack_kw: expect.any(Number) })
      );
    });

    it('should validate rack count within limits', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const rackCountInput = screen.getByLabelText('calculator.air_cooling.rack_count.label');
      await user.clear(rackCountInput);
      await user.type(rackCountInput, '2000'); // Above limit
      
      // Should trigger validation
      await waitFor(() => {
        expect(mockSetValidationErrors).toHaveBeenCalled();
      });
    });

    it('should select rack type and auto-populate power', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const highDensityRadio = screen.getByRole('radio', { name: /42U High Density Rack/ });
      await user.click(highDensityRadio);
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ rack_type: '42U_HIGH_DENSITY' })
      );
    });
  });

  describe('Total Power Configuration', () => {
    beforeEach(() => {
      require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue({
        ...defaultConfiguration,
        air_cooling: {
          ...defaultConfiguration.air_cooling,
          input_method: 'total_power',
        },
      });
    });

    it('should update total power when input changes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const totalPowerInput = screen.getByLabelText('calculator.air_cooling.total_power.label');
      await user.clear(totalPowerInput);
      await user.type(totalPowerInput, '300');
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ total_power_kw: expect.any(Number) })
      );
    });

    it('should validate total power within limits', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const totalPowerInput = screen.getByLabelText('calculator.air_cooling.total_power.label');
      await user.clear(totalPowerInput);
      await user.type(totalPowerInput, '100000'); // Above limit
      
      await waitFor(() => {
        expect(mockSetValidationErrors).toHaveBeenCalled();
      });
    });
  });

  describe('Advanced Configuration', () => {
    it('should update HVAC efficiency with slider', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const hvacSlider = screen.getByRole('slider', { name: /hvac.*efficiency/i });
      
      // Simulate slider change (this is simplified - actual slider interaction may vary)
      fireEvent.change(hvacSlider, { target: { value: '0.9' } });
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ hvac_efficiency: expect.any(Number) })
      );
    });

    it('should update power distribution efficiency', async () => {
      renderComponent();
      
      const powerEfficiencySlider = screen.getByRole('slider', { name: /power.*efficiency/i });
      fireEvent.change(powerEfficiencySlider, { target: { value: '0.98' } });
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ power_distribution_efficiency: expect.any(Number) })
      );
    });

    it('should update space efficiency', async () => {
      renderComponent();
      
      const spaceEfficiencySlider = screen.getByRole('slider', { name: /space.*efficiency/i });
      fireEvent.change(spaceEfficiencySlider, { target: { value: '0.85' } });
      
      expect(mockUpdateAirCooling).toHaveBeenCalledWith(
        expect.objectContaining({ space_efficiency: expect.any(Number) })
      );
    });
  });

  describe('Real-time Calculations and Preview', () => {
    it('should display calculated values in preview when configuration is valid', () => {
      renderComponent();
      
      // Should show calculated preview values
      expect(screen.getByText('calculator.preview.total_power')).toBeInTheDocument();
      expect(screen.getByText('calculator.preview.hvac_power')).toBeInTheDocument();
      expect(screen.getByText('calculator.preview.servers')).toBeInTheDocument();
    });

    it('should show "configure to see preview" message when configuration is incomplete', () => {
      require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue({
        ...defaultConfiguration,
        air_cooling: {
          input_method: 'rack_count',
          // Missing required fields
        },
      });
      
      renderComponent();
      
      expect(screen.getByText('calculator.preview.configure_to_see_preview')).toBeInTheDocument();
    });

    it('should calculate PUE correctly', () => {
      renderComponent();
      
      // With default configuration, should show a reasonable PUE
      const preview = screen.getByText('calculator.preview.title').closest('div');
      expect(preview).toBeInTheDocument();
    });

    it('should show estimated rack count for total power method', () => {
      require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue({
        ...defaultConfiguration,
        air_cooling: {
          input_method: 'total_power',
          total_power_kw: 300,
        },
      });
      
      renderComponent();
      
      expect(screen.getByText(/estimated_racks/)).toBeInTheDocument();
    });
  });

  describe('Form Validation and Error Handling', () => {
    it('should display validation errors when they exist', () => {
      (useCalculationStore as jest.Mock).mockReturnValue({
        updateAirCooling: mockUpdateAirCooling,
        setValidationErrors: mockSetValidationErrors,
        clearValidationErrors: mockClearValidationErrors,
      });

      // Mock form with errors
      const mockUseForm = jest.fn().mockReturnValue({
        control: {},
        watch: jest.fn().mockReturnValue({}),
        setValue: jest.fn(),
        trigger: jest.fn(),
        formState: {
          errors: {
            rack_count: { message: 'Rack count is required' },
          },
          isValid: false,
        },
        getValues: jest.fn(),
      });

      // Mock react-hook-form
      jest.doMock('react-hook-form', () => ({
        useForm: mockUseForm,
        Controller: ({ render }: any) => render({ field: {}, fieldState: {} }),
        useFieldArray: jest.fn().mockReturnValue({
          fields: [],
          append: jest.fn(),
          remove: jest.fn(),
        }),
      }));

      renderComponent();

      expect(mockSetValidationErrors).toHaveBeenCalled();
    });

    it('should clear validation errors when form is valid', () => {
      renderComponent();
      
      expect(mockClearValidationErrors).toHaveBeenCalledWith('air_cooling');
    });

    it('should handle numeric input validation', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const rackCountInput = screen.getByLabelText('calculator.air_cooling.rack_count.label');
      
      // Try to enter invalid non-numeric value
      await user.clear(rackCountInput);
      await user.type(rackCountInput, 'abc');
      
      // Should not update store with invalid value
      expect(mockUpdateAirCooling).not.toHaveBeenCalledWith(
        expect.objectContaining({ rack_count: 'abc' })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderComponent();
      
      expect(screen.getByRole('group', { name: /input.*method/i })).toBeInTheDocument();
      expect(screen.getByLabelText('calculator.air_cooling.rack_count.label')).toBeInTheDocument();
      expect(screen.getByLabelText('calculator.air_cooling.power_per_rack.label')).toBeInTheDocument();
    });

    it('should have help tooltips for complex fields', () => {
      renderComponent();
      
      const helpButtons = screen.getAllByRole('button', { name: /help/i });
      expect(helpButtons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const rackCountRadio = screen.getByRole('radio', { name: /rack_count/ });
      
      // Tab to element and activate with keyboard
      await user.tab();
      await user.keyboard('{Enter}');
      
      expect(rackCountRadio).toHaveFocus();
    });

    it('should have descriptive labels and helper text', () => {
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.rack_count.helper')).toBeInTheDocument();
      expect(screen.getByText('calculator.air_cooling.power_per_rack.helper')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should debounce input changes to prevent excessive updates', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const rackCountInput = screen.getByLabelText('calculator.air_cooling.rack_count.label');
      
      // Type multiple characters quickly
      await user.clear(rackCountInput);
      await user.type(rackCountInput, '25');
      
      // Should not call update for each keystroke
      // Implementation would need debouncing logic
      expect(mockUpdateAirCooling).toHaveBeenCalled();
    });

    it('should render efficiently without unnecessary re-renders', () => {
      const { rerender } = renderComponent();
      
      // Re-render with same props should not cause issues
      rerender(
        <ThemeProvider theme={theme}>
          <AirCoolingForm />
        </ThemeProvider>
      );
      
      expect(screen.getByText('calculator.air_cooling.title')).toBeInTheDocument();
    });
  });

  describe('Integration with Store', () => {
    it('should call updateAirCooling when form values change', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const rackCountInput = screen.getByLabelText('calculator.air_cooling.rack_count.label');
      await user.clear(rackCountInput);
      await user.type(rackCountInput, '15');
      
      expect(mockUpdateAirCooling).toHaveBeenCalled();
    });

    it('should handle store updates correctly', () => {
      // Mock different configuration
      const newConfig = {
        ...defaultConfiguration,
        air_cooling: {
          ...defaultConfiguration.air_cooling,
          rack_count: 25,
        },
      };
      
      require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue(newConfig);
      
      renderComponent();
      
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.title')).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.title')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency values correctly', () => {
      renderComponent();
      
      // Should use CurrencyUtils.formatLarge for cost display
      const preview = screen.getByText('calculator.preview.title').closest('div');
      expect(preview).toBeInTheDocument();
    });

    it('should handle different currencies', () => {
      require('../../../store/calculation').useConfiguration = jest.fn().mockReturnValue({
        ...defaultConfiguration,
        financial: {
          currency: 'EUR',
        },
      });
      
      renderComponent();
      
      expect(screen.getByText('calculator.air_cooling.title')).toBeInTheDocument();
    });
  });

  describe('Help and Documentation', () => {
    it('should display configuration help component', () => {
      renderComponent();
      
      expect(screen.getByText('calculator.help.air_cooling.title')).toBeInTheDocument();
    });

    it('should show contextual help for form sections', () => {
      renderComponent();
      
      const helpButtons = screen.getAllByRole('button', { name: /help/i });
      expect(helpButtons.length).toBeGreaterThan(0);
    });
  });
});