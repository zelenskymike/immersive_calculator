/**
 * Shared validation utilities
 */

import type { ValidationError, Currency, Locale, Region } from '../types';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Currency validation
export function isValidCurrency(currency: string): currency is Currency {
  return ['USD', 'EUR', 'SAR', 'AED'].includes(currency);
}

// Locale validation
export function isValidLocale(locale: string): locale is Locale {
  return ['en', 'ar'].includes(locale);
}

// Region validation
export function isValidRegion(region: string): region is Region {
  return ['US', 'EU', 'ME'].includes(region);
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// UUID validation
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// URL validation
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Numeric range validation
export function validateNumericRange(value: number, min?: number, max?: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push({
      field: 'value',
      message: 'Value must be a valid number',
      value
    });
    return errors;
  }
  
  if (min !== undefined && value < min) {
    errors.push({
      field: 'value',
      message: `Value must be at least ${min}`,
      value,
      constraint: `min: ${min}`
    });
  }
  
  if (max !== undefined && value > max) {
    errors.push({
      field: 'value',
      message: `Value must be at most ${max}`,
      value,
      constraint: `max: ${max}`
    });
  }
  
  return errors;
}

// String length validation
export function validateStringLength(value: string, minLength?: number, maxLength?: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message: 'Value must be a string',
      value
    });
    return errors;
  }
  
  if (minLength !== undefined && value.length < minLength) {
    errors.push({
      field: 'value',
      message: `String must be at least ${minLength} characters long`,
      value,
      constraint: `minLength: ${minLength}`
    });
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    errors.push({
      field: 'value',
      message: `String must be at most ${maxLength} characters long`,
      value,
      constraint: `maxLength: ${maxLength}`
    });
  }
  
  return errors;
}

// Required field validation
export function validateRequired<T>(value: T, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (value === null || value === undefined) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      value
    });
  } else if (typeof value === 'string' && value.trim() === '') {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot be empty`,
      value
    });
  } else if (Array.isArray(value) && value.length === 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot be empty`,
      value
    });
  }
  
  return errors;
}

// Array validation
export function validateArray<T>(
  value: T[], 
  fieldName: string, 
  options?: {
    minLength?: number;
    maxLength?: number;
    uniqueItems?: boolean;
    itemValidator?: (item: T, index: number) => ValidationError[];
  }
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(value)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be an array`,
      value
    });
    return errors;
  }
  
  // Length validation
  if (options?.minLength !== undefined && value.length < options.minLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must have at least ${options.minLength} items`,
      value,
      constraint: `minLength: ${options.minLength}`
    });
  }
  
  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must have at most ${options.maxLength} items`,
      value,
      constraint: `maxLength: ${options.maxLength}`
    });
  }
  
  // Uniqueness validation
  if (options?.uniqueItems && new Set(value).size !== value.length) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must contain unique items`,
      value
    });
  }
  
  // Item validation
  if (options?.itemValidator) {
    value.forEach((item, index) => {
      const itemErrors = options.itemValidator!(item, index);
      errors.push(...itemErrors.map(error => ({
        ...error,
        field: `${fieldName}[${index}].${error.field}`
      })));
    });
  }
  
  return errors;
}

// Date validation
export function validateDate(value: string, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!value) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      value
    });
    return errors;
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a valid date`,
      value
    });
  }
  
  return errors;
}

// Date range validation
export function validateDateRange(
  startDate: string, 
  endDate: string, 
  fieldName: string = 'dateRange'
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const startErrors = validateDate(startDate, `${fieldName}.start`);
  const endErrors = validateDate(endDate, `${fieldName}.end`);
  
  errors.push(...startErrors, ...endErrors);
  
  if (startErrors.length === 0 && endErrors.length === 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      errors.push({
        field: fieldName,
        message: 'End date must be after start date',
        value: { startDate, endDate }
      });
    }
  }
  
  return errors;
}

// Object validation helper
export function validateObject<T extends Record<string, any>>(
  value: T,
  validators: Record<keyof T, (val: any, fieldName: string) => ValidationError[]>
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!value || typeof value !== 'object') {
    return {
      isValid: false,
      errors: [{
        field: 'object',
        message: 'Value must be an object',
        value
      }]
    };
  }
  
  // Validate each field
  Object.entries(validators).forEach(([field, validator]) => {
    const fieldErrors = validator(value[field], field);
    errors.push(...fieldErrors);
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Sanitization utilities
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .slice(0, 1000); // Limit length
}

export function sanitizeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  return num;
}

// Password strength validation
export function validatePasswordStrength(password: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long'
    });
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter'
    });
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter'
    });
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number'
    });
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character'
    });
  }
  
  if (password.length < 12) {
    warnings.push({
      field: 'password',
      message: 'For better security, consider using at least 12 characters'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Business logic validations
export function validateRackCount(count: number): ValidationError[] {
  return validateNumericRange(count, 1, 1000);
}

export function validatePowerRating(powerKW: number): ValidationError[] {
  return validateNumericRange(powerKW, 0.1, 100);
}

export function validateAnalysisYears(years: number): ValidationError[] {
  return validateNumericRange(years, 1, 10);
}

export function validateDiscountRate(rate: number): ValidationError[] {
  return validateNumericRange(rate, 0.01, 0.30);
}

export function validateEfficiency(efficiency: number): ValidationError[] {
  return validateNumericRange(efficiency, 0.1, 1.0);
}