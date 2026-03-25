/* 
* <license header>
*/

import 'core-js/stable'
import 'regenerator-runtime/runtime'
import React from 'react'
import { createRoot } from 'react-dom/client'

import Runtime, { init } from '@adobe/exc-app'

import App from './components/App'
import '@react-spectrum/s2/page.css'
import './index.css'
import { Runtime as RuntimeType, IMS } from './types'
import type { AuthMode } from './contexts/AuthContext'

// @ts-ignore - React needs to be available globally for some Adobe packages
window.React = React

/*
 * Bootstrap Logic
 *
 * The app can run in two modes:
 *   1. ExC Shell mode:  Loaded inside the Adobe Experience Cloud Shell iframe.
 *      - exc-runtime.js detects the shell environment and loads the Module Runtime.
 *      - The shell provides IMS token, org, and profile via the 'ready' event.
 *
 *   2. Standalone mode: Loaded directly in a browser (localhost, CDN URL, etc.).
 *      - exc-runtime.js throws because the app is not in an iframe.
 *      - The app initializes Adobe's imslib.min.js (loaded via <script> in index.html)
 *        to perform its own OAuth authentication.
 */
try {
  // Attempt to load the Experience Cloud Runtime (throws if not in the ExC Shell iframe)
  require('./exc-runtime')
  // Success: bootstrap in ExC Shell mode
  init(bootstrapInExcShell)
} catch (e) {
  bootstrapStandalone()
}

// ============================================================================
// Standalone mode: direct IMS authentication via imslib.min.js
// ============================================================================

function bootstrapStandalone(): void {
  const mockRuntime: RuntimeType = {
    on: () => {},
    done: () => {}
  }

  // Render the app immediately in an unauthenticated / loading state.
  // AuthProvider (mounted inside App) will initialize the IMS library
  // and update auth state once the token arrives.
  const initialIms: IMS = {}

  renderApp(mockRuntime, initialIms, 'standalone')
}

// ============================================================================
// ExC Shell mode: IMS data comes from the Unified Shell runtime
// ============================================================================

function bootstrapInExcShell(): void {
  const runtime = Runtime() as unknown as RuntimeType

  // ready event brings in authentication/user info from the shell
  runtime.on('ready', ({ imsOrg, imsToken, imsProfile }) => {
    runtime.done()

    const ims: IMS = {
      profile: imsProfile,
      org: imsOrg,
      token: imsToken
    }

    renderApp(runtime, ims, 'shell')
  })

  // Set solution info for the shell app-bar
  runtime.solution = {
    icon: 'AdobeExperienceCloud',
    title: 'EMC',
    shortTitle: 'JGR'
  }
  runtime.title = 'EMC'
}

// ============================================================================
// Common render function
// ============================================================================

function renderApp(runtime: RuntimeType, initialIms: IMS, authMode: AuthMode): void {
  const root = createRoot(document.getElementById('root')!)
  root.render(<App runtime={runtime} ims={initialIms} authMode={authMode} />)
}
