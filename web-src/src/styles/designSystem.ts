/* 
* <license header>
*/

/**
 * Design System - Layout Constants and Style Utilities
 * 
 * Centralizes common layout dimensions, calculations, and style patterns
 * to ensure consistency across the application.
 */

// ============================================================
// Spacing Scale (based on 8px grid)
// ============================================================

/**
 * Spacing tokens following an 8px base grid
 * Use these for consistent margins, paddings, and gaps throughout the app
 * 
 * Naming convention:
 * - XXS to XXL for general sizes
 * - Numbers represent pixel values for reference
 */
export const SPACING = {
  /** 0px - No spacing */
  NONE: 0,
  /** 4px - Extra extra small */
  XXS: 4,
  /** 8px - Extra small */
  XS: 8,
  /** 12px - Small */
  SM: 12,
  /** 16px - Medium (default) */
  MD: 16,
  /** 24px - Large */
  LG: 24,
  /** 32px - Extra large */
  XL: 32,
  /** 40px - Extra extra large */
  XXL: 40,
  /** 48px - Triple extra large */
  XXXL: 48,
  /** 64px - Huge */
  HUGE: 64,
  /** 80px - Maximum */
  MAX: 80,
} as const

/**
 * Spectrum-compatible spacing using size tokens
 * These map to React Spectrum's size-* props
 */
export const SPECTRUM_SPACING = {
  'size-0': 0,
  'size-50': 4,
  'size-100': 8,
  'size-150': 12,
  'size-200': 16,
  'size-250': 20,
  'size-300': 24,
  'size-400': 32,
  'size-500': 40,
  'size-600': 48,
  'size-700': 56,
  'size-800': 64,
  'size-1000': 80,
} as const

/**
 * Form-specific spacing tokens
 * Use these for consistent spacing within forms
 */
export const FORM_SPACING = {
  /** Gap between form cards/sections */
  SECTION_GAP: SPACING.LG, // 24px
  /** Gap between fields within a section */
  FIELD_GAP: SPACING.MD, // 16px
  /** Gap between label and input */
  LABEL_GAP: SPACING.XXS, // 4px
  /** Padding inside form cards */
  CARD_PADDING: SPACING.LG, // 24px
  /** Gap between heading and content */
  HEADING_GAP: SPACING.SM, // 12px
  /** Gap between description and fields */
  DESCRIPTION_GAP: SPACING.MD, // 16px
  /** Indent for nested content */
  INDENT: SPACING.LG, // 24px
} as const

// ============================================================
// Layout Dimensions
// ============================================================

export const LAYOUT_DIMENSIONS = {
  /**
   * Global Navigation (TopNav) height
   * Matches the height="size-700" in TopNav component
   */
  GNAV_HEIGHT: 56, // px (size-700 = 56px)
  
  /**
   * Form Wizard Action Bar height
   * Fixed action bar at bottom of form pages
   */
  ACTION_BAR_HEIGHT: 60, // px
  
  /**
   * Side Navigation width
   * Used in FormWizard for step navigation
   */
  SIDE_NAV_WIDTH: 240, // px (size-3000 = 240px)
} as const

// ============================================================
// Common Style Objects
// ============================================================

/**
 * Sticky global navigation
 */
export const STICKY_GNAV_STYLES = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 1000,
}

// ============================================================
// Z-Index Scale
// ============================================================

/**
 * Z-index scale for layering components
 */
export const Z_INDEX = {
  DROPDOWN: 10,
  STICKY_ELEMENT: 50,
  ACTION_BAR: 100,
  MODAL_BACKDROP: 500,
  MODAL: 600,
  GNAV: 1000,
  TOOLTIP: 1100,
  NOTIFICATION: 1200,
} as const

// ============================================================
// Color Palette
// ============================================================

/**
 * Adobe brand colors and semantic colors
 */
export const COLORS = {
  // Grays
  GRAY_100: 'var(--spectrum-global-color-gray-100)',
  GRAY_200: 'var(--spectrum-global-color-gray-200)',
  GRAY_300: 'var(--spectrum-global-color-gray-300)',
  GRAY_400: 'var(--spectrum-global-color-gray-400)',
  GRAY_500: 'var(--spectrum-global-color-gray-500)',
  GRAY_600: 'var(--spectrum-global-color-gray-600)',
  GRAY_700: 'var(--spectrum-global-color-gray-700)',
  GRAY_800: 'var(--spectrum-global-color-gray-800)',
  
  // Blues
  BLUE_400: 'var(--spectrum-global-color-blue-400)',
  
  // Red
  RED_600: 'var(--spectrum-global-color-red-600)',
  
  // Semantic (theme-aware where noted)
  BLACK: '#000000',
  /** Primary heading / high-contrast text — follows Spectrum gray scale in light and dark */
  DARK_GRAY: 'var(--spectrum-global-color-gray-900)',
  WHITE: 'white',
  TRANSPARENT: 'transparent',
  
  // Button States
  BUTTON_HOVER_OVERLAY: 'rgba(0, 0, 0, 0.06)',
  BUTTON_ACTIVE_OVERLAY: 'rgba(0, 0, 0, 0.1)',
  BUTTON_DISABLED_OVERLAY: 'rgba(255, 255, 255, 0.4)',
  BUTTON_DISABLED_TEXT: 'rgba(255, 255, 255, 0.5)',

  STATUS_DRAFT: '#2D9D92',
  STATUS_PUBLISHED: '#CD3ACE',
  STATUS_ARCHIVED: '#666666',
  STATUS_CANCELLED: '#D7373F',
} as const

/**
 * Surfaces and borders for inline `UNSAFE_style` — backed by CSS variables (theme-aware).
 */
export const SURFACES = {
  CANVAS: 'var(--s2-container-bg)',
  /** Event/Series wizard chrome (scroll + side nav) — darker than app base in dark mode for layering */
  EVENT_FORM_SHELL: 'var(--emc-event-form-shell-bg)',
  /** FormCard and other raised panels inside event/series forms */
  FORM_CARD: 'var(--emc-form-card-bg)',
  /** Format selection (cloud/series) modal panel — contrasts with Picker field surfaces */
  FORMAT_DIALOG_PANEL: 'var(--emc-format-dialog-panel-bg)',
  SUBTLE: 'var(--spectrum-global-color-gray-100)',
  SUBTLE_WARM: 'var(--spectrum-global-color-gray-75)',
  /** Matches S2 TextField fill (`--emc-field-bg`, #111 dark / #fff light) */
  INPUT: 'var(--emc-field-bg)',
  BORDER: 'var(--spectrum-global-color-gray-300)',
  BORDER_STRONG: 'var(--spectrum-global-color-gray-400)',
  CHROME: 'var(--spectrum-global-color-gray-400)',
  SELECTED_FILL: 'var(--spectrum-global-color-blue-100)',
  SELECTED_RING: 'var(--spectrum-global-color-blue-500)',
  PILL_BG: 'var(--spectrum-global-color-gray-200)',
} as const

/**
 * Home page background — light/dark from `index.css` (`--emc-home-gradient`)
 */
export const GRADIENT_BACKGROUND = 'var(--emc-home-gradient)'

/**
 * Form wizard footer: flex child at bottom of column layout (not fixed).
 * Pair with a parent flex column + scrollable main so heights need no calc(100vh).
 */
export const FORM_WIZARD_FOOTER_STYLES = {
  position: 'fixed' as const,
  bottom: 0,
  display: 'flex' as const,
  alignItems: 'center' as const,
  flexShrink: 0,
  width: '100%' as const,
  minHeight: `${LAYOUT_DIMENSIONS.ACTION_BAR_HEIGHT}px`,
  backgroundColor: COLORS.BLACK,
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)',
  zIndex: Z_INDEX.ACTION_BAR,
}

// ============================================================
// Typography
// ============================================================

/** App sans stack — must match `:root { --emc-font-sans }` in `web-src/src/index.css` */
export const FONT_FAMILY_SANS = 'var(--emc-font-sans)' as const

/**
 * Typography styles for consistent text styling across the app
 * 
 * NOTE: Margins are set to 0 - use container gap for spacing instead.
 * This keeps elements like headings with tooltips properly aligned.
 */
export const TYPOGRAPHY = {
  /**
   * Step heading - main heading for each wizard step
   * Used in FormWizard for step titles like "Add Content", "Additional Info"
   */
  STEP_HEADING: {
    color: COLORS.GRAY_800,
    fontFamily: FONT_FAMILY_SANS,
    fontSize: '24px',
    lineHeight: '30px',
    fontWeight: 900,
    margin: 0,
  },
  
  /**
   * Component heading - main heading for each component section
   * Used for headings like "Event Information", "Venue Information", etc.
   */
  COMPONENT_HEADING: {
    color: COLORS.DARK_GRAY,
    fontFamily: FONT_FAMILY_SANS,
    fontSize: '28px',
    lineHeight: '35px',
    fontWeight: 700,
    margin: 0,
  },
  
  /**
   * Subsection heading - smaller heading within components
   */
  SUBSECTION_HEADING: {
    color: COLORS.GRAY_800,
    fontFamily: FONT_FAMILY_SANS,
    fontSize: '18px',
    lineHeight: '24px',
    fontWeight: 700,
    margin: 0,
  },
  
  /**
   * Field label style
   */
  FIELD_LABEL: {
    color: COLORS.GRAY_800,
    fontFamily: FONT_FAMILY_SANS,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 600,
    margin: 0,
  },
  
  /**
   * Helper/description text
   */
  HELPER_TEXT: {
    color: COLORS.GRAY_600,
    fontFamily: FONT_FAMILY_SANS,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
    margin: 0,
  },
  
  /**
   * Section description text - follows component headings
   */
  SECTION_DESCRIPTION: {
    color: COLORS.GRAY_700,
    fontFamily: FONT_FAMILY_SANS,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 400,
    margin: 0,
  },
} as const

// ============================================================
// Border Styles
// ============================================================

/**
 * Common border styles
 */
export const BORDERS = {
  DOTTED_GRAY: {
    border: '2px dashed var(--spectrum-global-color-gray-400)',
    borderRadius: '4px',
  },
  THIN_GRAY: {
    border: '1px solid var(--spectrum-global-color-gray-300)',
    borderRadius: '4px',
  },
} as const

// ============================================================
// Loading Animations
// ============================================================

/**
 * Shimmer loading skeleton styles
 * Used for loading states in tables and cards
 * 
 * @example
 * <div style={{ ...createShimmerStyle(120, 16) }} />
 */
export const SHIMMER_BASE = {
  background: 'var(--emc-shimmer-gradient)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: '4px',
} as const

/**
 * Creates a shimmer loading skeleton with specified dimensions
 * @param width - Width in pixels or CSS string
 * @param height - Height in pixels (default 16)
 */
export const createShimmerStyle = (width: number | string, height: number = 16) => ({
  ...SHIMMER_BASE,
  width: typeof width === 'number' ? `${width}px` : width,
  height: `${height}px`,
})

// ============================================================
// Helper Functions
// ============================================================

/**
 * Creates a style object for a fixed height based on viewport
 * @param offset - Pixels to subtract from 100vh
 */
export const createFixedHeightStyle = (offset: number) => ({
  height: `calc(100vh - ${offset}px)`,
  maxHeight: `calc(100vh - ${offset}px)`,
  overflow: 'auto' as const,
})

/**
 * Creates a style object for padding bottom to account for action bar
 */
export const createActionBarPadding = () => ({
  paddingBottom: `${LAYOUT_DIMENSIONS.ACTION_BAR_HEIGHT + 20}px`, // 20px extra spacing
})

// ============================================================
// Button State Styles
// ============================================================

/**
 * Action bar button styles with proper states
 * Note: Includes transition for smooth hover/active effects
 */
export const ACTION_BAR_BUTTON_STYLES = {
  // Back button (outline on red)
  BACK: {
    backgroundColor: COLORS.TRANSPARENT,
    color: COLORS.WHITE,
    borderColor: COLORS.WHITE,
    transition: 'all 0.2s ease',
  },
  
  // Preview buttons (white filled)
  PREVIEW: {
    backgroundColor: COLORS.WHITE,
    color: COLORS.BLACK,
    transition: 'all 0.2s ease',
  },
  
  // Save button (outline on red)
  SAVE: {
    backgroundColor: COLORS.TRANSPARENT,
    color: COLORS.WHITE,
    borderColor: COLORS.WHITE,
    transition: 'all 0.2s ease',
  },
  
  // Next/Publish button (dark filled) — fixed contrast on black footer bar (not theme gray-900)
  PRIMARY: {
    backgroundColor: '#2c2c2c',
    color: COLORS.WHITE,
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
} as const

/**
 * Creates interactive button styles with proper state handling
 */
export const createButtonStyles = (baseStyles: React.CSSProperties) => ({
  base: baseStyles,
  hover: {
    ...baseStyles,
    filter: 'brightness(0.95)',
  },
  active: {
    ...baseStyles,
    filter: 'brightness(0.9)',
  },
  disabled: {
    ...baseStyles,
    opacity: 0.4,
    cursor: 'not-allowed',
  },
})

// ============================================================
// Spacing Utilities
// ============================================================

/**
 * Creates a margin style object
 * @param top - Top margin (use SPACING tokens)
 * @param right - Right margin (defaults to top)
 * @param bottom - Bottom margin (defaults to top)
 * @param left - Left margin (defaults to right)
 */
export const createMargin = (
  top: number,
  right?: number,
  bottom?: number,
  left?: number
) => ({
  marginTop: top,
  marginRight: right ?? top,
  marginBottom: bottom ?? top,
  marginLeft: left ?? right ?? top,
})

/**
 * Creates a padding style object
 * @param top - Top padding (use SPACING tokens)
 * @param right - Right padding (defaults to top)
 * @param bottom - Bottom padding (defaults to top)
 * @param left - Left padding (defaults to right)
 */
export const createPadding = (
  top: number,
  right?: number,
  bottom?: number,
  left?: number
) => ({
  paddingTop: top,
  paddingRight: right ?? top,
  paddingBottom: bottom ?? top,
  paddingLeft: left ?? right ?? top,
})

/**
 * Creates a gap style for flex/grid containers
 * @param rowGap - Gap between rows (use SPACING tokens)
 * @param columnGap - Gap between columns (defaults to rowGap)
 */
export const createGap = (rowGap: number, columnGap?: number) => ({
  rowGap,
  columnGap: columnGap ?? rowGap,
})

/**
 * Common layout patterns using spacing tokens
 * 
 * Use these for consistent component layouts.
 * Gap-based spacing keeps elements like headings+tooltips aligned.
 */
export const LAYOUT_PATTERNS = {
  /**
   * Standard component wrapper
   * Use as the outermost container in form components
   * Gap of 24px between major sections (heading, description, fields)
   */
  COMPONENT_WRAPPER: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: FORM_SPACING.SECTION_GAP, // 24px
  },
  
  /**
   * Standard form section layout
   * Use for grouping related fields within a component
   * Gap of 16px between fields
   */
  FORM_SECTION: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: FORM_SPACING.FIELD_GAP, // 16px
  },
  
  /**
   * Form card with standard padding
   * Use when content needs a padded container
   */
  FORM_CARD: {
    ...createPadding(FORM_SPACING.CARD_PADDING),
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: FORM_SPACING.FIELD_GAP, // 16px
  },
  
  /**
   * Horizontal field group (e.g., first name / last name)
   * Use for side-by-side fields
   */
  FIELD_ROW: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    gap: FORM_SPACING.FIELD_GAP, // 16px
    alignItems: 'flex-start' as const,
  },
  
  /**
   * Vertical field stack
   * Use for stacking fields vertically with standard gap
   */
  FIELD_STACK: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: FORM_SPACING.FIELD_GAP, // 16px
  },
  
  /**
   * Section with heading and content
   * Smaller gap for heading-to-content relationship
   */
  SECTION_WITH_HEADING: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: FORM_SPACING.HEADING_GAP, // 12px
  },
  
  /**
   * Tight stack for closely related elements
   * Use for label+field or icon+text pairs
   */
  TIGHT_STACK: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: SPACING.XS, // 8px
  },
}

/**
 * Spectrum-compatible gap values for Flex component
 * Use with Flex's gap prop: <Flex gap={FLEX_GAP.SECTION}>
 */
export const FLEX_GAP = {
  /** No gap */
  NONE: 'size-0',
  /** 8px - tight spacing */
  TIGHT: 'size-100',
  /** 12px - small gap */
  SMALL: 'size-150',
  /** 16px - standard field gap */
  FIELD: 'size-200',
  /** 24px - section gap */
  SECTION: 'size-300',
  /** 32px - large gap */
  LARGE: 'size-400',
} as const

