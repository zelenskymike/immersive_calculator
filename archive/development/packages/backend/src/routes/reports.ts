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
        reportPath = await generatePDFReportWithCharts(
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
 * Generate charts HTML for PDF with embedded chart data
 */
function generateChartsHTML(results: CalculationResults): string {
  const { summary, breakdown, timeline } = results;
  
  // Chart data configurations
  const tcoProgressionData = generateTCOProgressionData(timeline);
  const pueComparisonData = generatePUEComparisonData(summary);
  const costBreakdownData = generateCostBreakdownData(breakdown);
  
  return `
    <section class="charts-section">
      <h2>Visual Analysis</h2>
      <div class="charts-grid">
        <div class="chart-container">
          <h3>TCO Progression Over Time</h3>
          <canvas id="tcoProgressionChart" width="800" height="400"></canvas>
        </div>
        <div class="chart-container">
          <h3>PUE Comparison</h3>
          <canvas id="pueComparisonChart" width="800" height="400"></canvas>
        </div>
        <div class="chart-container">
          <h3>Cost Breakdown</h3>
          <canvas id="costBreakdownChart" width="800" height="400"></canvas>
        </div>
      </div>
      
      <script>
        // Chart.js configuration and rendering
        const ctx1 = document.getElementById('tcoProgressionChart').getContext('2d');
        new Chart(ctx1, {
          type: 'line',
          data: ${JSON.stringify(tcoProgressionData)},
          options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: 'TCO Progression Over Time' },
              legend: { position: 'top' }
            },
            scales: {
              x: { title: { display: true, text: 'Year' } },
              y: { title: { display: true, text: 'Cost (USD)' } }
            },
            animation: false
          }
        });
        
        const ctx2 = document.getElementById('pueComparisonChart').getContext('2d');
        new Chart(ctx2, {
          type: 'bar',
          data: ${JSON.stringify(pueComparisonData)},
          options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: 'PUE Comparison' },
              legend: { position: 'top' }
            },
            scales: {
              y: { 
                title: { display: true, text: 'PUE Rating' },
                beginAtZero: true
              }
            },
            animation: false
          }
        });
        
        const ctx3 = document.getElementById('costBreakdownChart').getContext('2d');
        new Chart(ctx3, {
          type: 'doughnut',
          data: ${JSON.stringify(costBreakdownData)},
          options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: 'Cost Breakdown' },
              legend: { position: 'right' }
            },
            animation: false
          }
        });
      </script>
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
  const { breakdown } = results;
  
  // Set up columns
  sheet.columns = [
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Air Cooling', key: 'air_cooling', width: 20 },
    { header: 'Immersion Cooling', key: 'immersion_cooling', width: 20 },
    { header: 'Savings', key: 'savings', width: 20 },
    { header: 'Savings %', key: 'savings_pct', width: 15 },
  ];

  // CAPEX breakdown
  sheet.addRow({ category: 'CAPITAL EXPENDITURE (CAPEX)' });
  sheet.addRow({
    category: 'Equipment',
    air_cooling: breakdown.capex.air_cooling.equipment,
    immersion_cooling: breakdown.capex.immersion_cooling.equipment,
    savings: breakdown.capex.air_cooling.equipment - breakdown.capex.immersion_cooling.equipment,
    savings_pct: ((breakdown.capex.air_cooling.equipment - breakdown.capex.immersion_cooling.equipment) / breakdown.capex.air_cooling.equipment * 100).toFixed(1) + '%'
  });
  
  sheet.addRow({
    category: 'Installation',
    air_cooling: breakdown.capex.air_cooling.installation,
    immersion_cooling: breakdown.capex.immersion_cooling.installation,
    savings: breakdown.capex.air_cooling.installation - breakdown.capex.immersion_cooling.installation,
    savings_pct: ((breakdown.capex.air_cooling.installation - breakdown.capex.immersion_cooling.installation) / breakdown.capex.air_cooling.installation * 100).toFixed(1) + '%'
  });

  sheet.addRow({
    category: 'Infrastructure',
    air_cooling: breakdown.capex.air_cooling.infrastructure,
    immersion_cooling: breakdown.capex.immersion_cooling.infrastructure,
    savings: breakdown.capex.air_cooling.infrastructure - breakdown.capex.immersion_cooling.infrastructure,
    savings_pct: ((breakdown.capex.air_cooling.infrastructure - breakdown.capex.immersion_cooling.infrastructure) / breakdown.capex.air_cooling.infrastructure * 100).toFixed(1) + '%'
  });

  // OPEX breakdown
  sheet.addRow({});
  sheet.addRow({ category: 'OPERATIONAL EXPENDITURE (OPEX - 5 Year)' });
  sheet.addRow({
    category: 'Energy Costs',
    air_cooling: breakdown.opex_5yr.air_cooling.energy,
    immersion_cooling: breakdown.opex_5yr.immersion_cooling.energy,
    savings: breakdown.opex_5yr.air_cooling.energy - breakdown.opex_5yr.immersion_cooling.energy,
    savings_pct: ((breakdown.opex_5yr.air_cooling.energy - breakdown.opex_5yr.immersion_cooling.energy) / breakdown.opex_5yr.air_cooling.energy * 100).toFixed(1) + '%'
  });

  sheet.addRow({
    category: 'Maintenance',
    air_cooling: breakdown.opex_5yr.air_cooling.maintenance,
    immersion_cooling: breakdown.opex_5yr.immersion_cooling.maintenance,
    savings: breakdown.opex_5yr.air_cooling.maintenance - breakdown.opex_5yr.immersion_cooling.maintenance,
    savings_pct: ((breakdown.opex_5yr.air_cooling.maintenance - breakdown.opex_5yr.immersion_cooling.maintenance) / breakdown.opex_5yr.air_cooling.maintenance * 100).toFixed(1) + '%'
  });

  // Style headers
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getRow(6).font = { bold: true, size: 14 };
}

async function populateCapexSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  const { breakdown } = results;
  
  sheet.columns = [
    { header: 'Component', key: 'component', width: 30 },
    { header: 'Air Cooling Cost', key: 'air_cost', width: 20 },
    { header: 'Immersion Cooling Cost', key: 'immersion_cost', width: 25 },
    { header: 'Cost Difference', key: 'difference', width: 20 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];

  // Air cooling CAPEX details
  sheet.addRow({ component: 'AIR COOLING SYSTEM' });
  sheet.addRow({
    component: 'Servers & IT Equipment',
    air_cost: breakdown.capex.air_cooling.equipment,
    immersion_cost: 0,
    difference: breakdown.capex.air_cooling.equipment,
    notes: 'Standard server configuration with air cooling'
  });

  sheet.addRow({
    component: 'HVAC System',
    air_cost: breakdown.capex.air_cooling.hvac || 0,
    immersion_cost: 0,
    difference: breakdown.capex.air_cooling.hvac || 0,
    notes: 'CRAC/CRAH units, air distribution, cooling towers'
  });

  sheet.addRow({
    component: 'Power Infrastructure',
    air_cost: breakdown.capex.air_cooling.infrastructure,
    immersion_cost: 0,
    difference: breakdown.capex.air_cooling.infrastructure,
    notes: 'UPS, PDUs, electrical distribution'
  });

  // Immersion cooling CAPEX details
  sheet.addRow({});
  sheet.addRow({ component: 'IMMERSION COOLING SYSTEM' });
  sheet.addRow({
    component: 'Servers & IT Equipment',
    air_cost: 0,
    immersion_cost: breakdown.capex.immersion_cooling.equipment,
    difference: -breakdown.capex.immersion_cooling.equipment,
    notes: 'Immersion-ready server configuration'
  });

  sheet.addRow({
    component: 'Immersion Tanks & Coolant',
    air_cost: 0,
    immersion_cost: breakdown.capex.immersion_cooling.coolant || 0,
    difference: -(breakdown.capex.immersion_cooling.coolant || 0),
    notes: 'Immersion tanks, dielectric coolant, pumps'
  });

  sheet.addRow({
    component: 'Cooling Distribution Unit',
    air_cost: 0,
    immersion_cost: breakdown.capex.immersion_cooling.infrastructure,
    difference: -breakdown.capex.immersion_cooling.infrastructure,
    notes: 'CDU, heat exchangers, monitoring systems'
  });

  // Totals
  sheet.addRow({});
  sheet.addRow({
    component: 'TOTAL CAPEX',
    air_cost: breakdown.capex.air_cooling.total,
    immersion_cost: breakdown.capex.immersion_cooling.total,
    difference: breakdown.capex.air_cooling.total - breakdown.capex.immersion_cooling.total,
    notes: 'Net CAPEX savings with immersion cooling'
  });

  // Style headers and totals
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
  sheet.getRow(6).font = { bold: true, color: { argb: 'FF0000FF' } };
  sheet.getRow(12).font = { bold: true, size: 14 };
}

async function populateOpexSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  const { breakdown } = results;
  
  sheet.columns = [
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Air Cooling Energy', key: 'air_energy', width: 20 },
    { header: 'Immersion Energy', key: 'immersion_energy', width: 20 },
    { header: 'Energy Savings', key: 'energy_savings', width: 20 },
    { header: 'Air Maintenance', key: 'air_maintenance', width: 20 },
    { header: 'Immersion Maintenance', key: 'immersion_maintenance', width: 25 },
    { header: 'Maintenance Savings', key: 'maintenance_savings', width: 20 },
    { header: 'Total Annual Savings', key: 'total_savings', width: 25 },
  ];

  // Generate yearly breakdown (simplified)
  const yearlyEnergySavings = (breakdown.opex_5yr.air_cooling.energy - breakdown.opex_5yr.immersion_cooling.energy) / 5;
  const yearlyMaintenanceSavings = (breakdown.opex_5yr.air_cooling.maintenance - breakdown.opex_5yr.immersion_cooling.maintenance) / 5;

  for (let year = 1; year <= 5; year++) {
    sheet.addRow({
      year: year,
      air_energy: (breakdown.opex_5yr.air_cooling.energy / 5).toFixed(0),
      immersion_energy: (breakdown.opex_5yr.immersion_cooling.energy / 5).toFixed(0),
      energy_savings: yearlyEnergySavings.toFixed(0),
      air_maintenance: (breakdown.opex_5yr.air_cooling.maintenance / 5).toFixed(0),
      immersion_maintenance: (breakdown.opex_5yr.immersion_cooling.maintenance / 5).toFixed(0),
      maintenance_savings: yearlyMaintenanceSavings.toFixed(0),
      total_savings: (yearlyEnergySavings + yearlyMaintenanceSavings).toFixed(0)
    });
  }

  // Add totals row
  sheet.addRow({});
  sheet.addRow({
    year: 'TOTAL',
    air_energy: breakdown.opex_5yr.air_cooling.energy,
    immersion_energy: breakdown.opex_5yr.immersion_cooling.energy,
    energy_savings: breakdown.opex_5yr.air_cooling.energy - breakdown.opex_5yr.immersion_cooling.energy,
    air_maintenance: breakdown.opex_5yr.air_cooling.maintenance,
    immersion_maintenance: breakdown.opex_5yr.immersion_cooling.maintenance,
    maintenance_savings: breakdown.opex_5yr.air_cooling.maintenance - breakdown.opex_5yr.immersion_cooling.maintenance,
    total_savings: (breakdown.opex_5yr.air_cooling.total - breakdown.opex_5yr.immersion_cooling.total)
  });

  // Style headers and totals
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(7).font = { bold: true, size: 12 };
}

async function populateEnvironmentalSheet(sheet: ExcelJS.Worksheet, results: CalculationResults, options: any) {
  const { environmental } = results;
  
  sheet.columns = [
    { header: 'Environmental Metric', key: 'metric', width: 35 },
    { header: 'Annual Impact', key: 'annual', width: 20 },
    { header: '5-Year Impact', key: 'five_year', width: 20 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];

  const environmentalData = [
    {
      metric: 'Energy Savings',
      annual: environmental.energy_savings_kwh_annual.toLocaleString(),
      five_year: (environmental.energy_savings_kwh_annual * 5).toLocaleString(),
      unit: 'kWh',
      notes: 'Reduced energy consumption due to improved PUE'
    },
    {
      metric: 'Carbon Footprint Reduction',
      annual: (environmental.carbon_savings_kg_co2_annual / 1000).toFixed(1),
      five_year: ((environmental.carbon_savings_kg_co2_annual * 5) / 1000).toFixed(1),
      unit: 'Metric Tons CO₂',
      notes: 'Based on grid carbon intensity and energy savings'
    },
    {
      metric: 'Water Savings',
      annual: environmental.water_savings_gallons_annual.toLocaleString(),
      five_year: (environmental.water_savings_gallons_annual * 5).toLocaleString(),
      unit: 'Gallons',
      notes: 'Reduced cooling tower water consumption'
    },
    {
      metric: 'Waste Heat Recovery Potential',
      annual: (environmental.energy_savings_kwh_annual * 0.7).toFixed(0),
      five_year: (environmental.energy_savings_kwh_annual * 5 * 0.7).toFixed(0),
      unit: 'kWh thermal',
      notes: 'Recoverable waste heat for building heating'
    }
  ];

  sheet.addRows(environmentalData);

  // Add environmental impact summary
  sheet.addRow({});
  sheet.addRow({
    metric: 'ENVIRONMENTAL IMPACT SUMMARY',
    annual: '',
    five_year: '',
    unit: '',
    notes: 'Immersion cooling significantly reduces environmental impact'
  });

  // Style headers
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(7).font = { bold: true, color: { argb: 'FF008000' } };
}

/**
 * Generate TCO progression chart data
 */
function generateTCOProgressionData(timeline: any): any {
  if (!timeline || !timeline.yearly_progression) {
    return {
      labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
      datasets: [
        {
          label: 'Air Cooling TCO',
          data: [0, 0, 0, 0, 0],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false
        },
        {
          label: 'Immersion Cooling TCO',
          data: [0, 0, 0, 0, 0],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false
        }
      ]
    };
  }

  const years = timeline.yearly_progression;
  const labels = years.map((year: any, index: number) => `Year ${index + 1}`);
  
  return {
    labels,
    datasets: [
      {
        label: 'Air Cooling Cumulative TCO',
        data: years.map((year: any) => year.air_cooling.cumulative_tco),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Immersion Cooling Cumulative TCO',
        data: years.map((year: any) => year.immersion_cooling.cumulative_tco),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.1
      }
    ]
  };
}

/**
 * Generate PUE comparison chart data
 */
function generatePUEComparisonData(summary: any): any {
  return {
    labels: ['Air Cooling', 'Immersion Cooling'],
    datasets: [
      {
        label: 'PUE Rating',
        data: [
          summary.pue_air_cooling || 1.5,
          summary.pue_immersion_cooling || 1.1
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          '#ef4444',
          '#3b82f6'
        ],
        borderWidth: 2
      }
    ]
  };
}

/**
 * Generate cost breakdown chart data
 */
function generateCostBreakdownData(breakdown: any): any {
  if (!breakdown || !breakdown.capex || !breakdown.opex_5yr) {
    return {
      labels: ['CAPEX', 'OPEX (5yr)'],
      datasets: [
        {
          data: [50, 50],
          backgroundColor: ['#f59e0b', '#10b981'],
          borderColor: ['#d97706', '#059669'],
          borderWidth: 2
        }
      ]
    };
  }

  const airCoolingTotal = breakdown.capex.air_cooling.total + breakdown.opex_5yr.air_cooling.total;
  const immersionCoolingTotal = breakdown.capex.immersion_cooling.total + breakdown.opex_5yr.immersion_cooling.total;

  return {
    labels: [
      'Air Cooling CAPEX',
      'Air Cooling OPEX (5yr)',
      'Immersion Cooling CAPEX',
      'Immersion Cooling OPEX (5yr)'
    ],
    datasets: [
      {
        data: [
          breakdown.capex.air_cooling.total,
          breakdown.opex_5yr.air_cooling.total,
          breakdown.capex.immersion_cooling.total,
          breakdown.opex_5yr.immersion_cooling.total
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(59, 130, 246, 0.5)'
        ],
        borderColor: [
          '#ef4444',
          '#ef4444',
          '#3b82f6',
          '#3b82f6'
        ],
        borderWidth: 2
      }
    ]
  };
}

/**
 * Update PDF generation to wait for charts to render
 */
async function generatePDFReportWithCharts(
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
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // Generate HTML content
    const htmlContent = await generateReportHTML(results, configuration, options);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for charts to render if included
    if (options.includeCharts) {
      await page.waitForFunction(() => {
        return document.querySelectorAll('canvas').length >= 3;
      }, { timeout: 10000 });
      
      // Additional wait for chart animations to complete
      await page.waitForTimeout(2000);
    }
    
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

export default router;