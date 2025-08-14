/**
 * Immersion Cooling Configuration Form
 * Comprehensive form for configuring immersion cooling systems (1U-23U tanks)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Slider,
  Switch,
  Tooltip,
  IconButton,
  Alert,
  Chip,
  Divider,
  Paper,
  useTheme,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material';
import {
  Help as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  ElectricBolt as PowerIcon,
  AcUnit as CoolingIcon,
  Memory as TankIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoFixHigh as OptimizeIcon,
  Eco as EcoIcon,
} from '@mui/icons-material';

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Import shared types and utilities
import {
  ImmersionCoolingConfigSchema,
  VALIDATION_LIMITS,
  EQUIPMENT_DEFAULTS,
  EQUIPMENT_SPECS,
  CurrencyUtils,
} from '@tco-calculator/shared';
import type { ImmersionCoolingConfig, Currency } from '@tco-calculator/shared';

// Import store and hooks
import { useCalculationStore, useConfiguration } from '../../store/calculation';
import { useI18n } from '../../i18n/useI18n';

// Import components
import { CalculationPreview } from './CalculationPreview';
import { ConfigurationHelp } from '../common/ConfigurationHelp';
import { NumericField } from '../common/NumericField';

/**
 * Form validation schema with enhanced rules
 */
const immersionCoolingFormSchema = ImmersionCoolingConfigSchema.refine(
  (data) => {
    if (data.input_method === 'auto_optimize') {
      return data.target_power_kw && data.target_power_kw > 0;
    } else if (data.input_method === 'manual_config') {
      return data.tank_configurations && data.tank_configurations.length > 0;
    }
    return false;
  },
  {
    message: 'Required fields are missing for the selected input method',
    path: ['input_method'],
  }
);

type ImmersionCoolingFormData = z.infer<typeof immersionCoolingFormSchema>;

/**
 * Tank specifications for selection
 */
const TANK_SIZES = Object.entries(EQUIPMENT_SPECS.IMMERSION_TANKS).map(
  ([key, spec]) => ({
    value: key,
    label: key,
    ...spec,
  })
);

/**
 * Coolant types available
 */
const COOLANT_TYPES = [
  {
    value: 'synthetic',
    label: 'Synthetic Oil',
    viscosity: 'Medium',
    performance: 'Excellent',
    cost_multiplier: 1.0,
    description: 'High-performance synthetic coolant for maximum efficiency',
  },
  {
    value: 'mineral_oil',
    label: 'Mineral Oil',
    viscosity: 'Low',
    performance: 'Good',
    cost_multiplier: 0.6,
    description: 'Cost-effective mineral oil for general applications',
  },
  {
    value: 'dielectric',
    label: 'Dielectric Fluid',
    viscosity: 'High',
    performance: 'Premium',
    cost_multiplier: 1.8,
    description: 'Premium dielectric fluid for high-density applications',
  },
] as const;

export const ImmersionCoolingForm: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  
  // Store integration
  const configuration = useConfiguration();
  const { updateImmersionCooling, setValidationErrors, clearValidationErrors } = useCalculationStore();
  
  const immersionCoolingConfig = configuration.immersion_cooling;
  const currency = configuration.financial.currency;

  // Local state for advanced configuration
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  // Form setup
  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
    getValues,
  } = useForm<ImmersionCoolingFormData>({
    resolver: zodResolver(immersionCoolingFormSchema),
    defaultValues: immersionCoolingConfig,
    mode: 'onChange',
  });

  // Field array for tank configurations
  const {
    fields: tankFields,
    append: addTank,
    remove: removeTank,
  } = useFieldArray({
    control,
    name: 'tank_configurations',
  });

  // Watch form values for real-time updates
  const watchedValues = watch();
  const inputMethod = watch('input_method');
  const targetPower = watch('target_power_kw');
  const tankConfigurations = watch('tank_configurations');
  const coolantType = watch('coolant_type');

  // Calculated values for preview
  const calculatedValues = useMemo(() => {
    if (inputMethod === 'auto_optimize' && targetPower) {
      // Auto-optimize tank configuration
      const optimalConfig = optimizeTankConfiguration(targetPower);
      const totalTanks = optimalConfig.reduce((sum, config) => sum + config.quantity, 0);
      const totalCoolant = optimalConfig.reduce((sum, config) => {
        const tankSpec = TANK_SIZES.find(t => t.value === config.size);
        return sum + (tankSpec ? tankSpec.coolant_liters * config.quantity : 0);
      }, 0);
      
      const pumpPowerKW = targetPower * 0.015; // 1.5% for pumps
      const heatExchangerPowerKW = targetPower * 0.005; // 0.5% for heat exchangers
      const pue = (targetPower + pumpPowerKW + heatExchangerPowerKW) / targetPower;
      
      const coolantMultiplier = COOLANT_TYPES.find(c => c.value === coolantType)?.cost_multiplier || 1.0;
      const estimatedCost = (totalTanks * 35000) + (totalCoolant * 25 * coolantMultiplier);

      return {
        totalPowerKW: targetPower,
        totalTanks,
        totalCoolantLiters: totalCoolant,
        pumpPowerKW,
        heatExchangerPowerKW,
        totalFacilityPowerKW: targetPower + pumpPowerKW + heatExchangerPowerKW,
        pue: Math.max(pue, 1.0),
        estimatedCost,
        tankBreakdown: optimalConfig,
      };
    } else if (inputMethod === 'manual_config' && tankConfigurations && tankConfigurations.length > 0) {
      let totalPowerKW = 0;
      let totalTanks = 0;
      let totalCoolant = 0;

      tankConfigurations.forEach(config => {
        if (config.size && config.quantity && config.power_density_kw_per_u) {
          const tankSpec = TANK_SIZES.find(t => t.value === config.size);
          if (tankSpec) {
            totalPowerKW += tankSpec.height_units * config.power_density_kw_per_u * config.quantity;
            totalTanks += config.quantity;
            totalCoolant += tankSpec.coolant_liters * config.quantity;
          }
        }
      });

      if (totalPowerKW > 0) {
        const pumpPowerKW = totalPowerKW * 0.015;
        const heatExchangerPowerKW = totalPowerKW * 0.005;
        const pue = (totalPowerKW + pumpPowerKW + heatExchangerPowerKW) / totalPowerKW;
        
        const coolantMultiplier = COOLANT_TYPES.find(c => c.value === coolantType)?.cost_multiplier || 1.0;
        const estimatedCost = (totalTanks * 35000) + (totalCoolant * 25 * coolantMultiplier);

        return {
          totalPowerKW,
          totalTanks,
          totalCoolantLiters: totalCoolant,
          pumpPowerKW,
          heatExchangerPowerKW,
          totalFacilityPowerKW: totalPowerKW + pumpPowerKW + heatExchangerPowerKW,
          pue: Math.max(pue, 1.0),
          estimatedCost,
        };
      }
    }
    return null;
  }, [inputMethod, targetPower, tankConfigurations, coolantType]);

  // Auto-optimization function
  const optimizeTankConfiguration = useCallback((powerTarget: number) => {
    const configs = [];
    let remainingPower = powerTarget;

    // Prioritize larger tanks for efficiency
    const tankOptions = [...TANK_SIZES].sort((a, b) => b.height_units - a.height_units);

    for (const tank of tankOptions) {
      const maxPowerPerTank = tank.height_units * 2.0; // Assume 2kW per U optimal density
      const tanksNeeded = Math.floor(remainingPower / maxPowerPerTank);
      
      if (tanksNeeded > 0) {
        configs.push({
          size: tank.value,
          quantity: tanksNeeded,
          power_density_kw_per_u: 2.0,
          powerKW: tanksNeeded * maxPowerPerTank,
        });
        remainingPower -= tanksNeeded * maxPowerPerTank;
      }

      if (remainingPower <= 0) break;
    }

    // Handle any remaining power with smallest tank
    if (remainingPower > 0) {
      const smallestTank = TANK_SIZES[0]; // 1U tank
      const powerDensity = Math.min(remainingPower / smallestTank.height_units, 2.0);
      configs.push({
        size: smallestTank.value,
        quantity: 1,
        power_density_kw_per_u: powerDensity,
        powerKW: remainingPower,
      });
    }

    return configs;
  }, []);

  // Update store when form values change
  const updateConfiguration = useCallback(
    (values: Partial<ImmersionCoolingFormData>) => {
      updateImmersionCooling(values);
      
      // Trigger validation
      setTimeout(() => {
        trigger();
      }, 0);
    },
    [updateImmersionCooling, trigger]
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
        const error = errors[field as keyof ImmersionCoolingFormData];
        if (error?.message) {
          setValidationErrors(`immersion_cooling.${field}`, [error.message]);
        }
      });
    } else {
      clearValidationErrors('immersion_cooling');
    }
  }, [errors, setValidationErrors, clearValidationErrors]);

  // Handle input method change
  const handleInputMethodChange = (method: 'auto_optimize' | 'manual_config') => {
    setValue('input_method', method);
    
    // Clear dependent fields
    if (method === 'auto_optimize') {
      setValue('tank_configurations', []);
    } else {
      setValue('target_power_kw', undefined);
      if (tankFields.length === 0) {
        addTank({ size: '23U', quantity: 1, power_density_kw_per_u: 2.0 });
      }
    }
    
    updateConfiguration({ input_method: method });
  };

  // Handle auto-optimization
  const handleAutoOptimize = () => {
    if (targetPower) {
      const optimized = optimizeTankConfiguration(targetPower);
      setOptimizationResult(optimized);
      
      // Show advanced section with results
      setShowAdvanced(true);
    }
  };

  // Apply optimization results
  const applyOptimization = () => {
    if (optimizationResult) {
      setValue('input_method', 'manual_config');
      setValue('tank_configurations', optimizationResult);
      setOptimizationResult(null);
      handleInputMethodChange('manual_config');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom display="flex" alignItems="center">
          <EcoIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
          {t('calculator.immersion_cooling.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('calculator.immersion_cooling.description')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Input Method Selection */}
              <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                <FormLabel component="legend">
                  <Typography variant="h6">
                    {t('calculator.immersion_cooling.input_method.title')}
                  </Typography>
                </FormLabel>
                
                <Controller
                  name="input_method"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      {...field}
                      onChange={(e) => handleInputMethodChange(e.target.value as any)}
                      sx={{ mt: 1 }}
                    >
                      <FormControlLabel
                        value="auto_optimize"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {t('calculator.immersion_cooling.input_method.auto_optimize')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('calculator.immersion_cooling.input_method.auto_optimize_desc')}
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="manual_config"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {t('calculator.immersion_cooling.input_method.manual_config')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('calculator.immersion_cooling.input_method.manual_config_desc')}
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  )}
                />
              </FormControl>

              <Divider sx={{ my: 3 }} />

              {/* Auto-Optimize Configuration */}
              {inputMethod === 'auto_optimize' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('calculator.immersion_cooling.auto_optimize.title')}
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="target_power_kw"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                          <NumericField
                            {...field}
                            label={t('calculator.immersion_cooling.target_power.label')}
                            error={!!error}
                            helperText={error?.message || t('calculator.immersion_cooling.target_power.helper')}
                            InputProps={{
                              startAdornment: <PowerIcon sx={{ mr: 1, color: 'action.active' }} />,
                              endAdornment: <Typography variant="caption">kW</Typography>,
                            }}
                            min={VALIDATION_LIMITS.TOTAL_POWER.MIN}
                            max={VALIDATION_LIMITS.TOTAL_POWER.MAX}
                            step={1}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Button
                        variant="outlined"
                        startIcon={<OptimizeIcon />}
                        onClick={handleAutoOptimize}
                        disabled={!targetPower}
                        fullWidth
                        sx={{ height: '56px' }}
                      >
                        {t('calculator.immersion_cooling.optimize_button')}
                      </Button>
                    </Grid>
                  </Grid>

                  {optimizationResult && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        {t('calculator.immersion_cooling.optimization_complete')}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" component="div">
                          Recommended configuration: {optimizationResult.length} tank types
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={applyOptimization}
                          sx={{ mt: 1 }}
                        >
                          {t('calculator.immersion_cooling.apply_optimization')}
                        </Button>
                      </Box>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Manual Configuration */}
              {inputMethod === 'manual_config' && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {t('calculator.immersion_cooling.manual_config.title')}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => addTank({ size: '23U', quantity: 1, power_density_kw_per_u: 2.0 })}
                      size="small"
                    >
                      {t('calculator.immersion_cooling.add_tank')}
                    </Button>
                  </Box>

                  {tankFields.length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        {t('calculator.immersion_cooling.no_tanks_configured')}
                      </Typography>
                    </Alert>
                  )}

                  {tankFields.map((field, index) => (
                    <Card key={field.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="subtitle2" color="primary">
                            {t('calculator.immersion_cooling.tank')} #{index + 1}
                          </Typography>
                          {tankFields.length > 1 && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeTank(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Controller
                              name={`tank_configurations.${index}.size`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  select
                                  label={t('calculator.immersion_cooling.tank_size.label')}
                                  SelectProps={{ native: true }}
                                  fullWidth
                                >
                                  <option value="">{t('common.select')}</option>
                                  {TANK_SIZES.map((tank) => (
                                    <option key={tank.value} value={tank.value}>
                                      {tank.label} ({tank.max_power_kw}kW max)
                                    </option>
                                  ))}
                                </TextField>
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
                            <Controller
                              name={`tank_configurations.${index}.quantity`}
                              control={control}
                              render={({ field, fieldState: { error } }) => (
                                <NumericField
                                  {...field}
                                  label={t('calculator.immersion_cooling.quantity.label')}
                                  error={!!error}
                                  helperText={error?.message}
                                  InputProps={{
                                    startAdornment: <TankIcon sx={{ mr: 1, color: 'action.active' }} />,
                                  }}
                                  min={VALIDATION_LIMITS.TANK_QUANTITY.MIN}
                                  max={VALIDATION_LIMITS.TANK_QUANTITY.MAX}
                                  step={1}
                                  fullWidth
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
                            <Controller
                              name={`tank_configurations.${index}.power_density_kw_per_u`}
                              control={control}
                              render={({ field, fieldState: { error } }) => (
                                <NumericField
                                  {...field}
                                  label={t('calculator.immersion_cooling.power_density.label')}
                                  error={!!error}
                                  helperText={error?.message || t('calculator.immersion_cooling.power_density.helper')}
                                  InputProps={{
                                    startAdornment: <PowerIcon sx={{ mr: 1, color: 'action.active' }} />,
                                    endAdornment: <Typography variant="caption">kW/U</Typography>,
                                  }}
                                  min={VALIDATION_LIMITS.POWER_DENSITY.MIN}
                                  max={VALIDATION_LIMITS.POWER_DENSITY.MAX}
                                  step={0.1}
                                  fullWidth
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* System Configuration */}
              <Typography variant="h6" gutterBottom>
                {t('calculator.immersion_cooling.system_config.title')}
              </Typography>

              <Grid container spacing={3}>
                {/* Coolant Type */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel>
                      <Typography variant="body2" fontWeight="medium">
                        {t('calculator.immersion_cooling.coolant_type.label')}
                      </Typography>
                    </FormLabel>
                    
                    <Controller
                      name="coolant_type"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          {...field}
                          sx={{ mt: 1 }}
                        >
                          {COOLANT_TYPES.map((coolant) => (
                            <FormControlLabel
                              key={coolant.value}
                              value={coolant.value}
                              control={<Radio />}
                              label={
                                <Box sx={{ py: 1 }}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" fontWeight="medium">
                                      {coolant.label}
                                    </Typography>
                                    <Chip
                                      label={`${coolant.cost_multiplier}x cost`}
                                      size="small"
                                      color={coolant.cost_multiplier <= 1 ? 'success' : 'warning'}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {coolant.description} • Viscosity: {coolant.viscosity} • Performance: {coolant.performance}
                                  </Typography>
                                </Box>
                              }
                            />
                          ))}
                        </RadioGroup>
                      )}
                    />
                  </FormControl>
                </Grid>
              </Grid>

              {/* Advanced Configuration */}
              <Accordion expanded={showAdvanced} onChange={(_, expanded) => setShowAdvanced(expanded)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {t('calculator.immersion_cooling.advanced.title')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {/* Pumping Efficiency */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <Box display="flex" alignItems="center" mb={1}>
                          <FormLabel>
                            <Typography variant="body2" fontWeight="medium">
                              {t('calculator.immersion_cooling.pumping_efficiency.label')}
                            </Typography>
                          </FormLabel>
                          <Tooltip title={t('calculator.immersion_cooling.pumping_efficiency.tooltip')}>
                            <IconButton size="small">
                              <HelpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        <Controller
                          name="pumping_efficiency"
                          control={control}
                          render={({ field }) => (
                            <Box>
                              <Slider
                                {...field}
                                value={field.value || EQUIPMENT_DEFAULTS.IMMERSION_COOLING.TANK_STANDARD.pump_efficiency}
                                onChange={(_, value) => field.onChange(value)}
                                min={0.8}
                                max={0.98}
                                step={0.01}
                                marks={[
                                  { value: 0.8, label: '80%' },
                                  { value: 0.9, label: '90%' },
                                  { value: 0.98, label: '98%' },
                                ]}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                              />
                              <Typography variant="caption" color="text.secondary">
                                Current: {Math.round((field.value || EQUIPMENT_DEFAULTS.IMMERSION_COOLING.TANK_STANDARD.pump_efficiency) * 100)}%
                              </Typography>
                            </Box>
                          )}
                        />
                      </FormControl>
                    </Grid>

                    {/* Heat Exchanger Efficiency */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <Box display="flex" alignItems="center" mb={1}>
                          <FormLabel>
                            <Typography variant="body2" fontWeight="medium">
                              {t('calculator.immersion_cooling.heat_exchanger_efficiency.label')}
                            </Typography>
                          </FormLabel>
                          <Tooltip title={t('calculator.immersion_cooling.heat_exchanger_efficiency.tooltip')}>
                            <IconButton size="small">
                              <HelpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        <Controller
                          name="heat_exchanger_efficiency"
                          control={control}
                          render={({ field }) => (
                            <Box>
                              <Slider
                                {...field}
                                value={field.value || EQUIPMENT_DEFAULTS.IMMERSION_COOLING.TANK_STANDARD.heat_exchanger_efficiency}
                                onChange={(_, value) => field.onChange(value)}
                                min={0.85}
                                max={0.98}
                                step={0.01}
                                marks={[
                                  { value: 0.85, label: '85%' },
                                  { value: 0.95, label: '95%' },
                                  { value: 0.98, label: '98%' },
                                ]}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                              />
                              <Typography variant="caption" color="text.secondary">
                                Current: {Math.round((field.value || EQUIPMENT_DEFAULTS.IMMERSION_COOLING.TANK_STANDARD.heat_exchanger_efficiency) * 100)}%
                              </Typography>
                            </Box>
                          )}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Optimization Results Table */}
                  {optimizationResult && (
                    <Box mt={3}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('calculator.immersion_cooling.optimization_results')}
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tank Size</TableCell>
                              <TableCell align="right">Quantity</TableCell>
                              <TableCell align="right">Power Density</TableCell>
                              <TableCell align="right">Total Power</TableCell>
                              <TableCell align="right">Coolant Volume</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {optimizationResult.map((config: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{config.size}</TableCell>
                                <TableCell align="right">{config.quantity}</TableCell>
                                <TableCell align="right">{config.power_density_kw_per_u} kW/U</TableCell>
                                <TableCell align="right">{config.powerKW.toFixed(1)} kW</TableCell>
                                <TableCell align="right">
                                  {(TANK_SIZES.find(t => t.value === config.size)?.coolant_liters || 0) * config.quantity} L
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <TrendingUpIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
                {t('calculator.preview.title')}
              </Typography>
              
              {calculatedValues ? (
                <Box>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          {t('calculator.preview.total_power')}
                        </Typography>
                        <Typography variant="h6" color="primary.main">
                          {calculatedValues.totalPowerKW.toLocaleString()} kW
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          {t('calculator.preview.total_tanks')}
                        </Typography>
                        <Typography variant="h6" color="secondary.main">
                          {calculatedValues.totalTanks}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          PUE
                        </Typography>
                        <Typography variant="h6">
                          {calculatedValues.pue.toFixed(3)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          {t('calculator.preview.coolant_volume')}
                        </Typography>
                        <Typography variant="h6">
                          {calculatedValues.totalCoolantLiters.toLocaleString()} L
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Efficiency Improvement:</strong> Immersion cooling PUE of {calculatedValues.pue.toFixed(3)} 
                      represents significant improvement over typical air cooling PUE of 1.4-1.8
                    </Typography>
                  </Alert>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('calculator.preview.estimated_capex')}
                    </Typography>
                    <Chip
                      label={CurrencyUtils.formatLarge(calculatedValues.estimatedCost, currency)}
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>

                  <ConfigurationHelp
                    topic="immersion_cooling"
                    title={t('calculator.help.immersion_cooling.title')}
                    description={t('calculator.help.immersion_cooling.description')}
                  />
                </Box>
              ) : (
                <Alert severity="info">
                  <Typography variant="body2">
                    {t('calculator.preview.configure_to_see_preview')}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImmersionCoolingForm;