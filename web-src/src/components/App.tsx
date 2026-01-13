/* 
* <license header>
*/

import React from 'react'
import { Provider, defaultTheme, Grid, View } from '@adobe/react-spectrum'
import ErrorBoundary from 'react-error-boundary'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { TopNav } from './layout'
import { ToastContainer } from './shared'
import { ToastProvider, ApiProvider } from '../contexts'
import { Runtime, IMS } from '../types'

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
  OverviewDashboard
} from '../pages'

interface AppProps {
  runtime: Runtime
  ims: IMS
}

const App: React.FC<AppProps> = (props) => {
  console.log('runtime object:', props.runtime)
  console.log('ims object:', props.ims)

  // use exc runtime event handlers
  // respond to configuration change events (e.g. user switches org)
  props.runtime.on('configuration', ({ imsOrg, imsToken, locale }) => {
    console.log('configuration change', { imsOrg, imsToken, locale })
  })
  // respond to history change events
  props.runtime.on('history', ({ type, path }) => {
    console.log('history change', { type, path })
  })

  // error handler on UI rendering failure
  const onError = (_e: Error, _componentStack: string) => {
    // Handle error
  }

  // component to show if UI fails rendering
  const fallbackComponent = ({ componentStack, error }: { componentStack?: string; error?: Error }) => {
    return (
      <React.Fragment>
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>
          Something went wrong :(
        </h1>
        <pre>{(componentStack || '') + '\n' + (error?.message || '')}</pre>
      </React.Fragment>
    )
  }

  return (
    <ErrorBoundary onError={onError} FallbackComponent={fallbackComponent}>
      <Router>
        <Provider theme={defaultTheme} colorScheme={'light'} scale={'medium'}>
          <ApiProvider ims={props.ims}>
            <ToastProvider>
              <Grid
                areas={['header', 'content']}
                columns={['1fr']}
                rows={['auto', '1fr']}
                gap='size-0'
              >
                <View gridArea='header' UNSAFE_style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
                  <TopNav ims={props.ims} />
                </View>
                <View 
                  gridArea='content' 
                  UNSAFE_className='content-area'
                >
                  <Routes>
                    <Route path='/' element={<Home />} />
                    <Route path='/overview' element={<OverviewDashboard ims={props.ims} />} />
                    <Route path='/profile' element={<UserProfile ims={props.ims} />} />
                    <Route path='/clouds' element={<CloudManagementConsole ims={props.ims} />} />
                    <Route path='/series' element={<SeriesDashboard ims={props.ims} />} />
                    <Route path='/series/new' element={<SeriesForm ims={props.ims} />} />
                    <Route path='/series/edit/:id' element={<SeriesForm ims={props.ims} />} />
                    <Route path='/events' element={<EventsDashboard ims={props.ims} />} />
                    <Route path='/events/new/:eventType' element={<EventForm ims={props.ims} />} />
                    <Route path='/events/edit/:id' element={<EventForm ims={props.ims} />} />
                    <Route path='/registrations' element={<Registrations ims={props.ims} />} />
                    <Route path='/registrations/:eventId' element={<Registrations ims={props.ims} />} />
                    <Route path='/speakers' element={<SpeakersDashboard ims={props.ims} />} />
                    <Route path='/about' element={<About />}/>
                  </Routes>
                </View>
              </Grid>
              <ToastContainer />
            </ToastProvider>
          </ApiProvider>
        </Provider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
