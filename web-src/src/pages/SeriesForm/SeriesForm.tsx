/* 
* <license header>
*/

import React, { useEffect, useCallback, useRef } from 'react'
import { View, Flex, Divider } from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import { SeriesApiResponse } from '../../types/domain'
import { apiService } from '../../services/api'
import { IMS } from '../../types'
import { FormCard, LoadingSpinner, SingleStepFormLayout } from '../../components/shared'
import { SeriesDetailsComponent } from './SeriesDetailsComponent'
import { SeriesAdditionalInfoComponent } from './SeriesAdditionalInfoComponent'
import { SeriesTemplateComponent } from './SeriesTemplateComponent'
import { 
  SeriesFormProvider, 
  useSeriesFormContext, 
  useToast,
  SeriesFormData 
} from '../../contexts'
import { filterSeriesData } from '../../utils/dataFilters'

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
 * Build API payload from form data using data filter validation
 */
function buildApiPayload(formData: SeriesFormData, modificationTime?: number, isUpdate: boolean = false): any {
  // Convert SeriesFormData to a plain object for filtering
  const dataObject: Record<string, any> = {
    seriesName: formData.seriesName,
    cloudType: formData.cloudType,
    targetCms: formData.targetCms,
    templateId: formData.templateId,
    seriesDescription: formData.seriesDescription,
    externalThemeId: formData.externalThemeId,
    susiContextId: formData.susiContextId,
    relatedDomain: formData.relatedDomain,
    contentRoot: formData.contentRoot,
  }
  
  if (modificationTime !== undefined) {
    dataObject.modificationTime = modificationTime
  }
  
  // Use the data filter to ensure only submittable fields are included
  // and empty/null values are removed
  const mode = isUpdate ? 'update' : 'submission'
  const filteredPayload = filterSeriesData(dataObject, mode)
  
  return filteredPayload
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
      const payload = buildApiPayload(formData, modificationTime, isEditMode)
      
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
      let result
      
      // For new series: first create as draft, then publish
      if (!isEditMode || !seriesId) {
        // Step 1: Create the series first (as draft)
        const createPayload = buildApiPayload(formData, undefined, false)
        const createResult = await apiService.createSeriesExternal(createPayload)
        
        if ('error' in createResult) {
          throw new Error(createResult.error?.message || 'Failed to create series')
        }
        
        if (!createResult.seriesId) {
          throw new Error('No series ID returned from create')
        }
        
        const newSeriesId = createResult.seriesId
        setSeriesId(newSeriesId)
        
        // Step 2: Publish the newly created series
        const publishPayload = buildApiPayload(formData, createResult.modificationTime, true)
        result = await apiService.publishSeries(newSeriesId, publishPayload)
      } else {
        // For existing series: use publishSeries directly
        const modificationTime = state.seriesDataResp?.modificationTime
        const publishPayload = buildApiPayload(formData, modificationTime, true)
        result = await apiService.publishSeries(seriesId, publishPayload)
      }
      
      if ('error' in result) {
        throw new Error(result.error?.message || 'Failed to publish series')
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
  }, [formData, seriesId, isEditMode, isPublished, state.seriesDataResp, navigate, toast, setSeriesId, setSeriesResponse, setPublished, setSaveStatus, setSaveError])
  
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
