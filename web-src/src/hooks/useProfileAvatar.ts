/*
 * useProfileAvatar
 * Fetches IMS user avatar from cc-collab profile API
 */

import { useState, useEffect } from 'react'
import { IMS } from '../types'
import { fetchProfileAvatar } from '../services/profileApi'

/** Module-level cache to avoid duplicate fetches when multiple components use the hook */
const avatarCache: Record<string, string | null> = {}

export interface UseProfileAvatarResult {
  avatarUrl: string | null
  isLoading: boolean
}

/**
 * Fetches and returns the current user's avatar URL from the Adobe profile API.
 * Uses cache keyed by userId to avoid refetching when multiple components use the hook.
 */
export function useProfileAvatar(ims: IMS): UseProfileAvatarResult {
  const userId = ims.profile?.userId
  const cachedUrl = userId && avatarCache[userId] !== undefined ? avatarCache[userId] : null

  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedUrl)
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    Boolean(ims.token && ims.profile && !cachedUrl)
  )

  useEffect(() => {
    const token = ims.token
    const userId = ims.profile?.userId

    if (!token || !ims.profile) {
      setIsLoading(false)
      return
    }

    if (userId && avatarCache[userId] !== undefined) {
      setAvatarUrl(avatarCache[userId])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchProfileAvatar(token)
      .then((url) => {
        if (userId) avatarCache[userId] = url
        setAvatarUrl(url)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [ims.token, ims.profile, ims.profile?.userId])

  return { avatarUrl, isLoading }
}
