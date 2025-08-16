/**
 * Language Switcher Component
 * Provides language selection with flag icons and smooth RTL/LTR transitions
 */

import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Fade,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';

import { useI18n } from '../../i18n/useI18n';
import type { Locale } from '../../i18n/useI18n';

// Flag icons using emoji (reliable cross-platform support)
const LANGUAGE_FLAGS: Record<Locale, string> = {
  en: '🇺🇸', // US flag for English
  ar: '🇸🇦', // Saudi Arabia flag for Arabic
};

// Language display names in their native script
const LANGUAGE_NAMES: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  ar: { native: 'العربية', english: 'Arabic' },
};

export interface LanguageSwitcherProps {
  /** Display variant */
  variant?: 'button' | 'chip' | 'minimal';
  /** Size of the component */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show language names or just flags */
  showNames?: boolean;
  /** Whether to show the current language name */
  showCurrentName?: boolean;
  /** Custom className */
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'button',
  size = 'medium',
  showNames = true,
  showCurrentName = true,
  className,
}) => {
  const theme = useTheme();
  const { t, locale, setLocale, availableLocales, getLocaleDisplayName, isRTL } = useI18n();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (newLocale: Locale) => {
    if (newLocale !== locale) {
      // Apply fade-out effect before language change
      document.documentElement.style.transition = 'opacity 0.2s ease-in-out';
      document.documentElement.style.opacity = '0.8';
      
      setTimeout(() => {
        setLocale(newLocale);
        
        // Restore opacity after language change
        setTimeout(() => {
          document.documentElement.style.opacity = '1';
          document.documentElement.style.transition = '';
        }, 100);
      }, 150);
    }
    handleClose();
  };

  const currentLanguage = LANGUAGE_NAMES[locale];
  const currentFlag = LANGUAGE_FLAGS[locale];

  // Render minimal variant (just flag)
  if (variant === 'minimal') {
    return (
      <Box className={className}>
        <Button
          onClick={handleClick}
          size={size}
          sx={{
            minWidth: 'auto',
            width: size === 'small' ? 32 : size === 'large' ? 48 : 40,
            height: size === 'small' ? 32 : size === 'large' ? 48 : 40,
            borderRadius: 1,
            fontSize: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
          aria-label={t('common.select') + ' ' + t('common.language')}
          data-testid="language-switcher-minimal"
        >
          {currentFlag}
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          TransitionComponent={Fade}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: isRTL ? 'left' : 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: isRTL ? 'left' : 'right',
          }}
          PaperProps={{
            sx: {
              minWidth: 120,
              mt: 1,
            },
          }}
        >
          {availableLocales.map((lang) => (
            <MenuItem
              key={lang}
              onClick={() => handleLanguageSelect(lang)}
              selected={lang === locale}
              data-testid={`language-option-${lang}`}
            >
              <ListItemIcon sx={{ fontSize: '18px', minWidth: 32 }}>
                {LANGUAGE_FLAGS[lang]}
              </ListItemIcon>
              <ListItemText
                primary={LANGUAGE_NAMES[lang].native}
                secondary={LANGUAGE_NAMES[lang].english}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: lang === locale ? 'medium' : 'normal',
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  color: 'textSecondary',
                }}
              />
              {lang === locale && (
                <CheckIcon sx={{ ml: 1, fontSize: 16, color: 'primary.main' }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }

  // Render chip variant
  if (variant === 'chip') {
    return (
      <Box className={className}>
        <Chip
          icon={<Box sx={{ fontSize: '16px' }}>{currentFlag}</Box>}
          label={showCurrentName ? currentLanguage.native : undefined}
          onClick={handleClick}
          variant="outlined"
          size={size}
          sx={{
            cursor: 'pointer',
            '& .MuiChip-icon': {
              marginLeft: isRTL ? 0 : 1,
              marginRight: isRTL ? 1 : 0,
            },
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
          data-testid="language-switcher-chip"
        />

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          TransitionComponent={Fade}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          PaperProps={{
            sx: {
              minWidth: 160,
              mt: 1,
            },
          }}
        >
          {availableLocales.map((lang) => (
            <MenuItem
              key={lang}
              onClick={() => handleLanguageSelect(lang)}
              selected={lang === locale}
              data-testid={`language-option-${lang}`}
            >
              <ListItemIcon sx={{ fontSize: '18px', minWidth: 32 }}>
                {LANGUAGE_FLAGS[lang]}
              </ListItemIcon>
              <ListItemText
                primary={LANGUAGE_NAMES[lang].native}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: lang === locale ? 'medium' : 'normal',
                }}
              />
              {lang === locale && (
                <CheckIcon sx={{ ml: 1, fontSize: 16, color: 'primary.main' }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }

  // Render button variant (default)
  return (
    <Box className={className}>
      <Button
        variant="outlined"
        size={size}
        startIcon={
          <Box sx={{ fontSize: size === 'small' ? '16px' : '18px', lineHeight: 1 }}>
            {currentFlag}
          </Box>
        }
        endIcon={<ArrowDropDownIcon />}
        onClick={handleClick}
        sx={{
          minWidth: showCurrentName ? 120 : 80,
          justifyContent: 'space-between',
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main,
          },
          '& .MuiButton-startIcon': {
            marginLeft: isRTL ? 1 : -0.5,
            marginRight: isRTL ? -0.5 : 1,
          },
          '& .MuiButton-endIcon': {
            marginLeft: isRTL ? -0.5 : 1,
            marginRight: isRTL ? 1 : -0.5,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          },
        }}
        aria-label={t('navigation.language_selector')}
        data-testid="language-switcher-button"
      >
        {showCurrentName && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'medium',
              textTransform: 'none',
              fontSize: size === 'small' ? '0.75rem' : '0.875rem',
            }}
          >
            {currentLanguage.native}
          </Typography>
        )}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        TransitionComponent={Fade}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isRTL ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'left' : 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: anchorEl?.offsetWidth || 160,
            mt: 1,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {availableLocales.map((lang, index) => (
          <React.Fragment key={lang}>
            <MenuItem
              onClick={() => handleLanguageSelect(lang)}
              selected={lang === locale}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '10',
                },
              }}
              data-testid={`language-option-${lang}`}
            >
              <ListItemIcon sx={{ fontSize: '18px', minWidth: 40 }}>
                {LANGUAGE_FLAGS[lang]}
              </ListItemIcon>
              
              <ListItemText
                primary={LANGUAGE_NAMES[lang].native}
                secondary={showNames ? LANGUAGE_NAMES[lang].english : undefined}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: lang === locale ? 'medium' : 'normal',
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  color: 'textSecondary',
                }}
              />
              
              {lang === locale && (
                <CheckIcon 
                  sx={{ 
                    ml: isRTL ? 0 : 1, 
                    mr: isRTL ? 1 : 0, 
                    fontSize: 16, 
                    color: 'primary.main' 
                  }} 
                />
              )}
            </MenuItem>
            
            {index < availableLocales.length - 1 && (
              <Divider sx={{ my: 0 }} />
            )}
          </React.Fragment>
        ))}
        
        <Divider sx={{ my: 1 }} />
        
        <MenuItem disabled sx={{ py: 1 }}>
          <ListItemIcon>
            <LanguageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText
            primary={t('navigation.language_selector')}
            primaryTypographyProps={{
              variant: 'caption',
              color: 'textSecondary',
              fontStyle: 'italic',
            }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;