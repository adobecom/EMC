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
 * Wraps app content and shows a gate screen until the user is authenticated
 * and the ESP API ping succeeds.
 * - ExC Shell: gates until IMS from ready event + ESP ping succeeds.
 * - Standalone: gates until IMS init completes, user has a token, and ESP ping succeeds.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isLoading, isAuthenticated, isApiReady, pingError, signIn, retryPing } = useAuth()

  const showGate = isLoading || !isAuthenticated || !isApiReady
  const isCheckingAccess = isLoading || (isAuthenticated && !isApiReady && !pingError)

  if (showGate) {
    let message: string | undefined
    let actionLabel: string | undefined
    let onAction = signIn

    if (pingError === 'auth') {
      message = 'Your session has expired or your account does not have access. Please sign in again.'
      actionLabel = 'Sign In'
    } else if (pingError === 'network') {
      message = 'Unable to reach the server. Please check your connection and try again.'
      actionLabel = 'Retry'
      onAction = retryPing
    }

    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GateScreen
          onRequestAccess={onAction}
          isLoading={isCheckingAccess}
          message={message}
          actionLabel={actionLabel}
        />
      </Provider>
    )
  }

  return <>{children}</>
}

export default AuthGate
