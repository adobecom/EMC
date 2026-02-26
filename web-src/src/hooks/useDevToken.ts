/* 
* Dev Token Hook
* Manages development token state and dialog visibility
*/

import { useState, useEffect } from 'react'
import { tokenStorage } from '../services/tokenStorage'
import { env } from '../config/env'

interface UseDevTokenReturn {
  token: string | null
  isDialogOpen: boolean
  showDialog: () => void
  hideDialog: () => void
  handleTokenSaved: (token: string) => void
  isDevMode: boolean
}

/**
 * Hook to manage development token state
 * Automatically checks for stored tokens and manages the token dialog
 */
export function useDevToken(): UseDevTokenReturn {
  const [token, setToken] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDevMode] = useState(() => {
    // Dev token UI only when ?devtokenmode=true on an allowed host
    return env.isDevTokenModeEnabled()
  })

  useEffect(() => {
    // On mount, check for a valid stored token
    if (isDevMode) {
      const validToken = tokenStorage.getValidToken()
      
      if (validToken) {
        console.log('✅ Found valid stored token')
        setToken(validToken)
      } else {
        console.log('⚠️ No valid token found - API calls will fail')
        // Optionally auto-show dialog if no token
        // setIsDialogOpen(true)
      }
    }
  }, [isDevMode])

  const showDialog = () => setIsDialogOpen(true)
  const hideDialog = () => setIsDialogOpen(false)

  const handleTokenSaved = (newToken: string) => {
    setToken(newToken)
    setIsDialogOpen(false)
    console.log('🎉 Token updated successfully')
  }

  return {
    token,
    isDialogOpen,
    showDialog,
    hideDialog,
    handleTokenSaved,
    isDevMode
  }
}

export default useDevToken

