/* 
* <license header>
*/

import React, { useEffect, useCallback, useRef } from 'react'
import { View, Flex, Divider } from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import { SeriesApiResponse } from '../../types/domain'
import { apiService } from '../../services/api'
import { IMS } from '../../types'
import { FormCard, LoadingSpinner, SingleStepFormLayout } from '../shared'
import { SeriesDetailsComponent } from './SeriesDetailsComponent'
import { SeriesAdditionalInfoComponent } from './SeriesAdditionalInfoComponent'
import { SeriesTemplateComponent } from './SeriesTemplateComponent'
import { 
  SeriesFormProvider, 
  useSeriesFormContext, 
  useToast,
  SeriesFormData 
} from '../../contexts'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map API response to form data
 */
function mapApiResponseToFormData(series: SeriesApiResponse): SeriesFormData {
  return {
    seriesName: series.seriesName || '',
    cloudType: (series.cloudType as 'CreativeCloud' | 'ExperienceCloud') || 'ExperienceCloud',
    targetCms: series.targetCms || null,
    templateId: series.templateId || '',
    seriesDescription: series.seriesDescription || '',
    externalThemeId: series.externalThemeId || '',
    susiContextId: series.susiContextId || '',
    relatedDomain: series.relatedDomain || '',
    contentRoot: series.contentRoot || '',
  }
}

/**
 * Build API payload from form data
 */
function buildApiPayload(formData: SeriesFormData, modificationTime?: number): any {
  const payload: any = {
    seriesName: formData.seriesName,
    cloudType: formData.cloudType,
    targetCms: formData.targetCms,
    templateId: formData.templateId || null,
    seriesDescription: formData.seriesDescription || undefined,
    externalThemeId: formData.externalThemeId || undefined,
    susiContextId: formData.susiContextId || undefined,
    relatedDomain: formData.relatedDomain || undefined,
    contentRoot: formData.contentRoot || undefined,
  }
  
  if (modificationTime !== undefined) {
    payload.modificationTime = modificationTime
  }
  
  return payload
}

// ============================================================================
// INNER FORM COMPONENT (uses context)
// ============================================================================

interface SeriesFormInnerProps {
  ims: IMS
}

const SeriesFormInner: React.FC<SeriesFormInnerProps> = ({ ims }) => {
  const navigate = useNavigate()
  const { id: seriesIdParam } = useParams<{ id: string }>()
  const toast = useToast()
  
  // Track the last error shown to prevent duplicate toasts
  const lastErrorShownRef = useRef<string | null>(null)
  
  // Get context
  const {
    formData,
    seriesId,
    isEditMode,
    isLoading,
    isPublished,
    state,
    updateFormData,
    setSeriesId,
    setEditMode,
    setSeriesResponse,
    setLoading,
    setLoadError,
    setPublished,
    setSaveStatus,
    setSaveError,
  } = useSeriesFormContext()
  
  const isSaving = state.saveStatus === 'saving'
  
  // Show toast when saveError changes
  useEffect(() => {
    const saveError = state.saveError
    if (saveError && saveError !== lastErrorShownRef.current) {
      toast.error(saveError, { duration: 8000 })
      lastErrorShownRef.current = saveError
    }
    if (!saveError) {
      lastErrorShownRef.current = null
    }
  }, [state.saveError, toast])
  
  // ============================================================================
  // LOAD SERIES DATA
  // ============================================================================
  
  useEffect(() => {
    if (seriesIdParam) {
      setSeriesId(seriesIdParam)
      setEditMode(true)
      loadSeries(seriesIdParam)
    }
  }, [seriesIdParam])
  
  const loadSeries = async (seriesIdToLoad: string) => {
    setLoading(true)
    try {
      const response = await apiService.getSeriesByIdExternal(seriesIdToLoad)
      
      if ('error' in response) {
        console.error('Failed to load series:', response)
        setLoadError('Failed to load series data')
        return
      }
      
      setSeriesResponse(response as SeriesApiResponse)
      
      // Set published status
      setPublished((response as SeriesApiResponse).seriesStatus === 'published')
      
      const mappedData = mapApiResponseToFormData(response as SeriesApiResponse)
      updateFormData(mappedData)
      
    } catch (err) {
      console.error('Failed to load series:', err)
      setLoadError('Failed to load series data')
    } finally {
      setLoading(false)
    }
  }
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  /**
   * Handle Save button click - saves as draft
   */
  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaveStatus('saving')
    setSaveError(null)
    
    try {
      const modificationTime = state.seriesDataResp?.modificationTime
      const payload = buildApiPayload(formData, isEditMode ? modificationTime : undefined)
      
      let result
      if (isEditMode && seriesId) {
        result = await apiService.updateSeriesExternal(seriesId, payload)
      } else {
        result = await apiService.createSeriesExternal(payload)
      }
      
      if ('error' in result) {
        throw new Error(result.error?.message || 'Failed to save series')
      }
      
      // Update series ID if this was a create
      if (!isEditMode && result.seriesId) {
        setSeriesId(result.seriesId)
        setSeriesResponse(result as SeriesApiResponse)
      } else if (isEditMode) {
        setSeriesResponse(result as SeriesApiResponse)
      }
      
      setSaveStatus('success')
      toast.success(isEditMode ? 'Series updated successfully!' : 'Series saved successfully!')
      return true
      
    } catch (err) {
      console.error('Failed to save series:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save series'
      setSaveError(errorMessage)
      setSaveStatus('error')
      return false
    }
  }, [formData, seriesId, isEditMode, state.seriesDataResp, setSaveStatus, setSaveError, toast])
  
  /**
   * Handle Publish button click
   */
  const handlePublish = useCallback(async () => {
    setSaveStatus('saving')
    setSaveError(null)
    
    try {
      const modificationTime = state.seriesDataResp?.modificationTime
      const payload = {
        ...buildApiPayload(formData, isEditMode ? modificationTime : undefined),
        seriesStatus: 'published'
      }
      
      let result
      if (isEditMode && seriesId) {
        result = await apiService.updateSeriesExternal(seriesId, payload)
      } else {
        result = await apiService.createSeriesExternal(payload)
      }
      
      if ('error' in result) {
        throw new Error(result.error?.message || 'Failed to publish series')
      }
      
      // Update series ID if this was a create
      if (!isEditMode && result.seriesId) {
        setSeriesId(result.seriesId)
      }
      setSeriesResponse(result as SeriesApiResponse)
      
      setPublished(true)
      setSaveStatus('success')
      toast.success(
        isPublished ? 'Series re-published successfully!' : 'Series published successfully!',
        { 
          duration: 3000,
          action: {
            label: 'View Series',
            onPress: () => navigate('/series')
          }
        }
      )
      
      // Navigate after a short delay
      setTimeout(() => {
        navigate('/series')
      }, 2000)
      
    } catch (err) {
      console.error('Failed to publish series:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish series'
      setSaveError(errorMessage)
      setSaveStatus('error')
    }
  }, [formData, seriesId, isEditMode, isPublished, state.seriesDataResp, navigate, toast])
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  const isFormValid = 
    formData.seriesName.trim() !== '' &&
    formData.cloudType &&
    formData.targetCms !== null &&
    formData.templateId !== ''
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return <LoadingSpinner message="Loading series data..." />
  }
  
  // Side nav items
  const sideNavItems = [
    { id: 'series-detail', label: 'Series detail', isActive: true }
  ]
  
  // Determine status
  const status = isPublished ? 'published' : 'draft'

  return (
    <View 
      UNSAFE_style={{
        backgroundColor: 'var(--spectrum-global-color-gray-100)',
      }}
    >
      <SingleStepFormLayout
        title="Create series"
        sideNavCategory="SERIES CREATION"
        dashboardLabel="Dashboard"
        dashboardPath="/series"
        sideNavItems={sideNavItems}
        status={status}
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={isSaving}
        hasSavedId={!!seriesId}
        isPublished={isPublished}
        isValid={isFormValid}
        publishLabel="Publish series"
      >
        <Flex direction="column" gap="size-0">
          <FormCard>
            <SeriesDetailsComponent />
          </FormCard>

          <FormCard>
            <Flex direction="column" gap="size-400">
              <SeriesAdditionalInfoComponent />
              <Divider size="M" />
              <SeriesTemplateComponent />
            </Flex>
          </FormCard>
        </Flex>
      </SingleStepFormLayout>
    </View>
  )
}

// ============================================================================
// MAIN COMPONENT (provides context)
// ============================================================================

interface SeriesFormProps {
  ims: IMS
}

export const SeriesForm: React.FC<SeriesFormProps> = ({ ims }) => {
  const { id } = useParams<{ id: string }>()
  
  return (
    <SeriesFormProvider initialSeriesId={id || null}>
      <SeriesFormInner ims={ims} />
    </SeriesFormProvider>
  )
}
