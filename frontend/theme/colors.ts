export const lightTheme = {
  background: '#F8F9FA', // Soft off-white
  surface: '#FFFFFF', // Clean white
  surfaceElevated: '#FFFFFF', // Used with heavier shadows
  
  // Accents
  primary: '#4F46E5', // Deep Indigo
  primarySoft: 'rgba(79, 70, 229, 0.1)',
  accent: '#7C3AED', // Violet
  accentSoft: 'rgba(124, 58, 237, 0.08)',
  
  // Semantic
  success: '#059669', // Restrained emerald
  successSoft: 'rgba(5, 150, 105, 0.1)',
  danger: '#DC2626',
  warning: '#D97706',
  
  // Typography
  textHero: '#0F172A',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  
  // Materials / Borders
  border: 'rgba(15, 23, 42, 0.06)',
  borderHighlight: 'rgba(15, 23, 42, 0.12)',
  
  glassSurface: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  glassHighlight: 'rgba(255, 255, 255, 1)',
};

export const darkTheme = {
  background: '#0B0E14', // Deep Navy/Indigo tint, avoiding pure black
  surface: '#121620', // Elevation 1 solid
  surfaceElevated: '#1A1F2E', // Elevation 2 solid
  
  // Accents
  primary: '#6366F1', // Indigo
  primarySoft: 'rgba(99, 102, 241, 0.15)',
  accent: '#8B5CF6', // Violet
  accentSoft: 'rgba(139, 92, 246, 0.15)',
  
  // Semantic
  success: '#10B981', // Semantic emerald
  successSoft: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444',
  warning: '#F59E0B',
  
  // Typography
  textHero: '#F8FAFC',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8', // Significantly quieter
  textMuted: '#475569', // Barely there labels
  
  // Materials / Borders
  border: 'rgba(255, 255, 255, 0.05)',
  borderHighlight: 'rgba(255, 255, 255, 0.1)',
  
  glassSurface: 'rgba(18, 22, 32, 0.75)', // Indigo-tinted translucency
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  glassHighlight: 'rgba(255, 255, 255, 0.12)', // Subtle top-edge light
};

// Default export
export const colors = darkTheme;
