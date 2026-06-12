/*
* <license header>
*/

import { getCurrentEnvironment, getApiHost } from '../config/constants'
import { apiService } from './api'
import { extractImageFromUploadResponse, uploadImage, UploadTracker } from './requestHelpers'

/**
 * Upload a speaker profile image to ESP after the speaker record exists.
 * POST .../v1/series/{seriesId}/speakers/{speakerId}/images
 * PUT .../v1/series/{seriesId}/speakers/{speakerId}/images/{imageId} when replacing
 */
export async function uploadSpeakerSeriesImage(
  file: File,
  seriesId: string,
  speakerId: string,
  altText: string,
  existingImageId?: string
): Promise<{ imageUrl: string; imageId: string } | null> {
  try {
    const token = apiService.getAuthTokenForExternalUse()
    if (!token) throw new Error('No authentication token available')

    const env = getCurrentEnvironment()
    const host = getApiHost('esp', env)
    const uploadUrl = `${host}/v1/series/${seriesId}/speakers/${speakerId}/images`

    const tracker: UploadTracker = { progress: 0 }
    const config = {
      targetUrl: uploadUrl,
      altText,
      type: 'speaker-photo',
    }

    const result = await uploadImage(file, config, token, tracker, existingImageId)
    return extractImageFromUploadResponse(result)
  } catch (err) {
    console.error('Failed to upload speaker image:', err)
    return null
  }
}
