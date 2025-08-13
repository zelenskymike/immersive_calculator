# API Specification - Immersion Cooling TCO Calculator

## Overview

This document defines the complete RESTful API specification for the Immersion Cooling TCO Calculator using OpenAPI 3.0 format. The API provides endpoints for configuration management, calculation processing, report generation, and administrative functions.

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: Immersion Cooling TCO Calculator API
  description: |
    RESTful API for performing Total Cost of Ownership (TCO) calculations comparing 
    air cooling and immersion cooling systems for data centers. Supports multi-currency,
    multi-language operations with professional report generation.
  version: 1.0.0
  contact:
    name: API Support
    email: api-support@example.com
    url: https://docs.example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.tco-calculator.com/v1
    description: Production server
  - url: https://staging-api.tco-calculator.com/v1
    description: Staging server
  - url: http://localhost:3001/api/v1
    description: Development server

paths:
  # Health and System Status
  /health:
    get:
      summary: System health check
      description: Returns the current health status of the API and its dependencies
      tags:
        - System
      responses:
        '200':
          description: System is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'
        '503':
          description: System is unhealthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /info:
    get:
      summary: API information
      description: Returns API version, build information, and supported features
      tags:
        - System
      responses:
        '200':
          description: API information
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/APIInfo'

  # Configuration Endpoints
  /config/equipment:
    get:
      summary: Get equipment configurations
      description: Retrieves equipment pricing and specifications for calculations
      tags:
        - Configuration
      parameters:
        - name: category
          in: query
          description: Filter by equipment category
          required: false
          schema:
            type: string
            enum: [air_cooling, immersion_cooling]
        - name: currency
          in: query
          description: Currency for pricing information
          required: false
          schema:
            type: string
            enum: [USD, EUR, SAR, AED]
            default: USD
        - name: region
          in: query
          description: Regional pricing adjustments
          required: false
          schema:
            type: string
            enum: [US, EU, ME]
        - name: effective_date
          in: query
          description: Effective date for configuration (ISO 8601)
          required: false
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Equipment configurations retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EquipmentConfigResponse'
        '400':
          description: Invalid parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /config/financial:
    get:
      summary: Get financial parameters
      description: Retrieves financial calculation parameters (discount rates, energy costs, etc.)
      tags:
        - Configuration
      parameters:
        - name: category
          in: query
          description: Filter by parameter category
          required: false
          schema:
            type: string
            enum: [discount_rates, energy_costs, labor_costs, escalation_rates]
        - name: currency
          in: query
          description: Currency for financial parameters
          required: false
          schema:
            type: string
            enum: [USD, EUR, SAR, AED]
        - name: region
          in: query
          description: Regional parameter variations
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Financial parameters retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FinancialParametersResponse'

  /config/exchange-rates:
    get:
      summary: Get exchange rates
      description: Retrieves current exchange rates for supported currencies
      tags:
        - Configuration
      parameters:
        - name: base_currency
          in: query
          description: Base currency for rate conversion
          required: false
          schema:
            type: string
            enum: [USD, EUR, SAR, AED]
            default: USD
        - name: date
          in: query
          description: Date for historical rates (ISO 8601)
          required: false
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Exchange rates retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExchangeRatesResponse'

  # Calculation Endpoints
  /calculations/validate:
    post:
      summary: Validate calculation parameters
      description: Validates input parameters without performing full calculation
      tags:
        - Calculations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CalculationValidationRequest'
      responses:
        '200':
          description: Validation successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationResponse'
        '400':
          description: Validation failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationErrorResponse'

  /calculations/calculate:
    post:
      summary: Perform TCO calculation
      description: Executes complete TCO analysis comparing air cooling vs immersion cooling
      tags:
        - Calculations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CalculationRequest'
            examples:
              standard_calculation:
                summary: Standard calculation example
                value:
                  configuration:
                    air_cooling:
                      input_method: "rack_count"
                      rack_count: 100
                      rack_type: "42U_standard"
                      power_per_rack_kw: 12
                    immersion_cooling:
                      input_method: "auto_optimize"
                      target_power_kw: 1200
                      tank_configurations:
                        - size: "23U"
                          quantity: 25
                          power_density_kw_per_u: 2.0
                    financial:
                      analysis_years: 5
                      discount_rate: 0.08
                      currency: "USD"
                      region: "US"
                  locale: "en"
      responses:
        '200':
          description: Calculation completed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CalculationResponse'
        '400':
          description: Invalid calculation parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationErrorResponse'
        '422':
          description: Calculation processing error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /calculations/{sessionId}:
    get:
      summary: Retrieve saved calculation
      description: Gets a previously saved calculation session by ID
      tags:
        - Calculations
      parameters:
        - name: sessionId
          in: path
          required: true
          description: Calculation session ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Calculation session retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CalculationSessionResponse'
        '404':
          description: Session not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '410':
          description: Session expired
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /calculations/save:
    post:
      summary: Save calculation session
      description: Saves a calculation session for future retrieval or sharing
      tags:
        - Calculations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SaveSessionRequest'
      responses:
        '201':
          description: Session saved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SaveSessionResponse'
        '400':
          description: Invalid session data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  # Report Generation Endpoints
  /reports/pdf:
    post:
      summary: Generate PDF report
      description: Creates a PDF report from calculation results
      tags:
        - Reports
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PDFReportRequest'
      responses:
        '202':
          description: Report generation started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportGenerationResponse'
        '400':
          description: Invalid report parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /reports/excel:
    post:
      summary: Generate Excel report
      description: Creates an Excel spreadsheet from calculation results
      tags:
        - Reports
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExcelReportRequest'
      responses:
        '202':
          description: Report generation started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportGenerationResponse'

  /reports/{reportId}/status:
    get:
      summary: Get report generation status
      description: Checks the status of an asynchronous report generation
      tags:
        - Reports
      parameters:
        - name: reportId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Report status retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportStatusResponse'

  /reports/{reportId}/download:
    get:
      summary: Download generated report
      description: Downloads a completed report file
      tags:
        - Reports
      parameters:
        - name: reportId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: token
          in: query
          description: Download authorization token
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Report download
          content:
            application/pdf:
              schema:
                type: string
                format: binary
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
              schema:
                type: string
                format: binary
        '404':
          description: Report not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '410':
          description: Report expired
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  # Sharing Endpoints
  /sharing/create:
    post:
      summary: Create shareable link
      description: Creates a secure shareable link for calculation results
      tags:
        - Sharing
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateShareLinkRequest'
      responses:
        '201':
          description: Share link created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ShareLinkResponse'

  /sharing/{shareToken}:
    get:
      summary: Access shared calculation
      description: Retrieves calculation results via share token
      tags:
        - Sharing
      parameters:
        - name: shareToken
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Shared calculation retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SharedCalculationResponse'
        '404':
          description: Share link not found or expired
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  # Administrative Endpoints
  /admin/config/equipment:
    post:
      summary: Create equipment configuration
      description: Creates new equipment configuration (admin only)
      tags:
        - Administration
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateEquipmentConfigRequest'
      responses:
        '201':
          description: Equipment configuration created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EquipmentConfigResponse'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

    put:
      summary: Update equipment configuration
      description: Updates existing equipment configuration (admin only)
      tags:
        - Administration
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateEquipmentConfigRequest'
      responses:
        '200':
          description: Equipment configuration updated
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

  /admin/analytics:
    get:
      summary: Get usage analytics
      description: Retrieves system usage analytics and metrics (admin only)
      tags:
        - Administration
      security:
        - BearerAuth: []
      parameters:
        - name: start_date
          in: query
          schema:
            type: string
            format: date
        - name: end_date
          in: query
          schema:
            type: string
            format: date
        - name: granularity
          in: query
          schema:
            type: string
            enum: [hour, day, week, month]
            default: day
      responses:
        '200':
          description: Analytics data retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalyticsResponse'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # System Response Schemas
    HealthResponse:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        timestamp:
          type: string
          format: date-time
        checks:
          type: object
          properties:
            database:
              $ref: '#/components/schemas/HealthCheck'
            redis:
              $ref: '#/components/schemas/HealthCheck'
            external_services:
              $ref: '#/components/schemas/HealthCheck'

    HealthCheck:
      type: object
      properties:
        status:
          type: string
          enum: [pass, fail, warn]
        response_time_ms:
          type: integer
        output:
          type: string

    APIInfo:
      type: object
      properties:
        name:
          type: string
          example: "TCO Calculator API"
        version:
          type: string
          example: "1.0.0"
        build:
          type: string
        environment:
          type: string
          enum: [development, staging, production]
        features:
          type: object
          properties:
            multi_currency:
              type: boolean
            multi_language:
              type: boolean
            pdf_reports:
              type: boolean
            excel_reports:
              type: boolean

    # Configuration Schemas
    EquipmentConfigResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: array
          items:
            $ref: '#/components/schemas/EquipmentConfiguration'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    EquipmentConfiguration:
      type: object
      properties:
        id:
          type: string
          format: uuid
        category:
          type: string
          enum: [air_cooling, immersion_cooling]
        subcategory:
          type: string
        item_code:
          type: string
        display_name:
          type: object
          additionalProperties:
            type: string
        specifications:
          type: object
          description: Technical specifications in flexible JSON format
        pricing:
          type: object
          properties:
            USD:
              $ref: '#/components/schemas/EquipmentPricing'
            EUR:
              $ref: '#/components/schemas/EquipmentPricing'
            SAR:
              $ref: '#/components/schemas/EquipmentPricing'
            AED:
              $ref: '#/components/schemas/EquipmentPricing'
        effective_date:
          type: string
          format: date-time
        version:
          type: integer

    EquipmentPricing:
      type: object
      properties:
        equipment_cost:
          type: number
          format: double
        installation_cost:
          type: number
          format: double
        shipping_cost:
          type: number
          format: double
        maintenance_annual_pct:
          type: number
          format: double
        warranty_cost_annual:
          type: number
          format: double

    FinancialParametersResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: array
          items:
            $ref: '#/components/schemas/FinancialParameter'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    FinancialParameter:
      type: object
      properties:
        parameter_code:
          type: string
        parameter_name:
          type: string
        default_value:
          type: number
          format: double
        currency_code:
          type: string
          nullable: true
        unit:
          type: string
        regional_values:
          type: object
          additionalProperties:
            type: object
        description:
          type: object
          additionalProperties:
            type: string

    ExchangeRatesResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            base_currency:
              type: string
            effective_date:
              type: string
              format: date
            rates:
              type: object
              additionalProperties:
                type: number
                format: double
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    # Calculation Schemas
    CalculationValidationRequest:
      type: object
      properties:
        configuration:
          $ref: '#/components/schemas/CalculationConfiguration'
        locale:
          type: string
          enum: [en, ar]
          default: en

    CalculationRequest:
      type: object
      required:
        - configuration
      properties:
        configuration:
          $ref: '#/components/schemas/CalculationConfiguration'
        locale:
          type: string
          enum: [en, ar]
          default: en
        save_session:
          type: boolean
          default: false
        session_expiry_days:
          type: integer
          minimum: 1
          maximum: 90
          default: 30

    CalculationConfiguration:
      type: object
      required:
        - air_cooling
        - immersion_cooling
        - financial
      properties:
        air_cooling:
          $ref: '#/components/schemas/AirCoolingConfig'
        immersion_cooling:
          $ref: '#/components/schemas/ImmersionCoolingConfig'
        financial:
          $ref: '#/components/schemas/FinancialConfig'

    AirCoolingConfig:
      type: object
      required:
        - input_method
      properties:
        input_method:
          type: string
          enum: [rack_count, total_power]
        rack_count:
          type: integer
          minimum: 1
          maximum: 1000
        rack_type:
          type: string
        power_per_rack_kw:
          type: number
          format: double
          minimum: 0.5
          maximum: 50
        total_power_kw:
          type: number
          format: double
          minimum: 1
          maximum: 50000
        hvac_efficiency:
          type: number
          format: double
          minimum: 0.1
          maximum: 1.0
          default: 0.85

    ImmersionCoolingConfig:
      type: object
      required:
        - input_method
      properties:
        input_method:
          type: string
          enum: [manual_config, auto_optimize]
        target_power_kw:
          type: number
          format: double
          minimum: 1
          maximum: 50000
        tank_configurations:
          type: array
          items:
            type: object
            properties:
              size:
                type: string
                pattern: '^[1-9]\d*U$'
              quantity:
                type: integer
                minimum: 1
                maximum: 100
              power_density_kw_per_u:
                type: number
                format: double
                minimum: 0.5
                maximum: 5.0
        coolant_type:
          type: string
          default: "3M_Novec_7100"
        pumping_efficiency:
          type: number
          format: double
          minimum: 0.8
          maximum: 0.98
          default: 0.92

    FinancialConfig:
      type: object
      required:
        - analysis_years
        - currency
      properties:
        analysis_years:
          type: integer
          minimum: 1
          maximum: 10
        discount_rate:
          type: number
          format: double
          minimum: 0.01
          maximum: 0.20
          default: 0.08
        energy_cost_kwh:
          type: number
          format: double
          minimum: 0.01
          maximum: 1.0
        energy_escalation_rate:
          type: number
          format: double
          minimum: 0.0
          maximum: 0.10
          default: 0.03
        maintenance_escalation_rate:
          type: number
          format: double
          minimum: 0.0
          maximum: 0.10
          default: 0.025
        currency:
          type: string
          enum: [USD, EUR, SAR, AED]
        region:
          type: string
          enum: [US, EU, ME]

    CalculationResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/CalculationResults'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    CalculationResults:
      type: object
      properties:
        summary:
          $ref: '#/components/schemas/CalculationSummary'
        breakdown:
          $ref: '#/components/schemas/CalculationBreakdown'
        charts:
          $ref: '#/components/schemas/ChartData'
        environmental:
          $ref: '#/components/schemas/EnvironmentalImpact'
        session_id:
          type: string
          format: uuid
          nullable: true

    CalculationSummary:
      type: object
      properties:
        total_capex_savings:
          type: number
          format: double
        total_opex_savings_5yr:
          type: number
          format: double
        total_tco_savings_5yr:
          type: number
          format: double
        roi_percent:
          type: number
          format: double
        payback_months:
          type: integer
        npv_savings:
          type: number
          format: double
        pue_air_cooling:
          type: number
          format: double
        pue_immersion_cooling:
          type: number
          format: double
        energy_efficiency_improvement:
          type: number
          format: double

    CalculationBreakdown:
      type: object
      properties:
        capex:
          type: object
          properties:
            air_cooling:
              $ref: '#/components/schemas/CostBreakdown'
            immersion_cooling:
              $ref: '#/components/schemas/CostBreakdown'
        opex_annual:
          type: array
          items:
            type: object
            properties:
              year:
                type: integer
              air_cooling:
                $ref: '#/components/schemas/CostBreakdown'
              immersion_cooling:
                $ref: '#/components/schemas/CostBreakdown'
        tco_cumulative:
          type: array
          items:
            type: object
            properties:
              year:
                type: integer
              air_cooling:
                type: number
                format: double
              immersion_cooling:
                type: number
                format: double
              savings:
                type: number
                format: double

    CostBreakdown:
      type: object
      properties:
        equipment:
          type: number
          format: double
        installation:
          type: number
          format: double
        infrastructure:
          type: number
          format: double
        energy:
          type: number
          format: double
        maintenance:
          type: number
          format: double
        coolant:
          type: number
          format: double
          nullable: true
        total:
          type: number
          format: double

    ChartData:
      type: object
      properties:
        tco_progression:
          type: array
          items:
            type: object
            properties:
              year:
                type: integer
              air_cooling:
                type: number
                format: double
              immersion_cooling:
                type: number
                format: double
              savings:
                type: number
                format: double
        pue_comparison:
          type: object
          properties:
            air_cooling:
              type: number
              format: double
            immersion_cooling:
              type: number
              format: double
        cost_categories:
          type: object
          additionalProperties:
            type: object
            properties:
              air_cooling:
                type: number
                format: double
              immersion_cooling:
                type: number
                format: double

    EnvironmentalImpact:
      type: object
      properties:
        carbon_savings_kg_co2_annual:
          type: number
          format: double
        water_savings_gallons_annual:
          type: number
          format: double
        energy_savings_kwh_annual:
          type: number
          format: double

    # Report Schemas
    PDFReportRequest:
      type: object
      required:
        - session_id
      properties:
        session_id:
          type: string
          format: uuid
        template:
          type: string
          enum: [standard, detailed, executive_summary]
          default: standard
        include_charts:
          type: boolean
          default: true
        branding:
          $ref: '#/components/schemas/ReportBranding'
        locale:
          type: string
          enum: [en, ar]

    ExcelReportRequest:
      type: object
      required:
        - session_id
      properties:
        session_id:
          type: string
          format: uuid
        include_formulas:
          type: boolean
          default: true
        include_charts:
          type: boolean
          default: true
        worksheet_organization:
          type: string
          enum: [single_sheet, multi_sheet]
          default: multi_sheet

    ReportBranding:
      type: object
      properties:
        company_name:
          type: string
          maxLength: 100
        logo_url:
          type: string
          format: uri
        contact_info:
          type: string
        custom_header:
          type: string
        custom_footer:
          type: string

    ReportGenerationResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            report_id:
              type: string
              format: uuid
            status:
              type: string
              enum: [queued, generating, ready, error]
            estimated_completion:
              type: string
              format: date-time
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    ReportStatusResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            report_id:
              type: string
              format: uuid
            status:
              type: string
              enum: [queued, generating, ready, error, expired]
            progress_percent:
              type: integer
              minimum: 0
              maximum: 100
            download_url:
              type: string
              format: uri
              nullable: true
            expires_at:
              type: string
              format: date-time
            error_message:
              type: string
              nullable: true

    # Sharing Schemas
    CreateShareLinkRequest:
      type: object
      required:
        - session_id
      properties:
        session_id:
          type: string
          format: uuid
        expires_in_days:
          type: integer
          minimum: 1
          maximum: 90
          default: 30
        allow_download:
          type: boolean
          default: true
        password_protected:
          type: boolean
          default: false
        password:
          type: string
          minLength: 8
          maxLength: 50

    ShareLinkResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            share_token:
              type: string
            share_url:
              type: string
              format: uri
            expires_at:
              type: string
              format: date-time
            access_count:
              type: integer

    SharedCalculationResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            calculation_results:
              $ref: '#/components/schemas/CalculationResults'
            metadata:
              type: object
              properties:
                created_at:
                  type: string
                  format: date-time
                shared_at:
                  type: string
                  format: date-time
                access_count:
                  type: integer

    # Administrative Schemas
    CreateEquipmentConfigRequest:
      type: object
      required:
        - category
        - subcategory
        - item_code
        - display_name
        - specifications
        - base_pricing
      properties:
        category:
          type: string
          enum: [air_cooling, immersion_cooling]
        subcategory:
          type: string
        item_code:
          type: string
        display_name:
          type: object
          additionalProperties:
            type: string
        specifications:
          type: object
        base_pricing:
          type: object
        regional_adjustments:
          type: object
        effective_date:
          type: string
          format: date-time

    UpdateEquipmentConfigRequest:
      allOf:
        - $ref: '#/components/schemas/CreateEquipmentConfigRequest'
        - type: object
          required:
            - id
          properties:
            id:
              type: string
              format: uuid

    AnalyticsResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            summary:
              type: object
              properties:
                total_calculations:
                  type: integer
                unique_users:
                  type: integer
                total_reports_generated:
                  type: integer
                average_calculation_time_ms:
                  type: number
                  format: double
            time_series:
              type: array
              items:
                type: object
                properties:
                  timestamp:
                    type: string
                    format: date-time
                  calculations:
                    type: integer
                  users:
                    type: integer
                  reports:
                    type: integer
            by_currency:
              type: object
              additionalProperties:
                type: integer
            by_region:
              type: object
              additionalProperties:
                type: integer

    # Common Schemas
    ValidationResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            valid:
              type: boolean
            warnings:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string
                  suggestion:
                    type: string
                    nullable: true

    ValidationErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
            details:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string
                  value:
                    nullable: true

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
              nullable: true
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    ResponseMeta:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        request_id:
          type: string
          format: uuid
        version:
          type: string
        locale:
          type: string
        currency:
          type: string

    SaveSessionRequest:
      type: object
      required:
        - calculation_results
      properties:
        calculation_results:
          $ref: '#/components/schemas/CalculationResults'
        expires_in_days:
          type: integer
          minimum: 1
          maximum: 90
          default: 30
        make_public:
          type: boolean
          default: false

    SaveSessionResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            session_id:
              type: string
              format: uuid
            session_token:
              type: string
            expires_at:
              type: string
              format: date-time
            access_url:
              type: string
              format: uri

    CalculationSessionResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            session_id:
              type: string
              format: uuid
            configuration:
              $ref: '#/components/schemas/CalculationConfiguration'
            results:
              $ref: '#/components/schemas/CalculationResults'
            metadata:
              type: object
              properties:
                created_at:
                  type: string
                  format: date-time
                last_accessed_at:
                  type: string
                  format: date-time
                access_count:
                  type: integer
                locale:
                  type: string
                currency:
                  type: string

# Rate Limiting
x-rate-limit:
  anonymous: 100 per hour
  authenticated: 1000 per hour

# API Usage Examples
x-examples:
  basic_calculation:
    summary: Basic TCO calculation
    description: |
      Example of a standard TCO calculation comparing 100 air-cooled racks 
      against optimized immersion cooling configuration.
    request:
      method: POST
      url: /calculations/calculate
      body:
        configuration:
          air_cooling:
            input_method: "rack_count"
            rack_count: 100
            rack_type: "42U_standard"
            power_per_rack_kw: 12
          immersion_cooling:
            input_method: "auto_optimize"
            target_power_kw: 1200
          financial:
            analysis_years: 5
            discount_rate: 0.08
            currency: "USD"
            region: "US"
        locale: "en"
    response:
      status: 200
      body:
        success: true
        data:
          summary:
            total_capex_savings: 125000.00
            total_opex_savings_5yr: 450000.00
            roi_percent: 23.5
            payback_months: 18

  multi_currency_config:
    summary: Multi-currency configuration retrieval
    description: |
      Example of retrieving equipment configurations with EUR pricing 
      for European deployment.
    request:
      method: GET
      url: /config/equipment?category=immersion_cooling&currency=EUR&region=EU
    response:
      status: 200
      body:
        success: true
        data:
          - id: "123e4567-e89b-12d3-a456-426614174000"
            category: "immersion_cooling"
            subcategory: "tank"
            pricing:
              EUR:
                equipment_cost: 29400.00
                installation_cost: 6720.00
</code>
```

## API Usage Guidelines

### Authentication

Administrative endpoints require JWT authentication:

```bash
# Get admin token (implement according to your auth system)
curl -X POST https://api.tco-calculator.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token for admin endpoints
curl -X GET https://api.tco-calculator.com/v1/admin/analytics \
  -H "Authorization: Bearer <jwt_token>"
```

### Rate Limiting

The API implements rate limiting based on IP address:
- **Anonymous users**: 100 requests per hour
- **Authenticated users**: 1000 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

### Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "air_cooling.rack_count",
      "value": 1001,
      "constraint": "Maximum value is 1000"
    }
  },
  "meta": {
    "timestamp": "2025-08-13T10:30:00Z",
    "request_id": "req_123456",
    "version": "1.0.0"
  }
}
```

### Pagination

List endpoints support pagination:

```bash
# Get first page of results
curl "https://api.tco-calculator.com/v1/config/equipment?page=1&limit=20"

# Response includes pagination metadata
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Internationalization

The API supports multiple locales through the `Accept-Language` header or query parameter:

```bash
# Request Arabic interface
curl -H "Accept-Language: ar" \
  https://api.tco-calculator.com/v1/config/equipment

# Or use query parameter
curl "https://api.tco-calculator.com/v1/config/equipment?locale=ar"
```

## Performance Considerations

### Caching Strategy

- **Configuration data**: Cached for 1 hour
- **Exchange rates**: Cached for 24 hours  
- **Calculation results**: Cached for 30 minutes based on input hash
- **Reports**: Generated reports cached for 30 days

### Asynchronous Operations

Long-running operations (report generation) are handled asynchronously:

1. Submit request → Receive `202 Accepted` with operation ID
2. Poll status endpoint → Check progress
3. Download result when complete

### Request/Response Optimization

- JSON responses are compressed (gzip)
- Large datasets use pagination
- Optional fields excluded when empty
- Chart data pre-computed for common visualizations

This comprehensive API specification provides a complete contract for all client-server interactions in the Immersion Cooling TCO Calculator system.