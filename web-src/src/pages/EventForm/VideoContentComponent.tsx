/* 
* <license header>
*/

import React from 'react'
import { TextField } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HeadingWithTooltip
        level={3}
        tooltip="Add a link to an external video to display on your event page."
      >
        Video Content
      </HeadingWithTooltip>

      <TextField
        data-testid="video-url-input"
        label="Add external URL"
        placeholder="https://"
        value={videoUrl}
        onChange={handleUrlChange}
        styles={style({ width: 480 })}
      />
    </div>
  )
}
