/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import { TextField, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { HeadingWithTooltip } from '../../components/shared'
import { SPACING, COLORS } from '../../styles/designSystem'
import { useSeriesFormComponent } from '../../hooks/useSeriesFormComponent'
import { normalizeRelatedDomain, normalizeContentRoot } from '../../utils/seriesFormAutoCorrect'
import { cachedApi } from '../../services/api'
import { CaasTagsResponse, CaasTag } from '../../types/domain'

function extractTagNames(tagsObj: Record<string, CaasTag>, result: string[]) {
  Object.values(tagsObj).forEach((tag) => {
    result.push(tag.title || tag.name)
    if (tag.tags) extractTagNames(tag.tags, result)
  })
}

function parseTagNames(response: CaasTagsResponse): string[] {
  const names: string[] = []
  Object.values(response.namespaces).forEach((ns) => {
    if (ns.tags) extractTagNames(ns.tags, names)
  })
  return names
}

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
    customTagsUrl = '',
  } = formData

  const [previewTags, setPreviewTags] = useState<string[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!customTagsUrl) {
      setPreviewTags([])
      setPreviewError(null)
      return
    }

    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      setPreviewError(null)
      try {
        const response = await cachedApi.getTagsFromUrl(customTagsUrl) as CaasTagsResponse
        if (response?.namespaces) {
          setPreviewTags(parseTagNames(response))
        } else {
          setPreviewError('No tags found at this URL')
        }
      } catch {
        setPreviewError('Failed to load tags from this URL')
      } finally {
        setPreviewLoading(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [customTagsUrl])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.LG }}>
      {/* Additional Information Header */}
      <HeadingWithTooltip 
        level={3}
        tooltip="Configure optional settings for your series including SSO context, related domain, content root, and theme ID."
      >
        Additional information
      </HeadingWithTooltip>
      
      {/* Form Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.MD }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
          <Text UNSAFE_style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>
            Custom tags URL:
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <TextField
              aria-label="Custom tags URL"
              placeholder="Add custom CaaS taxonomy URL"
              value={customTagsUrl}
              onChange={(value) => updateFormData({ customTagsUrl: value })}
              styles={style({ width: '[100%]' })}
            />
            {previewLoading && (
              <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_500 }}>Loading tags…</Text>
            )}
            {previewError && !previewLoading && (
              <Text UNSAFE_style={{ fontSize: 12, color: COLORS.RED_600 }}>{previewError}</Text>
            )}
            {!previewLoading && !previewError && previewTags.length > 0 && (
              <div>
                <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_800, marginBottom: 6, display: 'block' }}>
                  {previewTags.length} tags available
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {previewTags.map((name) => (
                    <div
                      key={name}
                      style={{
                        backgroundColor: 'var(--emc-tag-chip-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'default',
                        borderRadius: '4px',
                        padding: '8px',
                      }}
                    >
                      <Text UNSAFE_style={{ color: 'white', fontSize: '14px' }}>{name}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
