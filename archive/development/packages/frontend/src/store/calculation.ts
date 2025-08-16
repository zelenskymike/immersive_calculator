/**
 * Calculation store using Zustand
 * Manages calculation configuration, results, and workflow state
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  CalculationConfiguration,
  CalculationResults,
  AirCoolingConfig,
  ImmersionCoolingConfig,
  FinancialConfig,
  Currency,
  Locale,
  ValidationWarning
} from '@tco-calculator/shared';

// Calculation workflow steps
export type CalculationStep = 
  | 'air_cooling' 
  | 'immersion_cooling' 
  | 'financial' 
  | 'review' 
  | 'results';

export interface CalculationState {
  // Workflow
  currentStep: CalculationStep;
  completedSteps: Set<CalculationStep>;
  
  // Configuration
  configuration: CalculationConfiguration;
  
  // Results
  results: CalculationResults | null;
  isCalculating: boolean;
  calculationError: string | null;
  
  // Validation
  validationErrors: Record<string, string[]>;
  validationWarnings: ValidationWarning[];
  
  // Session Management
  sessionId: string | null;
  lastSavedAt: string | null;
  isDirty: boolean;
  
  // UI State
  showAdvanced: boolean;
  compareMode: boolean;
}

export interface CalculationActions {
  // Workflow Navigation
  setCurrentStep: (step: CalculationStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeStep: (step: CalculationStep) => void;
  goToStep: (step: CalculationStep) => void;
  
  // Configuration Updates
  updateAirCooling: (config: Partial<AirCoolingConfig>) => void;
  updateImmersionCooling: (config: Partial<ImmersionCoolingConfig>) => void;
  updateFinancial: (config: Partial<FinancialConfig>) => void;
  updateConfiguration: (config: Partial<CalculationConfiguration>) => void;
  resetConfiguration: () => void;
  
  // Calculations
  calculate: () => Promise<void>;
  setResults: (results: CalculationResults) => void;
  clearResults: () => void;
  
  // Validation
  setValidationErrors: (field: string, errors: string[]) => void;
  clearValidationErrors: (field?: string) => void;
  setValidationWarnings: (warnings: ValidationWarning[]) => void;
  
  // Session Management
  setSessionId: (sessionId: string | null) => void;
  markSaved: () => void;
  markDirty: () => void;
  
  // UI State
  setShowAdvanced: (show: boolean) => void;
  toggleAdvanced: () => void;
  setCompareMode: (compare: boolean) => void;
  
  // Utility
  reset: () => void;
  canProceedToNext: () => boolean;
  getCompletionPercentage: () => number;
}

type CalculationStore = CalculationState & CalculationActions;

// Default configuration values
const getDefaultConfiguration = (currency: Currency = 'USD'): CalculationConfiguration => ({
  air_cooling: {
    input_method: 'rack_count',
    rack_count: 100,
    rack_type: '42U_STANDARD',
    power_per_rack_kw: 12,
    hvac_efficiency: 0.85,
    power_distribution_efficiency: 0.95,
    space_efficiency: 0.8,
  },
  immersion_cooling: {
    input_method: 'auto_optimize',
    target_power_kw: 1200,
    coolant_type: '3M_Novec_7100',
    pumping_efficiency: 0.92,
    heat_exchanger_efficiency: 0.95,
  },
  financial: {
    analysis_years: 5,
    currency,
    discount_rate: 0.08,
    energy_cost_kwh: 0.12,
    energy_escalation_rate: 0.03,
    maintenance_escalation_rate: 0.025,
  },
});

// Default state
const defaultState: CalculationState = {
  currentStep: 'air_cooling',
  completedSteps: new Set(),
  configuration: getDefaultConfiguration(),
  results: null,
  isCalculating: false,
  calculationError: null,
  validationErrors: {},
  validationWarnings: [],
  sessionId: null,
  lastSavedAt: null,
  isDirty: false,
  showAdvanced: false,
  compareMode: false,
};

// Step order for navigation
const stepOrder: CalculationStep[] = ['air_cooling', 'immersion_cooling', 'financial', 'review', 'results'];

// Create the store
export const useCalculationStore = create<CalculationStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...defaultState,
        
        // Workflow Navigation
        setCurrentStep: (step) => {
          set((state) => {
            state.currentStep = step;
          });
        },
        
        nextStep: () => {
          set((state) => {
            const currentIndex = stepOrder.indexOf(state.currentStep);
            if (currentIndex < stepOrder.length - 1) {
              state.currentStep = stepOrder[currentIndex + 1];
            }
          });
        },
        
        previousStep: () => {
          set((state) => {
            const currentIndex = stepOrder.indexOf(state.currentStep);
            if (currentIndex > 0) {
              state.currentStep = stepOrder[currentIndex - 1];
            }
          });
        },
        
        completeStep: (step) => {
          set((state) => {
            state.completedSteps.add(step);
          });
        },
        
        goToStep: (step) => {
          set((state) => {
            // Only allow going to completed steps or the next step
            const currentIndex = stepOrder.indexOf(state.currentStep);
            const targetIndex = stepOrder.indexOf(step);
            
            if (state.completedSteps.has(step) || targetIndex <= currentIndex + 1) {
              state.currentStep = step;
            }
          });
        },
        
        // Configuration Updates
        updateAirCooling: (config) => {
          set((state) => {
            Object.assign(state.configuration.air_cooling, config);
            state.isDirty = true;
          });
        },
        
        updateImmersionCooling: (config) => {
          set((state) => {
            Object.assign(state.configuration.immersion_cooling, config);
            state.isDirty = true;
          });
        },
        
        updateFinancial: (config) => {
          set((state) => {
            Object.assign(state.configuration.financial, config);
            state.isDirty = true;
          });
        },
        
        updateConfiguration: (config) => {
          set((state) => {
            if (config.air_cooling) {
              Object.assign(state.configuration.air_cooling, config.air_cooling);
            }
            if (config.immersion_cooling) {
              Object.assign(state.configuration.immersion_cooling, config.immersion_cooling);
            }
            if (config.financial) {
              Object.assign(state.configuration.financial, config.financial);
            }
            state.isDirty = true;
          });
        },
        
        resetConfiguration: () => {
          set((state) => {
            const currency = state.configuration.financial.currency;
            state.configuration = getDefaultConfiguration(currency);
            state.completedSteps.clear();
            state.currentStep = 'air_cooling';
            state.results = null;
            state.validationErrors = {};
            state.validationWarnings = [];
            state.isDirty = false;
          });
        },
        
        // Calculations
        calculate: async () => {
          const { configuration } = get();
          
          set((state) => {
            state.isCalculating = true;
            state.calculationError = null;
          });
          
          try {
            // This would call the API service
            const { calculateTCO } = await import('../services/calculationService');
            const results = await calculateTCO(configuration);
            
            set((state) => {
              state.results = results;
              state.isCalculating = false;
              state.currentStep = 'results';
              state.completedSteps.add('review');
              state.completedSteps.add('results');
            });
          } catch (error) {
            set((state) => {
              state.isCalculating = false;
              state.calculationError = error instanceof Error ? error.message : 'Calculation failed';
            });
            throw error;
          }
        },
        
        setResults: (results) => {
          set((state) => {
            state.results = results;
          });
        },
        
        clearResults: () => {
          set((state) => {
            state.results = null;
            state.calculationError = null;
          });
        },
        
        // Validation
        setValidationErrors: (field, errors) => {
          set((state) => {
            if (errors.length === 0) {
              delete state.validationErrors[field];
            } else {
              state.validationErrors[field] = errors;
            }
          });
        },
        
        clearValidationErrors: (field) => {
          set((state) => {
            if (field) {
              delete state.validationErrors[field];
            } else {
              state.validationErrors = {};
            }
          });
        },
        
        setValidationWarnings: (warnings) => {
          set((state) => {
            state.validationWarnings = warnings;
          });
        },
        
        // Session Management
        setSessionId: (sessionId) => {
          set((state) => {
            state.sessionId = sessionId;
          });
        },
        
        markSaved: () => {
          set((state) => {
            state.lastSavedAt = new Date().toISOString();
            state.isDirty = false;
          });
        },
        
        markDirty: () => {
          set((state) => {
            state.isDirty = true;
          });
        },
        
        // UI State
        setShowAdvanced: (show) => {
          set((state) => {
            state.showAdvanced = show;
          });
        },
        
        toggleAdvanced: () => {
          set((state) => {
            state.showAdvanced = !state.showAdvanced;
          });
        },
        
        setCompareMode: (compare) => {
          set((state) => {
            state.compareMode = compare;
          });
        },
        
        // Utility
        reset: () => {
          set(defaultState);
        },
        
        canProceedToNext: () => {
          const { currentStep, validationErrors } = get();
          
          // Check if current step has any validation errors
          const stepPrefix = currentStep.replace('_', '_');
          const hasErrors = Object.keys(validationErrors).some(key => 
            key.startsWith(stepPrefix)
          );
          
          return !hasErrors;
        },
        
        getCompletionPercentage: () => {
          const { completedSteps } = get();
          const totalSteps = stepOrder.length - 1; // Exclude results step
          const completed = Array.from(completedSteps).filter(step => 
            step !== 'results'
          ).length;
          
          return Math.round((completed / totalSteps) * 100);
        },
      }))
    ),
    {
      name: 'TCO Calculator Calculation Store',
      enabled: import.meta.env.DEV,
    }
  )
);

// Selectors for better performance
export const useCurrentStep = () => useCalculationStore((state) => state.currentStep);
export const useConfiguration = () => useCalculationStore((state) => state.configuration);
export const useResults = () => useCalculationStore((state) => state.results);
export const useIsCalculating = () => useCalculationStore((state) => state.isCalculating);
export const useValidationErrors = () => useCalculationStore((state) => state.validationErrors);
export const useValidationWarnings = () => useCalculationStore((state) => state.validationWarnings);
export const useCompletedSteps = () => useCalculationStore((state) => state.completedSteps);
export const useIsDirty = () => useCalculationStore((state) => state.isDirty);

// Computed selectors
export const useStepProgress = () => useCalculationStore((state) => {
  const currentIndex = stepOrder.indexOf(state.currentStep);
  const totalSteps = stepOrder.length;
  
  return {
    current: currentIndex + 1,
    total: totalSteps,
    percentage: Math.round(((currentIndex + 1) / totalSteps) * 100),
    canGoNext: state.canProceedToNext() && currentIndex < totalSteps - 1,
    canGoPrevious: currentIndex > 0,
  };
});

export const useTotalSavings = () => useCalculationStore((state) => {
  if (!state.results) return null;
  
  return {
    capex: state.results.summary.total_capex_savings,
    opex: state.results.summary.total_opex_savings_5yr,
    total: state.results.summary.total_tco_savings_5yr,
    roi: state.results.summary.roi_percent,
    payback: state.results.summary.payback_months,
    currency: state.configuration.financial.currency,
  };
});

// Auto-save subscription
if (typeof window !== 'undefined') {
  let autoSaveTimeout: NodeJS.Timeout;
  
  useCalculationStore.subscribe(
    (state) => state.isDirty,
    (isDirty) => {
      if (isDirty) {
        // Debounced auto-save
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
          const state = useCalculationStore.getState();
          if (state.isDirty && state.sessionId) {
            try {
              // Auto-save to backend
              const { saveCalculationSession } = await import('../services/calculationService');
              await saveCalculationSession(state.sessionId, state.configuration);
              state.markSaved();
            } catch (error) {
              console.warn('Auto-save failed:', error);
            }
          }
        }, 2000); // 2 second debounce
      }
    }
  );
}