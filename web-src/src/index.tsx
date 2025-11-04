/* 
* <license header>
*/

import 'core-js/stable'
import 'regenerator-runtime/runtime'
import React from 'react'
import ReactDOM from 'react-dom'

import Runtime, { init } from '@adobe/exc-app'

import App from './components/App'
import './index.css'
import { Runtime as RuntimeType, IMS } from './types'

// @ts-ignore - React needs to be available globally for some Adobe packages
window.React = React

/* Here you can bootstrap your application and configure the integration with the Adobe Experience Cloud Shell */
try {
  // attempt to load the Experience Cloud Runtime
  require('./exc-runtime')
  // if there are no errors, bootstrap the app in the Experience Cloud Shell
  init(bootstrapInExcShell)
} catch (e) {
  console.log('application not running in Adobe Experience Cloud Shell')
  // fallback mode, run the application without the Experience Cloud Runtime
  bootstrapRaw()
}

function bootstrapRaw(): void {
  /* **here you can mock the exc runtime and ims objects** */
  const mockRuntime: RuntimeType = { 
    on: () => {},
    done: () => {}
  }
  
  // Check for dev tokens in localStorage (see docs/LOCAL_DEV_WITH_IMS.md)
  const devToken = localStorage.getItem('dev_ims_token')
  const devOrg = localStorage.getItem('dev_ims_org')
  
  const mockIms: IMS = {
    profile: devToken ? {
      userId: 'dev-user@AdobeID',
      name: 'Dev User',
      email: 'dev.user@example.com',
      first_name: 'Dev',
      last_name: 'User'
    } : undefined,
    org: devOrg || undefined,
    token: devToken || undefined
  }

  console.log('🔧 Dev Mode - IMS Token Available:', !!devToken)
  if (!devToken) {
    console.log('💡 To use real IMS authentication in local dev:')
    console.log('   1. Get token from ExC Shell: https://experience.adobe.com')
    console.log('   2. In console: localStorage.setItem("dev_ims_token", "YOUR_TOKEN")')
    console.log('   3. In console: localStorage.setItem("dev_ims_org", "YOUR_ORG@AdobeOrg")')
    console.log('   4. Reload page')
    console.log('   See docs/LOCAL_DEV_WITH_IMS.md for details')
  }

  // render the actual react application and pass along the runtime object to make it available to the App
  ReactDOM.render(
    <App runtime={mockRuntime} ims={mockIms} />,
    document.getElementById('root')
  )
}

function bootstrapInExcShell(): void {
  // get the Experience Cloud Runtime object
  const runtime = Runtime() as unknown as RuntimeType

  // use this to set a favicon
  // runtime.favicon = 'url-to-favicon'

  // use this to respond to clicks on the app-bar title
  // runtime.heroClick = () => window.alert('Did I ever tell you you\'re my hero?')

  // ready event brings in authentication/user info
  runtime.on('ready', ({ imsOrg, imsToken, imsProfile }) => {
    // tell the exc-runtime object we are done
    runtime.done()
    console.log('Ready! received imsProfile:', imsProfile)
    const ims: IMS = {
      profile: imsProfile,
      org: imsOrg,
      token: imsToken
    }
    // render the actual react application and pass along the runtime and ims objects to make it available to the App
    ReactDOM.render(
      <App runtime={runtime} ims={ims} />,
      document.getElementById('root')
    )
  })

  // set solution info, shortTitle is used when window is too small to display full title
  runtime.solution = {
    icon: 'AdobeExperienceCloud',
    title: 'EMC',
    shortTitle: 'JGR'
  }
  runtime.title = 'EMC'
}

