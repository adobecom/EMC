/* 
* <license header>
*/

import React from 'react'
import { Provider, defaultTheme, Grid, View } from '@adobe/react-spectrum'
// @ts-ignore — Fonts component exists but isn't in the package exports for v0.12.0
import { Fonts } from '@react-spectrum/s2/dist/Fonts.mjs'
import { Provider as S2Provider } from '@react-spectrum/s2'
import { ErrorBoundary } from 'react-error-boundary'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { TopNav } from './layout'
import { ToastContainer } from './shared'
import { AuthGate } from './AuthGate'
import { ToastProvider, ApiProvider, AuthProvider, GroupProvider } from '../contexts'
import { RBACProvider } from '../contexts/RBACContext'
import { RBACGate } from './RBACGate'
import { useAuth } from '../contexts/AuthContext'
import { Runtime, IMS } from '../types'
import type { AuthMode } from '../contexts/AuthContext'

// Pages - route-level components
import {
  Home,
  About,
  UserProfile,
  CloudManagementConsole,
  SeriesDashboard,
  EventsDashboard,
  SeriesForm,
  EventForm,
  Registrations,
  SpeakersDashboard,
  OverviewDashboard,
  UserManagement,
  ScopeGroupManagement,
  RoleManagement,
} from '../pages'

interface AppProps {
  runtime: Runtime
  ims: IMS
  authMode: AuthMode
}

// Inner component that consumes AuthContext so it can react to auth state changes
const AppContent: React.FC<{ runtime: Runtime }> = ({ runtime }) => {
  const { ims, updateFromShell } = useAuth()

  // Sync configuration changes from ExC Shell (e.g. org switch)
  React.useEffect(() => {
    runtime.on('configuration', ({ imsOrg, imsToken }) => {
      if (imsToken && imsOrg) {
        updateFromShell({ ...ims, token: imsToken, org: imsOrg })
      }
    })

    runtime.on('history', () => {})
  }, [runtime, updateFromShell])

  // error handler on UI rendering failure
  const onError = (_e: unknown, _info: React.ErrorInfo) => {
    // Handle error
  }

  // component to show if UI fails rendering
  const fallbackComponent = ({ error }: { error: unknown }) => {
    const message = error instanceof Error ? error.message : String(error)
    return (
      <React.Fragment>
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
          Something went wrong :(
        </h1>
        <pre>{message}</pre>
      </React.Fragment>
    )
  }

  return (
    <ErrorBoundary onError={onError} FallbackComponent={fallbackComponent}>
      <Router>
        <Provider theme={defaultTheme} colorScheme={'light'} scale={'medium'}>
          <S2Provider colorScheme="light">
          <Fonts />
          <ApiProvider ims={ims}>
            <RBACProvider>
              <GroupProvider>
                <ToastProvider>
                  <Grid
                    areas={['header', 'content']}
                    columns={['1fr']}
                    rows={['auto', '1fr']}
                    gap='size-0'
                  >
                    <View gridArea='header' UNSAFE_style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
                      <TopNav ims={ims} />
                    </View>
                    <View
                      gridArea='content'
                      UNSAFE_className='content-area'
                    >
                      <RBACGate>
                        <Routes>
                          <Route path='/' element={<Home />} />
                          <Route path='/overview' element={<OverviewDashboard ims={ims} />} />
                          <Route path='/profile' element={<UserProfile ims={ims} />} />
                          <Route path='/clouds' element={<CloudManagementConsole ims={ims} />} />
                          <Route path='/series' element={<SeriesDashboard ims={ims} />} />
                          <Route path='/series/new' element={<SeriesForm ims={ims} />} />
                          <Route path='/series/edit/:id' element={<SeriesForm ims={ims} />} />
                          <Route path='/events' element={<EventsDashboard ims={ims} />} />
                          <Route path='/events/new/:eventType' element={<EventForm ims={ims} />} />
                          <Route path='/events/edit/:id' element={<EventForm ims={ims} />} />
                          <Route path='/registrations' element={<Registrations ims={ims} />} />
                          <Route path='/registrations/:eventId' element={<Registrations ims={ims} />} />
                          <Route path='/speakers' element={<SpeakersDashboard ims={ims} />} />
                          <Route path='/users' element={<UserManagement ims={ims} />} />
                          <Route path='/access' element={<ScopeGroupManagement ims={ims} />} />
                          <Route path='/roles' element={<RoleManagement ims={ims} />} />
                          <Route path='/about' element={<About />}/>
                        </Routes>
                      </RBACGate>
                    </View>
                  </Grid>
                  <ToastContainer />
                </ToastProvider>
              </GroupProvider>
            </RBACProvider>
          </ApiProvider>
          </S2Provider>
        </Provider>
      </Router>
    </ErrorBoundary>
  )
}

const App: React.FC<AppProps> = ({ runtime, ims, authMode }) => {
  return (
    <AuthProvider initialIms={ims} authMode={authMode}>
      <AuthGate>
        <AppContent runtime={runtime} />
      </AuthGate>
    </AuthProvider>
  )
}

export default App
