/**
 * Configuration Help Component
 * Provides contextual help and documentation for form sections
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Lightbulb as TipIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as BestPracticeIcon,
} from '@mui/icons-material';

import { useI18n } from '../../i18n/useI18n';

interface ConfigurationHelpProps {
  topic: string;
  title: string;
  description: string;
  expanded?: boolean;
  showDialog?: boolean;
}

/**
 * Help content configuration by topic
 */
const HELP_CONTENT: Record<string, {
  overview: string;
  bestPractices: Array<{ title: string; description: string }>;
  tips: Array<{ title: string; description: string }>;
  warnings: Array<{ title: string; description: string }>;
  examples: Array<{ scenario: string; values: Record<string, string | number> }>;
}> = {
  air_cooling: {
    overview: 'Air cooling systems use HVAC units to maintain optimal temperatures for data center equipment. Configuration parameters affect both performance and cost calculations.',
    bestPractices: [
      {
        title: 'Rack Density Planning',
        description: 'Plan for 15-20kW per rack for standard deployments. High-density configurations may require specialized cooling.',
      },
      {
        title: 'HVAC Efficiency',
        description: 'Modern HVAC systems achieve 85-90% efficiency. Older systems may operate at 70-80% efficiency.',
      },
      {
        title: 'Space Utilization',
        description: 'Account for hot/cold aisle configurations which typically achieve 80-85% space efficiency.',
      },
    ],
    tips: [
      {
        title: 'Power Distribution',
        description: 'Use 95% efficiency for modern UPS systems and power distribution units.',
      },
      {
        title: 'Rack Configuration',
        description: 'Standard 42U racks can accommodate 15-25kW depending on server density and cooling capability.',
      },
    ],
    warnings: [
      {
        title: 'High Density Risks',
        description: 'Power densities above 25kW per rack may require liquid cooling or specialized HVAC systems.',
      },
      {
        title: 'Efficiency Impact',
        description: 'Poor airflow management can reduce HVAC efficiency by 20-30%.',
      },
    ],
    examples: [
      {
        scenario: 'Small Office Data Center',
        values: { racks: 10, power_per_rack: 12, hvac_efficiency: 0.85 },
      },
      {
        scenario: 'Enterprise Data Center',
        values: { racks: 100, power_per_rack: 18, hvac_efficiency: 0.9 },
      },
    ],
  },
  immersion_cooling: {
    overview: 'Immersion cooling submerges servers in dielectric fluid for superior heat dissipation and energy efficiency. This technology can achieve PUE values as low as 1.02.',
    bestPractices: [
      {
        title: 'Tank Sizing',
        description: 'Use larger tanks (20U+) for better cost efficiency and easier maintenance access.',
      },
      {
        title: 'Power Density',
        description: 'Immersion cooling supports 2-5kW per U, significantly higher than air cooling.',
      },
      {
        title: 'Fluid Selection',
        description: 'Synthetic fluids offer best performance but mineral oil provides cost-effective alternative.',
      },
    ],
    tips: [
      {
        title: 'Optimization',
        description: 'Auto-optimization typically selects 23U tanks for best balance of cost and efficiency.',
      },
      {
        title: 'Maintenance',
        description: 'Immersion cooling requires 70% less maintenance than traditional air cooling systems.',
      },
    ],
    warnings: [
      {
        title: 'Initial Investment',
        description: 'Higher upfront costs are offset by operational savings within 2-4 years.',
      },
      {
        title: 'Specialized Skills',
        description: 'Staff may require training on immersion cooling maintenance procedures.',
      },
    ],
    examples: [
      {
        scenario: 'High-Performance Computing',
        values: { target_power: 500, coolant_type: 'synthetic', power_density: 3.0 },
      },
      {
        scenario: 'Edge Computing',
        values: { target_power: 50, coolant_type: 'mineral_oil', power_density: 2.0 },
      },
    ],
  },
  financial: {
    overview: 'Financial parameters determine the accuracy of TCO calculations and ROI analysis. Regional settings affect energy costs, labor rates, and currency calculations.',
    bestPractices: [
      {
        title: 'Analysis Period',
        description: 'Use 5-7 years for most accurate projections. Longer periods increase uncertainty.',
      },
      {
        title: 'Discount Rate',
        description: 'Corporate discount rates typically range from 6-12% depending on industry and risk profile.',
      },
      {
        title: 'Regional Accuracy',
        description: 'Select the correct region for accurate energy costs and labor rates.',
      },
    ],
    tips: [
      {
        title: 'Energy Escalation',
        description: 'Historical energy cost increases average 2-4% annually. Use conservative estimates.',
      },
      {
        title: 'Currency Considerations',
        description: 'Multi-national deployments should consider exchange rate fluctuations.',
      },
    ],
    warnings: [
      {
        title: 'Escalation Rates',
        description: 'Aggressive escalation rates (>6%) may overstate long-term savings.',
      },
      {
        title: 'Regional Variations',
        description: 'Energy costs can vary significantly within regions. Verify local rates.',
      },
    ],
    examples: [
      {
        scenario: 'US Enterprise',
        values: { analysis_years: 5, discount_rate: 0.08, energy_cost: 0.12 },
      },
      {
        scenario: 'EU Data Center',
        values: { analysis_years: 7, discount_rate: 0.06, energy_cost: 0.28 },
      },
    ],
  },
};

export const ConfigurationHelp: React.FC<ConfigurationHelpProps> = ({
  topic,
  title,
  description,
  expanded = false,
  showDialog = false,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(showDialog);
  const [expandedSection, setExpandedSection] = useState<string | false>(expanded ? 'overview' : false);

  const helpContent = HELP_CONTENT[topic];
  if (!helpContent) {
    return null;
  }

  const handleSectionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  const openDialog = () => setDialogOpen(true);
  const closeDialog = () => setDialogOpen(false);

  return (
    <>
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center">
              <HelpIcon sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="subtitle2" color="info.main">
                {title}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={openDialog}
              startIcon={<InfoIcon />}
              sx={{ minWidth: 'auto' }}
            >
              More Info
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>

          {/* Quick tips */}
          {helpContent.tips.slice(0, 2).map((tip, index) => (
            <Box key={index} mt={1}>
              <Chip
                icon={<TipIcon />}
                label={tip.title}
                size="small"
                variant="outlined"
                color="info"
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Detailed Help Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <HelpIcon sx={{ mr: 1 }} />
              <Typography variant="h6">{title}</Typography>
            </Box>
            <IconButton onClick={closeDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {/* Overview */}
          <Accordion
            expanded={expandedSection === 'overview'}
            onChange={handleSectionChange('overview')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Overview</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                {helpContent.overview}
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Best Practices */}
          <Accordion
            expanded={expandedSection === 'best_practices'}
            onChange={handleSectionChange('best_practices')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Best Practices</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {helpContent.bestPractices.map((practice, index) => (
                  <ListItem key={index} alignItems="flex-start">
                    <ListItemIcon>
                      <BestPracticeIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={practice.title}
                      secondary={practice.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Tips */}
          <Accordion
            expanded={expandedSection === 'tips'}
            onChange={handleSectionChange('tips')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Tips & Guidelines</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {helpContent.tips.map((tip, index) => (
                  <ListItem key={index} alignItems="flex-start">
                    <ListItemIcon>
                      <TipIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={tip.title}
                      secondary={tip.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Warnings */}
          <Accordion
            expanded={expandedSection === 'warnings'}
            onChange={handleSectionChange('warnings')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Important Considerations</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {helpContent.warnings.map((warning, index) => (
                  <ListItem key={index} alignItems="flex-start">
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning.title}
                      secondary={warning.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Examples */}
          <Accordion
            expanded={expandedSection === 'examples'}
            onChange={handleSectionChange('examples')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Configuration Examples</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {helpContent.examples.map((example, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    {example.scenario}
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {Object.entries(example.values).map(([key, value]) => (
                      <Typography key={key} variant="body2" color="text.secondary">
                        <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                      </Typography>
                    ))}
                  </Box>
                  {index < helpContent.examples.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfigurationHelp;