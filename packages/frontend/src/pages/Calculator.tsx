/**
 * Main Calculator Page - Wizard-style form with step-by-step configuration
 * Implements comprehensive UI with real-time validation and calculation preview
 */

import React, { useEffect, useMemo } from 'react';
import {
  Container,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Fade,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Calculate as CalculateIcon,
  Refresh as ResetIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Import form components
import { AirCoolingForm } from '../components/calculator/AirCoolingForm';
import { ImmersionCoolingForm } from '../components/calculator/ImmersionCoolingForm';
import { FinancialConfigForm } from '../components/calculator/FinancialConfigForm';
import { ConfigurationReview } from '../components/calculator/ConfigurationReview';
import { CalculationResults } from '../components/calculator/CalculationResults';

// Import store and hooks
import {
  useCalculationStore,
  useCurrentStep,
  useStepProgress,
  useIsCalculating,
  useValidationErrors,
  useValidationWarnings,
  type CalculationStep,
} from '../store/calculation';

// Import utilities
import { useI18n } from '../i18n/useI18n';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

/**
 * Step configuration with metadata
 */
const stepConfig: Record<CalculationStep, {
  key: CalculationStep;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  component: React.ComponentType;
  optional?: boolean;
}> = {
  air_cooling: {
    key: 'air_cooling',
    titleKey: 'calculator.steps.air_cooling.title',
    descriptionKey: 'calculator.steps.air_cooling.description',
    icon: <></>, // TODO: Add proper icons
    component: AirCoolingForm,
  },
  immersion_cooling: {
    key: 'immersion_cooling',
    titleKey: 'calculator.steps.immersion_cooling.title',
    descriptionKey: 'calculator.steps.immersion_cooling.description',
    icon: <></>,
    component: ImmersionCoolingForm,
  },
  financial: {
    key: 'financial',
    titleKey: 'calculator.steps.financial.title',
    descriptionKey: 'calculator.steps.financial.description',
    icon: <></>,
    component: FinancialConfigForm,
  },
  review: {
    key: 'review',
    titleKey: 'calculator.steps.review.title',
    descriptionKey: 'calculator.steps.review.description',
    icon: <></>,
    component: ConfigurationReview,
  },
  results: {
    key: 'results',
    titleKey: 'calculator.steps.results.title',
    descriptionKey: 'calculator.steps.results.description',
    icon: <></>,
    component: CalculationResults,
  },
};

const Calculator: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Store selectors
  const currentStep = useCurrentStep();
  const stepProgress = useStepProgress();
  const isCalculating = useIsCalculating();
  const validationErrors = useValidationErrors();
  const validationWarnings = useValidationWarnings();
  
  // Store actions
  const {
    nextStep,
    previousStep,
    goToStep,
    completeStep,
    calculate,
    reset,
    canProceedToNext,
    getCompletionPercentage,
  } = useCalculationStore();

  // Calculate step index for stepper
  const steps = Object.values(stepConfig);
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const CurrentStepComponent = stepConfig[currentStep].component;

  // Handle step completion when moving to next
  const handleNext = async () => {
    if (currentStep === 'review') {
      // Trigger calculation
      try {
        completeStep(currentStep);
        await calculate();
      } catch (error) {
        console.error('Calculation failed:', error);
        // Error is handled by the store
      }
    } else {
      completeStep(currentStep);
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleReset = () => {
    if (confirm(t('calculator.confirm_reset'))) {
      reset();
    }
  };

  const handleStepClick = (stepIndex: number) => {
    const step = steps[stepIndex];
    goToStep(step.key);
  };

  // Progress calculation
  const completionPercentage = getCompletionPercentage();
  const canProceed = canProceedToNext();

  // Error display
  const hasErrors = Object.keys(validationErrors).length > 0;
  const hasWarnings = validationWarnings.length > 0;

  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowRight':
            event.preventDefault();
            if (stepProgress.canGoNext && canProceed) {
              handleNext();
            }
            break;
          case 'ArrowLeft':
            event.preventDefault();
            if (stepProgress.canGoPrevious) {
              handlePrevious();
            }
            break;
          case 'r':
            event.preventDefault();
            handleReset();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stepProgress, canProceed]);

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            {t('calculator.title')}
          </Typography>
          <Typography variant="h6" color="text.secondary" align="center" paragraph>
            {t('calculator.subtitle')}
          </Typography>
          
          {/* Progress indicators */}
          <Box sx={{ mt: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                {t('calculator.progress.completion', { 
                  percentage: completionPercentage,
                  current: stepProgress.current,
                  total: stepProgress.total 
                })}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                color="secondary"
              >
                {t('calculator.reset')}
              </Button>
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={stepProgress.percentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Box>

        {/* Main content */}
        <Paper elevation={1} sx={{ overflow: 'hidden' }}>
          {/* Stepper */}
          <Stepper
            activeStep={currentStepIndex}
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ p: 3, pb: 0 }}
          >
            {steps.map((step, index) => (
              <Step
                key={step.key}
                completed={currentStepIndex > index}
                sx={{
                  cursor: index <= currentStepIndex ? 'pointer' : 'default',
                  '& .MuiStepLabel-root': {
                    cursor: 'inherit',
                  },
                }}
                onClick={() => index <= currentStepIndex && handleStepClick(index)}
              >
                <StepLabel
                  error={Object.keys(validationErrors).some(key => 
                    key.startsWith(step.key.replace('_', '_'))
                  )}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {t(step.titleKey)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t(step.descriptionKey)}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider />

          {/* Step content */}
          <Box sx={{ position: 'relative', minHeight: 400 }}>
            {isCalculating && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <LoadingSpinner size="large" />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  {t('calculator.calculating')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('calculator.calculating_description')}
                </Typography>
              </Box>
            )}

            <Fade in={!isCalculating} timeout={300}>
              <Box sx={{ p: 3 }}>
                {/* Validation alerts */}
                {hasErrors && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {t('calculator.validation.errors_found')}
                    </Typography>
                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                      {Object.entries(validationErrors).map(([field, errors]) =>
                        errors.map((error, index) => (
                          <li key={`${field}-${index}`}>
                            <Typography variant="caption">
                              {error}
                            </Typography>
                          </li>
                        ))
                      )}
                    </Box>
                  </Alert>
                )}

                {hasWarnings && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                      <WarningIcon sx={{ fontSize: 'inherit', mr: 0.5 }} />
                      {t('calculator.validation.warnings_found')}
                    </Typography>
                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                      {validationWarnings.map((warning, index) => (
                        <li key={index}>
                          <Typography variant="caption">
                            <strong>{warning.field}:</strong> {warning.message}
                            {warning.suggestion && (
                              <em> ({warning.suggestion})</em>
                            )}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </Alert>
                )}

                {/* Step form component */}
                <Box sx={{ minHeight: 350 }}>
                  <CurrentStepComponent />
                </Box>
              </Box>
            </Fade>
          </Box>

          <Divider />

          {/* Navigation */}
          <Box
            sx={{
              p: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.palette.grey[50],
            }}
          >
            <Button
              onClick={handlePrevious}
              disabled={!stepProgress.canGoPrevious}
              startIcon={<BackIcon />}
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
            >
              {t('calculator.navigation.previous')}
            </Button>

            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {t('calculator.navigation.step_count', {
                  current: stepProgress.current,
                  total: stepProgress.total,
                })}
              </Typography>
            </Box>

            <Button
              onClick={handleNext}
              disabled={!canProceed || (!stepProgress.canGoNext && currentStep !== 'review')}
              endIcon={currentStep === 'review' ? <CalculateIcon /> : <NextIcon />}
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              {currentStep === 'review' 
                ? t('calculator.navigation.calculate')
                : t('calculator.navigation.next')
              }
            </Button>
          </Box>
        </Paper>

        {/* Keyboard shortcuts help */}
        {!isMobile && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              {t('calculator.shortcuts.help')}
            </Typography>
          </Box>
        )}
      </Container>
    </ErrorBoundary>
  );
};

export default Calculator;