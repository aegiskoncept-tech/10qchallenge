/**
 * 10Q CHALLENGE LMS — ADMIN DESIGN TOKENS
 * Standardized design tokens for the unified SaaS administrative interface.
 */

export const ADMIN_TOKENS = {
  colors: {
    primaryBlue: '#1455C0',
    primaryBlueHover: '#0F449E',
    primaryBlueLight: '#E8F1FC',
    darkNavy: '#14233F',
    darkNavyLight: '#1E3258',
    bgMain: '#F6F8FC',
    bgCard: '#FFFFFF',
    bgCardSubtle: '#FAFCFF',
    border: '#E3E8F0',
    borderLight: '#EDF1F7',
    primaryText: '#172B4D',
    secondaryText: '#6B7890',
    mutedText: '#9AA5B8',
    success: '#16A36A',
    successBg: '#E9F8F1',
    successBorder: '#B2EAD0',
    danger: '#E5484D',
    dangerBg: '#FDF0F0',
    dangerBorder: '#F9C6C7',
    warning: '#E6A23C',
    warningBg: '#FEF8EC',
    warningBorder: '#FBDCA6',
    info: '#2075E8',
    infoBg: '#EDF5FD',
    infoBorder: '#B8D8FA'
  },
  typography: {
    fontSans: "'Inter', system-ui, -apple-system, sans-serif",
    fontHeading: "'Outfit', 'Inter', system-ui, sans-serif"
  },
  shadows: {
    subtle: '0 1px 3px 0 rgba(20, 35, 63, 0.04), 0 1px 2px 0 rgba(20, 35, 63, 0.02)',
    card: '0 2px 6px -1px rgba(20, 35, 63, 0.06), 0 1px 3px -1px rgba(20, 35, 63, 0.04)',
    elevated: '0 8px 24px -4px rgba(20, 35, 63, 0.08), 0 4px 12px -2px rgba(20, 35, 63, 0.04)',
    dropdown: '0 10px 30px -5px rgba(20, 35, 63, 0.12), 0 4px 10px -2px rgba(20, 35, 63, 0.05)'
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  }
} as const;

export type AdminColorTokens = typeof ADMIN_TOKENS.colors;
