/**
 * Report generation routes
 * Handles PDF and Excel report generation with comprehensive data
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

// PDF and Excel generation libraries
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';

import { asyncHandler } from '@/middleware/error';
import { 
  validateRequest,
  validationRules,
  reportRateLimit 
} from '@/middleware/security';
import { logger } from '@/utils/logger';

import type { 
  CalculationResults,
  ReportRequest,
  ReportResponse,
  ReportFormat,
  Currency,
  Locale 
} from '@shared/types';
import { 
  calculateTCO,
  CurrencyUtils,
  CHART_DEFAULTS 
} from '@tco-calculator/shared';

const router = Router();

// Apply report-specific rate limiting
router.use('/reports', reportRateLimit);

// Temporary storage for generated reports
const REPORTS_DIR = process.env.REPORTS_DIR || '/tmp/tco-reports';
const REPORT_RETENTION_HOURS = 24;

// Ensure reports directory exists
(async () => {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create reports directory:', error);
  }
})();

/**
 * POST /api/v1/reports/generate
 * Generate comprehensive TCO analysis report
 */
router.post('/reports/generate',
  validateRequest([
    ...validationRules.calculationConfig(),
    validationRules.reportFormat(),
    validationRules.locale(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const reportId = uuidv4();
    
    const {
      configuration,
      format = 'pdf',
      locale = 'en',
      include_charts = true,
      include_breakdown = true,
      company_info,
      custom_branding,
    } = req.body as ReportRequest;

    logger.info('Report generation started', {
      reportId,
      format,
      locale,
      currency: configuration.financial.currency,
    });

    try {
      // Calculate TCO results
      const results = calculateTCO(configuration);
      
      let reportPath: string;
      let mimeType: string;
      let filename: string;

      if (format === 'pdf') {
        reportPath = await generatePDFReport(
          reportId,
          results,
          configuration,
          {
            locale,
            includeCharts: include_charts,
            includeBreakdown: include_breakdown,
            companyInfo: company_info,
            customBranding: custom_branding,
          }
        );
        mimeType = 'application/pdf';
        filename = `tco-analysis-${reportId}.pdf`;
      } else if (format === 'excel') {
        reportPath = await generateExcelReport(
          reportId,
          results,
          configuration,
          {
            locale,
            includeCharts: include_charts,
            includeBreakdown: include_breakdown,
            companyInfo: company_info,
          }
        );
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `tco-analysis-${reportId}.xlsx`;
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Supported formats: pdf, excel',
          },
        });
      }

      const processingTime = Date.now() - startTime;
      
      // Get file stats
      const stats = await fs.stat(reportPath);
      
      logger.info('Report generated successfully', {
        reportId,
        format,
        processingTime,
        fileSize: stats.size,
      });

      const response: ReportResponse = {
        success: true,
        data: {
          report_id: reportId,
          format,
          filename,
          file_size: stats.size,
          download_url: `/api/v1/reports/${reportId}/download`,
          expires_at: new Date(Date.now() + REPORT_RETENTION_HOURS * 60 * 60 * 1000).toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          processing_time_ms: processingTime,
          locale,
        },
      };

      res.json(response);

      // Schedule cleanup
      setTimeout(async () => {
        try {
          await fs.unlink(reportPath);
          logger.info('Report file cleaned up', { reportId });
        } catch (error) {
          logger.warn('Failed to cleanup report file', { reportId, error });
        }
      }, REPORT_RETENTION_HOURS * 60 * 60 * 1000);

    } catch (error) {
      logger.error('Report generation failed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  })
);

/**
 * GET /api/v1/reports/:reportId/download
 * Download generated report
 */
router.get('/reports/:reportId/download',
  validateRequest([
    validationRules.uuid('reportId'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    
    // Find report file
    const files = await fs.readdir(REPORTS_DIR);
    const reportFile = files.find(f => f.startsWith(reportId));
    
    if (!reportFile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found or expired',
        },
      });
    }

    const reportPath = path.join(REPORTS_DIR, reportFile);
    
    try {
      const stats = await fs.stat(reportPath);
      const ext = path.extname(reportFile).toLowerCase();
      
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (ext === '.xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `attachment; filename="${reportFile}"`);
      res.setHeader('Cache-Control', 'private, no-cache');

      // Stream file to response
      const fileStream = createReadStream(reportPath);
      await pipeline(fileStream, res);

      logger.info('Report downloaded', { reportId });

    } catch (error) {
      logger.error('Report download failed', { reportId, error });
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_ERROR',
          message: 'Failed to download report',
        },
      });
    }
  })
);

/**
 * GET /api/v1/reports/:reportId/preview
 * Get report metadata and preview information
 */
router.get('/reports/:reportId/preview',
  validateRequest([
    validationRules.uuid('reportId'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    
    // Find report file
    const files = await fs.readdir(REPORTS_DIR);
    const reportFile = files.find(f => f.startsWith(reportId));
    
    if (!reportFile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found or expired',
        },
      });
    }

    const reportPath = path.join(REPORTS_DIR, reportFile);
    const stats = await fs.stat(reportPath);
    const ext = path.extname(reportFile).toLowerCase();

    res.json({
      success: true,
      data: {
        report_id: reportId,
        format: ext === '.pdf' ? 'pdf' : 'excel',
        filename: reportFile,
        file_size: stats.size,
        created_at: stats.birthtime.toISOString(),
        expires_at: new Date(stats.birthtime.getTime() + REPORT_RETENTION_HOURS * 60 * 60 * 1000).toISOString(),
        download_url: `/api/v1/reports/${reportId}/download`,
      },
    });
  })
);

/**
 * Generate PDF report using Puppeteer
 */
async function generatePDFReport(
  reportId: string,
  results: CalculationResults,
  configuration: any,
  options: {
    locale: Locale;
    includeCharts: boolean;
    includeBreakdown: boolean;
    companyInfo?: any;
    customBranding?: any;
  }
): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = await generateReportHTML(results, configuration, options);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Configure PDF generation
    const reportPath = path.join(REPORTS_DIR, `${reportId}.pdf`);
    
    await page.pdf({
      path: reportPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: generateHeaderTemplate(options.companyInfo, options.customBranding),
      footerTemplate: generateFooterTemplate(),
    });

    return reportPath;
  } finally {
    await browser.close();
  }
}

/**
 * Generate Excel report using ExcelJS
 */
async function generateExcelReport(
  reportId: string,
  results: CalculationResults,
  configuration: any,
  options: {
    locale: Locale;
    includeCharts: boolean;
    includeBreakdown: boolean;
    companyInfo?: any;
  }
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = 'TCO Calculator';
  workbook.lastModifiedBy = 'TCO Calculator';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Summary worksheet
  const summarySheet = workbook.addWorksheet('Summary');
  await populateSummarySheet(summarySheet, results, configuration, options);

  // Financial breakdown worksheet
  if (options.includeBreakdown) {
    const breakdownSheet = workbook.addWorksheet('Financial Breakdown');
    await populateBreakdownSheet(breakdownSheet, results, options);

    // CAPEX details
    const capexSheet = workbook.addWorksheet('CAPEX Details');
    await populateCapexSheet(capexSheet, results, options);

    // OPEX details
    const opexSheet = workbook.addWorksheet('OPEX Details');
    await populateOpexSheet(opexSheet, results, options);

    // Environmental impact
    const envSheet = workbook.addWorksheet('Environmental Impact');
    await populateEnvironmentalSheet(envSheet, results, options);
  }

  const reportPath = path.join(REPORTS_DIR, `${reportId}.xlsx`);
  await workbook.xlsx.writeFile(reportPath);

  return reportPath;
}

/**
 * Generate HTML content for PDF report
 */
async function generateReportHTML(
  results: CalculationResults,
  configuration: any,
  options: any
): Promise<string> {
  const { summary, breakdown, environmental } = results;
  const currency = configuration.financial.currency;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TCO Analysis Report</title>
      <style>
        ${getReportCSS()}
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <div class="report-container">
        <header class="report-header">
          <h1>Total Cost of Ownership Analysis</h1>
          <p class="report-subtitle">Air Cooling vs Immersion Cooling Comparison</p>
          <div class="report-meta">
            <p>Generated: ${new Date().toLocaleDateString()}</p>
            <p>Analysis Period: ${configuration.financial.analysis_years} years</p>
            <p>Currency: ${currency}</p>
          </div>
        </header>

        <section class="executive-summary">
          <h2>Executive Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total TCO Savings</h3>
              <p class="metric">${CurrencyUtils.formatLarge(summary.total_tco_savings_5yr, currency)}</p>
              <p class="subtitle">Over ${configuration.financial.analysis_years} years</p>
            </div>
            <div class="summary-card">
              <h3>Return on Investment</h3>
              <p class="metric">${summary.roi_percent.toFixed(1)}%</p>
              <p class="subtitle">ROI</p>
            </div>
            <div class="summary-card">
              <h3>Payback Period</h3>
              <p class="metric">${(summary.payback_months / 12).toFixed(1)} years</p>
              <p class="subtitle">${summary.payback_months.toFixed(0)} months</p>
            </div>
            <div class="summary-card">
              <h3>Energy Efficiency</h3>
              <p class="metric">${summary.energy_efficiency_improvement.toFixed(1)}%</p>
              <p class="subtitle">PUE Improvement</p>
            </div>
          </div>
        </section>

        ${options.includeCharts ? generateChartsHTML(results) : ''}
        
        <section class="cost-breakdown">
          <h2>Cost Breakdown</h2>
          <div class="breakdown-grid">
            <div class="breakdown-column">
              <h3>Air Cooling System</h3>
              <table class="cost-table">
                <tr><td>Equipment</td><td>${CurrencyUtils.formatLarge(breakdown.capex.air_cooling.equipment, currency)}</td></tr>
                <tr><td>Installation</td><td>${CurrencyUtils.formatLarge(breakdown.capex.air_cooling.installation, currency)}</td></tr>
                <tr><td>Infrastructure</td><td>${CurrencyUtils.formatLarge(breakdown.capex.air_cooling.infrastructure, currency)}</td></tr>
                <tr class="total-row"><td><strong>Total CAPEX</strong></td><td><strong>${CurrencyUtils.formatLarge(breakdown.capex.air_cooling.total, currency)}</strong></td></tr>
              </table>
            </div>
            <div class="breakdown-column">
              <h3>Immersion Cooling System</h3>
              <table class="cost-table">
                <tr><td>Equipment</td><td>${CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.equipment, currency)}</td></tr>
                <tr><td>Installation</td><td>${CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.installation, currency)}</td></tr>
                <tr><td>Infrastructure</td><td>${CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.infrastructure, currency)}</td></tr>
                <tr><td>Coolant</td><td>${CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.coolant || 0, currency)}</td></tr>
                <tr class="total-row"><td><strong>Total CAPEX</strong></td><td><strong>${CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.total, currency)}</strong></td></tr>
              </table>
            </div>
          </div>
        </section>

        <section class="environmental-impact">
          <h2>Environmental Impact</h2>
          <div class="environmental-grid">
            <div class="env-metric">
              <h4>Annual Carbon Savings</h4>
              <p class="env-value">${(environmental.carbon_savings_kg_co2_annual / 1000).toFixed(1)} metric tons CO₂</p>
            </div>
            <div class="env-metric">
              <h4>Annual Energy Savings</h4>
              <p class="env-value">${(environmental.energy_savings_kwh_annual / 1000).toFixed(0)} MWh</p>
            </div>
            <div class="env-metric">
              <h4>Water Savings</h4>
              <p class="env-value">${environmental.water_savings_gallons_annual.toLocaleString()} gallons</p>
            </div>
          </div>
        </section>

        ${options.includeBreakdown ? generateDetailedBreakdownHTML(breakdown, currency) : ''}

        <footer class="report-footer">
          <p>Generated by TCO Calculator v1.0 | ${new Date().toISOString()}</p>
          ${options.companyInfo ? `<p>${options.companyInfo.name}</p>` : ''}
        </footer>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate CSS for report styling
 */
function getReportCSS(): string {
  return `
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: #333;
      line-height: 1.6;
    }
    
    .report-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1976d2;
    }
    
    .report-header h1 {
      color: #1976d2;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    
    .report-subtitle {
      font-size: 16px;
      color: #666;
      margin: 0 0 15px 0;
    }
    
    .report-meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      font-size: 14px;
      color: #666;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid #1976d2;
    }
    
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
    }
    
    .metric {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
      color: #2e7d32;
    }
    
    .subtitle {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
      margin: 20px 0;
    }
    
    .cost-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .cost-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
    }
    
    .cost-table .total-row {
      border-top: 2px solid #333;
      background: #f8f9fa;
    }
    
    .environmental-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    
    .env-metric {
      text-align: center;
      padding: 15px;
      background: #e8f5e8;
      border-radius: 8px;
    }
    
    .env-value {
      font-size: 20px;
      font-weight: bold;
      color: #2e7d32;
      margin: 10px 0;
    }
    
    .report-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    @media print {
      .report-container {
        max-width: none;
        margin: 0;
        padding: 15px;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}

/**
 * Generate charts HTML for PDF
 */
function generateChartsHTML(results: CalculationResults): string {
  // This would generate Chart.js charts for PDF inclusion
  return `
    <section class="charts-section">
      <h2>Visual Analysis</h2>
      <div class="charts-grid">
        <div class="chart-container">
          <canvas id="tcoProgressionChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-container">
          <canvas id="pueComparisonChart" width="400" height="200"></canvas>
        </div>
      </div>
    </section>
  `;
}

function generateDetailedBreakdownHTML(breakdown: any, currency: Currency): string {
  return `
    <section class="detailed-breakdown">
      <h2>Detailed Financial Analysis</h2>
      <!-- Detailed breakdown tables would go here -->
    </section>
  `;
}

function generateHeaderTemplate(companyInfo?: any, customBranding?: any): string {
  return `
    <div style="font-size: 10px; margin: 0 15mm; width: 100%; display: flex; justify-content: space-between;">
      <span>TCO Analysis Report</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `;
}

function generateFooterTemplate(): string {
  return `
    <div style="font-size: 8px; margin: 0 15mm; text-align: center;">
      <span>Generated by TCO Calculator | Confidential</span>
    </div>
  `;
}

// Excel worksheet population functions
async function populateSummarySheet(sheet: ExcelJS.Worksheet, results: CalculationResults, config: any, options: any) {
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
    { header: 'Unit', key: 'unit', width: 15 },
  ];

  const { summary } = results;
  const currency = config.financial.currency;

  const summaryData = [
    { metric: 'Total TCO Savings (5 years)', value: CurrencyUtils.formatLarge(summary.total_tco_savings_5yr, currency), unit: currency },
    { metric: 'CAPEX Savings', value: CurrencyUtils.formatLarge(summary.total_capex_savings, currency), unit: currency },
    { metric: 'OPEX Savings (5 years)', value: CurrencyUtils.formatLarge(summary.total_opex_savings_5yr, currency), unit: currency },
    { metric: 'ROI', value: summary.roi_percent.toFixed(1), unit: '%' },
    { metric: 'Payback Period', value: (summary.payback_months / 12).toFixed(1), unit: 'years' },
    { metric: 'NPV Savings', value: CurrencyUtils.formatLarge(summary.npv_savings, currency), unit: currency },
    { metric: 'Air Cooling PUE', value: summary.pue_air_cooling.toFixed(3), unit: '' },
    { metric: 'Immersion Cooling PUE', value: summary.pue_immersion_cooling.toFixed(3), unit: '' },
    { metric: 'Energy Efficiency Improvement', value: summary.energy_efficiency_improvement.toFixed(1), unit: '%' },
  ];

  sheet.addRows(summaryData);
  
  // Style the header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
}

async function populateBreakdownSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  // Implementation for breakdown sheet
}

async function populateCapexSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  // Implementation for CAPEX sheet
}

async function populateOpexSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  // Implementation for OPEX sheet
}

async function populateEnvironmentalSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  // Implementation for environmental impact sheet
}

export default router;