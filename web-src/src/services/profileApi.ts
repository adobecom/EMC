/*
 * Profile API Service
 * Fetches IMS user avatar from Adobe cc-collab profile API
 */

import { getProfileApiHost } from '../config/constants'
import { safeFetch } from './requestHelpers'

interface ProfileApiResponse {
  user?: {
    avatar?: string
    [key: string]: unknown
  }
}

/**
 * Fetch the current user's avatar URL from the Adobe profile API.
 * Uses cc-collab.adobe.io (prod) or cc-collab-stage.adobe.io (stage/dev).
 *
 * @param token - Valid IMS Bearer token
 * @returns Avatar URL string, or null on error or missing avatar
 */
export async function fetchProfileAvatar(token: string): Promise<string | null> {
  if (!token || typeof token !== 'string') return null

  const url = `${getProfileApiHost()}/profile`

  try {
    const response = await safeFetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) return null

    const data = (await response.json()) as ProfileApiResponse
    const avatar = data?.user?.avatar
    return typeof avatar === 'string' && avatar.length > 0 ? avatar : null
  } catch {
    return null
  }
}
