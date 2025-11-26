/* 
* <license header>
*/

import React from 'react'
import { Provider, defaultTheme, Grid, View } from '@adobe/react-spectrum'
import ErrorBoundary from 'react-error-boundary'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import TopNav from './TopNav'
import ActionsForm from './ActionsForm'
import { Home } from './Home'
import { About } from './About'
import { UserProfile } from './UserProfile'
import { OrgTeamManagement } from './OrgTeamManagement'
import { SeriesDashboard } from './SeriesDashboard'
import { EventsDashboard } from './EventsDashboard'
import { SeriesForm } from './SeriesForm'
import { EventForm } from './EventForm'
import { RegistrationDashboard } from './RegistrationDashboard'
import { Runtime, IMS } from '../types'

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
                <Route path='/profile' element={<UserProfile ims={props.ims} />} />
                <Route path='/organizations' element={<OrgTeamManagement ims={props.ims} />} />
                <Route path='/series' element={<SeriesDashboard ims={props.ims} />} />
                <Route path='/series/new' element={<SeriesForm ims={props.ims} />} />
                <Route path='/series/edit/:id' element={<SeriesForm ims={props.ims} />} />
                <Route path='/events' element={<EventsDashboard ims={props.ims} />} />
                <Route path='/events/new' element={<EventForm ims={props.ims} />} />
                <Route path='/events/edit/:id' element={<EventForm ims={props.ims} />} />
                <Route path='/registrations' element={<RegistrationDashboard ims={props.ims} />} />
                <Route path='/registrations/:eventId' element={<RegistrationDashboard ims={props.ims} />} />
                <Route path='/actions' element={<ActionsForm runtime={props.runtime} ims={props.ims} />}/>
                <Route path='/about' element={<About />}/>
              </Routes>
            </View>
          </Grid>
        </Provider>
      </Router>
    </ErrorBoundary>
  )
}

export default App

