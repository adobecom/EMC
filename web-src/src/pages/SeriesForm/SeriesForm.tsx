/* 
* <license header>
*/

import React, { useEffect, useCallback, useRef } from 'react'
import { Divider } from '@react-spectrum/s2'
import { useNavigate, useParams } from 'react-router-dom'
import { SeriesApiResponse } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { IMS } from '../../types'
import { FormCard, BlurredLoadingOverlay, SingleStepFormLayout, HistoryTimeline } from '../../components/shared'
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
import { SURFACES } from '../../styles/designSystem'
import { normalizeRelatedDomain, normalizeContentRoot } from '../../utils/seriesFormAutoCorrect'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Load canonical series from ESP (bypasses GET cache) so modificationTime and
 * other required fields match the server after mutations.
 */
async function fetchSeriesCanonical(seriesId: string): Promise<SeriesApiResponse | null> {
  const data = await apiService.getSeriesByIdExternal(seriesId)
  if (!data || typeof data !== 'object' || 'error' in data) {
    return null
  }
  return data as SeriesApiResponse
}

function mergeSeriesMutationIntoState(
  previous: SeriesApiResponse | null,
  mutationResult: SeriesApiResponse
): SeriesApiResponse {
  return { ...(previous ?? {}), ...mutationResult } as SeriesApiResponse
}

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
    customTagsUrl: series.caasTaxonomyUrl || '',
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
    caasTaxonomyUrl: formData.customTagsUrl,
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

const SeriesFormInner: React.FC<SeriesFormInnerProps> = ({ ims: _ims }) => {
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
      const response = await cachedApi.getSeriesById(seriesIdToLoad)
      
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
      const corrected = {
        ...formData,
        relatedDomain: normalizeRelatedDomain(formData.relatedDomain),
        contentRoot: normalizeContentRoot(formData.contentRoot),
      }
      updateFormData({ relatedDomain: corrected.relatedDomain, contentRoot: corrected.contentRoot })

      let modificationTime = state.seriesDataResp?.modificationTime
      if (isEditMode && seriesId && modificationTime === undefined) {
        const refreshed = await fetchSeriesCanonical(seriesId)
        if (refreshed?.modificationTime != null) {
          modificationTime = refreshed.modificationTime
          setSeriesResponse(refreshed)
        } else {
          const msg = 'Could not load series data (modification time missing). Try reloading the page.'
          setSaveError(msg)
          setSaveStatus('error')
          return false
        }
      }

      const payload = buildApiPayload(corrected, modificationTime, isEditMode)
      
      let result
      if (isEditMode && seriesId) {
        result = await apiService.updateSeriesExternal(seriesId, payload)
      } else {
        result = await apiService.createSeriesExternal(payload)
      }
      
      if ('error' in result) {
        throw new Error(result.error?.message || 'Failed to save series')
      }

      const mutationSeries = result as SeriesApiResponse
      if (!isEditMode && mutationSeries.seriesId) {
        setSeriesId(mutationSeries.seriesId)
      }

      const idToRefresh = mutationSeries.seriesId ?? seriesId
      if (idToRefresh) {
        const refreshed = await fetchSeriesCanonical(idToRefresh)
        if (refreshed) {
          setSeriesResponse(refreshed)
        } else {
          setSeriesResponse(
            mergeSeriesMutationIntoState(state.seriesDataResp, mutationSeries)
          )
        }
      } else {
        setSeriesResponse(
          mergeSeriesMutationIntoState(state.seriesDataResp, mutationSeries)
        )
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
  }, [
    formData,
    seriesId,
    isEditMode,
    state.seriesDataResp,
    setSaveStatus,
    setSaveError,
    setSeriesId,
    setSeriesResponse,
    toast,
    updateFormData,
  ])
  
  /**
   * Handle Publish button click
   */
  const handlePublish = useCallback(async () => {
    setSaveStatus('saving')
    setSaveError(null)
    
    try {
      const corrected = {
        ...formData,
        relatedDomain: normalizeRelatedDomain(formData.relatedDomain),
        contentRoot: normalizeContentRoot(formData.contentRoot),
      }
      updateFormData({ relatedDomain: corrected.relatedDomain, contentRoot: corrected.contentRoot })

      let result
      let seriesIdForCanonicalRefresh: string | null = null
      
      // For new series: first create as draft, then publish
      if (!isEditMode || !seriesId) {
        // Step 1: Create the series first (as draft)
        const createPayload = buildApiPayload(corrected, undefined, false)
        const createResult = await apiService.createSeriesExternal(createPayload)
        
        if ('error' in createResult) {
          throw new Error(createResult.error?.message || 'Failed to create series')
        }
        
        if (!createResult.seriesId) {
          throw new Error('No series ID returned from create')
        }
        
        const newSeriesId = createResult.seriesId
        setSeriesId(newSeriesId)
        seriesIdForCanonicalRefresh = newSeriesId
        
        // Step 2: Publish the newly created series
        let publishModificationTime = createResult.modificationTime
        if (publishModificationTime === undefined) {
          const refreshedForPublish = await fetchSeriesCanonical(newSeriesId)
          if (refreshedForPublish?.modificationTime != null) {
            publishModificationTime = refreshedForPublish.modificationTime
            setSeriesResponse(refreshedForPublish)
          } else {
            const msg = 'Could not load series data (modification time missing). Try reloading the page.'
            setSaveError(msg)
            setSaveStatus('error')
            return
          }
        }
        const publishPayload = buildApiPayload(corrected, publishModificationTime, true)
        result = await apiService.publishSeries(newSeriesId, publishPayload)
      } else {
        seriesIdForCanonicalRefresh = seriesId
        // For existing series: use publishSeries directly
        let modificationTime = state.seriesDataResp?.modificationTime
        if (seriesId && modificationTime === undefined) {
          const refreshed = await fetchSeriesCanonical(seriesId)
          if (refreshed?.modificationTime != null) {
            modificationTime = refreshed.modificationTime
            setSeriesResponse(refreshed)
          } else {
            const msg = 'Could not load series data (modification time missing). Try reloading the page.'
            setSaveError(msg)
            setSaveStatus('error')
            return
          }
        }
        const publishPayload = buildApiPayload(corrected, modificationTime, true)
        result = await apiService.publishSeries(seriesId, publishPayload)
      }
      
      if ('error' in result) {
        throw new Error(result.error?.message || 'Failed to publish series')
      }

      const mutationSeries = result as SeriesApiResponse
      const refreshId = mutationSeries.seriesId ?? seriesIdForCanonicalRefresh
      if (refreshId) {
        const refreshed = await fetchSeriesCanonical(refreshId)
        if (refreshed) {
          setSeriesResponse(refreshed)
        } else {
          setSeriesResponse(
            mergeSeriesMutationIntoState(state.seriesDataResp, mutationSeries)
          )
        }
      } else {
        setSeriesResponse(
          mergeSeriesMutationIntoState(state.seriesDataResp, mutationSeries)
        )
      }
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
      
    } catch (err) {
      console.error('Failed to publish series:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish series'
      setSaveError(errorMessage)
      setSaveStatus('error')
    }
  }, [formData, seriesId, isEditMode, isPublished, state.seriesDataResp, navigate, toast, setSeriesId, setSeriesResponse, setPublished, setSaveStatus, setSaveError, updateFormData])
  
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
    return <BlurredLoadingOverlay visible={true} message="Loading series data..." ariaLabel="Loading series" />
  }
  
  // Side nav items
  const sideNavItems = [
    { id: 'series-detail', label: 'Series detail', isActive: true }
  ]
  
  // Determine status
  const status = isPublished ? 'published' : 'draft'

  // Render history timeline only in edit mode with a valid seriesId
  const renderHeaderActions = () => {
    if (!isEditMode || !seriesId) {
      return null
    }
    return <HistoryTimeline resourceId={seriesId} resourceType="series" />
  }

  return (
    <div
      style={{
        backgroundColor: SURFACES.EVENT_FORM_SHELL,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        alignSelf: 'stretch',
        overflow: 'hidden',
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
        headerActions={renderHeaderActions()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <FormCard>
            <SeriesDetailsComponent />
          </FormCard>

          <FormCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <SeriesAdditionalInfoComponent />
              <Divider size="M" />
              <SeriesTemplateComponent />
            </div>
          </FormCard>
        </div>
      </SingleStepFormLayout>
    </div>
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
