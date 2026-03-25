/* 
* <license header>
*/

import React from 'react'
import {
  Flex,
  Text
} from '@adobe/react-spectrum'
import { TextField } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { HeadingWithTooltip } from '../../components/shared'
import { FLEX_GAP } from '../../styles/designSystem'
import { useSeriesFormComponent } from '../../hooks/useSeriesFormComponent'
import { normalizeRelatedDomain, normalizeContentRoot } from '../../utils/seriesFormAutoCorrect'

/**
 * SeriesAdditionalInfoComponent - Manages additional series settings
 * 
 * Uses SeriesFormContext for state management.
 * Handles: susiContextId, relatedDomain, contentRoot, externalThemeId
 */
export const SeriesAdditionalInfoComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useSeriesFormComponent({
    componentId: 'series-additional-info',
  })
  
  // Destructure form data
  const {
    susiContextId = '',
    relatedDomain = '',
    contentRoot = '',
    externalThemeId = '',
  } = formData
  
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      {/* Additional Information Header */}
      <HeadingWithTooltip 
        level={3}
        tooltip="Configure optional settings for your series including SSO context, related domain, content root, and theme ID."
      >
        Additional information
      </HeadingWithTooltip>
      
      {/* Form Fields */}
      <Flex direction="column" gap={FLEX_GAP.FIELD}>
        <Flex direction="row" gap="size-400" alignItems="start">
          <Text UNSAFE_style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>
            SUSI context ID:
          </Text>
          <TextField
            aria-label="SUSI context ID"
            placeholder="Add path"
            value={susiContextId}
            onChange={(value) => updateFormData({ susiContextId: value })}
            styles={style({ width: '[100%]' })}
          />
        </Flex>
        
        <Flex direction="row" gap="size-400" alignItems="start">
          <Text UNSAFE_style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>
            Related domain:
          </Text>
          <TextField
            aria-label="Related domain"
            placeholder="Add related domain"
            value={relatedDomain}
            onChange={(value) => updateFormData({ relatedDomain: value })}
            onBlur={() => {
              const normalized = normalizeRelatedDomain(relatedDomain)
              if (normalized !== relatedDomain) {
                updateFormData({ relatedDomain: normalized })
              }
            }}
            styles={style({ width: '[100%]' })}
          />
        </Flex>
        
        <Flex direction="row" gap="size-400" alignItems="start">
          <Text UNSAFE_style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>
            Content root:
          </Text>
          <TextField
            aria-label="Content root"
            placeholder="Add content root"
            value={contentRoot}
            onChange={(value) => updateFormData({ contentRoot: value })}
            onBlur={() => {
              const normalized = normalizeContentRoot(contentRoot)
              if (normalized !== contentRoot) {
                updateFormData({ contentRoot: normalized })
              }
            }}
            styles={style({ width: '[100%]' })}
          />
        </Flex>
        
        <Flex direction="row" gap="size-400" alignItems="start">
          <Text UNSAFE_style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>
            External theme ID:
          </Text>
          <TextField
            aria-label="External theme ID"
            placeholder="Add external theme ID"
            value={externalThemeId}
            onChange={(value) => updateFormData({ externalThemeId: value })}
            styles={style({ width: '[100%]' })}
          />
        </Flex>
      </Flex>
    </Flex>
  )
}
