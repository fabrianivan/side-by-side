/**
 * Design Tokens — Side by Side ("Better together.")
 * Gaya: minimalis, hangat, modern, dan tenang.
 */
export const designTokens = {
  colors: {
    teal: '#0F8B8D',
    tealDark: '#0B6B6D',
    tealLight: '#E6F4F4',
    navy: '#1B2A41',
    navyLight: '#2B3F5E',
    coral: '#FF7A66',
    coralDark: '#E5634F',
    coralLight: '#FFF0ED',
    background: '#FFFFFF',
    softGray: '#F4F7F8',
    text: '#1B2A41',
    textMuted: '#4A5D75',
    success: '#2E9E6B',
    warning: '#E0A100',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
    baseSize: '16px',
    scale: {
      normal: 1,
      large: 1.125,
      xlarge: 1.25,
    },
  },
  radius: {
    button: '12px',
    card: '16px',
  },
  accessibility: {
    minTouchTargetPx: 44,
    wcagLevel: 'AA',
  },
} as const;
