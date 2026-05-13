// V3 — Tipografi tokenları. Tüm ekranlarda ad-hoc fontSize/fontWeight tanımları
// yerine bu objeyi kullan. Sayısal değerler (skor, oran, %) için "num*" tokenları
// tabular-nums içerir — hizalama bozulmasın.
//
// Kullanım:
//   import { typography } from '../theme/typography';
//   <Text style={[typography.h2, { color: colors.text }]}>Bugün</Text>
//
// Notlar:
// - lineHeight, Dynamic Type ile uyum için font scale'a duyarlı; component'lar
//   `allowFontScaling` default true bırakmalı.
// - `letterSpacing` minus (negatif) iOS'ta SF font'unda büyük başlıkların
//   sıkışmasını verir — Apple HIG.

import type { TextStyle } from 'react-native';

type Token = TextStyle;

export const typography = {
  // ===== Heading scale =====
  h1: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 34,
  } as Token,
  h2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 28,
  } as Token,
  h3: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
  } as Token,

  // ===== Body =====
  body: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  } as Token,
  bodyDim: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as Token,
  bodySmall: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  } as Token,

  // ===== Numeric (skor / oran / %) =====
  numLarge: {
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 42,
  } as Token,
  numMed: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 26,
  } as Token,
  numSmall: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  } as Token,

  // ===== Microcopy / labels =====
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 14,
  } as Token,
  labelSmall: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 13,
  } as Token,
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  } as Token,
} as const;

// Sabit tab bar yüksekliği (blur + safe area dahil) — Faz 1 tab bar değişimi
// ile birlikte ekran içerikleri buna göre paddingBottom alır.
export const TAB_BAR_HEIGHT = 84;
