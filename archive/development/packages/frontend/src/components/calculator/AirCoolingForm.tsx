/**
 * Air Cooling Configuration Form
 * Comprehensive form for configuring traditional air cooling systems (42U racks)
 */

import React, { useCallback, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import {
  Help as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  ElectricBolt as PowerIcon,
  AcUnit as CoolingIcon,
  Memory as RackIcon,
} from '@mui/icons-material';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Import shared types and utilities
import {
  AirCoolingConfigSchema,
  VALIDATION_LIMITS,
  EQUIPMENT_DEFAULTS,
  CurrencyUtils,
} from '@tco-calculator/shared';
import type { AirCoolingConfig, Currency } from '@tco-calculator/shared';

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
const airCoolingFormSchema = AirCoolingConfigSchema.refine(
  (data) => {
    if (data.input_method === 'rack_count') {
      return data.rack_count && data.power_per_rack_kw;
    } else if (data.input_method === 'total_power') {
      return data.total_power_kw;
    }
    return false;
  },
  {
    message: 'Required fields are missing for the selected input method',
    path: ['input_method'], // Show error on input method field
  }
);

type AirCoolingFormData = z.infer<typeof airCoolingFormSchema>;

/**
 * Equipment specifications for display
 */
const RACK_TYPES = [
  {
    value: '42U_STANDARD',
    label: '42U Standard Rack',
    power_capacity: 15,
    typical_servers: 42,
    description: 'Standard 19" rack with basic cooling',
  },
  {
    value: '42U_HIGH_DENSITY',
    label: '42U High Density Rack',
    power_capacity: 25,
    typical_servers: 42,
    description: 'High-density rack with enhanced cooling',
  },
  {
    value: '45U_STANDARD',
    label: '45U Standard Rack',
    power_capacity: 18,
    typical_servers: 45,
    description: 'Extended height rack for more equipment',
  },
] as const;

export const AirCoolingForm: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  
  // Store integration
  const configuration = useConfiguration();
  const { updateAirCooling, setValidationErrors, clearValidationErrors } = useCalculationStore();
  
  const airCoolingConfig = configuration.air_cooling;
  const currency = configuration.financial.currency;

  // Form setup
  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
    getValues,
  } = useForm<AirCoolingFormData>({
    resolver: zodResolver(airCoolingFormSchema),
    defaultValues: airCoolingConfig,
    mode: 'onChange',
  });

  // Watch form values for real-time updates
  const watchedValues = watch();
  const inputMethod = watch('input_method');
  const rackCount = watch('rack_count');
  const powerPerRack = watch('power_per_rack_kw');
  const totalPower = watch('total_power_kw');

  // Calculated values for preview
  const calculatedValues = useMemo(() => {
    if (inputMethod === 'rack_count' && rackCount && powerPerRack) {
      const total = rackCount * powerPerRack;
      const hvacEfficiency = watchedValues.hvac_efficiency || EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.efficiency;
      const hvacPower = total / (hvacEfficiency * EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.cop);
      const pue = (total + hvacPower) / total;
      
      return {
        totalPowerKW: total,
        hvacPowerKW: hvacPower,
        pue: Math.max(pue, 1.0),
        estimatedCost: total * 1500, // Rough estimate
        servers: rackCount * 42, // Assume 42 servers per rack
      };
    } else if (inputMethod === 'total_power' && totalPower) {
      const rackCapacity = EQUIPMENT_DEFAULTS.AIR_COOLING.RACK_42U.power_capacity_kw;
      const racks = Math.ceil(totalPower / rackCapacity);
      const hvacEfficiency = watchedValues.hvac_efficiency || EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.efficiency;
      const hvacPower = totalPower / (hvacEfficiency * EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.cop);
      const pue = (totalPower + hvacPower) / totalPower;
      
      return {
        totalPowerKW: totalPower,
        estimatedRacks: racks,
        hvacPowerKW: hvacPower,
        pue: Math.max(pue, 1.0),
        estimatedCost: totalPower * 1500,
        servers: racks * 42,
      };
    }
    return null;
  }, [inputMethod, rackCount, powerPerRack, totalPower, watchedValues.hvac_efficiency]);

  // Update store when form values change
  const updateConfiguration = useCallback(
    (values: Partial<AirCoolingFormData>) => {
      updateAirCooling(values);
      
      // Trigger validation
      setTimeout(() => {
        trigger();
      }, 0);
    },
    [updateAirCooling, trigger]
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
        const error = errors[field as keyof AirCoolingFormData];
        if (error?.message) {
          setValidationErrors(`air_cooling.${field}`, [error.message]);
        }
      });
    } else {
      clearValidationErrors('air_cooling');
    }
  }, [errors, setValidationErrors, clearValidationErrors]);

  // Handle input method change
  const handleInputMethodChange = (method: 'rack_count' | 'total_power') => {
    setValue('input_method', method);
    
    // Clear dependent fields
    if (method === 'rack_count') {
      setValue('total_power_kw', undefined);
    } else {
      setValue('rack_count', undefined);
      setValue('power_per_rack_kw', undefined);
      setValue('rack_type', undefined);
    }
    
    updateConfiguration({ input_method: method });
  };

  // Handle rack type selection
  const handleRackTypeChange = (rackType: string) => {
    setValue('rack_type', rackType);
    const rackSpec = RACK_TYPES.find(r => r.value === rackType);
    if (rackSpec) {
      setValue('power_per_rack_kw', rackSpec.power_capacity);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom display="flex" alignItems="center">
          <CoolingIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          {t('calculator.air_cooling.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('calculator.air_cooling.description')}
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
                    {t('calculator.air_cooling.input_method.title')}
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
                        value="rack_count"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {t('calculator.air_cooling.input_method.rack_count')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('calculator.air_cooling.input_method.rack_count_desc')}
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="total_power"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {t('calculator.air_cooling.input_method.total_power')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('calculator.air_cooling.input_method.total_power_desc')}
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  )}
                />
              </FormControl>

              <Divider sx={{ my: 3 }} />

              {/* Rack Count Configuration */}
              {inputMethod === 'rack_count' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('calculator.air_cooling.rack_configuration.title')}
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {/* Rack Type Selection */}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <FormLabel>
                          <Typography variant="body2" fontWeight="medium">
                            {t('calculator.air_cooling.rack_type.title')}
                          </Typography>
                        </FormLabel>
                        
                        <Controller
                          name="rack_type"
                          control={control}
                          render={({ field }) => (
                            <RadioGroup
                              {...field}
                              onChange={(e) => handleRackTypeChange(e.target.value)}
                              sx={{ mt: 1 }}
                            >
                              {RACK_TYPES.map((rack) => (
                                <FormControlLabel
                                  key={rack.value}
                                  value={rack.value}
                                  control={<Radio />}
                                  label={
                                    <Box sx={{ py: 1 }}>
                                      <Typography variant="body2" fontWeight="medium">
                                        {rack.label}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {rack.description} • {rack.power_capacity}kW • {rack.typical_servers} servers
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

                    {/* Rack Count */}
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="rack_count"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                          <NumericField
                            {...field}
                            label={t('calculator.air_cooling.rack_count.label')}
                            error={!!error}
                            helperText={error?.message || t('calculator.air_cooling.rack_count.helper')}
                            InputProps={{
                              startAdornment: <RackIcon sx={{ mr: 1, color: 'action.active' }} />,
                            }}
                            min={VALIDATION_LIMITS.RACK_COUNT.MIN}
                            max={VALIDATION_LIMITS.RACK_COUNT.MAX}
                            step={1}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>

                    {/* Power per Rack */}
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="power_per_rack_kw"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                          <NumericField
                            {...field}
                            label={t('calculator.air_cooling.power_per_rack.label')}
                            error={!!error}
                            helperText={error?.message || t('calculator.air_cooling.power_per_rack.helper')}
                            InputProps={{
                              startAdornment: <PowerIcon sx={{ mr: 1, color: 'action.active' }} />,
                              endAdornment: <Typography variant="caption">kW</Typography>,
                            }}
                            min={VALIDATION_LIMITS.POWER_PER_RACK.MIN}
                            max={VALIDATION_LIMITS.POWER_PER_RACK.MAX}
                            step={0.1}
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Total Power Configuration */}
              {inputMethod === 'total_power' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('calculator.air_cooling.total_power_config.title')}
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="total_power_kw"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                          <NumericField
                            {...field}
                            label={t('calculator.air_cooling.total_power.label')}
                            error={!!error}
                            helperText={error?.message || t('calculator.air_cooling.total_power.helper')}
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
                  </Grid>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Advanced Configuration */}
              <Typography variant="h6" gutterBottom>
                {t('calculator.air_cooling.advanced.title')}
              </Typography>

              <Grid container spacing={3}>
                {/* HVAC Efficiency */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FormLabel>
                        <Typography variant="body2" fontWeight="medium">
                          {t('calculator.air_cooling.hvac_efficiency.label')}
                        </Typography>
                      </FormLabel>
                      <Tooltip title={t('calculator.air_cooling.hvac_efficiency.tooltip')}>
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Controller
                      name="hvac_efficiency"
                      control={control}
                      render={({ field }) => (
                        <Box>
                          <Slider
                            {...field}
                            value={field.value || EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.efficiency}
                            onChange={(_, value) => field.onChange(value)}
                            min={0.5}
                            max={0.95}
                            step={0.05}
                            marks={[
                              { value: 0.5, label: '50%' },
                              { value: 0.75, label: '75%' },
                              { value: 0.95, label: '95%' },
                            ]}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Current: {Math.round((field.value || EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.efficiency) * 100)}%
                          </Typography>
                        </Box>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Power Distribution Efficiency */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FormLabel>
                        <Typography variant="body2" fontWeight="medium">
                          {t('calculator.air_cooling.power_efficiency.label')}
                        </Typography>
                      </FormLabel>
                      <Tooltip title={t('calculator.air_cooling.power_efficiency.tooltip')}>
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Controller
                      name="power_distribution_efficiency"
                      control={control}
                      render={({ field }) => (
                        <Box>
                          <Slider
                            {...field}
                            value={field.value || EQUIPMENT_DEFAULTS.AIR_COOLING.INFRASTRUCTURE.power_distribution_efficiency}
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
                            Current: {Math.round((field.value || EQUIPMENT_DEFAULTS.AIR_COOLING.INFRASTRUCTURE.power_distribution_efficiency) * 100)}%
                          </Typography>
                        </Box>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Space Efficiency */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FormLabel>
                        <Typography variant="body2" fontWeight="medium">
                          {t('calculator.air_cooling.space_efficiency.label')}
                        </Typography>
                      </FormLabel>
                      <Tooltip title={t('calculator.air_cooling.space_efficiency.tooltip')}>
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Controller
                      name="space_efficiency"
                      control={control}
                      render={({ field }) => (
                        <Box>
                          <Slider
                            {...field}
                            value={field.value || 0.8}
                            onChange={(_, value) => field.onChange(value)}
                            min={0.6}
                            max={0.95}
                            step={0.05}
                            marks={[
                              { value: 0.6, label: '60%' },
                              { value: 0.8, label: '80%' },
                              { value: 0.95, label: '95%' },
                            ]}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Current: {Math.round((field.value || 0.8) * 100)}%
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
                          {t('calculator.preview.hvac_power')}
                        </Typography>
                        <Typography variant="h6" color="secondary.main">
                          {calculatedValues.hvacPowerKW.toFixed(1)} kW
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          PUE
                        </Typography>
                        <Typography variant="h6">
                          {calculatedValues.pue.toFixed(2)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          {t('calculator.preview.servers')}
                        </Typography>
                        <Typography variant="h6">
                          {calculatedValues.servers.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {inputMethod === 'total_power' && calculatedValues.estimatedRacks && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        {t('calculator.preview.estimated_racks', { 
                          count: calculatedValues.estimatedRacks 
                        })}
                      </Typography>
                    </Alert>
                  )}

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('calculator.preview.estimated_capex')}
                    </Typography>
                    <Chip
                      label={CurrencyUtils.formatLarge(calculatedValues.estimatedCost, currency)}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  <ConfigurationHelp
                    topic="air_cooling"
                    title={t('calculator.help.air_cooling.title')}
                    description={t('calculator.help.air_cooling.description')}
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

export default AirCoolingForm;