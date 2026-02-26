/*
 * <license header>
 */

import React, { ReactNode } from 'react'
import { Provider, defaultTheme } from '@adobe/react-spectrum'
import { useAuth } from '../contexts/AuthContext'
import { GateScreen } from './shared/GateScreen'

interface AuthGateProps {
  children: ReactNode
}

/**
 * Wraps app content and shows a gate screen until the user is authenticated.
 * - ExC Shell: always renders children (shell provides IMS before render).
 * - Standalone: shows GateScreen until IMS init completes and user has a token.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { authMode, isLoading, isAuthenticated, signIn } = useAuth()

  if (authMode === 'shell') {
    return <>{children}</>
  }

  if (isLoading || !isAuthenticated) {
    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GateScreen
          onRequestAccess={signIn}
          isLoading={isLoading}
        />
      </Provider>
    )
  }

  return <>{children}</>
}

export default AuthGate
