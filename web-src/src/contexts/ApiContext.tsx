/* 
* <license header>
*/

import React, { createContext, useContext, useEffect } from 'react'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface ApiContextValue {
  apiService: typeof apiService
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined)

interface ApiProviderProps {
  children: React.ReactNode
  ims: IMS
  actionUrls?: Record<string, string>
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children, ims, actionUrls }) => {
  useEffect(() => {
    // Set authentication headers when IMS data changes
    apiService.setAuthHeaders(ims.token, ims.org)
  }, [ims.token, ims.org])

  useEffect(() => {
    // Set action URLs when they're available
    if (actionUrls) {
      apiService.setActionUrls(actionUrls)
    }
  }, [actionUrls])

  return <ApiContext.Provider value={{ apiService }}>{children}</ApiContext.Provider>
}

export const useApi = (): typeof apiService => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context.apiService
}

