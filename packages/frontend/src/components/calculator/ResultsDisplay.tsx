/**
 * Results Display Component
 * Comprehensive display of TCO calculation results with interactive charts
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Chip,
  Button,
  Tab,
  Tabs,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  useTheme,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Eco as EcoIcon,
  Assessment as AssessmentIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Import shared types and utilities
import {
  CurrencyUtils,
  CHART_DEFAULTS,
} from '@tco-calculator/shared';
import type { 
  CalculationResults, 
  Currency,
  ChartData,
  CalculationSummary,
} from '@tco-calculator/shared';

// Import store and hooks
import { useCalculationStore } from '../../store/calculation';
import { useI18n } from '../../i18n/useI18n';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

interface ResultsDisplayProps {
  results: CalculationResults | null;
  loading?: boolean;
  error?: string | null;
  currency: Currency;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  loading = false,
  error = null,
  currency,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(['summary']);

  // Chart color configuration
  const chartColors = {
    airCooling: theme.palette.primary.main,
    immersionCooling: theme.palette.secondary.main,
    savings: theme.palette.success.main,
    background: theme.palette.background.paper,
  };

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!results?.charts) return null;

    const { charts } = results;
    
    // TCO Progression Chart
    const tcoProgressionData = {
      labels: charts.tco_progression.map(d => `Year ${d.year}`),
      datasets: [
        {
          label: 'Air Cooling TCO',
          data: charts.tco_progression.map(d => d.air_cooling),
          borderColor: chartColors.airCooling,
          backgroundColor: `${chartColors.airCooling}20`,
          borderWidth: 2,
          fill: false,
        },
        {
          label: 'Immersion Cooling TCO',
          data: charts.tco_progression.map(d => d.immersion_cooling),
          borderColor: chartColors.immersionCooling,
          backgroundColor: `${chartColors.immersionCooling}20`,
          borderWidth: 2,
          fill: false,
        },
        {
          label: 'Cumulative Savings',
          data: charts.tco_progression.map(d => d.savings),
          borderColor: chartColors.savings,
          backgroundColor: `${chartColors.savings}20`,
          borderWidth: 2,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    };

    // Cost Categories Comparison
    const categoryLabels = Object.keys(charts.cost_categories);
    const costCategoriesData = {
      labels: categoryLabels,
      datasets: [
        {
          label: 'Air Cooling',
          data: categoryLabels.map(cat => charts.cost_categories[cat].air_cooling),
          backgroundColor: chartColors.airCooling,
          borderRadius: 4,
        },
        {
          label: 'Immersion Cooling',
          data: categoryLabels.map(cat => charts.cost_categories[cat].immersion_cooling),
          backgroundColor: chartColors.immersionCooling,
          borderRadius: 4,
        },
      ],
    };

    // PUE Comparison
    const pueComparisonData = {
      labels: ['Air Cooling PUE', 'Immersion Cooling PUE'],
      datasets: [
        {
          data: [charts.pue_comparison.air_cooling, charts.pue_comparison.immersion_cooling],
          backgroundColor: [chartColors.airCooling, chartColors.immersionCooling],
          borderWidth: 2,
          borderColor: theme.palette.background.paper,
        },
      ],
    };

    return {
      tcoProgression: tcoProgressionData,
      costCategories: costCategoriesData,
      pueComparison: pueComparisonData,
    };
  }, [results, chartColors, theme.palette.background.paper]);

  // Chart options
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
      },
    };

    return {
      tcoProgression: {
        ...baseOptions,
        scales: {
          y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            title: {
              display: true,
              text: `Total Cost (${currency})`,
            },
          },
          y1: {
            type: 'linear' as const,
            display: true,
            position: 'right' as const,
            title: {
              display: true,
              text: `Savings (${currency})`,
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Total Cost of Ownership Progression',
          },
        },
      },
      costCategories: {
        ...baseOptions,
        scales: {
          y: {
            title: {
              display: true,
              text: `Cost (${currency})`,
            },
          },
        },
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Cost Category Comparison',
          },
        },
      },
      pueComparison: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Power Usage Effectiveness (PUE) Comparison',
          },
        },
      },
    };
  }, [currency]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedAccordions(prev =>
      isExpanded
        ? [...prev, panel]
        : prev.filter(p => p !== panel)
    );
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Exporting PDF...');
  };

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    console.log('Exporting Excel...');
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Sharing results...');
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={60} />
        <Box ml={2}>
          <Typography variant="h6">Calculating TCO...</Typography>
          <Typography variant="body2" color="text.secondary">
            This may take a few moments
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Calculation Error</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  // No results state
  if (!results) {
    return (
      <Alert severity="info">
        <Typography variant="body1">
          Configure your air cooling and immersion cooling systems to see TCO analysis results.
        </Typography>
      </Alert>
    );
  }

  const { summary, breakdown, environmental } = results;

  return (
    <Box>
      {/* Results Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom display="flex" alignItems="center">
          <AssessmentIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          {t('calculator.results.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('calculator.results.description')}
        </Typography>
      </Box>

      {/* Quick Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Total TCO Savings
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {CurrencyUtils.formatLarge(summary.total_tco_savings_5yr, currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Over 5 years
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                ROI
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {summary.roi_percent.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Return on Investment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Payback Period
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {(summary.payback_months / 12).toFixed(1)} years
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.payback_months.toFixed(0)} months
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Energy Efficiency
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">
                {summary.energy_efficiency_improvement.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PUE Improvement
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Results Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Summary" icon={<TrendingUpIcon />} />
            <Tab label="Charts & Analysis" icon={<AssessmentIcon />} />
            <Tab label="Environmental Impact" icon={<EcoIcon />} />
            <Tab label="Detailed Breakdown" icon={<InfoIcon />} />
          </Tabs>
        </Box>

        {/* Summary Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Financial Summary
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="CAPEX Savings"
                    secondary={CurrencyUtils.formatLarge(summary.total_capex_savings, currency)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="5-Year OPEX Savings"
                    secondary={CurrencyUtils.formatLarge(summary.total_opex_savings_5yr, currency)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Net Present Value (NPV)"
                    secondary={CurrencyUtils.formatLarge(summary.npv_savings, currency)}
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                System Comparison
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Air Cooling PUE"
                    secondary={summary.pue_air_cooling.toFixed(3)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Immersion Cooling PUE"
                    secondary={summary.pue_immersion_cooling.toFixed(3)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cost per kW (Immersion)"
                    secondary={CurrencyUtils.formatLarge(summary.cost_per_kw_immersion_cooling, currency)}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {chartData && (
              <>
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2, height: 400 }}>
                    <Line 
                      data={chartData.tcoProgression} 
                      options={chartOptions.tcoProgression}
                    />
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper elevation={1} sx={{ p: 2, height: 400 }}>
                    <Bar 
                      data={chartData.costCategories} 
                      options={chartOptions.costCategories}
                    />
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper elevation={1} sx={{ p: 2, height: 400 }}>
                    <Doughnut 
                      data={chartData.pueComparison} 
                      options={chartOptions.pueComparison}
                    />
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>

        {/* Environmental Impact Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="h6">Environmental Benefits</Typography>
                <Typography variant="body2">
                  Immersion cooling provides significant environmental improvements through energy efficiency.
                </Typography>
              </Alert>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Annual Carbon Savings
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {(environmental.carbon_savings_kg_co2_annual / 1000).toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Metric tons CO2 per year
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Annual Energy Savings
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {(environmental.energy_savings_kwh_annual / 1000).toFixed(0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    MWh per year
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Water Savings
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {environmental.water_savings_gallons_annual.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gallons per year
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body1" paragraph>
                The carbon footprint reduction of {environmental.carbon_footprint_reduction_percent.toFixed(1)}% 
                is equivalent to removing approximately {Math.round(environmental.carbon_savings_kg_co2_annual / 4000)} 
                cars from the road annually.
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Detailed Breakdown Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box>
            {/* CAPEX Breakdown */}
            <Accordion 
              expanded={expandedAccordions.includes('capex')} 
              onChange={handleAccordionChange('capex')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">CAPEX Breakdown</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Air Cooling System
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Equipment"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.air_cooling.equipment, currency)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Installation"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.air_cooling.installation, currency)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Infrastructure"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.air_cooling.infrastructure, currency)}
                        />
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Total"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.air_cooling.total, currency)}
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                        />
                      </ListItem>
                    </List>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Immersion Cooling System
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Equipment"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.equipment, currency)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Installation"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.installation, currency)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Infrastructure"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.infrastructure, currency)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Coolant"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.coolant || 0, currency)}
                        />
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Total"
                          secondary={CurrencyUtils.formatLarge(breakdown.capex.immersion_cooling.total, currency)}
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* OPEX Breakdown */}
            <Accordion 
              expanded={expandedAccordions.includes('opex')} 
              onChange={handleAccordionChange('opex')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Annual OPEX Analysis</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Annual operational costs showing escalation over {breakdown.opex_annual.length} years
                  </Typography>
                </Box>
                {/* This could be enhanced with a table showing year-by-year OPEX */}
              </AccordionDetails>
            </Accordion>
          </Box>
        </TabPanel>

        {/* Export Actions */}
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button
            startIcon={<ShareIcon />}
            onClick={handleShare}
            variant="outlined"
          >
            Share Results
          </Button>
          <Button
            startIcon={<ExcelIcon />}
            onClick={handleExportExcel}
            variant="outlined"
          >
            Export Excel
          </Button>
          <Button
            startIcon={<PdfIcon />}
            onClick={handleExportPDF}
            variant="contained"
            color="primary"
          >
            Export PDF
          </Button>
        </CardActions>
      </Card>
    </Box>
  );
};

export default ResultsDisplay;