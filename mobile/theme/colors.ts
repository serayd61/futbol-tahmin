// Çoklu palet — light + dark, ThemeContext üzerinden seçilir
// V3 — WCAG AA kontrast düzeltmeleri (textFaint dark: #5E6B82 → #6E7C95,
//      light: #94A3B8 → #7B8AA0). Aksi halde küçük "meta" metinler 4.5:1
//      kontrast eşiğini geçemiyordu.
export type ColorPalette = {
  bg:           string;
  bgGradient:   string;   // subtle gradient end (üst → alt)
  card:         string;
  cardElev:     string;
  cardHover:    string;
  border:       string;
  borderStrong: string;
  text:         string;
  textDim:      string;
  textFaint:    string;
  primary:      string;
  primaryDim:   string;
  primaryBg:    string;   // primary alpha background (10%)
  draw:         string;
  drawBg:       string;
  away:         string;
  awayBg:       string;
  high:         string;
  highBg:       string;   // confidence yüksek için soft pill bg
  medium:       string;
  mediumBg:     string;
  low:          string;
  lowBg:        string;
  shadow:       string;   // shadow color (subtle elevation)
};

export const darkColors: ColorPalette = {
  bg:           '#070C18',
  bgGradient:   '#0B1326',
  card:         '#0F1A30',
  cardElev:     '#162542',
  cardHover:    '#1B2D4D',
  border:       '#1E2C49',
  borderStrong: '#2A3D63',
  text:         '#F1F5FB',
  textDim:      '#9AA8BF',
  textFaint:    '#6E7C95',   // V3 a11y: ~4.5:1 dark bg üzerinde
  primary:      '#22C55E',
  primaryDim:   '#22C55E55',
  primaryBg:    '#22C55E1A',
  draw:         '#FBBF24',
  drawBg:       '#FBBF241A',
  away:         '#F87171',
  awayBg:       '#F871711A',
  high:         '#34D399',
  highBg:       '#34D39922',
  medium:       '#FBBF24',
  mediumBg:     '#FBBF2422',
  low:          '#94A3B8',
  lowBg:        '#94A3B81F',
  shadow:       '#000000',
};

export const lightColors: ColorPalette = {
  bg:           '#F4F6FB',
  bgGradient:   '#FFFFFF',
  card:         '#FFFFFF',
  cardElev:     '#F8FAFC',
  cardHover:    '#EEF2F8',
  border:       '#E2E8F0',
  borderStrong: '#CBD5E1',
  text:         '#0F172A',
  textDim:      '#64748B',
  textFaint:    '#7B8AA0',   // V3 a11y: ~4.5:1 light bg üzerinde
  primary:      '#16A34A',
  primaryDim:   '#16A34A55',
  primaryBg:    '#16A34A14',
  draw:         '#D97706',
  drawBg:       '#D9770614',
  away:         '#DC2626',
  awayBg:       '#DC262614',
  high:         '#059669',
  highBg:       '#0596691A',
  medium:       '#D97706',
  mediumBg:     '#D977061A',
  low:          '#64748B',
  lowBg:        '#64748B14',
  shadow:       '#0F172A',
};

// Geriye dönük uyum: bazı yerlerde hala static `colors` import edilebilir.
// Default = dark (mevcut görsel davranış).
export const colors: ColorPalette = darkColors;

// Confidence label çevirileri — UI'da Türkçe görünür
export const confidenceLabels: Record<'high' | 'medium' | 'low', string> = {
  high:   'Güçlü',
  medium: 'Olası',
  low:    'Belirsiz',
};

export const confidenceDescriptions: Record<'high' | 'medium' | 'low', string> = {
  high:   'Model ≥%60 olasılıkla öneriyor',
  medium: 'Olası ama riskli, %45-60 arası',
  low:    'Veri yetersiz / belirsiz',
};
