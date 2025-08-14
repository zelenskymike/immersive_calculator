#!/usr/bin/env node

/**
 * Performance metrics quality gate checker for CI/CD pipeline
 * Validates that performance test results meet minimum thresholds
 */

const fs = require('fs');
const path = require('path');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    p95: 2000, // 95th percentile response time in ms
    p99: 5000, // 99th percentile response time in ms
    average: 1000 // Average response time in ms
  },
  throughput: {
    minRps: 100, // Minimum requests per second
    targetRps: 250 // Target requests per second
  },
  errorRate: {
    maxPercentage: 1.0 // Maximum error rate percentage
  },
  calculation: {
    maxTime: 500, // Maximum calculation time in ms
    p95Time: 300 // 95th percentile calculation time in ms
  },
  reportGeneration: {
    pdfMaxTime: 10000, // Maximum PDF generation time in ms
    excelMaxTime: 5000 // Maximum Excel generation time in ms
  }
};

/**
 * Load performance test results
 */
function loadPerformanceResults() {
  const resultsDir = path.join(__dirname, '..', 'tests', 'performance', 'results');
  
  try {
    // Load k6 performance results
    const k6ResultsFile = path.join(resultsDir, 'performance.json');
    const k6Results = fs.existsSync(k6ResultsFile) 
      ? JSON.parse(fs.readFileSync(k6ResultsFile, 'utf8'))
      : null;

    // Load calculation performance results
    const calcResultsFile = path.join(resultsDir, 'calculation-performance.json');
    const calcResults = fs.existsSync(calcResultsFile)
      ? JSON.parse(fs.readFileSync(calcResultsFile, 'utf8'))
      : null;

    // Load report generation performance results
    const reportResultsFile = path.join(resultsDir, 'report-performance.json');
    const reportResults = fs.existsSync(reportResultsFile)
      ? JSON.parse(fs.readFileSync(reportResultsFile, 'utf8'))
      : null;

    return {
      k6: k6Results,
      calculation: calcResults,
      reports: reportResults
    };
  } catch (error) {
    console.error('Error loading performance results:', error.message);
    return null;
  }
}

/**
 * Validate response time metrics
 */
function validateResponseTime(metrics) {
  const results = [];
  
  if (metrics.http_req_duration) {
    const p95 = metrics.http_req_duration.p95;
    const p99 = metrics.http_req_duration.p99;
    const avg = metrics.http_req_duration.avg;

    results.push({
      metric: 'Response Time P95',
      value: p95,
      threshold: PERFORMANCE_THRESHOLDS.responseTime.p95,
      passed: p95 <= PERFORMANCE_THRESHOLDS.responseTime.p95,
      unit: 'ms'
    });

    results.push({
      metric: 'Response Time P99',
      value: p99,
      threshold: PERFORMANCE_THRESHOLDS.responseTime.p99,
      passed: p99 <= PERFORMANCE_THRESHOLDS.responseTime.p99,
      unit: 'ms'
    });

    results.push({
      metric: 'Average Response Time',
      value: avg,
      threshold: PERFORMANCE_THRESHOLDS.responseTime.average,
      passed: avg <= PERFORMANCE_THRESHOLDS.responseTime.average,
      unit: 'ms'
    });
  }

  return results;
}

/**
 * Validate throughput metrics
 */
function validateThroughput(metrics) {
  const results = [];
  
  if (metrics.http_reqs) {
    const rps = metrics.http_reqs.rate;

    results.push({
      metric: 'Requests Per Second',
      value: rps,
      threshold: PERFORMANCE_THRESHOLDS.throughput.minRps,
      passed: rps >= PERFORMANCE_THRESHOLDS.throughput.minRps,
      unit: 'rps'
    });

    const targetMet = rps >= PERFORMANCE_THRESHOLDS.throughput.targetRps;
    results.push({
      metric: 'Target Throughput',
      value: rps,
      threshold: PERFORMANCE_THRESHOLDS.throughput.targetRps,
      passed: targetMet,
      unit: 'rps',
      warning: !targetMet
    });
  }

  return results;
}

/**
 * Validate error rate metrics
 */
function validateErrorRate(metrics) {
  const results = [];
  
  if (metrics.http_req_failed) {
    const errorRate = (metrics.http_req_failed.rate * 100);

    results.push({
      metric: 'Error Rate',
      value: errorRate,
      threshold: PERFORMANCE_THRESHOLDS.errorRate.maxPercentage,
      passed: errorRate <= PERFORMANCE_THRESHOLDS.errorRate.maxPercentage,
      unit: '%'
    });
  }

  return results;
}

/**
 * Validate calculation performance
 */
function validateCalculationPerformance(calcResults) {
  const results = [];
  
  if (calcResults && calcResults.calculations) {
    const calculations = calcResults.calculations;
    
    const avgTime = calculations.reduce((sum, calc) => sum + calc.duration, 0) / calculations.length;
    const p95Time = calculations
      .map(calc => calc.duration)
      .sort((a, b) => a - b)[Math.floor(calculations.length * 0.95)];

    results.push({
      metric: 'Average Calculation Time',
      value: avgTime,
      threshold: PERFORMANCE_THRESHOLDS.calculation.maxTime,
      passed: avgTime <= PERFORMANCE_THRESHOLDS.calculation.maxTime,
      unit: 'ms'
    });

    results.push({
      metric: 'P95 Calculation Time',
      value: p95Time,
      threshold: PERFORMANCE_THRESHOLDS.calculation.p95Time,
      passed: p95Time <= PERFORMANCE_THRESHOLDS.calculation.p95Time,
      unit: 'ms'
    });
  }

  return results;
}

/**
 * Validate report generation performance
 */
function validateReportPerformance(reportResults) {
  const results = [];
  
  if (reportResults && reportResults.reports) {
    const reports = reportResults.reports;
    
    const pdfReports = reports.filter(r => r.format === 'pdf');
    const excelReports = reports.filter(r => r.format === 'excel');

    if (pdfReports.length > 0) {
      const avgPdfTime = pdfReports.reduce((sum, report) => sum + report.generation_time, 0) / pdfReports.length;
      results.push({
        metric: 'Average PDF Generation Time',
        value: avgPdfTime,
        threshold: PERFORMANCE_THRESHOLDS.reportGeneration.pdfMaxTime,
        passed: avgPdfTime <= PERFORMANCE_THRESHOLDS.reportGeneration.pdfMaxTime,
        unit: 'ms'
      });
    }

    if (excelReports.length > 0) {
      const avgExcelTime = excelReports.reduce((sum, report) => sum + report.generation_time, 0) / excelReports.length;
      results.push({
        metric: 'Average Excel Generation Time',
        value: avgExcelTime,
        threshold: PERFORMANCE_THRESHOLDS.reportGeneration.excelMaxTime,
        passed: avgExcelTime <= PERFORMANCE_THRESHOLDS.reportGeneration.excelMaxTime,
        unit: 'ms'
      });
    }
  }

  return results;
}

/**
 * Format validation results for output
 */
function formatResults(results) {
  console.log('\n=== Performance Quality Gate Results ===\n');
  
  let allPassed = true;
  let hasWarnings = false;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : (result.warning ? '⚠️  WARN' : '❌ FAIL');
    const formatted = `${status} ${result.metric}: ${result.value}${result.unit} (threshold: ${result.threshold}${result.unit})`;
    
    console.log(formatted);
    
    if (!result.passed && !result.warning) {
      allPassed = false;
    }
    
    if (result.warning) {
      hasWarnings = true;
    }
  });

  console.log('\n=== Summary ===');
  console.log(`Total metrics checked: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed && !r.warning).length}`);
  console.log(`Warnings: ${results.filter(r => r.warning).length}`);

  if (allPassed) {
    console.log('\n🎉 All performance quality gates PASSED');
    if (hasWarnings) {
      console.log('⚠️  Some performance targets not met but within acceptable limits');
    }
  } else {
    console.log('\n💥 Performance quality gates FAILED');
    console.log('Performance requirements not met. Please optimize before deployment.');
  }

  return allPassed;
}

/**
 * Main execution function
 */
function main() {
  console.log('🔍 Checking performance metrics against quality gates...');
  
  const performanceData = loadPerformanceResults();
  
  if (!performanceData) {
    console.error('❌ No performance data found. Run performance tests first.');
    process.exit(1);
  }

  let allResults = [];

  // Validate k6 load test results
  if (performanceData.k6 && performanceData.k6.metrics) {
    console.log('\n📊 Validating load test metrics...');
    const metrics = performanceData.k6.metrics;
    
    allResults.push(...validateResponseTime(metrics));
    allResults.push(...validateThroughput(metrics));
    allResults.push(...validateErrorRate(metrics));
  }

  // Validate calculation performance
  if (performanceData.calculation) {
    console.log('\n🧮 Validating calculation performance...');
    allResults.push(...validateCalculationPerformance(performanceData.calculation));
  }

  // Validate report generation performance
  if (performanceData.reports) {
    console.log('\n📄 Validating report generation performance...');
    allResults.push(...validateReportPerformance(performanceData.reports));
  }

  if (allResults.length === 0) {
    console.log('⚠️  No performance metrics found to validate');
    process.exit(1);
  }

  // Format and display results
  const passed = formatResults(allResults);

  // Write results to file for artifact storage
  const resultsOutput = {
    timestamp: new Date().toISOString(),
    thresholds: PERFORMANCE_THRESHOLDS,
    results: allResults,
    passed,
    summary: {
      total: allResults.length,
      passed: allResults.filter(r => r.passed).length,
      failed: allResults.filter(r => !r.passed && !r.warning).length,
      warnings: allResults.filter(r => r.warning).length
    }
  };

  const outputFile = path.join(__dirname, '..', 'tests', 'performance', 'results', 'quality-gate-results.json');
  
  try {
    fs.writeFileSync(outputFile, JSON.stringify(resultsOutput, null, 2));
    console.log(`\n📁 Results saved to: ${outputFile}`);
  } catch (error) {
    console.warn(`Failed to save results: ${error.message}`);
  }

  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateResponseTime,
  validateThroughput,
  validateErrorRate,
  validateCalculationPerformance,
  validateReportPerformance,
  PERFORMANCE_THRESHOLDS
};