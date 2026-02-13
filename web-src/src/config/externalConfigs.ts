/* 
* <license header>
*/

/**
 * External configuration URLs
 * 
 * NOTE: These configs are currently hosted externally on adobe.com and should 
 * eventually be migrated to an internal config space within the platform.
 * 
 * Migration tracking: When internal config endpoints are available, update
 * INTERNAL_CONFIG_BASE and switch the implementation in configService.ts
 */

/**
 * Base URL for Adobe event libs configs
 */
export const ADOBE_EVENT_LIBS_BASE = 'https://www.adobe.com/event-libs/assets/configs'

/**
 * Base URL for ECC v1 hosted JSON configs
 * Always uses dev environment - these are static config files
 */
export const ECC_CONFIG_BASE = 'https://dev--ecc-milo--adobecom.aem.live'

/**
 * External configuration URLs for various features
 */
export const EXTERNAL_CONFIG_URLS = {
  /**
   * RSVP form field configurations per cloud type
   * Used by: RegistrationFieldsComponent, AttendeeDashboard
   * Structure: Array of { Field, Type, Label?, Required?, Placeholder?, Options? }
   */
  rsvp: {
    CreativeCloud: `${ADOBE_EVENT_LIBS_BASE}/rsvp/creativecloud.json`,
    ExperienceCloud: `${ADOBE_EVENT_LIBS_BASE}/rsvp/experiencecloud.json`,
  },
  
  /**
   * Page metadata configuration
   * Used by: PageMetadataComponent
   * Structure: Metadata field definitions
   */
  metadataCatalogue: `${ADOBE_EVENT_LIBS_BASE}/metadata-catalogue.json`,
  
  /**
   * Promotional content configuration
   * Used by: Content promotion components
   * Structure: Array of promotional content items
   */
  promotionalContent: `${ADOBE_EVENT_LIBS_BASE}/promotional-content.json`,
  
  /**
   * Target CMS options for series creation
   * Used by: SeriesDetailsComponent
   * Structure: { data: [{ Code, Provider, Instance }] }
   */
  targetCmsMap: `${ADOBE_EVENT_LIBS_BASE}/target-cms-map.json`,
  
  /**
   * Series templates for template picker
   * Used by: SeriesTemplateComponent
   * Structure: { data: [{ template-path, template-name, template-image, supported-event-type }] }
   */
  seriesTemplates: `${ADOBE_EVENT_LIBS_BASE}/series-templates.json`,
} as const

/**
 * Cloud types that have RSVP configurations
 */
export type RsvpCloudType = keyof typeof EXTERNAL_CONFIG_URLS.rsvp

/**
 * Check if a cloud type has RSVP config available
 */
export function hasRsvpConfig(cloudType: string): cloudType is RsvpCloudType {
  return cloudType in EXTERNAL_CONFIG_URLS.rsvp
}

/**
 * Get RSVP config URL for a cloud type
 */
export function getRsvpConfigUrl(cloudType: RsvpCloudType): string {
  return EXTERNAL_CONFIG_URLS.rsvp[cloudType]
}

/**
 * Future: Base URL for internal config migration
 * When internal config endpoints are ready, update this and switch
 * configService.ts to use internal endpoints
 */
export const INTERNAL_CONFIG_BASE = '/api/configs' // Placeholder for future migration

/**
 * Feature flag for using internal configs (future)
 */
export const USE_INTERNAL_CONFIGS = false

