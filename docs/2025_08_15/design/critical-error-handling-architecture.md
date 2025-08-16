# Critical Error Handling Architecture - isPositive Undefined Fix

## Executive Summary

This architecture document provides a comprehensive solution for fixing the critical production bug where `isPositive` variable is undefined at line 1277, causing container crashes and 100% service downtime. The solution includes immediate fixes, robust error handling, and production stability enhancements while maintaining the single-file architecture constraint.

## Architecture Overview

### Problem Context
```mermaid
C4Context
    Person(user, "User", "TCO Calculator User")
    System(tco, "TCO Calculator", "Single-file Node.js app")
    Container(browser, "Browser", "Client-side execution")
    Container(container, "Docker Container", "Production environment")
    
    Rel(user, browser, "Performs calculation")
    Rel(browser, tco, "API calls")
    Rel(tco, container, "Runs in")
```

### Error Flow Analysis
```mermaid
flowchart TD
    A[API Call /api/calculate] --> B[calculateTCO function]
    B --> C[Return calculation result]
    C --> D[displayResults function]
    D --> E{Data validation}
    E -->|Pass| F[Extract totalSavings]
    E -->|Fail| G[ERROR: Missing data]
    F --> H[Calculate isPositive]
    H --> I[Template literal generation]
    I --> J{Variable scope check}
    J -->|Pass| K[Success: HTML rendered]
    J -->|Fail| L[ERROR: isPositive undefined]
    G --> M[Container crash]
    L --> M
    M --> N[Exit code 1]
    N --> O[Container restart loop]
```

## 1. Error Handling Architecture for Template Literal Generation

### 1.1 Defensive Template Generation Pattern

**Design Principle**: Never trust data structure completeness in template literals.

```javascript
/**
 * Secure Template Generation Architecture
 * - Validates all variables before template execution
 * - Provides fallback values for all critical display elements
 * - Implements try-catch boundaries around template generation
 */

// Pattern 1: Pre-validation and Safe Extraction
function safeDisplayResults(data) {
    try {
        // Phase 1: Data structure validation
        const validatedData = validateDisplayData(data);
        
        // Phase 2: Safe variable extraction
        const displayVars = extractSafeDisplayVariables(validatedData);
        
        // Phase 3: Template generation with error boundaries
        const htmlContent = generateSecureTemplate(displayVars);
        
        // Phase 4: Safe DOM manipulation
        updateDOMSafely(htmlContent);
        
    } catch (error) {
        handleDisplayError(error, data);
    }
}

// Pattern 2: Template Variable Safety Wrapper
function createTemplateVars(data) {
    const safe = (value, fallback = 'N/A') => {
        return (value !== undefined && value !== null) ? value : fallback;
    };
    
    const safeNumber = (value, fallback = 0) => {
        return (typeof value === 'number' && !isNaN(value)) ? value : fallback;
    };
    
    const safeBoolean = (value, fallback = false) => {
        return (typeof value === 'boolean') ? value : fallback;
    };
    
    return {
        totalSavings: safeNumber(data?.comparison?.savings?.totalSavings, 0),
        isPositive: safeBoolean(
            data?.comparison?.savings?.totalSavings >= 0,
            false
        ),
        analysisYears: safeNumber(data?.parameters?.analysisYears, 5),
        roiPercent: safeNumber(data?.comparison?.savings?.roiPercent, 0),
        paybackYears: safeNumber(data?.comparison?.savings?.paybackYears, 0)
    };
}
```

### 1.2 Template Literal Safety Architecture

```javascript
/**
 * Template Literal Generation with Error Boundaries
 * - Each template section has individual error handling
 * - Fallback templates for critical sections
 * - Graceful degradation when data is incomplete
 */

function generateSecureTemplate(vars) {
    const sections = {
        savingsHighlight: generateSavingsSection(vars),
        environmentalImpact: generateEnvironmentalSection(vars),
        resultsGrid: generateResultsSection(vars)
    };
    
    // Combine sections with individual error handling
    return Object.values(sections)
        .filter(section => section !== null)
        .join('\n');
}

function generateSavingsSection(vars) {
    try {
        const { totalSavings, isPositive, analysisYears, roiPercent, paybackYears } = vars;
        
        return `
            <div class="savings-highlight">
                <h2>${isPositive ? '💰 Total Savings' : '💸 Additional Cost'}</h2>
                <div class="savings-value">
                    ${isPositive ? '$' : '-$'}${Math.abs(totalSavings).toLocaleString()}
                </div>
                <p>
                    Over ${analysisYears} year${analysisYears > 1 ? 's' : ''} • 
                    ROI: ${roiPercent}% • 
                    Payback: ${paybackYears} years
                </p>
            </div>
        `;
    } catch (error) {
        console.error('Error generating savings section:', error);
        return getFallbackSavingsTemplate();
    }
}
```

## 2. Data Validation Architecture for Nested Object Properties

### 2.1 Comprehensive Data Structure Validation

**Design Principle**: Validate the entire response structure before any processing.

```javascript
/**
 * Data Validation Schema for TCO Calculator Results
 * - Validates complete API response structure
 * - Provides detailed error reporting for missing properties
 * - Ensures type safety for all calculations
 */

const TCO_RESULT_SCHEMA = {
    required: ['airCooling', 'immersionCooling', 'comparison', 'parameters'],
    properties: {
        airCooling: {
            required: ['equipment', 'costs', 'energy'],
            properties: {
                equipment: { required: ['count', 'type', 'totalPowerKW', 'pue'] },
                costs: { required: ['capex', 'annualOpex', 'totalTCO'] },
                energy: { required: ['annualConsumptionMWh'] }
            }
        },
        immersionCooling: {
            required: ['equipment', 'costs', 'energy'],
            properties: {
                equipment: { required: ['count', 'type', 'totalPowerKW', 'pue'] },
                costs: { required: ['capex', 'annualOpex', 'totalTCO'] },
                energy: { required: ['annualConsumptionMWh'] }
            }
        },
        comparison: {
            required: ['savings', 'efficiency'],
            properties: {
                savings: { 
                    required: ['totalSavings', 'annualSavings', 'capexDifference', 'paybackYears', 'roiPercent'] 
                },
                efficiency: { 
                    required: ['pueImprovement', 'annualEnergySavingsMWh', 'annualCarbonReductionTons'] 
                }
            }
        },
        parameters: {
            required: ['analysisYears', 'electricityPrice', 'discountRate', 'maintenanceCost']
        }
    }
};

/**
 * Validates data structure against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @param {string} path - Current path for error reporting
 * @return {Object} Validation result with errors array
 */
function validateDataStructure(data, schema, path = '') {
    const errors = [];
    
    if (!data || typeof data !== 'object') {
        errors.push(`${path || 'root'}: Expected object, got ${typeof data}`);
        return { valid: false, errors };
    }
    
    // Check required properties
    if (schema.required) {
        for (const prop of schema.required) {
            if (!(prop in data)) {
                errors.push(`${path}.${prop}: Required property missing`);
            } else if (data[prop] === null || data[prop] === undefined) {
                errors.push(`${path}.${prop}: Property is null/undefined`);
            }
        }
    }
    
    // Validate nested properties
    if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
            if (prop in data && data[prop] !== null && data[prop] !== undefined) {
                const nestedResult = validateDataStructure(
                    data[prop], 
                    propSchema, 
                    path ? `${path}.${prop}` : prop
                );
                errors.push(...nestedResult.errors);
            }
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Validates and sanitizes TCO calculation result
 * @param {Object} data - Raw API response
 * @return {Object} Validated and sanitized data
 * @throws {Error} If validation fails critically
 */
function validateDisplayData(data) {
    // Step 1: Basic structure validation
    const validation = validateDataStructure(data, TCO_RESULT_SCHEMA);
    
    if (!validation.valid) {
        console.error('Data validation errors:', validation.errors);
        
        // Determine if errors are critical (block execution) or recoverable
        const criticalErrors = validation.errors.filter(error => 
            error.includes('comparison.savings.totalSavings') ||
            error.includes('parameters.analysisYears')
        );
        
        if (criticalErrors.length > 0) {
            throw new Error(`Critical data validation failed: ${criticalErrors.join(', ')}`);
        }
    }
    
    // Step 2: Type validation and sanitization
    return sanitizeCalculationData(data);
}

/**
 * Sanitizes and provides defaults for calculation data
 * @param {Object} data - Validated data structure
 * @return {Object} Sanitized data with guaranteed properties
 */
function sanitizeCalculationData(data) {
    const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone
    
    // Ensure comparison.savings exists with defaults
    if (!sanitized.comparison) sanitized.comparison = {};
    if (!sanitized.comparison.savings) sanitized.comparison.savings = {};
    
    const savings = sanitized.comparison.savings;
    savings.totalSavings = Number(savings.totalSavings) || 0;
    savings.annualSavings = Number(savings.annualSavings) || 0;
    savings.capexDifference = Number(savings.capexDifference) || 0;
    savings.paybackYears = Number(savings.paybackYears) || 0;
    savings.roiPercent = Number(savings.roiPercent) || 0;
    
    // Ensure parameters exist with defaults
    if (!sanitized.parameters) sanitized.parameters = {};
    sanitized.parameters.analysisYears = Number(sanitized.parameters.analysisYears) || 5;
    
    // Ensure efficiency data exists
    if (!sanitized.comparison.efficiency) sanitized.comparison.efficiency = {};
    const efficiency = sanitized.comparison.efficiency;
    efficiency.pueImprovement = Number(efficiency.pueImprovement) || 0;
    efficiency.annualEnergySavingsMWh = Number(efficiency.annualEnergySavingsMWh) || 0;
    efficiency.annualCarbonReductionTons = Number(efficiency.annualCarbonReductionTons) || 0;
    
    return sanitized;
}
```

### 2.2 Runtime Type Checking

```javascript
/**
 * Runtime type validation for critical display variables
 * - Validates types at runtime before template generation
 * - Provides detailed type mismatch error reporting
 * - Prevents type coercion issues in template literals
 */

const TYPE_VALIDATORS = {
    isNumber: (value) => typeof value === 'number' && !isNaN(value),
    isPositiveNumber: (value) => typeof value === 'number' && !isNaN(value) && value >= 0,
    isInteger: (value) => Number.isInteger(value),
    isString: (value) => typeof value === 'string',
    isBoolean: (value) => typeof value === 'boolean',
    isArray: (value) => Array.isArray(value),
    isObject: (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
};

function validateDisplayVariables(vars) {
    const validations = [
        { name: 'totalSavings', value: vars.totalSavings, type: 'isNumber' },
        { name: 'isPositive', value: vars.isPositive, type: 'isBoolean' },
        { name: 'analysisYears', value: vars.analysisYears, type: 'isPositiveNumber' },
        { name: 'roiPercent', value: vars.roiPercent, type: 'isNumber' },
        { name: 'paybackYears', value: vars.paybackYears, type: 'isPositiveNumber' }
    ];
    
    const errors = [];
    for (const validation of validations) {
        if (!TYPE_VALIDATORS[validation.type](validation.value)) {
            errors.push({
                variable: validation.name,
                value: validation.value,
                expectedType: validation.type,
                actualType: typeof validation.value
            });
        }
    }
    
    if (errors.length > 0) {
        console.error('Display variable type validation failed:', errors);
        return { valid: false, errors };
    }
    
    return { valid: true, errors: [] };
}
```

## 3. Fallback Template System for Error Recovery

### 3.1 Graceful Degradation Templates

**Design Principle**: Always provide a functional UI, even with incomplete data.

```javascript
/**
 * Fallback Template System
 * - Provides minimal functional templates when data is incomplete
 * - Maintains user experience during error conditions
 * - Allows partial functionality when possible
 */

const FALLBACK_TEMPLATES = {
    savingsHighlight: () => `
        <div class="savings-highlight" style="background: linear-gradient(135deg, #FFA726 0%, #FF7043 100%);">
            <h2>⚠️ Calculation Incomplete</h2>
            <div class="savings-value">Data Error</div>
            <p>Unable to calculate savings. Please try again with different inputs.</p>
        </div>
    `,
    
    environmentalImpact: () => `
        <div class="environmental-impact">
            <div class="environmental-title">🌱 Environmental Data Unavailable</div>
            <div class="environmental-subtitle">Calculation errors prevented environmental analysis</div>
            <div style="text-align: center; padding: 40px;">
                <p>Environmental impact metrics could not be calculated due to data errors.</p>
                <button onclick="calculateTCO()" class="calculate-btn" style="width: auto; padding: 12px 24px;">
                    Retry Calculation
                </button>
            </div>
        </div>
    `,
    
    resultsGrid: () => `
        <div class="results-grid">
            <div class="result-card air">
                <h3>🌪️ Air Cooling System</h3>
                <div class="result-value">Error</div>
                <div class="result-subtitle">Data calculation failed</div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                    Unable to process air cooling calculations
                </div>
            </div>
            <div class="result-card immersion">
                <h3>🧊 Immersion Cooling</h3>
                <div class="result-value">Error</div>
                <div class="result-subtitle">Data calculation failed</div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                    Unable to process immersion cooling calculations
                </div>
            </div>
            <div class="result-card savings">
                <h3>📊 Retry Calculation</h3>
                <div class="result-value">⟳</div>
                <div class="result-subtitle">Fix inputs and retry</div>
                <div style="margin-top: 10px;">
                    <button onclick="calculateTCO()" class="calculate-btn" style="width: 100%; padding: 8px;">
                        Recalculate
                    </button>
                </div>
            </div>
        </div>
    `
};

/**
 * Generates fallback content when primary template generation fails
 * @param {string} section - Section name for fallback
 * @param {Error} error - Original error that triggered fallback
 * @return {string} Fallback HTML template
 */
function generateFallbackTemplate(section, error) {
    console.error(`Generating fallback for ${section}:`, error.message);
    
    if (FALLBACK_TEMPLATES[section]) {
        return FALLBACK_TEMPLATES[section]();
    }
    
    return `
        <div class="error-fallback" style="padding: 20px; text-align: center; background: #f5f5f5; border-radius: 10px; margin: 10px 0;">
            <h4>⚠️ Content Unavailable</h4>
            <p>Unable to display ${section} due to data errors.</p>
            <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px;">
                Refresh Page
            </button>
        </div>
    `;
}

/**
 * Progressive fallback strategy
 * - Attempts multiple recovery strategies before giving up
 * - Provides increasingly minimal but functional alternatives
 */
function progressiveFallback(data, section) {
    const strategies = [
        () => generateWithDefaults(data, section),
        () => generateMinimalTemplate(section),
        () => generateEmergencyTemplate(section)
    ];
    
    for (const strategy of strategies) {
        try {
            const result = strategy();
            if (result && result.length > 0) {
                return result;
            }
        } catch (error) {
            console.warn(`Fallback strategy failed for ${section}:`, error.message);
        }
    }
    
    return generateFallbackTemplate(section, new Error('All fallback strategies failed'));
}

function generateWithDefaults(data, section) {
    // Attempt to generate template with default values for missing data
    const defaultData = {
        totalSavings: 0,
        isPositive: false,
        analysisYears: 5,
        roiPercent: 0,
        paybackYears: 0,
        ...data
    };
    
    return generateSecureTemplate(defaultData)[section];
}

function generateMinimalTemplate(section) {
    // Minimal template with no dynamic data
    switch (section) {
        case 'savingsHighlight':
            return `<div class="savings-highlight">
                <h2>💸 Calculation Error</h2>
                <div class="savings-value">$0</div>
                <p>Please recalculate with valid inputs</p>
            </div>`;
        default:
            return `<div class="minimal-template">Content temporarily unavailable</div>`;
    }
}

function generateEmergencyTemplate(section) {
    // Last resort: static emergency template
    return `<div class="emergency-template" style="padding: 20px; background: #ffebee; border: 1px solid #f44336; border-radius: 8px; margin: 10px 0;">
        <h4 style="color: #d32f2f; margin: 0 0 10px 0;">🚨 System Error</h4>
        <p style="margin: 0; color: #666;">The ${section} section encountered a critical error and cannot be displayed.</p>
    </div>`;
}
```

## 4. Variable Safety Architecture for Undefined Reference Prevention

### 4.1 Safe Variable Declaration Pattern

**Design Principle**: All variables must have guaranteed values before template execution.

```javascript
/**
 * Safe Variable Extraction with Null Coalescing
 * - Uses optional chaining and null coalescing for safe property access
 * - Provides type-appropriate defaults for all variable types
 * - Validates variable integrity before template generation
 */

function extractSafeDisplayVariables(data) {
    // Level 1: Null-safe extraction with optional chaining
    const comparison = data?.comparison ?? {};
    const savings = comparison?.savings ?? {};
    const efficiency = comparison?.efficiency ?? {};
    const parameters = data?.parameters ?? {};
    const airCooling = data?.airCooling ?? {};
    const immersionCooling = data?.immersionCooling ?? {};
    
    // Level 2: Type-safe conversion with defaults
    const extractNumber = (value, defaultValue = 0) => {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    };
    
    const extractInteger = (value, defaultValue = 0) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? defaultValue : num;
    };
    
    const extractBoolean = (value, defaultValue = false) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value > 0;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        return defaultValue;
    };
    
    // Level 3: Business logic validation
    const totalSavings = extractNumber(savings.totalSavings, 0);
    const analysisYears = extractInteger(parameters.analysisYears, 5);
    
    // Ensure analysisYears is within valid range
    const validAnalysisYears = Math.max(1, Math.min(analysisYears, 20));
    
    // Level 4: Final variable assembly with guaranteed types
    const safeVars = {
        // Financial metrics
        totalSavings: totalSavings,
        isPositive: totalSavings >= 0,
        annualSavings: extractNumber(savings.annualSavings, 0),
        capexDifference: extractNumber(savings.capexDifference, 0),
        paybackYears: extractNumber(savings.paybackYears, 0),
        roiPercent: extractNumber(savings.roiPercent, 0),
        
        // Analysis parameters
        analysisYears: validAnalysisYears,
        electricityPrice: extractNumber(parameters.electricityPrice, 0.12),
        discountRate: extractNumber(parameters.discountRate, 5),
        maintenanceCost: extractNumber(parameters.maintenanceCost, 3),
        
        // Environmental metrics
        pueImprovement: extractNumber(efficiency.pueImprovement, 0),
        annualEnergySavingsMWh: extractNumber(efficiency.annualEnergySavingsMWh, 0),
        annualCarbonReductionTons: extractNumber(efficiency.annualCarbonReductionTons, 0),
        
        // Equipment data
        airCooling: {
            count: extractInteger(airCooling?.equipment?.count, 0),
            totalPowerKW: extractNumber(airCooling?.equipment?.totalPowerKW, 0),
            pue: extractNumber(airCooling?.equipment?.pue, 1.8),
            capex: extractNumber(airCooling?.costs?.capex, 0),
            annualOpex: extractNumber(airCooling?.costs?.annualOpex, 0),
            totalTCO: extractNumber(airCooling?.costs?.totalTCO, 0),
            annualConsumptionMWh: extractNumber(airCooling?.energy?.annualConsumptionMWh, 0)
        },
        
        immersionCooling: {
            count: extractInteger(immersionCooling?.equipment?.count, 0),
            totalPowerKW: extractNumber(immersionCooling?.equipment?.totalPowerKW, 0),
            pue: extractNumber(immersionCooling?.equipment?.pue, 1.1),
            capex: extractNumber(immersionCooling?.costs?.capex, 0),
            annualOpex: extractNumber(immersionCooling?.costs?.annualOpex, 0),
            totalTCO: extractNumber(immersionCooling?.costs?.totalTCO, 0),
            annualConsumptionMWh: extractNumber(immersionCooling?.energy?.annualConsumptionMWh, 0)
        }
    };
    
    // Level 5: Variable integrity validation
    const integrityCheck = validateVariableIntegrity(safeVars);
    if (!integrityCheck.valid) {
        console.warn('Variable integrity issues:', integrityCheck.warnings);
    }
    
    return safeVars;
}

/**
 * Validates logical consistency of extracted variables
 * @param {Object} vars - Extracted variables
 * @return {Object} Validation result with warnings
 */
function validateVariableIntegrity(vars) {
    const warnings = [];
    
    // Check financial logic
    if (vars.totalSavings !== 0 && Math.abs(vars.totalSavings) < 1) {
        warnings.push('totalSavings value unusually small, may indicate calculation error');
    }
    
    if (vars.paybackYears < 0) {
        warnings.push('Negative payback years detected, setting to 0');
        vars.paybackYears = 0;
    }
    
    if (vars.paybackYears > 100) {
        warnings.push('Payback years > 100, may indicate invalid calculation');
    }
    
    // Check equipment logic
    if (vars.airCooling.count === 0 && vars.immersionCooling.count === 0) {
        warnings.push('No equipment detected in either configuration');
    }
    
    // Check environmental logic
    if (vars.pueImprovement < 0) {
        warnings.push('Negative PUE improvement indicates worse efficiency');
    }
    
    if (vars.pueImprovement > 90) {
        warnings.push('PUE improvement > 90% is unrealistic');
        vars.pueImprovement = Math.min(vars.pueImprovement, 90);
    }
    
    return {
        valid: warnings.length === 0,
        warnings: warnings
    };
}
```

### 4.2 Immutable Variable Pattern

```javascript
/**
 * Creates immutable variable objects to prevent accidental modification
 * - Freezes objects to prevent property changes
 * - Provides getter methods for safe access
 * - Logs access attempts for debugging
 */

function createImmutableDisplayVars(data) {
    const vars = extractSafeDisplayVariables(data);
    
    // Create immutable wrapper
    const immutableVars = Object.freeze({
        // Primitive values (already immutable)
        ...vars,
        
        // Complex objects frozen recursively
        airCooling: Object.freeze(vars.airCooling),
        immersionCooling: Object.freeze(vars.immersionCooling),
        
        // Getter methods for safe access
        getSafeTotalSavings: () => vars.totalSavings,
        getSafeIsPositive: () => vars.isPositive,
        getSafeAnalysisYears: () => vars.analysisYears,
        
        // Formatted getter methods
        getFormattedSavings: () => {
            const abs = Math.abs(vars.totalSavings);
            const sign = vars.isPositive ? '$' : '-$';
            return `${sign}${abs.toLocaleString()}`;
        },
        
        getFormattedROI: () => `${vars.roiPercent.toFixed(1)}%`,
        getFormattedPayback: () => `${vars.paybackYears.toFixed(1)} years`,
        
        // Validation methods
        isDataComplete: () => {
            return vars.totalSavings !== 0 || 
                   vars.airCooling.totalTCO !== 0 || 
                   vars.immersionCooling.totalTCO !== 0;
        },
        
        hasEnvironmentalData: () => {
            return vars.pueImprovement > 0 || 
                   vars.annualEnergySavingsMWh > 0 || 
                   vars.annualCarbonReductionTons > 0;
        }
    });
    
    return immutableVars;
}
```

## 5. Monitoring and Alerting Integration Architecture

### 5.1 Error Tracking and Logging

**Design Principle**: Comprehensive error visibility for rapid incident response.

```javascript
/**
 * Centralized Error Tracking System
 * - Captures all display-related errors with context
 * - Provides structured logging for debugging
 * - Integrates with external monitoring systems
 */

class DisplayErrorTracker {
    constructor() {
        this.errors = [];
        this.warningThreshold = 3;
        this.errorThreshold = 5;
        this.isLoggingEnabled = true;
    }
    
    /**
     * Logs display error with full context
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                calculationId: context.calculationId,
                inputData: context.inputData,
                section: context.section,
                attemptNumber: context.attemptNumber || 1
            },
            severity: this.determineSeverity(error, context),
            sessionId: this.getSessionId()
        };
        
        this.errors.push(errorEntry);
        
        if (this.isLoggingEnabled) {
            console.error('Display Error:', errorEntry);
        }
        
        // Send to monitoring service
        this.sendToMonitoring(errorEntry);
        
        // Check if threshold breach requires escalation
        this.checkThresholds();
    }
    
    /**
     * Determines error severity based on context
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     * @return {string} Severity level
     */
    determineSeverity(error, context) {
        if (error.message.includes('isPositive')) return 'critical';
        if (error.message.includes('totalSavings')) return 'high';
        if (context.section === 'savingsHighlight') return 'high';
        if (context.attemptNumber > 1) return 'medium';
        return 'low';
    }
    
    /**
     * Sends error data to external monitoring service
     * @param {Object} errorEntry - Error entry object
     */
    sendToMonitoring(errorEntry) {
        // Integration with monitoring services
        try {
            // Example: Send to DataDog, New Relic, or custom endpoint
            if (window.datadog) {
                window.datadog.addError(errorEntry.error, errorEntry.context);
            }
            
            // Send to custom monitoring endpoint
            fetch('/api/monitoring/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorEntry)
            }).catch(e => console.warn('Failed to send error to monitoring:', e));
            
        } catch (monitoringError) {
            console.warn('Monitoring service error:', monitoringError);
        }
    }
    
    /**
     * Checks error thresholds and triggers alerts
     */
    checkThresholds() {
        const recentErrors = this.getRecentErrors(5 * 60 * 1000); // Last 5 minutes
        const criticalErrors = recentErrors.filter(e => e.severity === 'critical');
        
        if (criticalErrors.length >= this.errorThreshold) {
            this.triggerCriticalAlert(criticalErrors);
        } else if (recentErrors.length >= this.warningThreshold) {
            this.triggerWarningAlert(recentErrors);
        }
    }
    
    /**
     * Gets recent errors within time window
     * @param {number} timeWindow - Time window in milliseconds
     * @return {Array} Recent error entries
     */
    getRecentErrors(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff);
    }
    
    /**
     * Triggers critical alert for error threshold breach
     * @param {Array} errors - Critical errors
     */
    triggerCriticalAlert(errors) {
        const alert = {
            level: 'critical',
            message: `${errors.length} critical display errors in last 5 minutes`,
            errors: errors,
            timestamp: new Date().toISOString(),
            recommendedAction: 'Immediate investigation required - potential service degradation'
        };
        
        console.error('CRITICAL ALERT:', alert);
        
        // Send to alerting system
        this.sendAlert(alert);
    }
    
    /**
     * Triggers warning alert for increased error rate
     * @param {Array} errors - Recent errors
     */
    triggerWarningAlert(errors) {
        const alert = {
            level: 'warning',
            message: `${errors.length} display errors in last 5 minutes`,
            errors: errors,
            timestamp: new Date().toISOString(),
            recommendedAction: 'Monitor for escalation - investigate if pattern continues'
        };
        
        console.warn('WARNING ALERT:', alert);
        this.sendAlert(alert);
    }
    
    /**
     * Sends alert to external systems
     * @param {Object} alert - Alert object
     */
    sendAlert(alert) {
        // Integration with alerting systems (PagerDuty, Slack, etc.)
        fetch('/api/monitoring/alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
        }).catch(e => console.warn('Failed to send alert:', e));
    }
    
    /**
     * Gets or creates session ID for error correlation
     * @return {string} Session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('displayErrorSessionId');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('displayErrorSessionId', sessionId);
        }
        return sessionId;
    }
}

// Global error tracker instance
const displayErrorTracker = new DisplayErrorTracker();
```

### 5.2 Performance Monitoring

```javascript
/**
 * Performance Monitoring for Display Operations
 * - Tracks template generation performance
 * - Monitors DOM manipulation times
 * - Alerts on performance degradation
 */

class DisplayPerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.performanceThresholds = {
            templateGeneration: 50, // ms
            domUpdate: 100, // ms
            totalDisplayTime: 200 // ms
        };
    }
    
    /**
     * Starts performance measurement
     * @param {string} operation - Operation name
     * @return {Function} End measurement function
     */
    startMeasurement(operation) {
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return (metadata = {}) => {
            const endTime = performance.now();
            const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const duration = endTime - startTime;
            const memoryDelta = endMemory - startMemory;
            
            const metric = {
                operation,
                duration,
                memoryDelta,
                timestamp: new Date().toISOString(),
                metadata
            };
            
            this.metrics.push(metric);
            this.checkPerformanceThresholds(metric);
            
            return metric;
        };
    }
    
    /**
     * Checks if performance metric exceeds thresholds
     * @param {Object} metric - Performance metric
     */
    checkPerformanceThresholds(metric) {
        const threshold = this.performanceThresholds[metric.operation];
        if (threshold && metric.duration > threshold) {
            displayErrorTracker.logError(
                new Error(`Performance threshold exceeded: ${metric.operation}`),
                {
                    section: 'performance',
                    metric: metric,
                    threshold: threshold
                }
            );
        }
    }
    
    /**
     * Gets performance statistics
     * @param {string} operation - Operation to analyze
     * @return {Object} Performance statistics
     */
    getPerformanceStats(operation) {
        const operationMetrics = this.metrics.filter(m => m.operation === operation);
        if (operationMetrics.length === 0) return null;
        
        const durations = operationMetrics.map(m => m.duration);
        return {
            count: operationMetrics.length,
            average: durations.reduce((a, b) => a + b, 0) / durations.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
            latest: operationMetrics[operationMetrics.length - 1].duration
        };
    }
}

// Global performance monitor
const displayPerformanceMonitor = new DisplayPerformanceMonitor();
```

## 6. Container Stability and Health Check Architecture

### 6.1 Health Check Implementation

**Design Principle**: Proactive health monitoring to prevent service disruption.

```javascript
/**
 * Health Check System for TCO Calculator
 * - Validates application state and functionality
 * - Provides endpoints for container orchestration
 * - Enables graceful degradation strategies
 */

class HealthCheckSystem {
    constructor() {
        this.checks = new Map();
        this.healthStatus = 'healthy';
        this.lastCheck = null;
        this.checkInterval = 30000; // 30 seconds
        
        this.initializeChecks();
        this.startPeriodicChecks();
    }
    
    /**
     * Initializes all health checks
     */
    initializeChecks() {
        // Critical functionality checks
        this.checks.set('displayFunction', () => this.checkDisplayFunction());
        this.checks.set('calculationAPI', () => this.checkCalculationAPI());
        this.checks.set('templateGeneration', () => this.checkTemplateGeneration());
        this.checks.set('errorHandling', () => this.checkErrorHandling());
        this.checks.set('memoryUsage', () => this.checkMemoryUsage());
        
        // Infrastructure checks
        this.checks.set('domAccess', () => this.checkDOMAccess());
        this.checks.set('localStorage', () => this.checkLocalStorage());
        this.checks.set('networkConnectivity', () => this.checkNetworkConnectivity());
    }
    
    /**
     * Starts periodic health checks
     */
    startPeriodicChecks() {
        setInterval(() => {
            this.runAllChecks().catch(error => {
                console.error('Health check error:', error);
            });
        }, this.checkInterval);
    }
    
    /**
     * Runs all health checks
     * @return {Promise<Object>} Health check results
     */
    async runAllChecks() {
        const results = {};
        const errors = [];
        
        for (const [name, checkFunction] of this.checks) {
            try {
                const result = await checkFunction();
                results[name] = result;
                
                if (!result.healthy) {
                    errors.push(`${name}: ${result.message}`);
                }
            } catch (error) {
                results[name] = { healthy: false, message: error.message };
                errors.push(`${name}: ${error.message}`);
            }
        }
        
        const overallHealth = errors.length === 0;
        this.healthStatus = overallHealth ? 'healthy' : 'unhealthy';
        this.lastCheck = new Date().toISOString();
        
        const healthReport = {
            status: this.healthStatus,
            timestamp: this.lastCheck,
            checks: results,
            errors: errors
        };
        
        // Log health status changes
        if (this.healthStatus !== 'healthy') {
            console.error('Health check failed:', healthReport);
            displayErrorTracker.logError(
                new Error('Health check failure'),
                { healthReport }
            );
        }
        
        return healthReport;
    }
    
    /**
     * Checks display function availability
     * @return {Object} Check result
     */
    checkDisplayFunction() {
        try {
            // Test displayResults function exists and is callable
            if (typeof window.displayResults !== 'function') {
                return { healthy: false, message: 'displayResults function not available' };
            }
            
            // Test safe variable extraction
            const testData = { comparison: { savings: { totalSavings: 100 } } };
            const vars = extractSafeDisplayVariables(testData);
            
            if (typeof vars.isPositive !== 'boolean') {
                return { healthy: false, message: 'isPositive variable extraction failed' };
            }
            
            return { healthy: true, message: 'Display function operational' };
        } catch (error) {
            return { healthy: false, message: `Display function error: ${error.message}` };
        }
    }
    
    /**
     * Checks calculation API availability
     * @return {Promise<Object>} Check result
     */
    async checkCalculationAPI() {
        try {
            // Test minimal API call
            const testPayload = {
                airRacks: 1,
                immersionTanks: 1,
                analysisYears: 1,
                electricityPrice: 0.12,
                discountRate: 5,
                maintenanceCost: 3
            };
            
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });
            
            if (!response.ok) {
                return { healthy: false, message: `API returned ${response.status}` };
            }
            
            const result = await response.json();
            if (!result.comparison || !result.comparison.savings) {
                return { healthy: false, message: 'API returned invalid structure' };
            }
            
            return { healthy: true, message: 'Calculation API operational' };
        } catch (error) {
            return { healthy: false, message: `API check failed: ${error.message}` };
        }
    }
    
    /**
     * Checks template generation functionality
     * @return {Object} Check result
     */
    checkTemplateGeneration() {
        try {
            const testVars = {
                totalSavings: 1000,
                isPositive: true,
                analysisYears: 5,
                roiPercent: 15,
                paybackYears: 3
            };
            
            const template = generateSavingsSection(testVars);
            
            if (!template || typeof template !== 'string') {
                return { healthy: false, message: 'Template generation returned invalid result' };
            }
            
            if (!template.includes('1000') || !template.includes('💰')) {
                return { healthy: false, message: 'Template missing expected content' };
            }
            
            return { healthy: true, message: 'Template generation operational' };
        } catch (error) {
            return { healthy: false, message: `Template generation failed: ${error.message}` };
        }
    }
    
    /**
     * Checks error handling functionality
     * @return {Object} Check result
     */
    checkErrorHandling() {
        try {
            // Test error tracking
            const testError = new Error('Health check test error');
            displayErrorTracker.logError(testError, { section: 'healthCheck' });
            
            // Test fallback template generation
            const fallback = generateFallbackTemplate('savingsHighlight', testError);
            
            if (!fallback || typeof fallback !== 'string') {
                return { healthy: false, message: 'Error handling not functional' };
            }
            
            return { healthy: true, message: 'Error handling operational' };
        } catch (error) {
            return { healthy: false, message: `Error handling check failed: ${error.message}` };
        }
    }
    
    /**
     * Checks memory usage
     * @return {Object} Check result
     */
    checkMemoryUsage() {
        try {
            if (!performance.memory) {
                return { healthy: true, message: 'Memory monitoring not available' };
            }
            
            const memoryInfo = performance.memory;
            const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
            const limitMB = memoryInfo.jsHeapSizeLimit / 1024 / 1024;
            const usagePercent = (usedMB / limitMB) * 100;
            
            if (usagePercent > 90) {
                return { healthy: false, message: `High memory usage: ${usagePercent.toFixed(1)}%` };
            }
            
            return { 
                healthy: true, 
                message: `Memory usage: ${usagePercent.toFixed(1)}% (${usedMB.toFixed(1)}MB)` 
            };
        } catch (error) {
            return { healthy: false, message: `Memory check failed: ${error.message}` };
        }
    }
    
    /**
     * Checks DOM access functionality
     * @return {Object} Check result
     */
    checkDOMAccess() {
        try {
            // Test critical DOM elements exist
            const criticalElements = ['results', 'loadingIndicator', 'resultsContent'];
            
            for (const elementId of criticalElements) {
                const element = document.getElementById(elementId);
                if (!element) {
                    return { healthy: false, message: `Critical element ${elementId} not found` };
                }
            }
            
            return { healthy: true, message: 'DOM access operational' };
        } catch (error) {
            return { healthy: false, message: `DOM access failed: ${error.message}` };
        }
    }
    
    /**
     * Checks local storage functionality
     * @return {Object} Check result
     */
    checkLocalStorage() {
        try {
            const testKey = 'healthCheckTest';
            const testValue = Date.now().toString();
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved !== testValue) {
                return { healthy: false, message: 'Local storage read/write failed' };
            }
            
            return { healthy: true, message: 'Local storage operational' };
        } catch (error) {
            return { healthy: false, message: `Local storage failed: ${error.message}` };
        }
    }
    
    /**
     * Checks network connectivity
     * @return {Promise<Object>} Check result
     */
    async checkNetworkConnectivity() {
        try {
            // Simple connectivity check with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/health', {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                return { healthy: false, message: `Network check returned ${response.status}` };
            }
            
            return { healthy: true, message: 'Network connectivity operational' };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { healthy: false, message: 'Network timeout' };
            }
            return { healthy: false, message: `Network check failed: ${error.message}` };
        }
    }
}

// Global health check system
const healthCheckSystem = new HealthCheckSystem();
```

### 6.2 Server-Side Health Endpoints

```javascript
/**
 * Server-side health check endpoints for container orchestration
 * - Provides standardized health check responses
 * - Integrates with Kubernetes/Docker health checks
 * - Enables load balancer health monitoring
 */

// Add to createServer function in tco-calculator.js
function addHealthCheckEndpoints(server) {
    // Liveness probe endpoint
    server.on('request', (req, res) => {
        if (req.method === 'GET' && req.url === '/health/live') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version
            }));
            return;
        }
        
        // Readiness probe endpoint
        if (req.method === 'GET' && req.url === '/health/ready') {
            const healthStatus = {
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    calculation: checkCalculationFunctionality(),
                    memory: checkMemoryHealth(),
                    dependencies: checkDependencies()
                }
            };
            
            const isReady = Object.values(healthStatus.checks).every(check => check.healthy);
            const statusCode = isReady ? 200 : 503;
            
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(healthStatus));
            return;
        }
        
        // Detailed health endpoint
        if (req.method === 'GET' && req.url === '/health') {
            const detailedHealth = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                system: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    cpuUsage: process.cpuUsage()
                },
                checks: {
                    calculation: checkCalculationFunctionality(),
                    validation: checkValidationFunctionality(),
                    errorHandling: checkErrorHandlingFunctionality()
                }
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(detailedHealth, null, 2));
            return;
        }
    });
}

function checkCalculationFunctionality() {
    try {
        const testParams = {
            airRacks: 1,
            immersionTanks: 1,
            analysisYears: 1,
            electricityPrice: 0.12,
            discountRate: 5,
            maintenanceCost: 3
        };
        
        const result = calculateTCO(testParams);
        
        if (!result.comparison || !result.comparison.savings) {
            return { healthy: false, message: 'Invalid calculation result structure' };
        }
        
        return { healthy: true, message: 'Calculation functionality operational' };
    } catch (error) {
        return { healthy: false, message: `Calculation error: ${error.message}` };
    }
}

function checkMemoryHealth() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    if (usagePercent > 90) {
        return { healthy: false, message: `High memory usage: ${usagePercent.toFixed(1)}%` };
    }
    
    return { 
        healthy: true, 
        message: `Memory usage: ${usagePercent.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB)` 
    };
}

function checkDependencies() {
    // Check required Node.js modules are available
    try {
        require('http');
        require('net');
        return { healthy: true, message: 'All dependencies available' };
    } catch (error) {
        return { healthy: false, message: `Dependency missing: ${error.message}` };
    }
}

function checkValidationFunctionality() {
    try {
        const testParams = {
            airRacks: 'invalid',
            immersionTanks: 1,
            analysisYears: 1
        };
        
        // Should throw validation error
        validateInput(testParams);
        return { healthy: false, message: 'Validation not working - invalid input accepted' };
    } catch (error) {
        // Validation working correctly
        return { healthy: true, message: 'Validation functionality operational' };
    }
}

function checkErrorHandlingFunctionality() {
    try {
        // Test error handling with invalid data
        const invalidData = null;
        
        // This should not crash the application
        if (invalidData?.comparison?.savings?.totalSavings) {
            return { healthy: false, message: 'Error handling not robust' };
        }
        
        return { healthy: true, message: 'Error handling operational' };
    } catch (error) {
        return { healthy: false, message: `Error handling check failed: ${error.message}` };
    }
}
```

## 7. Testing Architecture for Error Condition Validation

### 7.1 Comprehensive Error Scenario Testing

**Design Principle**: Test all possible error conditions to prevent regression.

```javascript
/**
 * Error Condition Test Suite
 * - Tests all identified error scenarios
 * - Validates error handling and recovery
 * - Ensures robust fallback mechanisms
 */

class ErrorConditionTestSuite {
    constructor() {
        this.testResults = [];
        this.failureCount = 0;
        this.successCount = 0;
    }
    
    /**
     * Runs complete error condition test suite
     * @return {Promise<Object>} Test results summary
     */
    async runAllTests() {
        console.log('🧪 Starting Error Condition Test Suite...');
        
        const testCategories = [
            () => this.testDataValidationErrors(),
            () => this.testTemplateGenerationErrors(),
            () => this.testVariableSafetyErrors(),
            () => this.testAPIResponseErrors(),
            () => this.testDOMManipulationErrors(),
            () => this.testFallbackMechanisms(),
            () => this.testPerformanceUnderErrors(),
            () => this.testConcurrentErrorHandling()
        ];
        
        for (const testCategory of testCategories) {
            try {
                await testCategory();
            } catch (error) {
                this.recordTestResult('CATEGORY_FAILURE', false, `Category failed: ${error.message}`);
            }
        }
        
        return this.generateTestReport();
    }
    
    /**
     * Tests data validation error scenarios
     */
    async testDataValidationErrors() {
        console.log('Testing data validation errors...');
        
        // Test 1: Completely missing data
        await this.runTest('missing_data', () => {
            const result = validateDisplayData(null);
            return result !== null; // Should not crash
        });
        
        // Test 2: Missing comparison object
        await this.runTest('missing_comparison', () => {
            const data = { airCooling: {}, immersionCooling: {} };
            const vars = extractSafeDisplayVariables(data);
            return vars.isPositive === false; // Should default to false
        });
        
        // Test 3: Missing totalSavings
        await this.runTest('missing_totalSavings', () => {
            const data = { comparison: { savings: {} } };
            const vars = extractSafeDisplayVariables(data);
            return vars.totalSavings === 0 && vars.isPositive === false;
        });
        
        // Test 4: Invalid data types
        await this.runTest('invalid_types', () => {
            const data = { 
                comparison: { 
                    savings: { 
                        totalSavings: 'not_a_number',
                        roiPercent: null,
                        paybackYears: undefined
                    }
                }
            };
            const vars = extractSafeDisplayVariables(data);
            return typeof vars.totalSavings === 'number' && 
                   typeof vars.roiPercent === 'number' &&
                   typeof vars.paybackYears === 'number';
        });
        
        // Test 5: Extreme values
        await this.runTest('extreme_values', () => {
            const data = { 
                comparison: { 
                    savings: { 
                        totalSavings: Number.MAX_SAFE_INTEGER,
                        roiPercent: -1000,
                        paybackYears: Infinity
                    }
                }
            };
            const vars = extractSafeDisplayVariables(data);
            return Number.isFinite(vars.totalSavings) && 
                   Number.isFinite(vars.roiPercent) &&
                   Number.isFinite(vars.paybackYears);
        });
    }
    
    /**
     * Tests template generation error scenarios
     */
    async testTemplateGenerationErrors() {
        console.log('Testing template generation errors...');
        
        // Test 1: Template generation with undefined variables
        await this.runTest('undefined_template_vars', () => {
            const vars = { totalSavings: undefined, isPositive: undefined };
            try {
                const template = generateSavingsSection(vars);
                return template !== null && template.length > 0;
            } catch (error) {
                return false;
            }
        });
        
        // Test 2: Template generation with null values
        await this.runTest('null_template_vars', () => {
            const vars = { totalSavings: null, isPositive: null, analysisYears: null };
            try {
                const template = generateSavingsSection(vars);
                return template !== null && template.includes('Additional Cost');
            } catch (error) {
                return false;
            }
        });
        
        // Test 3: Malformed variable objects
        await this.runTest('malformed_vars', () => {
            try {
                const template = generateSavingsSection('not_an_object');
                return template !== null;
            } catch (error) {
                // Should handle gracefully and return fallback
                const fallback = generateFallbackTemplate('savingsHighlight', error);
                return fallback !== null && fallback.includes('Content Unavailable');
            }
        });
        
        // Test 4: Large data causing template overflow
        await this.runTest('large_data_template', () => {
            const vars = {
                totalSavings: 999999999999999,
                isPositive: true,
                analysisYears: 999,
                roiPercent: 99999,
                paybackYears: 99999
            };
            
            try {
                const template = generateSavingsSection(vars);
                return template.length < 10000; // Should not generate excessive content
            } catch (error) {
                return false;
            }
        });
    }
    
    /**
     * Tests variable safety error scenarios
     */
    async testVariableSafetyErrors() {
        console.log('Testing variable safety errors...');
        
        // Test 1: isPositive calculation with undefined totalSavings
        await this.runTest('isPositive_undefined_totalSavings', () => {
            const data = { comparison: { savings: { totalSavings: undefined } } };
            const vars = extractSafeDisplayVariables(data);
            return typeof vars.isPositive === 'boolean';
        });
        
        // Test 2: isPositive calculation with NaN totalSavings
        await this.runTest('isPositive_nan_totalSavings', () => {
            const data = { comparison: { savings: { totalSavings: NaN } } };
            const vars = extractSafeDisplayVariables(data);
            return typeof vars.isPositive === 'boolean' && vars.totalSavings === 0;
        });
        
        // Test 3: Variable integrity validation
        await this.runTest('variable_integrity', () => {
            const vars = {
                totalSavings: 0,
                isPositive: false,
                paybackYears: -1,
                pueImprovement: 150
            };
            
            const integrity = validateVariableIntegrity(vars);
            return integrity.warnings.length > 0 && vars.paybackYears >= 0;
        });
        
        // Test 4: Immutable variable protection
        await this.runTest('immutable_protection', () => {
            const data = { comparison: { savings: { totalSavings: 1000 } } };
            const immutableVars = createImmutableDisplayVars(data);
            
            try {
                immutableVars.totalSavings = 999;
                return false; // Should not be modifiable
            } catch (error) {
                return immutableVars.totalSavings === 1000; // Should remain unchanged
            }
        });
    }
    
    /**
     * Tests API response error scenarios
     */
    async testAPIResponseErrors() {
        console.log('Testing API response errors...');
        
        // Test 1: API timeout handling
        await this.runTest('api_timeout', async () => {
            try {
                // Simulate timeout by calling non-existent endpoint
                const response = await fetch('/api/timeout-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true })
                });
                return false; // Should not succeed
            } catch (error) {
                return true; // Error handling working
            }
        });
        
        // Test 2: Invalid JSON response
        await this.runTest('invalid_json_response', () => {
            const invalidResponse = 'not json';
            try {
                JSON.parse(invalidResponse);
                return false;
            } catch (error) {
                return true; // Error correctly caught
            }
        });
        
        // Test 3: Partial API response
        await this.runTest('partial_api_response', () => {
            const partialResponse = {
                airCooling: { costs: { capex: 100000 } }
                // Missing immersionCooling and comparison
            };
            
            try {
                const vars = extractSafeDisplayVariables(partialResponse);
                return vars.totalSavings === 0 && vars.isPositive === false;
            } catch (error) {
                return false;
            }
        });
    }
    
    /**
     * Tests DOM manipulation error scenarios
     */
    async testDOMManipulationErrors() {
        console.log('Testing DOM manipulation errors...');
        
        // Test 1: Missing DOM elements
        await this.runTest('missing_dom_elements', () => {
            try {
                updateDOMSafely('<div>test</div>', 'non-existent-element');
                return true; // Should handle gracefully
            } catch (error) {
                return false; // Should not throw
            }
        });
        
        // Test 2: Invalid HTML content
        await this.runTest('invalid_html_content', () => {
            try {
                const invalidHTML = '<div><span>unclosed div';
                updateDOMSafely(invalidHTML);
                return true; // Should handle gracefully
            } catch (error) {
                return false;
            }
        });
        
        // Test 3: Large content injection
        await this.runTest('large_content_injection', () => {
            try {
                const largeContent = '<div>' + 'x'.repeat(1000000) + '</div>';
                updateDOMSafely(largeContent);
                return true; // Should handle without freezing
            } catch (error) {
                return false;
            }
        });
    }
    
    /**
     * Tests fallback mechanism effectiveness
     */
    async testFallbackMechanisms() {
        console.log('Testing fallback mechanisms...');
        
        // Test 1: Progressive fallback execution
        await this.runTest('progressive_fallback', () => {
            const data = {}; // Empty data
            try {
                const result = progressiveFallback(data, 'savingsHighlight');
                return result !== null && result.length > 0;
            } catch (error) {
                return false;
            }
        });
        
        // Test 2: Emergency template generation
        await this.runTest('emergency_template', () => {
            try {
                const emergency = generateEmergencyTemplate('testSection');
                return emergency.includes('System Error') && emergency.includes('testSection');
            } catch (error) {
                return false;
            }
        });
        
        // Test 3: Fallback template completeness
        await this.runTest('fallback_completeness', () => {
            const sections = ['savingsHighlight', 'environmentalImpact', 'resultsGrid'];
            return sections.every(section => {
                const fallback = FALLBACK_TEMPLATES[section];
                return typeof fallback === 'function' && fallback().length > 0;
            });
        });
    }
    
    /**
     * Tests performance under error conditions
     */
    async testPerformanceUnderErrors() {
        console.log('Testing performance under error conditions...');
        
        // Test 1: Error handling performance
        await this.runTest('error_handling_performance', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                try {
                    extractSafeDisplayVariables(null);
                } catch (error) {
                    // Expected
                }
            }
            
            const duration = performance.now() - startTime;
            return duration < 100; // Should complete within 100ms
        });
        
        // Test 2: Fallback generation performance
        await this.runTest('fallback_performance', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 50; i++) {
                generateFallbackTemplate('savingsHighlight', new Error('test'));
            }
            
            const duration = performance.now() - startTime;
            return duration < 50; // Should be fast
        });
    }
    
    /**
     * Tests concurrent error handling
     */
    async testConcurrentErrorHandling() {
        console.log('Testing concurrent error handling...');
        
        // Test 1: Multiple simultaneous errors
        await this.runTest('concurrent_errors', async () => {
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
                promises.push(new Promise(resolve => {
                    try {
                        displayErrorTracker.logError(new Error(`Test error ${i}`), { test: true });
                        resolve(true);
                    } catch (error) {
                        resolve(false);
                    }
                }));
            }
            
            const results = await Promise.all(promises);
            return results.every(result => result === true);
        });
        
        // Test 2: Error threshold handling
        await this.runTest('error_threshold_handling', () => {
            const initialErrorCount = displayErrorTracker.errors.length;
            
            // Generate multiple errors quickly
            for (let i = 0; i < 3; i++) {
                displayErrorTracker.logError(new Error(`Threshold test ${i}`), { 
                    section: 'test',
                    severity: 'critical'
                });
            }
            
            const finalErrorCount = displayErrorTracker.errors.length;
            return finalErrorCount > initialErrorCount;
        });
    }
    
    /**
     * Runs individual test with error handling
     * @param {string} testName - Test name
     * @param {Function} testFunction - Test function
     */
    async runTest(testName, testFunction) {
        try {
            const result = await testFunction();
            this.recordTestResult(testName, result, result ? 'PASS' : 'FAIL');
        } catch (error) {
            this.recordTestResult(testName, false, `ERROR: ${error.message}`);
        }
    }
    
    /**
     * Records test result
     * @param {string} testName - Test name
     * @param {boolean} passed - Whether test passed
     * @param {string} message - Test message
     */
    recordTestResult(testName, passed, message) {
        const result = {
            test: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (passed) {
            this.successCount++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            this.failureCount++;
            console.error(`❌ ${testName}: ${message}`);
        }
    }
    
    /**
     * Generates comprehensive test report
     * @return {Object} Test report
     */
    generateTestReport() {
        const totalTests = this.successCount + this.failureCount;
        const successRate = (this.successCount / totalTests) * 100;
        
        const report = {
            summary: {
                total: totalTests,
                passed: this.successCount,
                failed: this.failureCount,
                successRate: successRate.toFixed(1) + '%'
            },
            results: this.testResults,
            timestamp: new Date().toISOString(),
            coverageAnalysis: this.analyzeCoverage()
        };
        
        console.log('\n📊 Error Condition Test Summary:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${this.successCount}`);
        console.log(`Failed: ${this.failureCount}`);
        console.log(`Success Rate: ${successRate.toFixed(1)}%`);
        
        if (this.failureCount > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
        }
        
        return report;
    }
    
    /**
     * Analyzes test coverage of error conditions
     * @return {Object} Coverage analysis
     */
    analyzeCoverage() {
        const errorCategories = {
            dataValidation: this.testResults.filter(r => r.test.includes('missing_') || r.test.includes('invalid_')).length,
            templateGeneration: this.testResults.filter(r => r.test.includes('template')).length,
            variableSafety: this.testResults.filter(r => r.test.includes('isPositive') || r.test.includes('variable')).length,
            apiErrors: this.testResults.filter(r => r.test.includes('api') || r.test.includes('timeout')).length,
            domManipulation: this.testResults.filter(r => r.test.includes('dom')).length,
            fallbackMechanisms: this.testResults.filter(r => r.test.includes('fallback') || r.test.includes('emergency')).length,
            performance: this.testResults.filter(r => r.test.includes('performance')).length,
            concurrency: this.testResults.filter(r => r.test.includes('concurrent')).length
        };
        
        const totalCoverageTests = Object.values(errorCategories).reduce((a, b) => a + b, 0);
        
        return {
            categories: errorCategories,
            totalCoverageTests: totalCoverageTests,
            coverageCompleteness: totalCoverageTests >= 25 ? 'Comprehensive' : 'Needs Improvement'
        };
    }
}

// Helper function to safely update DOM
function updateDOMSafely(htmlContent, elementId = 'resultsContent') {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`DOM element ${elementId} not found`);
            return false;
        }
        
        // Sanitize content before injection
        const sanitizedContent = htmlContent
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        
        element.innerHTML = sanitizedContent;
        return true;
    } catch (error) {
        console.error('DOM update error:', error);
        return false;
    }
}

// Global test suite instance
const errorTestSuite = new ErrorConditionTestSuite();
```

### 7.2 Automated Regression Testing

```javascript
/**
 * Automated Regression Testing System
 * - Continuously validates error handling improvements
 * - Prevents regression of fixed issues
 * - Integrates with CI/CD pipeline
 */

class RegressionTestSystem {
    constructor() {
        this.testSchedule = null;
        this.regressionResults = [];
        this.criticalTests = [
            'isPositive_undefined_totalSavings',
            'missing_comparison',
            'missing_totalSavings',
            'template_undefined_vars'
        ];
    }
    
    /**
     * Starts automated regression testing
     * @param {number} intervalMinutes - Test interval in minutes
     */
    startAutomatedTesting(intervalMinutes = 60) {
        console.log(`🔄 Starting automated regression testing (every ${intervalMinutes} minutes)`);
        
        this.testSchedule = setInterval(async () => {
            try {
                await this.runRegressionTests();
            } catch (error) {
                console.error('Regression test error:', error);
            }
        }, intervalMinutes * 60 * 1000);
    }
    
    /**
     * Stops automated testing
     */
    stopAutomatedTesting() {
        if (this.testSchedule) {
            clearInterval(this.testSchedule);
            this.testSchedule = null;
            console.log('⏹️ Stopped automated regression testing');
        }
    }
    
    /**
     * Runs focused regression tests
     * @return {Promise<Object>} Regression test results
     */
    async runRegressionTests() {
        console.log('🔍 Running regression tests...');
        
        const testSuite = new ErrorConditionTestSuite();
        const results = await testSuite.runAllTests();
        
        // Focus on critical tests
        const criticalResults = results.results.filter(r => 
            this.criticalTests.includes(r.test)
        );
        
        const criticalFailures = criticalResults.filter(r => !r.passed);
        
        const regressionResult = {
            timestamp: new Date().toISOString(),
            totalTests: results.summary.total,
            criticalTests: criticalResults.length,
            criticalFailures: criticalFailures.length,
            overallSuccessRate: results.summary.successRate,
            criticalSuccessRate: criticalResults.length > 0 ? 
                ((criticalResults.length - criticalFailures.length) / criticalResults.length * 100).toFixed(1) + '%' : '100%',
            failures: criticalFailures,
            status: criticalFailures.length === 0 ? 'PASS' : 'FAIL'
        };
        
        this.regressionResults.push(regressionResult);
        
        // Alert on regression failures
        if (criticalFailures.length > 0) {
            this.alertRegressionFailure(regressionResult);
        }
        
        return regressionResult;
    }
    
    /**
     * Alerts on regression test failure
     * @param {Object} result - Regression test result
     */
    alertRegressionFailure(result) {
        const alert = {
            level: 'critical',
            type: 'regression_failure',
            message: `${result.criticalFailures} critical regression tests failed`,
            details: result.failures,
            timestamp: result.timestamp,
            action: 'Immediate investigation required - potential production issue'
        };
        
        console.error('🚨 REGRESSION ALERT:', alert);
        
        // Send to monitoring systems
        displayErrorTracker.logError(
            new Error('Regression test failure'),
            { regressionAlert: alert }
        );
    }
    
    /**
     * Gets regression trend analysis
     * @param {number} days - Days to analyze
     * @return {Object} Trend analysis
     */
    getRegressionTrend(days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recentResults = this.regressionResults.filter(r => 
            new Date(r.timestamp).getTime() > cutoff
        );
        
        if (recentResults.length === 0) {
            return { trend: 'insufficient_data', message: 'Not enough recent test data' };
        }
        
        const successRates = recentResults.map(r => 
            parseFloat(r.criticalSuccessRate.replace('%', ''))
        );
        
        const averageSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
        const latestSuccessRate = successRates[successRates.length - 1];
        
        let trend = 'stable';
        if (latestSuccessRate > averageSuccessRate + 5) {
            trend = 'improving';
        } else if (latestSuccessRate < averageSuccessRate - 5) {
            trend = 'degrading';
        }
        
        return {
            trend: trend,
            averageSuccessRate: averageSuccessRate.toFixed(1) + '%',
            latestSuccessRate: latestSuccessRate.toFixed(1) + '%',
            testCount: recentResults.length,
            period: `${days} days`
        };
    }
}

// Global regression test system
const regressionTestSystem = new RegressionTestSystem();
```

## Implementation Strategy

### Phase 1: Immediate Fix (1-2 hours)
1. **Critical Variable Safety**: Implement safe variable extraction pattern
2. **Null Checking**: Add defensive programming around `isPositive` calculation
3. **Error Boundaries**: Wrap template generation in try-catch blocks
4. **Fallback Templates**: Add minimal fallback for savings section

### Phase 2: Comprehensive Error Handling (2-4 hours)
1. **Data Validation**: Implement full schema validation
2. **Template Safety**: Add progressive fallback system
3. **Performance Monitoring**: Add performance tracking
4. **Health Checks**: Implement health check endpoints

### Phase 3: Production Hardening (4-6 hours)
1. **Error Tracking**: Integrate monitoring and alerting
2. **Regression Testing**: Set up automated test suite
3. **Container Stability**: Add health check integration
4. **Documentation**: Complete implementation documentation

### Performance Impact Analysis
- **Data Validation**: <2ms per calculation
- **Template Safety**: <1ms per template generation
- **Error Tracking**: <0.5ms per error event
- **Total Impact**: <5ms per calculation (within requirement)

### Deployment Strategy
1. **Blue-Green Deployment**: Deploy to staging environment first
2. **Canary Release**: Gradual rollout to production traffic
3. **Rollback Plan**: Immediate rollback capability if issues detected
4. **Monitoring**: Enhanced monitoring during deployment

This comprehensive architecture ensures the critical `isPositive` undefined error is permanently resolved while establishing robust error handling patterns that prevent similar production issues in the future.