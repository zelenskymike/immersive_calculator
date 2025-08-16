/**
 * Application Header Component
 * Responsive header with navigation, language switcher, and branding
 */

import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Container,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Link as MuiLink,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Calculator as CalculatorIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  ContactMail as ContactIcon,
  TrendingUp as TCOIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useI18n } from '../../i18n/useI18n';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export interface HeaderProps {
  /** Whether to show the navigation menu */
  showNavigation?: boolean;
  /** Whether to show the language switcher */
  showLanguageSwitcher?: boolean;
  /** Custom actions to display in the header */
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  showNavigation = true,
  showLanguageSwitcher = true,
  actions,
}) => {
  const { t, isRTL, locale } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items
  const navigationItems = [
    {
      key: 'calculator',
      label: t('navigation.calculator'),
      path: '/',
      icon: <CalculatorIcon />,
    },
    {
      key: 'about',
      label: t('navigation.about'),
      path: '/about',
      icon: <InfoIcon />,
    },
    {
      key: 'help',
      label: t('navigation.help'),
      path: '/help',
      icon: <HelpIcon />,
    },
    {
      key: 'contact',
      label: t('navigation.contact'),
      path: '/contact',
      icon: <ContactIcon />,
    },
  ];

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMobileMenuClose();
  };

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderDesktopNavigation = () => (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
      {navigationItems.map((item) => (
        <Button
          key={item.key}
          component={Link}
          to={item.path}
          startIcon={item.icon}
          sx={{
            color: 'inherit',
            textDecoration: 'none',
            mx: 0.5,
            px: 2,
            py: 1,
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: isActivePath(item.path) ? 'bold' : 'normal',
            backgroundColor: isActivePath(item.path) 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '& .MuiButton-startIcon': {
              marginRight: isRTL ? 0 : 1,
              marginLeft: isRTL ? 1 : 0,
            },
          }}
          data-testid={`nav-${item.key}`}
        >
          {item.label}
        </Button>
      ))}
    </Box>
  );

  const renderMobileNavigation = () => (
    <Drawer
      anchor={isRTL ? 'right' : 'left'}
      open={mobileMenuOpen}
      onClose={handleMobileMenuClose}
      PaperProps={{
        sx: {
          width: 280,
          backgroundColor: 'background.default',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center">
          <TCOIcon sx={{ mr: isRTL ? 0 : 1, ml: isRTL ? 1 : 0, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold">
            {t('calculator.title')}
          </Typography>
        </Box>
        <IconButton onClick={handleMobileMenuClose} data-testid="mobile-menu-close">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <List sx={{ flex: 1 }}>
        {navigationItems.map((item) => (
          <ListItem
            key={item.key}
            button
            onClick={() => handleNavigate(item.path)}
            sx={{
              backgroundColor: isActivePath(item.path) 
                ? 'primary.main' + '10' 
                : 'transparent',
              '&:hover': {
                backgroundColor: 'primary.main' + '20',
              },
            }}
            data-testid={`mobile-nav-${item.key}`}
          >
            <ListItemIcon sx={{ color: isActivePath(item.path) ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: isActivePath(item.path) ? 'bold' : 'normal',
                color: isActivePath(item.path) ? 'primary.main' : 'inherit',
              }}
            />
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="body2" color="textSecondary">
            {t('navigation.language')}:
          </Typography>
          <LanguageSwitcher variant="chip" size="small" />
        </Box>
        
        <Box display="flex" alignItems="center" justifyContent="center">
          <Chip
            label={`v${__APP_VERSION__ || '1.0.0'}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={1}
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ px: 0 }}>
            {/* Mobile Menu Button */}
            {isMobile && showNavigation && (
              <IconButton
                edge="start"
                color="inherit"
                aria-label={t('navigation.menu')}
                onClick={handleMobileMenuToggle}
                sx={{ 
                  mr: isRTL ? 0 : 2, 
                  ml: isRTL ? 2 : 0,
                  display: { xs: 'block', md: 'none' } 
                }}
                data-testid="mobile-menu-button"
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo and Title */}
            <Box 
              component={Link} 
              to="/"
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                flexGrow: 0,
                '&:hover': {
                  opacity: 0.8,
                },
              }}
              data-testid="header-logo"
            >
              <TCOIcon sx={{ mr: isRTL ? 0 : 2, ml: isRTL ? 2 : 0, fontSize: 32 }} />
              <Box>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    lineHeight: 1.2,
                    display: { xs: isMobile && showNavigation ? 'none' : 'block', sm: 'block' },
                  }}
                >
                  {t('calculator.title')}
                </Typography>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{
                    opacity: 0.8,
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {t('calculator.subtitle')}
                </Typography>
              </Box>
            </Box>

            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop Navigation */}
            {showNavigation && renderDesktopNavigation()}

            {/* Header Actions */}
            {actions && (
              <Box sx={{ ml: isRTL ? 0 : 2, mr: isRTL ? 2 : 0 }}>
                {actions}
              </Box>
            )}

            {/* Language Switcher */}
            {showLanguageSwitcher && !isMobile && (
              <Box sx={{ ml: isRTL ? 0 : 2, mr: isRTL ? 2 : 0 }}>
                <LanguageSwitcher variant="button" size="small" showNames={false} />
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      {isMobile && showNavigation && renderMobileNavigation()}
    </>
  );
};

export default Header;