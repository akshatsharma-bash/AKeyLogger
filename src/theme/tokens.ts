// Hallmark · cleanup pass on spec-locked system (tokens unchanged) · pre-emit critique: P4 H4 E4 S5 R5 V4
import { Platform, TextStyle } from 'react-native';

export const colors = {
  bg: '#0E1016',
  surface: '#14171E',
  surfaceAlt: '#1B1F28',
  border: '#2A2F3A',
  textPrimary: '#ECEEF2',
  textSecondary: '#9AA1AD',
  accent: '#E2283C', // fills only, never text
  onAccent: '#FFFFFF',
  accentText: '#FF5A6A',
  success: '#3DD68C',
  warning: '#F5B544',
  scrim: 'rgba(0,0,0,0.55)',
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const gutter = 16;
export const radius = { input: 8, card: 12, sheet: 16 } as const;
export const touch = 48;

const num: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 48, fontWeight: '700', ...num } as TextStyle,
  title: { fontSize: 22, fontWeight: '700' } as TextStyle,
  heading: { fontSize: 18, fontWeight: '600' } as TextStyle,
  body: { fontSize: 16, fontWeight: '400' } as TextStyle,
  label: { fontSize: 14, fontWeight: '500' } as TextStyle,
  caption: { fontSize: 12, fontWeight: '500' } as TextStyle,
  num,
};

export const displayMaxScale = 1.3;

export const motion = { fast: 150, normal: 200, slow: 250 } as const;

export const ripple =
  Platform.OS === 'android' ? { color: colors.surfaceAlt } : undefined;
