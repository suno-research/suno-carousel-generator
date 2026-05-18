import type { SlideEstilo } from './types';

export const SUNO_TOKENS = {
  bg: '#FFFFFF',
  text: '#0F1419',
  accent: '#D42126',
  verified: '#1D9BF0',
  handle: '#536471',
  fontPrimary: 'Inter',
  fontStack: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

export const SLIDE_DIMENSIONS = {
  width: 1080,
  height: 1350,
} as const;

export const DEFAULT_BODY_FONT_SIZE = 39;

export const SUNO_DEFAULT_ESTILO: SlideEstilo = {
  bg_color: SUNO_TOKENS.bg,
  text_color: SUNO_TOKENS.text,
  accent_color: SUNO_TOKENS.accent,
  font_family: SUNO_TOKENS.fontPrimary,
  align: 'left',
  font_size: DEFAULT_BODY_FONT_SIZE,
  imagem_fit: 'cover',
  imagem_scale: 1,
  imagem_offset_x: 50,
  imagem_offset_y: 50,
  imagem_height_pct: 38,
};

export const SUNO_HEADER = {
  nome: 'Suno Investimentos',
  handle: '@suno',
  avatar: '(SUNO)',
};
