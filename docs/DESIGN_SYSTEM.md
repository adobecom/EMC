# Design System

**Version:** 1.0.0  
**Location:** `/web-src/src/styles/designSystem.ts`  
**Purpose:** Centralized design tokens, layout constants, and style utilities for consistent UI/UX

---

## Overview

The EMC Design System provides a single source of truth for layout dimensions, colors, z-indices, borders, and reusable style patterns. This ensures consistency across the application and makes it easier to maintain and update the UI.

### Key Benefits

- **Consistency**: All components use the same spacing, colors, and styles
- **Maintainability**: Change values in one place to update across the app
- **Type Safety**: TypeScript constants prevent typos and invalid values
- **Documentation**: Self-documenting code with clear naming conventions

---

## Layout Dimensions

### Core Dimensions

```typescript
import { LAYOUT_DIMENSIONS } from '../styles/designSystem'

LAYOUT_DIMENSIONS.GNAV_HEIGHT        // 56px  - Global navigation height
LAYOUT_DIMENSIONS.ACTION_BAR_HEIGHT  // 60px  - Form wizard action bar height
LAYOUT_DIMENSIONS.SIDE_NAV_WIDTH     // 240px - Side navigation panel width
```

### Calculated Heights

```typescript
import { 
  SAFE_AREA_HEIGHT,
  FORM_CONTENT_HEIGHT,
  CONTENT_HEIGHT_NO_ACTION_BAR 
} from '../styles/designSystem'

SAFE_AREA_HEIGHT              // 121px - gnav + action bar + padding
FORM_CONTENT_HEIGHT           // calc(100vh - 121px)
CONTENT_HEIGHT_NO_ACTION_BAR  // calc(100vh - 56px)
```

### Usage Example

```tsx
import { LAYOUT_DIMENSIONS } from '../../styles/designSystem'

<View
  height={LAYOUT_DIMENSIONS.GNAV_HEIGHT}
  width={LAYOUT_DIMENSIONS.SIDE_NAV_WIDTH}
>
  {/* content */}
</View>
```

---

## Color Palette

### Adobe Brand Colors

```typescript
import { COLORS } from '../styles/designSystem'

COLORS.ADOBE_RED   // '#EB1000' - Primary brand color
```

### Grays (Spectrum Variables)

```typescript
COLORS.GRAY_100  // var(--spectrum-global-color-gray-100) - Lightest
COLORS.GRAY_200  // var(--spectrum-global-color-gray-200)
COLORS.GRAY_300  // var(--spectrum-global-color-gray-300)
COLORS.GRAY_400  // var(--spectrum-global-color-gray-400)
COLORS.GRAY_600  // var(--spectrum-global-color-gray-600)
COLORS.GRAY_700  // var(--spectrum-global-color-gray-700)
COLORS.GRAY_800  // var(--spectrum-global-color-gray-800) - Darkest
```

### Blues

```typescript
COLORS.BLUE_400  // var(--spectrum-global-color-blue-400) - Info/link color
```

### Semantic Colors

```typescript
COLORS.BLACK       // '#000000'
COLORS.DARK_GRAY   // '#2C2C2C' - Used for dark buttons
COLORS.WHITE       // 'white'
COLORS.TRANSPARENT // 'transparent'
```

### Button State Colors

```typescript
COLORS.BUTTON_HOVER_OVERLAY    // 'rgba(0, 0, 0, 0.06)'
COLORS.BUTTON_ACTIVE_OVERLAY   // 'rgba(0, 0, 0, 0.1)'
COLORS.BUTTON_DISABLED_OVERLAY // 'rgba(255, 255, 255, 0.4)'
COLORS.BUTTON_DISABLED_TEXT    // 'rgba(255, 255, 255, 0.5)'
```

### Usage Example

```tsx
import { COLORS } from '../../styles/designSystem'

<View
  backgroundColor={COLORS.GRAY_100}
  UNSAFE_style={{ borderColor: COLORS.ADOBE_RED }}
>
  <Text UNSAFE_style={{ color: COLORS.GRAY_800 }}>
    Hello World
  </Text>
</View>
```

---

## Z-Index Scale

Layering hierarchy for overlapping components:

```typescript
import { Z_INDEX } from '../styles/designSystem'

Z_INDEX.DROPDOWN         // 10   - Dropdown menus
Z_INDEX.STICKY_ELEMENT   // 50   - Sticky headers/elements
Z_INDEX.ACTION_BAR       // 100  - Form action bar
Z_INDEX.MODAL_BACKDROP   // 500  - Modal overlay
Z_INDEX.MODAL            // 600  - Modal dialogs
Z_INDEX.GNAV             // 1000 - Global navigation
Z_INDEX.TOOLTIP          // 1100 - Tooltips
Z_INDEX.NOTIFICATION     // 1200 - Toast notifications
```

### Usage Example

```tsx
import { Z_INDEX } from '../../styles/designSystem'

<View UNSAFE_style={{ zIndex: Z_INDEX.MODAL }}>
  <Dialog>{/* modal content */}</Dialog>
</View>
```

---

## Common Style Objects

Pre-configured style objects for common layout patterns.

### Sticky Global Navigation

```typescript
import { STICKY_GNAV_STYLES } from '../styles/designSystem'

<View UNSAFE_style={STICKY_GNAV_STYLES}>
  <TopNav />
</View>
```

Result:
```typescript
{
  position: 'sticky',
  top: 0,
  zIndex: 1000
}
```

### Fixed Action Bar

```typescript
import { FIXED_ACTION_BAR_STYLES } from '../styles/designSystem'

<View UNSAFE_style={FIXED_ACTION_BAR_STYLES}>
  <ActionButtons />
</View>
```

Result:
```typescript
{
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '60px',
  zIndex: 100,
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)'
}
```

### Side Navigation Sticky Styles

```typescript
import { SIDE_NAV_STICKY_STYLES } from '../styles/designSystem'

<View UNSAFE_style={SIDE_NAV_STICKY_STYLES}>
  <NavigationItems />
</View>
```

Result:
```typescript
{
  alignSelf: 'flex-start',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  minHeight: 'calc(100vh - 121px)',
  maxHeight: 'calc(100vh - 121px)'
}
```

### Scrollable Content Area

```typescript
import { SCROLLABLE_CONTENT_STYLES } from '../styles/designSystem'

<View UNSAFE_style={SCROLLABLE_CONTENT_STYLES}>
  <FormContent />
</View>
```

Result:
```typescript
{
  minHeight: 'calc(100vh - 121px)',
  maxHeight: 'calc(100vh - 121px)',
  overflow: 'auto'
}
```

---

## Border Styles

### Dotted Gray Border

Used for drag-and-drop zones, placeholders.

```typescript
import { BORDERS } from '../styles/designSystem'

<View UNSAFE_style={BORDERS.DOTTED_GRAY}>
  <DropZone />
</View>
```

Result:
```typescript
{
  border: '2px dashed var(--spectrum-global-color-gray-400)',
  borderRadius: '4px'
}
```

### Thin Gray Border

Used for card outlines, separators.

```typescript
<View UNSAFE_style={BORDERS.THIN_GRAY}>
  <Card />
</View>
```

Result:
```typescript
{
  border: '1px solid var(--spectrum-global-color-gray-300)',
  borderRadius: '4px'
}
```

---

## Helper Functions

### createFixedHeightStyle

Creates a style object for a fixed height based on viewport.

```typescript
import { createFixedHeightStyle } from '../styles/designSystem'

const style = createFixedHeightStyle(100) // Subtract 100px from viewport
```

Result:
```typescript
{
  height: 'calc(100vh - 100px)',
  maxHeight: 'calc(100vh - 100px)',
  overflow: 'auto'
}
```

### createActionBarPadding

Creates padding bottom to account for the fixed action bar.

```typescript
import { createActionBarPadding } from '../styles/designSystem'

const style = createActionBarPadding()
```

Result:
```typescript
{
  paddingBottom: '80px' // 60px action bar + 20px spacing
}
```

---

## Button Styles (Legacy)

> **Note:** These are currently defined but **not used** in the codebase. The application relies on Spectrum's default button behaviors for proper hover/active/focus states. These are kept for reference.

### Action Bar Button Styles

```typescript
import { ACTION_BAR_BUTTON_STYLES } from '../styles/designSystem'

ACTION_BAR_BUTTON_STYLES.BACK     // Back button (outline on red)
ACTION_BAR_BUTTON_STYLES.PREVIEW  // Preview buttons (white filled)
ACTION_BAR_BUTTON_STYLES.SAVE     // Save button (outline on red)
ACTION_BAR_BUTTON_STYLES.PRIMARY  // Next/Publish button (dark filled)
```

### createButtonStyles

Creates button styles with state handling.

```typescript
import { createButtonStyles } from '../styles/designSystem'

const buttonStyles = createButtonStyles({
  backgroundColor: '#2C2C2C',
  color: 'white'
})

// Returns: { base, hover, active, disabled }
```

---

## Best Practices

### 1. Always Import from Design System

❌ **Don't:**
```tsx
<View UNSAFE_style={{ zIndex: 1000, position: 'sticky', top: 0 }}>
```

✅ **Do:**
```tsx
import { STICKY_GNAV_STYLES } from '../../styles/designSystem'

<View UNSAFE_style={STICKY_GNAV_STYLES}>
```

### 2. Use Spectrum Colors via Design System

❌ **Don't:**
```tsx
<Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-800)' }}>
```

✅ **Do:**
```tsx
import { COLORS } from '../../styles/designSystem'

<Text UNSAFE_style={{ color: COLORS.GRAY_800 }}>
```

### 3. Combine Styles Correctly

When combining design system styles with custom styles:

```tsx
import { BORDERS, COLORS } from '../../styles/designSystem'

<View
  UNSAFE_style={{
    ...BORDERS.DOTTED_GRAY,
    backgroundColor: COLORS.GRAY_100,
    padding: '20px' // Custom addition
  }}
>
```

### 4. Prefer Spectrum Props Over UNSAFE_style

When possible, use Spectrum's built-in props:

❌ **Don't:**
```tsx
<View UNSAFE_style={{ backgroundColor: COLORS.GRAY_100 }}>
```

✅ **Do:**
```tsx
<View backgroundColor="gray-100">
```

Use `UNSAFE_style` only when:
- Spectrum doesn't provide the prop you need
- You need to combine multiple design system constants
- You need precise CSS control (z-index, position, etc.)

### 5. Button States

❌ **Don't:** Override button styles with `UNSAFE_style` for hover/active states

✅ **Do:** Use Spectrum's default button behaviors:
```tsx
<Button variant="cta">Next</Button>
<Button variant="secondary" style="outline" staticColor="white">Back</Button>
```

---

## Adding New Design Tokens

When adding new design tokens to the design system:

1. **Choose the right category**: Layout, Color, Z-Index, Border, etc.
2. **Use consistent naming**: ALL_CAPS_WITH_UNDERSCORES
3. **Add JSDoc comments**: Explain what it's for and where it's used
4. **Use `as const`**: For type safety
5. **Update this documentation**: Add examples and usage

### Example

```typescript
// In designSystem.ts
export const LAYOUT_DIMENSIONS = {
  // ... existing dimensions
  
  /**
   * Modal max width for consistent dialog sizing
   * Used in all modal dialogs across the app
   */
  MODAL_MAX_WIDTH: 600, // px
} as const
```

Then update this doc with usage examples.

---

## Migration Guide

If you have existing hardcoded values, migrate them to the design system:

### Step 1: Identify the Value

```tsx
// Old code
<View UNSAFE_style={{ height: '56px' }}>
```

### Step 2: Find or Add to Design System

```typescript
// In designSystem.ts - already exists!
LAYOUT_DIMENSIONS.GNAV_HEIGHT: 56
```

### Step 3: Update Component

```tsx
// New code
import { LAYOUT_DIMENSIONS } from '../../styles/designSystem'

<View height={LAYOUT_DIMENSIONS.GNAV_HEIGHT}>
```

---

## Related Documentation

- [Frontend Architecture](./FRONTEND.md)
- [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)
- [Event Form Documentation](./EVENT_FORM.md)

---

## Version History

- **1.0.0** (2025-11-25): Initial design system documentation
  - Layout dimensions
  - Color palette
  - Z-index scale
  - Common style objects
  - Border styles
  - Helper functions

