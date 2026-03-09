/* 
* <license header>
*/

import React from 'react'
import {
  TextField,
  Flex,
} from '@adobe/react-spectrum'
import { HeadingWithTooltip } from '../../components/shared'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

export const VideoContentComponent: React.FC = () => {
  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'video-content',
  })

  const videoUrl = formData.video?.url || ''

  const handleUrlChange = (value: string) => {
    updateFormData({
      video: { ...formData.video, url: value },
    })
  }

  return (
    <Flex direction="column" gap="size-200">
      <HeadingWithTooltip
        level={3}
        tooltip="Add a link to an external video to display on your event page."
      >
        Video Content
      </HeadingWithTooltip>

      <TextField
        label="Add external URL"
        placeholder="https://"
        value={videoUrl}
        onChange={handleUrlChange}
        width="size-6000"
      />
    </Flex>
  )
}
