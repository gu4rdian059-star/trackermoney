export const Palette = {
  // Light Theme Clean Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceSubtle: '#F8FAFC',

  // Crisp Light Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  borderHighlight: '#94A3B8',

  // Core Accents for Light Theme (High Contrast & Legibility)
  emerald: '#059669',
  emeraldLight: '#10B981',
  emeraldMuted: '#ECFDF5',

  rose: '#E11D48',
  roseLight: '#F43F5E',
  roseMuted: '#FFF1F2',

  cyan: '#0284C7',
  cyanMuted: '#F0F9FF',

  indigo: '#4F46E5',
  indigoMuted: '#EEF2FF',

  amber: '#D97706',
  amberMuted: '#FFFBEB',

  purple: '#7C3AED',
  purpleMuted: '#FAF5FF',

  // Typography for Light Mode
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
};

export const Colors = {
  light: {
    text: Palette.textPrimary,
    background: Palette.background,
    tint: Palette.emerald,
    icon: Palette.textSecondary,
    tabIconDefault: Palette.textTertiary,
    tabIconSelected: Palette.emerald,
    card: Palette.surface,
    border: Palette.border,
  },
  dark: {
    text: '#FFFFFF',
    background: '#090A0F',
    tint: '#10B981',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#10B981',
    card: '#13161F',
    border: '#212638',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalTimeString = (d: Date = new Date()): string => {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatIDR = (amount: number): string => {
  return 'Rp ' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatDateID = (dateString: string): string => {
  try {
    if (!dateString) return '';
    // Parse YYYY-MM-DD components directly to prevent UTC offset shifting
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatTimeID = (timeString?: string, timestamp?: number): string => {
  if (timeString) {
    return `${timeString} WIB`;
  }
  if (timestamp) {
    const d = new Date(timestamp);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} WIB`;
  }
  return '';
};

