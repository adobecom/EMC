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
// Calculated Heights
// ============================================================

/**
 * Safe area height for form layouts
 * Accounts for global nav (56px) + form action bar (60px) + padding (5px)
 */
export const SAFE_AREA_HEIGHT = LAYOUT_DIMENSIONS.GNAV_HEIGHT + LAYOUT_DIMENSIONS.ACTION_BAR_HEIGHT + 5 // 121px

/**
 * Content area height for pages with both gnav and action bar
 */
export const FORM_CONTENT_HEIGHT = `calc(100vh - ${SAFE_AREA_HEIGHT}px)`

/**
 * Full viewport height minus just the gnav
 */
export const CONTENT_HEIGHT_NO_ACTION_BAR = `calc(100vh - ${LAYOUT_DIMENSIONS.GNAV_HEIGHT}px)`

// ============================================================
// Common Style Objects
// ============================================================

/**
 * Sticky positioning for side navigation
 */
export const SIDE_NAV_STICKY_STYLES = {
  alignSelf: 'flex-start' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  overflow: 'auto' as const,
  minHeight: FORM_CONTENT_HEIGHT,
  maxHeight: FORM_CONTENT_HEIGHT,
}

/**
 * Scrollable content area with safe height
 */
export const SCROLLABLE_CONTENT_STYLES = {
  minHeight: FORM_CONTENT_HEIGHT,
  maxHeight: FORM_CONTENT_HEIGHT,
  overflow: 'auto' as const,
}

/**
 * Sticky global navigation
 */
export const STICKY_GNAV_STYLES = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 1000,
}

/**
 * Fixed action bar at bottom
 */
export const FIXED_ACTION_BAR_STYLES = {
  position: 'fixed' as const,
  bottom: 0,
  left: 0,
  right: 0,
  height: `${LAYOUT_DIMENSIONS.ACTION_BAR_HEIGHT}px`,
  zIndex: 100,
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)',
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
  ADOBE_RED: '#EB1000',
  
  // Grays
  GRAY_100: 'var(--spectrum-global-color-gray-100)',
  GRAY_200: 'var(--spectrum-global-color-gray-200)',
  GRAY_300: 'var(--spectrum-global-color-gray-300)',
  GRAY_400: 'var(--spectrum-global-color-gray-400)',
  GRAY_600: 'var(--spectrum-global-color-gray-600)',
  GRAY_700: 'var(--spectrum-global-color-gray-700)',
  GRAY_800: 'var(--spectrum-global-color-gray-800)',
  
  // Blues
  BLUE_400: 'var(--spectrum-global-color-blue-400)',
  
  // Red
  RED_600: 'var(--spectrum-global-color-red-600)',
  
  // Semantic
  BLACK: '#000000',
  DARK_GRAY: '#2C2C2C',
  WHITE: 'white',
  TRANSPARENT: 'transparent',
  
  // Button States
  BUTTON_HOVER_OVERLAY: 'rgba(0, 0, 0, 0.06)',
  BUTTON_ACTIVE_OVERLAY: 'rgba(0, 0, 0, 0.1)',
  BUTTON_DISABLED_OVERLAY: 'rgba(255, 255, 255, 0.4)',
  BUTTON_DISABLED_TEXT: 'rgba(255, 255, 255, 0.5)',
} as const

// ============================================================
// Typography
// ============================================================

/**
 * Typography styles for consistent text styling across the app
 */
export const TYPOGRAPHY = {
  /**
   * Step heading - main heading for each wizard step
   * Used in FormWizard for step titles like "Add Content", "Additional Info"
   */
  STEP_HEADING: {
    color: COLORS.ADOBE_RED,
    fontSize: '24px',
    lineHeight: '30px',
    fontWeight: 900,
  },
  
  /**
   * Component heading - main heading for each component section
   * Used for headings like "Event Information", "Venue Information", etc.
   */
  COMPONENT_HEADING: {
    color: COLORS.BLACK,
    fontSize: '28px',
    lineHeight: '35px',
    fontWeight: 700,
  },
  
  /**
   * Subsection heading - smaller heading within components
   */
  SUBSECTION_HEADING: {
    color: COLORS.GRAY_800,
    fontSize: '18px',
    lineHeight: '24px',
    fontWeight: 700,
  },
  
  /**
   * Field label style
   */
  FIELD_LABEL: {
    color: COLORS.GRAY_800,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 600,
  },
  
  /**
   * Helper/description text
   */
  HELPER_TEXT: {
    color: COLORS.GRAY_600,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
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
  
  // Next/Publish button (dark filled)
  PRIMARY: {
    backgroundColor: COLORS.DARK_GRAY,
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

