/**
 * Coverage Merger Script
 * Merges coverage reports from different test suites and packages
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const COVERAGE_DIR = path.join(process.cwd(), 'coverage');
const MERGED_COVERAGE_FILE = path.join(COVERAGE_DIR, 'coverage-merged.json');

/**
 * Merges multiple coverage reports into a single consolidated report
 */
function mergeCoverageReports() {
    console.log('🔄 Merging coverage reports...');
    
    // Ensure coverage directory exists
    if (!fs.existsSync(COVERAGE_DIR)) {
        fs.mkdirSync(COVERAGE_DIR, { recursive: true });
    }
    
    // Find all coverage files
    const coverageFiles = glob.sync(path.join(COVERAGE_DIR, '**/coverage-final.json'));
    
    if (coverageFiles.length === 0) {
        console.warn('⚠️  No coverage files found to merge');
        return;
    }
    
    console.log(`📊 Found ${coverageFiles.length} coverage files:`);
    coverageFiles.forEach(file => {
        console.log(`   - ${path.relative(process.cwd(), file)}`);
    });
    
    // Merge coverage data
    const mergedCoverage = {};
    let totalStatements = { covered: 0, total: 0 };
    let totalBranches = { covered: 0, total: 0 };
    let totalFunctions = { covered: 0, total: 0 };
    let totalLines = { covered: 0, total: 0 };
    
    coverageFiles.forEach(file => {
        try {
            const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
            
            Object.keys(coverage).forEach(filePath => {
                const fileCoverage = coverage[filePath];
                
                // Use absolute path as key to avoid duplicates
                const absolutePath = path.resolve(filePath);
                
                if (!mergedCoverage[absolutePath]) {
                    mergedCoverage[absolutePath] = fileCoverage;
                    
                    // Accumulate totals
                    if (fileCoverage.s) {
                        Object.values(fileCoverage.s).forEach(count => {
                            totalStatements.total++;
                            if (count > 0) totalStatements.covered++;
                        });
                    }
                    
                    if (fileCoverage.b) {
                        Object.values(fileCoverage.b).forEach(branches => {
                            branches.forEach(count => {
                                totalBranches.total++;
                                if (count > 0) totalBranches.covered++;
                            });
                        });
                    }
                    
                    if (fileCoverage.f) {
                        Object.values(fileCoverage.f).forEach(count => {
                            totalFunctions.total++;
                            if (count > 0) totalFunctions.covered++;
                        });
                    }
                    
                    if (fileCoverage.l) {
                        Object.values(fileCoverage.l).forEach(count => {
                            totalLines.total++;
                            if (count > 0) totalLines.covered++;
                        });
                    }
                }
            });
        } catch (error) {
            console.error(`❌ Error reading coverage file ${file}:`, error.message);
        }
    });
    
    // Write merged coverage file
    fs.writeFileSync(MERGED_COVERAGE_FILE, JSON.stringify(mergedCoverage, null, 2));
    
    // Generate summary
    const summary = {
        statements: {
            covered: totalStatements.covered,
            total: totalStatements.total,
            percentage: totalStatements.total > 0 ? (totalStatements.covered / totalStatements.total * 100) : 0,
        },
        branches: {
            covered: totalBranches.covered,
            total: totalBranches.total,
            percentage: totalBranches.total > 0 ? (totalBranches.covered / totalBranches.total * 100) : 0,
        },
        functions: {
            covered: totalFunctions.covered,
            total: totalFunctions.total,
            percentage: totalFunctions.total > 0 ? (totalFunctions.covered / totalFunctions.total * 100) : 0,
        },
        lines: {
            covered: totalLines.covered,
            total: totalLines.total,
            percentage: totalLines.total > 0 ? (totalLines.covered / totalLines.total * 100) : 0,
        },
    };
    
    // Write summary file
    const summaryFile = path.join(COVERAGE_DIR, 'coverage-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    // Console output
    console.log('\n📈 Coverage Summary:');
    console.log(`   Statements: ${summary.statements.covered}/${summary.statements.total} (${summary.statements.percentage.toFixed(2)}%)`);
    console.log(`   Branches:   ${summary.branches.covered}/${summary.branches.total} (${summary.branches.percentage.toFixed(2)}%)`);
    console.log(`   Functions:  ${summary.functions.covered}/${summary.functions.total} (${summary.functions.percentage.toFixed(2)}%)`);
    console.log(`   Lines:      ${summary.lines.covered}/${summary.lines.total} (${summary.lines.percentage.toFixed(2)}%)`);
    
    // Check thresholds
    const thresholds = {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
    };
    
    let allThresholdsMet = true;
    Object.entries(thresholds).forEach(([metric, threshold]) => {
        if (summary[metric].percentage < threshold) {
            console.log(`❌ ${metric.charAt(0).toUpperCase() + metric.slice(1)} coverage (${summary[metric].percentage.toFixed(2)}%) below threshold (${threshold}%)`);
            allThresholdsMet = false;
        } else {
            console.log(`✅ ${metric.charAt(0).toUpperCase() + metric.slice(1)} coverage meets threshold`);
        }
    });
    
    if (allThresholdsMet) {
        console.log('\n🎉 All coverage thresholds met!');
    } else {
        console.log('\n⚠️  Some coverage thresholds not met');
        process.exit(1);
    }
    
    console.log(`\n📁 Merged coverage report saved to: ${MERGED_COVERAGE_FILE}`);
    console.log(`📁 Coverage summary saved to: ${summaryFile}`);
}

// Execute if run directly
if (require.main === module) {
    try {
        mergeCoverageReports();
    } catch (error) {
        console.error('❌ Failed to merge coverage reports:', error.message);
        process.exit(1);
    }
}

module.exports = { mergeCoverageReports };