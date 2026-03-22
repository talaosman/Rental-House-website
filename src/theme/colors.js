/**
 * colors.js — Design tokens for RentHouse Mobile
 *
 * Extracted directly from web CSS files (RentHouse-FrontEnd/src/*.css).
 * The mobile app uses a LIGHT THEME matching the web frontend exactly.
 *
 * Primary palette: Navy (#1e3a5f) + White (#ffffff) + Light gray (#f8f9fa)
 * Font reference: Inter (sans-serif) + Playfair Display (headings)
 *
 * Usage:
 *   import { colors } from '../theme/colors';
 *   import { brand, text, background } from '../theme/colors';
 */

// ---------------------------------------------------------------------------
// BRAND / PRIMARY NAVY
// Hero sections, primary buttons, nav gradients.
// Sources: HomePage.css, Schedule.css, FeedbackForm.css
// ---------------------------------------------------------------------------
export const brand = {
  navyDark:  '#1e3a5f',  // Primary — buttons, headings, search btn
  navyMid:   '#2d5a8c',  // Secondary — hover, gradient end
  blue:      '#007bff',  // Accent blue — AboutContact buttons/links
  blueHover: '#0056b3',  // Blue hover state
  white:     '#ffffff',
  black:     '#000000',
};

// ---------------------------------------------------------------------------
// BACKGROUND
// Page, card and gradient surface colors.
// ---------------------------------------------------------------------------
export const background = {
  page:        '#f8f9fa',  // Main page background (Schedule, Feedback, PropertyDetails)
  pageFade:    '#f8fafc',  // Lighter page variant (HomePage features)
  pageFade2:   '#f4f7fb',  // UserProfile page background
  pageFade3:   '#f4f7f9',  // About/Contact page background
  card:        '#ffffff',  // Cards, modals, forms
  chip:        '#f1f5f9',  // Feature chips, badges
  chipHover:   '#e0e7ff',  // Chip hover
  userInfo:    '#f8fafc',  // User info display rows
  lightBlue:   '#e0f2fe',  // Gradient end, info item hover
  inputFocus:  'rgba(30,58,95,0.1)',  // Input focus ring
  overlay:     'rgba(0,0,0,0.5)',     // Modal overlay
  heroOverlay: 'rgba(0,0,0,0.45)',    // Hero image overlay
  hoverCard:   'rgba(30,58,95,0.82)', // Property card hover overlay
};

// ---------------------------------------------------------------------------
// TEXT HIERARCHY
// ---------------------------------------------------------------------------
export const text = {
  primary:    '#1e293b',  // Main headings, form labels
  dark:       '#2c3e50',  // Property location, strong headings
  medium:     '#374151',  // Form labels, password icon
  slate:      '#475569',  // User info text, feature item text
  muted:      '#64748b',  // Subtitles, descriptions, loading text
  gray:       '#6b7280',  // Username, secondary label
  light:      '#94a3b8',  // Placeholder, hint, character count
  hint:       '#94a3b8',  // TextInput placeholderTextColor
  subMuted:   '#6c757d',  // PropertyDetails availability msg
  white:      '#ffffff',
  heroSub:    '#f0f4f8',  // Hero subtitle on navy background
  heroSubAlt: '#e0f2fe',  // Schedule hero subtitle
  // OAuth / social
  github:      '#24292f',
  githubDark:  '#1b1f23',
  googleLabel: '#3c4043',
};

// ---------------------------------------------------------------------------
// BORDER
// Dividers, input outlines, card borders.
// ---------------------------------------------------------------------------
export const border = {
  DEFAULT:  '#e2e8f0',  // Primary — inputs, cards, dividers
  light:    '#e9ecef',  // Property header divider
  medium:   '#d1d5db',  // UserProfile input border
  dashed:   '#dddddd',  // Subtle, About/Contact form
  focus:    '#1e3a5f',  // Focused input border (navy)
  focusAlt: '#2563eb',  // Blue-focused input (UserProfile)
};

// ---------------------------------------------------------------------------
// SUCCESS — Greens (booking, availability, geocode found)
// ---------------------------------------------------------------------------
export const success = {
  DEFAULT:  '#10b981',  // Icon color, checkmark, badge
  dark:     '#059669',  // Hover / gradient end
  muted:    '#155724',  // Available status text
  bg:       '#ecfdf5',  // Success status banner bg
  bgLegacy: '#d4edda',  // PropertyDetails available chip bg
  border:   '#a7f3d0',  // Success banner border
  shadow:   'rgba(16,185,129,0.3)',
};

// ---------------------------------------------------------------------------
// ERROR — Reds (validation, delete, emergency)
// ---------------------------------------------------------------------------
export const error = {
  DEFAULT:  '#dc2626',  // Standard error, emergency btn
  dark:     '#b91c1c',  // Hover / darker red
  legacy:   '#e74c3c',  // PropertyDetails favorite icon, legacy
  vivid:    '#ef4444',  // Tailwind red-500, validation highlights
  bg:       '#fef2f2',  // Error status banner bg
  bgLegacy: '#fee2e2',  // Emergency card bg
  border:   '#fecaca',  // Error banner border
  text:     '#721c24',  // Error text on light bg
  shadow:   'rgba(220,38,38,0.3)',
};

// ---------------------------------------------------------------------------
// WARNING — Ambers (ratings, caution)
// ---------------------------------------------------------------------------
export const warning = {
  DEFAULT:  '#f59e0b',
  dark:     '#d97706',
  bg:       '#fffbeb',
  border:   '#fef3c7',
  shadow:   'rgba(245,158,11,0.3)',
};

// ---------------------------------------------------------------------------
// OVERLAY / GRADIENTS
// ---------------------------------------------------------------------------
export const overlay = {
  heroImage: 'rgba(0,0,0,0.45)',
  heroLight: 'rgba(0,0,0,0.2)',
  cardHover: 'rgba(30,58,95,0.82)',
  modalBg:   'rgba(0,0,0,0.5)',
  navy10:    'rgba(30,58,95,0.1)',
  navy30:    'rgba(30,58,95,0.3)',
};

// ---------------------------------------------------------------------------
// SHADOW — box-shadow equivalents for iOS shadowColor / Android elevation
// ---------------------------------------------------------------------------
export const shadow = {
  card:   'rgba(0,0,0,0.08)',
  cardMd: 'rgba(0,0,0,0.1)',
  navy:   'rgba(30,58,95,0.3)',
  navySm: 'rgba(30,58,95,0.15)',
  navyLg: 'rgba(30,58,95,0.4)',
  green:  'rgba(16,185,129,0.3)',
  red:    'rgba(220,38,38,0.3)',
};

// ---------------------------------------------------------------------------
// STATUS CHIPS — property availability badges
// ---------------------------------------------------------------------------
export const status = {
  availableBg:   '#d4edda',
  availableText: '#155724',
  rentedBg:      '#f8d7da',
  rentedText:    '#721c24',
};

// ---------------------------------------------------------------------------
// SEMANTIC aliases — flat shortcuts + all namespaces in one object.
// ---------------------------------------------------------------------------
export const colors = {
  // Flat shortcuts
  white:          '#ffffff',
  black:          '#000000',
  pageBackground: '#f8f9fa',
  navyPrimary:    '#1e3a5f',
  navySecondary:  '#2d5a8c',
  blue:           '#007bff',
  blueHover:      '#0056b3',

  // Namespaces
  brand,
  background,
  text,
  border,
  success,
  error,
  warning,
  overlay,
  shadow,
  status,
};

export default colors;
