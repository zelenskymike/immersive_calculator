/**
 * Enhanced Numeric Input Field Component
 * Provides formatted numeric input with validation and locale support
 */

import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import {
  TextField,
  TextFieldProps,
  InputAdornment,
  IconButton,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// Import i18n hook
import { useI18n } from '../../i18n/useI18n';

export interface NumericFieldProps extends Omit<TextFieldProps, 'type' | 'onChange' | 'value'> {
  value?: number | string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  allowNegative?: boolean;
  showSteppers?: boolean;
  formatOnBlur?: boolean;
  thousandsSeparator?: boolean;
  prefix?: string;
  suffix?: string;
  tooltipInfo?: string;
  onValueChange?: (value: number | null) => void;
}

/**
 * Format number with locale-aware formatting
 */
const formatNumber = (
  value: number,
  decimals: number = 2,
  thousandsSeparator: boolean = false,
  locale: string = 'en-US'
): string => {
  if (isNaN(value)) return '';
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: thousandsSeparator,
  };
  
  return new Intl.NumberFormat(locale, options).format(value);
};

/**
 * Parse string to number, handling locale formatting
 */
const parseNumber = (str: string): number | null => {
  if (!str) return null;
  
  // Remove common formatting characters
  const cleaned = str.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
};

export const NumericField = forwardRef<HTMLInputElement, NumericFieldProps>(({
  value,
  onChange,
  onValueChange,
  min,
  max,
  step = 1,
  decimals = 2,
  allowNegative = true,
  showSteppers = false,
  formatOnBlur = true,
  thousandsSeparator = false,
  prefix,
  suffix,
  tooltipInfo,
  error,
  helperText,
  InputProps,
  ...props
}, ref) => {
  const { locale } = useI18n();
  const [displayValue, setDisplayValue] = useState<string>('');
  const [focused, setFocused] = useState(false);

  // Initialize display value
  useEffect(() => {
    if (value !== undefined && value !== '') {
      const numValue = typeof value === 'number' ? value : parseNumber(String(value));
      if (numValue !== null) {
        const formatted = focused || !formatOnBlur 
          ? numValue.toString()
          : formatNumber(numValue, decimals, thousandsSeparator, locale);
        setDisplayValue(formatted);
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value, focused, formatOnBlur, decimals, thousandsSeparator, locale]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setDisplayValue(inputValue);

    // Parse and validate
    const numericValue = parseNumber(inputValue);
    
    if (numericValue !== null) {
      // Apply constraints
      let constrainedValue = numericValue;
      
      if (!allowNegative && constrainedValue < 0) {
        constrainedValue = 0;
      }
      
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }

      // Update the event target value for form libraries
      const syntheticEvent = {
        ...event,
        target: {
          ...event.target,
          value: constrainedValue.toString(),
        },
      };

      onChange?.(syntheticEvent);
      onValueChange?.(constrainedValue);
    } else {
      // Handle empty or invalid input
      onChange?.(event);
      onValueChange?.(null);
    }
  }, [onChange, onValueChange, min, max, allowNegative]);

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    
    // Convert formatted display back to raw number for editing
    if (formatOnBlur && displayValue) {
      const numValue = parseNumber(displayValue);
      if (numValue !== null) {
        setDisplayValue(numValue.toString());
      }
    }
    
    props.onFocus?.(event);
  }, [props.onFocus, formatOnBlur, displayValue]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    
    // Format the display value
    if (formatOnBlur && displayValue) {
      const numValue = parseNumber(displayValue);
      if (numValue !== null) {
        const formatted = formatNumber(numValue, decimals, thousandsSeparator, locale);
        setDisplayValue(formatted);
      }
    }
    
    props.onBlur?.(event);
  }, [props.onBlur, formatOnBlur, displayValue, decimals, thousandsSeparator, locale]);

  const handleStepUp = useCallback(() => {
    const currentValue = parseNumber(displayValue) || 0;
    const newValue = currentValue + step;
    
    const constrainedValue = max !== undefined ? Math.min(newValue, max) : newValue;
    
    const event = {
      target: { value: constrainedValue.toString() },
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleInputChange(event);
  }, [displayValue, step, max, handleInputChange]);

  const handleStepDown = useCallback(() => {
    const currentValue = parseNumber(displayValue) || 0;
    const newValue = currentValue - step;
    
    let constrainedValue = min !== undefined ? Math.max(newValue, min) : newValue;
    if (!allowNegative) {
      constrainedValue = Math.max(constrainedValue, 0);
    }
    
    const event = {
      target: { value: constrainedValue.toString() },
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleInputChange(event);
  }, [displayValue, step, min, allowNegative, handleInputChange]);

  // Enhanced input props
  const enhancedInputProps = {
    ...InputProps,
    startAdornment: (
      <Box display="flex" alignItems="center">
        {InputProps?.startAdornment}
        {prefix && <span style={{ marginRight: 4 }}>{prefix}</span>}
        {showSteppers && (
          <IconButton
            size="small"
            onClick={handleStepDown}
            disabled={
              (min !== undefined && parseNumber(displayValue) !== null && parseNumber(displayValue)! <= min) ||
              (!allowNegative && parseNumber(displayValue) !== null && parseNumber(displayValue)! <= 0)
            }
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    ),
    endAdornment: (
      <Box display="flex" alignItems="center">
        {showSteppers && (
          <IconButton
            size="small"
            onClick={handleStepUp}
            disabled={
              max !== undefined && parseNumber(displayValue) !== null && parseNumber(displayValue)! >= max
            }
          >
            <AddIcon fontSize="small" />
          </IconButton>
        )}
        {suffix && <span style={{ marginLeft: 4 }}>{suffix}</span>}
        {tooltipInfo && (
          <Tooltip title={tooltipInfo} arrow>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {InputProps?.endAdornment}
      </Box>
    ),
  };

  // Validation message enhancement
  const enhancedHelperText = helperText || (
    min !== undefined && max !== undefined
      ? `Range: ${min} - ${max}`
      : min !== undefined
      ? `Minimum: ${min}`
      : max !== undefined
      ? `Maximum: ${max}`
      : undefined
  );

  return (
    <TextField
      {...props}
      ref={ref}
      value={displayValue}
      onChange={handleInputChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      error={error}
      helperText={enhancedHelperText}
      InputProps={enhancedInputProps}
      inputProps={{
        inputMode: 'decimal',
        pattern: allowNegative ? '[0-9.-]*' : '[0-9.]*',
        ...props.inputProps,
      }}
    />
  );
});

NumericField.displayName = 'NumericField';

export default NumericField;