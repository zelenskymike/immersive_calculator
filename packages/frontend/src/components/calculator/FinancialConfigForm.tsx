/**
 * Financial Configuration Form
 * Comprehensive form for financial parameters and analysis settings
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  Chip,
  Paper,
  useTheme,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Help as HelpIcon,
  Public as RegionIcon,
  Schedule as TimeIcon,
  Percent as PercentIcon,
  ElectricBolt as EnergyIcon,
} from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Import shared types and utilities
import {
  FinancialConfigSchema,
  VALIDATION_LIMITS,
  FINANCIAL_DEFAULTS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_REGIONS,
  CurrencyUtils,
} from '@tco-calculator/shared';
import type { FinancialConfig, Currency, Region } from '@tco-calculator/shared';

// Import store and hooks
import { useCalculationStore, useConfiguration } from '../../store/calculation';
import { useI18n } from '../../i18n/useI18n';

// Import components
import { NumericField } from '../common/NumericField';
import { ConfigurationHelp } from '../common/ConfigurationHelp';

type FinancialFormData = z.infer<typeof FinancialConfigSchema>;

/**
 * Regional configuration data
 */
const REGION_CONFIG = {
  US: {
    label: 'United States',
    currency: 'USD' as Currency,
    energyCost: FINANCIAL_DEFAULTS.ENERGY_COSTS.US,
    laborCost: FINANCIAL_DEFAULTS.LABOR_COSTS.US,
    description: 'North American markets with moderate energy costs',
  },
  EU: {
    label: 'European Union',
    currency: 'EUR' as Currency,
    energyCost: FINANCIAL_DEFAULTS.ENERGY_COSTS.EU,
    laborCost: FINANCIAL_DEFAULTS.LABOR_COSTS.EU,
    description: 'European markets with higher energy costs',
  },
  ME: {
    label: 'Middle East',
    currency: 'AED' as Currency,
    energyCost: FINANCIAL_DEFAULTS.ENERGY_COSTS.ME,
    laborCost: FINANCIAL_DEFAULTS.LABOR_COSTS.ME,
    description: 'Gulf states with subsidized energy costs',
  },
} as const;

export const FinancialConfigForm: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  
  // Store integration
  const configuration = useConfiguration();
  const { updateFinancial, setValidationErrors, clearValidationErrors } = useCalculationStore();
  
  const financialConfig = configuration.financial;

  // Form setup
  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<FinancialFormData>({
    resolver: zodResolver(FinancialConfigSchema),
    defaultValues: financialConfig,
    mode: 'onChange',
  });

  // Watch form values
  const watchedValues = watch();
  const selectedRegion = watch('region');
  const selectedCurrency = watch('currency');
  const analysisYears = watch('analysis_years');
  const discountRate = watch('discount_rate');
  const useCustomRates = watch('use_custom_rates');

  // Regional defaults based on selection
  const regionalDefaults = useMemo(() => {
    const region = selectedRegion || 'US';
    return REGION_CONFIG[region];
  }, [selectedRegion]);

  // Update store when form values change
  const updateConfiguration = useCallback(
    (values: Partial<FinancialFormData>) => {
      updateFinancial(values);
      
      // Trigger validation
      setTimeout(() => {
        trigger();
      }, 0);
    },
    [updateFinancial, trigger]
  );

  // Handle form changes with debouncing
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name && value[name] !== undefined) {
        updateConfiguration({ [name]: value[name] });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, updateConfiguration]);

  // Update validation errors in store
  useEffect(() => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      errorFields.forEach(field => {
        const error = errors[field as keyof FinancialFormData];
        if (error?.message) {
          setValidationErrors(`financial.${field}`, [error.message]);
        }
      });
    } else {
      clearValidationErrors('financial');
    }
  }, [errors, setValidationErrors, clearValidationErrors]);

  // Handle region change - auto-update related fields
  const handleRegionChange = (region: Region) => {
    setValue('region', region);
    
    const regionConfig = REGION_CONFIG[region];
    
    // Auto-update currency if not manually changed
    if (!useCustomRates) {
      setValue('currency', regionConfig.currency);
      setValue('custom_energy_cost', regionConfig.energyCost);
      setValue('custom_labor_cost', regionConfig.laborCost);
    }
    
    updateConfiguration({ 
      region,
      ...((!useCustomRates) && {
        currency: regionConfig.currency,
        custom_energy_cost: regionConfig.energyCost,
        custom_labor_cost: regionConfig.laborCost,
      }),
    });
  };

  // NPV calculation preview
  const npvPreview = useMemo(() => {
    if (analysisYears && discountRate) {
      const futureValue = 100000; // Sample calculation
      const npv = futureValue / Math.pow(1 + discountRate, analysisYears);
      return npv;
    }
    return null;
  }, [analysisYears, discountRate]);

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom display="flex" alignItems="center">
          <MoneyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          {t('calculator.financial.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('calculator.financial.description')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Configuration */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Regional Settings */}
              <Typography variant="h6" gutterBottom>
                {t('calculator.financial.regional.title')}
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <FormLabel>
                      <Typography variant="body2" fontWeight="medium">
                        {t('calculator.financial.region.label')}
                      </Typography>
                    </FormLabel>
                    <Controller
                      name="region"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          onChange={(e) => handleRegionChange(e.target.value as Region)}
                          startAdornment={<RegionIcon sx={{ mr: 1, color: 'action.active' }} />}
                        >
                          {SUPPORTED_REGIONS.map((region) => (
                            <MenuItem key={region} value={region}>
                              <Box>
                                <Typography variant="body2">
                                  {REGION_CONFIG[region].label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {REGION_CONFIG[region].description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <FormLabel>
                      <Typography variant="body2" fontWeight="medium">
                        {t('calculator.financial.currency.label')}
                      </Typography>
                    </FormLabel>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <Select {...field}>
                          {SUPPORTED_CURRENCIES.map((currency) => (
                            <MenuItem key={currency} value={currency}>
                              {currency} ({CurrencyUtils.getCurrencySymbol(currency)})
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Selected Region:</strong> {regionalDefaults.label} <br />
                      <strong>Default Energy Cost:</strong> {CurrencyUtils.format(regionalDefaults.energyCost, regionalDefaults.currency)} per kWh <br />
                      <strong>Default Labor Cost:</strong> {CurrencyUtils.format(regionalDefaults.laborCost, regionalDefaults.currency)} per hour
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>

              <Box my={3}>
                <Controller
                  name="use_custom_rates"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value || false}
                        />
                      }
                      label={t('calculator.financial.use_custom_rates.label')}
                    />
                  )}
                />
              </Box>

              {useCustomRates && (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="custom_energy_cost"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <NumericField
                          {...field}
                          label={t('calculator.financial.energy_cost.label')}
                          error={!!error}
                          helperText={error?.message || t('calculator.financial.energy_cost.helper')}
                          InputProps={{
                            startAdornment: <EnergyIcon sx={{ mr: 1, color: 'action.active' }} />,
                            endAdornment: <Typography variant="caption">per kWh</Typography>,
                          }}
                          min={VALIDATION_LIMITS.ENERGY_COST.MIN}
                          max={VALIDATION_LIMITS.ENERGY_COST.MAX}
                          step={0.01}
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="custom_labor_cost"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <NumericField
                          {...field}
                          label={t('calculator.financial.labor_cost.label')}
                          error={!!error}
                          helperText={error?.message || t('calculator.financial.labor_cost.helper')}
                          InputProps={{
                            startAdornment: <MoneyIcon sx={{ mr: 1, color: 'action.active' }} />,
                            endAdornment: <Typography variant="caption">per hour</Typography>,
                          }}
                          min={10}
                          max={200}
                          step={1}
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              )}

              {/* Analysis Parameters */}
              <Box my={3}>
                <Typography variant="h6" gutterBottom>
                  {t('calculator.financial.analysis.title')}
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="analysis_years"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <NumericField
                          {...field}
                          label={t('calculator.financial.analysis_years.label')}
                          error={!!error}
                          helperText={error?.message || t('calculator.financial.analysis_years.helper')}
                          InputProps={{
                            startAdornment: <TimeIcon sx={{ mr: 1, color: 'action.active' }} />,
                            endAdornment: <Typography variant="caption">years</Typography>,
                          }}
                          min={VALIDATION_LIMITS.ANALYSIS_YEARS.MIN}
                          max={VALIDATION_LIMITS.ANALYSIS_YEARS.MAX}
                          step={1}
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="discount_rate"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <NumericField
                          {...field}
                          label={t('calculator.financial.discount_rate.label')}
                          error={!!error}
                          helperText={error?.message || t('calculator.financial.discount_rate.helper')}
                          InputProps={{
                            startAdornment: <PercentIcon sx={{ mr: 1, color: 'action.active' }} />,
                            endAdornment: <Typography variant="caption">%</Typography>,
                          }}
                          min={VALIDATION_LIMITS.DISCOUNT_RATE.MIN * 100}
                          max={VALIDATION_LIMITS.DISCOUNT_RATE.MAX * 100}
                          step={0.1}
                          fullWidth
                          value={field.value ? field.value * 100 : ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) / 100)}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Escalation Rates */}
              <Typography variant="h6" gutterBottom>
                {t('calculator.financial.escalation.title')}
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FormLabel>
                        <Typography variant="body2" fontWeight="medium">
                          {t('calculator.financial.energy_escalation.label')}
                        </Typography>
                      </FormLabel>
                      <Tooltip title={t('calculator.financial.energy_escalation.tooltip')}>
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Controller
                      name="energy_escalation_rate"
                      control={control}
                      render={({ field }) => (
                        <Box>
                          <Slider
                            {...field}
                            value={field.value ? field.value * 100 : FINANCIAL_DEFAULTS.ESCALATION_RATES.ENERGY * 100}
                            onChange={(_, value) => field.onChange((value as number) / 100)}
                            min={0}
                            max={10}
                            step={0.1}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 3, label: '3%' },
                              { value: 6, label: '6%' },
                              { value: 10, label: '10%' },
                            ]}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${value}%`}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Current: {field.value ? (field.value * 100).toFixed(1) : (FINANCIAL_DEFAULTS.ESCALATION_RATES.ENERGY * 100).toFixed(1)}% annually
                          </Typography>
                        </Box>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FormLabel>
                        <Typography variant="body2" fontWeight="medium">
                          {t('calculator.financial.maintenance_escalation.label')}
                        </Typography>
                      </FormLabel>
                      <Tooltip title={t('calculator.financial.maintenance_escalation.tooltip')}>
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Controller
                      name="maintenance_escalation_rate"
                      control={control}
                      render={({ field }) => (
                        <Box>
                          <Slider
                            {...field}
                            value={field.value ? field.value * 100 : FINANCIAL_DEFAULTS.ESCALATION_RATES.MAINTENANCE * 100}
                            onChange={(_, value) => field.onChange((value as number) / 100)}
                            min={0}
                            max={8}
                            step={0.1}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 2.5, label: '2.5%' },
                              { value: 5, label: '5%' },
                              { value: 8, label: '8%' },
                            ]}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${value}%`}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Current: {field.value ? (field.value * 100).toFixed(1) : (FINANCIAL_DEFAULTS.ESCALATION_RATES.MAINTENANCE * 100).toFixed(1)}% annually
                          </Typography>
                        </Box>
                      )}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <TrendingUpIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                {t('calculator.financial.preview.title')}
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Analysis Period
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {analysisYears || FINANCIAL_DEFAULTS.ANALYSIS_YEARS.DEFAULT} years
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Discount Rate (NPV)
                    </Typography>
                    <Typography variant="h6" color="secondary.main">
                      {discountRate ? (discountRate * 100).toFixed(1) : (FINANCIAL_DEFAULTS.DISCOUNT_RATE * 100).toFixed(1)}%
                    </Typography>
                  </Grid>

                  {npvPreview && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        NPV Example (${100000})
                      </Typography>
                      <Typography variant="h6">
                        {CurrencyUtils.format(npvPreview, selectedCurrency)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Regional Defaults Applied:</strong><br />
                  Energy: {CurrencyUtils.format(regionalDefaults.energyCost, regionalDefaults.currency)}/kWh<br />
                  Labor: {CurrencyUtils.format(regionalDefaults.laborCost, regionalDefaults.currency)}/hr
                </Typography>
              </Alert>

              <ConfigurationHelp
                topic="financial"
                title={t('calculator.help.financial.title')}
                description={t('calculator.help.financial.description')}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinancialConfigForm;