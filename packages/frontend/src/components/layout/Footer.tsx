/**
 * Application Footer Component
 * Responsive footer with links, branding, and localization support
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link as MuiLink,
  Grid,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  Email as EmailIcon,
  Language as LanguageIcon,
  TrendingUp as TCOIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

import { useI18n } from '../../i18n/useI18n';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export interface FooterProps {
  /** Whether to show social links */
  showSocial?: boolean;
  /** Whether to show the language switcher */
  showLanguageSwitcher?: boolean;
  /** Whether to show the detailed footer (vs compact) */
  compact?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  showSocial = true,
  showLanguageSwitcher = true,
  compact = false,
}) => {
  const { t, isRTL, formatDate } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const currentYear = new Date().getFullYear();

  // Footer links organized by sections
  const footerSections = [
    {
      title: t('navigation.calculator'),
      links: [
        { label: t('navigation.home'), path: '/' },
        { label: t('navigation.about'), path: '/about' },
        { label: t('navigation.help'), path: '/help' },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('navigation.documentation'), path: '/docs' },
        { label: t('footer.api_docs'), path: '/api-docs' },
        { label: t('footer.examples'), path: '/examples' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.privacy'), path: '/privacy' },
        { label: t('footer.terms'), path: '/terms' },
        { label: t('footer.cookies'), path: '/cookies' },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { label: t('navigation.contact'), path: '/contact' },
        { label: t('footer.feedback'), path: '/feedback' },
        { label: t('footer.report_issue'), path: '/issues' },
      ],
    },
  ];

  // Social media links
  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/tco-calculator',
      icon: <GitHubIcon />,
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/tco-calculator',
      icon: <LinkedInIcon />,
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/tco_calculator',
      icon: <TwitterIcon />,
    },
    {
      name: 'Email',
      url: 'mailto:info@tco-calculator.com',
      icon: <EmailIcon />,
    },
  ];

  // Render compact footer
  if (compact) {
    return (
      <Box
        component="footer"
        sx={{
          backgroundColor: 'background.paper',
          borderTop: `1px solid ${theme.palette.divider}`,
          py: 2,
          mt: 'auto',
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="body2" color="textSecondary" textAlign="center">
              {t('footer.copyright')}
            </Typography>

            {showLanguageSwitcher && (
              <LanguageSwitcher variant="minimal" size="small" />
            )}
          </Stack>
        </Container>
      </Box>
    );
  }

  // Render full footer
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'grey.900',
        color: 'common.white',
        mt: 'auto',
      }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          {/* Brand Section */}
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" mb={2}>
              <TCOIcon sx={{ mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0, fontSize: 32, color: 'primary.light' }} />
              <Box>
                <Typography variant="h6" fontWeight="bold" color="common.white">
                  {t('calculator.title')}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {t('calculator.subtitle')}
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="body2" color="grey.300" paragraph>
              {t('footer.description')}
            </Typography>

            {showSocial && (
              <Box>
                <Typography variant="body2" color="grey.300" gutterBottom>
                  {t('footer.follow_us')}:
                </Typography>
                <Box display="flex" gap={1}>
                  {socialLinks.map((social) => (
                    <IconButton
                      key={social.name}
                      component="a"
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        color: 'grey.300',
                        '&:hover': {
                          color: 'primary.light',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                      data-testid={`social-${social.name.toLowerCase()}`}
                    >
                      {social.icon}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            )}
          </Grid>

          {/* Footer Links */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={isMobile ? 2 : 4}>
              {footerSections.map((section) => (
                <Grid item xs={6} sm={3} key={section.title}>
                  <Typography
                    variant="subtitle2"
                    color="primary.light"
                    fontWeight="bold"
                    gutterBottom
                  >
                    {section.title}
                  </Typography>
                  <Stack spacing={1}>
                    {section.links.map((link) => (
                      <MuiLink
                        key={link.label}
                        component={Link}
                        to={link.path}
                        variant="body2"
                        color="grey.300"
                        underline="hover"
                        sx={{
                          display: 'block',
                          '&:hover': {
                            color: 'primary.light',
                          },
                        }}
                        data-testid={`footer-link-${link.path.replace('/', '')}`}
                      >
                        {link.label}
                      </MuiLink>
                    ))}
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, backgroundColor: 'grey.700' }} />

        {/* Bottom Section */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            textAlign="center"
          >
            <Typography variant="body2" color="grey.400">
              {t('footer.copyright')}
            </Typography>
            
            <Box display="flex" gap={1} alignItems="center">
              <Chip
                label={`v${__APP_VERSION__ || '1.0.0'}`}
                size="small"
                variant="outlined"
                sx={{
                  color: 'grey.400',
                  borderColor: 'grey.600',
                  fontSize: '0.75rem',
                }}
              />
              
              <Typography variant="caption" color="grey.500">
                {t('footer.last_updated')}: {formatDate(new Date())}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
          >
            {showLanguageSwitcher && (
              <Box display="flex" alignItems="center" gap={1}>
                <LanguageIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                <LanguageSwitcher variant="minimal" size="small" />
              </Box>
            )}

            <Typography variant="caption" color="grey.500">
              {t('footer.built_with_love')} 💙
            </Typography>
          </Stack>
        </Stack>

        {/* Development Info */}
        {import.meta.env.DEV && (
          <>
            <Divider sx={{ my: 2, backgroundColor: 'grey.700' }} />
            <Box textAlign="center">
              <Typography variant="caption" color="grey.500" fontFamily="monospace">
                Dev Mode • {import.meta.env.MODE} • React {React.version}
              </Typography>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Footer;