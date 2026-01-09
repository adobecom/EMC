/* 
* <license header>
*/

/**
 * Components - Reusable, stateless UI components
 * 
 * Note: Page-level components (dashboards, forms, etc.) have been
 * moved to src/pages/ for better separation of concerns.
 */

// App root
export { default as App } from './App'

// Layout components
export * from './layout'

// User components (reusable UI components, not pages)
export { UserPanel } from './user'

// Dev components
export * from './dev'

// Shared components (reusable across pages)
export * from './shared'
