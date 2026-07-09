/**
 * SEBON RTA/RTS Enterprise Design System
 * 
 * Spacing: 8px base grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64)
 * Typography: Inter system font stack
 * Border Radius: 4px (sm), 6px (md), 8px (lg), 12px (xl)
 * Elevation: 4 levels (0, 1, 2, 3)
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 56,
  "7xl": 64,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 24,
  "4xl": 30,
} as const;

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const statusColors = {
  draft: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  pending: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  approved: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  rejected: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  cancelled: { bg: "bg-gray-50 dark:bg-gray-900", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
  failed: { bg: "bg-rose-50 dark:bg-rose-950", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
  active: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  inactive: { bg: "bg-gray-50 dark:bg-gray-900", text: "text-gray-500 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
  info: { bg: "bg-sky-50 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-800" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  success: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  danger: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
} as const;

export const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive shadow-sm",
  success: "bg-success text-success-foreground hover:bg-success/90 border-success shadow-sm",
  outline: "bg-transparent text-foreground hover:bg-muted border-border",
  ghost: "bg-transparent text-foreground hover:bg-muted border-transparent",
} as const;

export const buttonSizes = {
  sm: "h-7 px-2 text-xs gap-1",
  md: "h-9 px-3 text-sm gap-2",
  lg: "h-11 px-4 text-base gap-2",
} as const;

export const inputSizes = {
  sm: "h-7 px-2 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-base",
} as const;

export const cardVariants = {
  standard: "border bg-card text-card-foreground shadow-sm",
  dashboard: "border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow",
  summary: "border bg-background text-foreground",
  statistics: "border-0 bg-gradient-to-br from-primary/5 to-primary/10 text-foreground",
} as const;

export const elevation = {
  0: "shadow-none",
  1: "shadow-sm",
  2: "shadow-md",
  3: "shadow-lg",
} as const;

export const gridModes = {
  dense: { rowHeight: 32, fontSize: 11, padding: "px-2 py-1" },
  compact: { rowHeight: 40, fontSize: 12, padding: "px-3 py-2" },
  comfortable: { rowHeight: 48, fontSize: 13, padding: "px-4 py-3" },
} as const;

export const breakpoints = {
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  ultrawide: 1536,
  "4k": 1920,
} as const;

export const containerWidths = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
  full: "100%",
} as const;

export const animation = {
  fast: 150,
  normal: 200,
  slow: 300,
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const motionGuidelines = {
  pageTransition: { duration: 0.2, ease: "easeInOut" },
  modalEnter: { duration: 0.15, ease: "easeOut" },
  modalExit: { duration: 0.1, ease: "easeIn" },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
  tap: { scale: 0.98 },
  fadeIn: { opacity: 0, animate: { opacity: 1 }, duration: 0.2 },
  slideUp: { y: 10, animate: { y: 0 }, duration: 0.2 },
} as const;