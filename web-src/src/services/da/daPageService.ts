/**
 * DA Page Service — browser-side event page creation orchestrator.
 *
 * Framework-free port of the `DocumentAuthoring` class from
 * events-platform-hh-webhooks/actions/hoolihan-da-webhook/da-utils/index.js.
 * Uses native browser DOMParser/XMLSerializer instead of linkedom, and the
 * logged-in user's IMS bearer token instead of a client_credentials service token.
 *
 * Ordering invariant (enforced by the caller, useEventFormSave):
 *   - For CREATE: ESP create → afterSave callbacks → getEventFull → createEventPages → follow-up PUT with pageCreatedBy:'emc'
 *   - For UPDATE: createEventPages → ESP PUT with pageCreatedBy:'emc' already in payload
 */

import { DA_CONFIG, DEFAULT_LOCALE, DEFAULT_SP_LOCALES, EMC_MARKER, getDaSiteForSeries } from '../../config/daConfig'
import { readFromDA, writeToDA, listDaPath } from './daClient'
import { bulkHelixOperation, resolveHelixOperation } from './helixClient'
import { replacePlaceholders, resolveArrayPlaceholders, updateFragmentPaths, replaceToImageTag } from '../../utils/daPage/placeholders'
import { getRelativeEventPagePath, getLocalizedTemplatePath, constructFragmentsFolderPath } from '../../utils/daPage/paths'
import { mergeLocalization, getDisplayDateTime, extractCustomAttributes, fillMissingFields } from '../../utils/daPage/localization'
import {
  parseHtmlDocument,
  serializeDocument,
  extractDynamicFragmentMetadata,
  updatePictureTags,
  getHubConfigs,
  performDomOperations,
} from '../../utils/daPage/dom'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DaPageCreationInput {
  /** Fully-hydrated event from cachedApi.getEventFull — must include series, photos, sessions */
  eventData: Record<string, any>
  /** true → Publish action; false → Save Draft */
  publish: boolean
  /** true → liveUpdate flag (also publish/unpublish live pages) */
  liveUpdate?: boolean
  /** User IMS bearer token */
  token: string
  /**
   * IETF locale → DA folder map. Falls back to DEFAULT_SP_LOCALES when omitted.
   * Pass scope-config locales here for production accuracy.
   */
  spLocales?: Record<string, string>
  /** Dry-run: skip all DA writes but trace through the logic */
  dryRun?: boolean
}

export interface LocalePageResult {
  locale: string
  success: boolean
  pages: string[]
  error?: string
}

export interface DaPageCreationResult {
  /** All locales succeeded */
  success: boolean
  /** Per-locale outcomes */
  results: LocalePageResult[]
  /** Flat list of all page paths created across all locales */
  allPages: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function joinPath(...parts: (string | undefined | null)[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/([^:]\/)\/+/g, '$1')
}

/**
 * Returns true when the series is configured for Document Authoring.
 * Checks targetCms.code (da-*) and targetCms.provider.
 */
export function isDocumentAuthoringEvent(eventData: Record<string, any>): boolean {
  const code: string | undefined = eventData?.series?.targetCms?.code
  const provider: string | undefined = eventData?.series?.targetCms?.provider
  if (code && code.startsWith('da-')) return true
  if (provider && provider.toLowerCase() === 'documentauthoring') return true
  return false
}

/** Derive the ietfLocales list from the event: defaultLocale + localizations keys. */
function deriveIetfLocales(eventData: Record<string, any>): string[] {
  const defaultLocale: string = eventData.defaultLocale || DEFAULT_LOCALE
  const localizationKeys: string[] = Object.keys(eventData.localizations || {})
  const set = new Set<string>([defaultLocale, ...localizationKeys])
  // ietfLocales from the event payload takes precedence (set by upstream hydration)
  if (Array.isArray(eventData.ietfLocales) && eventData.ietfLocales.length > 0) {
    return eventData.ietfLocales
  }
  return [...set]
}

// ─── Template cache (module-level per session) ──────────────────────────────

const _templateCache = new Map<string, string>()

async function fetchTemplate(templatePath: string, token: string): Promise<string> {
  if (_templateCache.has(templatePath)) {
    return _templateCache.get(templatePath)!
  }
  const html = await readFromDA(templatePath, token)
  if (!html) throw new Error(`Template is empty at ${templatePath}`)
  _templateCache.set(templatePath, html)
  return html
}

// ─── Core event-object population ────────────────────────────────────────────

const DEFAULT_LOCALIZATION_KEYS = ['venue', 'location', 'speakers', 'sponsors', 'photos', 'sessionTimes', 'series']

function populateEventObject(
  eventData: Record<string, any>,
  locale: string,
  spLocales: Record<string, string>
): Record<string, any> {
  let obj = structuredClone(eventData)
  const [language, country] = locale.toLowerCase().split('-')
  obj.language = language || 'en'
  obj.country = country || 'us'
  mergeLocalization(obj, locale, DEFAULT_LOCALIZATION_KEYS)
  obj.sessions?.forEach((item: Record<string, any>) => {
    mergeLocalization(item, locale, DEFAULT_LOCALIZATION_KEYS)
  })
  obj.locale = locale
  obj.localeFolder = spLocales[locale] ?? ''
  obj.displayDateTime = getDisplayDateTime(
    obj.localStartTimeMillis,
    obj.localEndTimeMillis,
    `${obj.language}-${obj.country}`,
    obj.gmtOffset
  )
  obj.eventTitle = obj.title
  obj.title = obj.eventTitle ? `${obj.eventTitle} | Adobe Events` : obj.eventTitle
  obj = fillMissingFields(obj)
  return obj
}

// ─── Fragment processing ──────────────────────────────────────────────────────

async function createNewFragment(
  html: string,
  destinationPath: string,
  payload: Record<string, any>,
  site: string,
  token: string,
  dryRun: boolean
): Promise<void> {
  const IMG_PLACEHOLDERS = ['photoURL']
  let processedHtml = html

  // DOM-parse to normalize (like linkedom's document.toString())
  const doc = parseHtmlDocument(processedHtml)
  processedHtml = serializeDocument(doc)

  IMG_PLACEHOLDERS.forEach((placeholder) => {
    processedHtml = replaceToImageTag(placeholder, processedHtml)
  })

  let hydratedHtml = replacePlaceholders(processedHtml, payload)
  if (payload?.photos?.length > 0) {
    hydratedHtml = updatePictureTags(hydratedHtml, payload.photos)
  }
  if (!hydratedHtml) return

  const fragmentDoc = parseHtmlDocument(hydratedHtml)
  fragmentDoc.querySelectorAll('.dynamic-fragment-metadata').forEach((el) => el.remove())
  const finalHtml = serializeDocument(fragmentDoc)
  const blob = new Blob([finalHtml], { type: 'text/html' })
  await writeToDA(`${site}/${destinationPath}.html`, blob, token, dryRun)
}

async function processFragments(
  html: string,
  eventData: Record<string, any>,
  fragmentTemplatePath: string,
  destinationPath: string,
  fragmentMap: Record<string, any>,
  site: string,
  token: string,
  dryRun: boolean
): Promise<Array<{ destinationPath: string }>> {
  const result: Array<{ destinationPath: string }> = []
  const fragmentsArray = resolveArrayPlaceholders(destinationPath, eventData)
  const updatedHtml = updateFragmentPaths(html, fragmentMap)

  if (fragmentsArray?.exists) {
    for (const key of Object.keys(fragmentsArray.values)) {
      const newPath = destinationPath
        .replace(fragmentsArray.placeholder, key.replace(/ /g, '-'))
        .normalize('NFC')
      fragmentMap[fragmentTemplatePath] = {
        ...fragmentMap[fragmentTemplatePath],
        destinationPath: newPath,
      }
      await createNewFragment(updatedHtml, newPath, { locale: eventData.locale, ...fragmentsArray.values[key] }, site, token, dryRun)
      result.push({ destinationPath: newPath })
    }
  } else {
    await createNewFragment(updatedHtml, destinationPath, { ...eventData }, site, token, dryRun)
    result.push({ destinationPath })
  }

  return result
}

async function createHydratedEventFragments(
  html: string,
  eventData: Record<string, any>,
  relativeDestinationPath: string,
  fragmentMap: Record<string, any>,
  site: string,
  token: string,
  dryRun: boolean,
  fragmentFolderPath?: string | null
): Promise<void> {
  if (!relativeDestinationPath) return
  const effectiveFragmentFolder = fragmentFolderPath || constructFragmentsFolderPath(relativeDestinationPath)

  // Keys already in fragmentMap before this call — skip them during verifyAndUpdate
  const preExistingKeys = new Set(Object.keys(fragmentMap))

  const processHtml = async (innerHtml: string, innerEventData: Record<string, any>): Promise<void> => {
    const fragments = extractDynamicFragmentMetadata(innerHtml, effectiveFragmentFolder)
    if (fragments.length === 0) return

    const unprocessed = fragments.filter((f) => {
      if (fragmentMap[f.fragmentTemplatePath]) return false
      return true
    })

    // Mark all unprocessed synchronously so recursion and siblings skip duplicates
    unprocessed.forEach((f) => { fragmentMap[f.fragmentTemplatePath] = { fragment: f } })

    await Promise.all(unprocessed.map(async (fragment) => {
      const { fragmentTemplatePath, destinationPath } = fragment
      try {
        const fetchedHtml = await fetchTemplate(`${fragmentTemplatePath}.html`, token)
        await processHtml(fetchedHtml, innerEventData)
        const links = await processFragments(fetchedHtml, innerEventData, fragmentTemplatePath, destinationPath, fragmentMap, site, token, dryRun)
        fragmentMap[fragmentTemplatePath] = {
          ...fragmentMap[fragmentTemplatePath],
          html: fetchedHtml,
          links,
        }
      } catch (err) {
        console.error(`DA: error processing fragment ${fragmentTemplatePath}:`, err)
        throw err
      }
    }))
  }

  // Verify fragment cross-references after all fragments are written
  const verifyAndUpdateFragments = async (): Promise<void> => {
    await Promise.all(
      Object.entries(fragmentMap)
        .filter(([key]) => !preExistingKeys.has(key))
        .map(async ([, value]) => {
          const { fragment } = value as { fragment: { destinationPath: string } }
          const fragmentReadPath = `${site}/${fragment.destinationPath}.html`
          try {
            const existingHtml = await readFromDA(fragmentReadPath, token)
            const updatedHtml = updateFragmentPaths(existingHtml, fragmentMap)
            if (existingHtml !== updatedHtml) {
              const blob = new Blob([updatedHtml], { type: 'text/html' })
              await writeToDA(`${site}/${fragment.destinationPath}.html`, blob, token, dryRun)
            }
          } catch {
            // Not fatal — fragment may not exist yet on first creation
          }
        })
    )
  }

  await processHtml(html, eventData)
  await verifyAndUpdateFragments()
}

// ─── Per-locale page creation ─────────────────────────────────────────────────

async function createOrUpdateDaPage(
  templatePath: string,
  eventObj: Record<string, any>,
  destinationPath: string,
  fragmentMap: Record<string, any>,
  site: string,
  token: string,
  dryRun: boolean,
  fragmentFolderPath?: string | null
): Promise<Record<string, any>> {
  const templateHtml = await fetchTemplate(templatePath, token)

  await createHydratedEventFragments(
    templateHtml,
    eventObj,
    destinationPath,
    fragmentMap,
    site,
    token,
    dryRun,
    fragmentFolderPath
  )

  let hydratedHtml = updateFragmentPaths(templateHtml, fragmentMap)
  hydratedHtml = replacePlaceholders(hydratedHtml, eventObj)
  if (eventObj.photos?.length > 0) {
    hydratedHtml = updatePictureTags(hydratedHtml, eventObj.photos)
  }

  const document = parseHtmlDocument(hydratedHtml)
  const blob = performDomOperations(document, eventObj, EMC_MARKER)
  await writeToDA(`${site}/${destinationPath}.html`, blob, token, dryRun)

  return fragmentMap
}

function collectEventSpeakers(eventObj: Record<string, any>): any[] {
  const seen = new Set<string>()
  const speakers: any[] = []
  const addSpeaker = (s: any) => {
    if (s.speakerId && !seen.has(s.speakerId)) {
      seen.add(s.speakerId)
      speakers.push(s)
    }
  }
  ;(eventObj.speakers || []).forEach(addSpeaker)
  ;(eventObj.sessions || []).forEach((session: any) => (session.speakers || []).forEach(addSpeaker))
  return speakers
}

function collectPages(opts: { pagePaths?: (string | null | undefined)[]; fragmentMaps?: Record<string, any>[] }): string[] {
  const pages = new Set<string>((opts.pagePaths || []).filter(Boolean) as string[])
  for (const fm of opts.fragmentMaps || []) {
    for (const val of Object.values(fm || {})) {
      const frag = (val as any)?.fragment
      if (frag?.destinationPath) pages.add(frag.destinationPath)
    }
  }
  return [...pages]
}

async function performEventDetailPageOperation(
  inputData: Record<string, any>,
  locale: string,
  site: string,
  spLocales: Record<string, string>,
  token: string,
  dryRun: boolean
): Promise<{ pages: string[] }> {
  let eventObj = populateEventObject(inputData, locale, spLocales)

  const templateId: string = eventObj.series?.templateId
  if (!templateId) throw new Error(`Missing series.templateId for event ${eventObj.eventId}`)
  if (!eventObj.detailPagePath) throw new Error(`Missing detailPagePath for event ${eventObj.eventId}`)

  const eventTemplatePath = `${getLocalizedTemplatePath(templateId, eventObj.localeFolder)}.html`
  const relativeDestinationPagePath = getRelativeEventPagePath(eventObj, spLocales)
  if (!relativeDestinationPagePath) throw new Error(`Could not derive relative page path for locale ${locale}`)

  // Fetch template to read hub configs
  const templateHtml = await fetchTemplate(eventTemplatePath, token)
  const hubConfigs = getHubConfigs(templateHtml)
  const { templatePath: sessionHubTemplatePath, hubName: sessionHubName } = hubConfigs['session-hub'] || {}
  const { templatePath: speakerHubTemplatePath, hubName: speakerHubName } = hubConfigs['speaker-hub'] || {}

  // For UNPUBLISH, collect teardown paths and return early
  if (!eventObj.published && eventObj.liveUpdate) {
    const paths = await listTeardownPaths(relativeDestinationPagePath, site, token)
    return { pages: paths }
  }

  eventObj = extractCustomAttributes(eventObj)
  eventObj = parsePublishingProfileMetadata(eventObj)

  const allSpeakers = collectEventSpeakers(eventObj)
  if (eventObj?.sessions?.length > 0 && sessionHubTemplatePath && sessionHubName) {
    eventObj.sessionHubPath = `${relativeDestinationPagePath}/${sessionHubName}`
  }
  if (allSpeakers.length > 0 && speakerHubTemplatePath && speakerHubName) {
    eventObj.speakerHubPath = `${relativeDestinationPagePath}/${speakerHubName}`
  }

  const eventFragmentFolderPath = constructFragmentsFolderPath(relativeDestinationPagePath)

  const sessionHubCreated = Boolean(eventObj?.sessions?.length > 0 && sessionHubTemplatePath && sessionHubName)
  const speakerHubCreated = Boolean(allSpeakers.length > 0 && speakerHubTemplatePath && speakerHubName)

  const [sessionHubFragmentMap, speakerHubFragmentMap] = await Promise.all([
    sessionHubCreated
      ? createOrUpdateDaPage(
          `${sessionHubTemplatePath}.html`,
          eventObj,
          `${relativeDestinationPagePath}/${sessionHubName}`,
          {},
          site,
          token,
          dryRun,
          eventFragmentFolderPath
        )
      : Promise.resolve({}),
    speakerHubCreated
      ? createOrUpdateDaPage(
          `${speakerHubTemplatePath}.html`,
          { ...eventObj, speakers: allSpeakers },
          `${relativeDestinationPagePath}/${speakerHubName}`,
          {},
          site,
          token,
          dryRun,
          eventFragmentFolderPath
        )
      : Promise.resolve({}),
  ])

  const eventPageFragmentMap = await createOrUpdateDaPage(
    eventTemplatePath,
    eventObj,
    relativeDestinationPagePath,
    { ...sessionHubFragmentMap },
    site,
    token,
    dryRun
  )

  const pages = collectPages({
    pagePaths: [
      relativeDestinationPagePath,
      sessionHubCreated ? `${relativeDestinationPagePath}/${sessionHubName}` : null,
      speakerHubCreated ? `${relativeDestinationPagePath}/${speakerHubName}` : null,
    ],
    fragmentMaps: [eventPageFragmentMap, sessionHubFragmentMap, speakerHubFragmentMap],
  })

  return { pages }
}

function parsePublishingProfileMetadata(eventData: Record<string, any>): Record<string, any> {
  const { publishingProfile, ...rest } = eventData
  let updated = { ...rest }
  if (publishingProfile?.metadata) {
    for (const [key, value] of Object.entries(publishingProfile.metadata)) {
      if (!(key in updated)) {
        updated = { ...updated, [key]: value }
      }
    }
  }
  return updated
}

// ─── Teardown / listing helpers ───────────────────────────────────────────────

async function listPagePaths(
  relativeFolderPath: string,
  site: string,
  token: string
): Promise<string[]> {
  let items: Awaited<ReturnType<typeof listDaPath>>
  try {
    items = await listDaPath(joinPath(site, relativeFolderPath), token)
  } catch {
    return []
  }
  const paths: string[] = []
  for (const item of items || []) {
    const childPath = `${relativeFolderPath}/${item.name}`
    if (item.ext === 'html') {
      paths.push(childPath)
    } else if (!item.ext) {
      paths.push(...(await listPagePaths(childPath, site, token)))
    }
  }
  return paths
}

async function listTeardownPaths(relativePagePath: string, site: string, token: string): Promise<string[]> {
  const paths = new Set<string>(await listPagePaths(relativePagePath, site, token))
  paths.add(relativePagePath)
  const fragmentsFolder = constructFragmentsFolderPath(relativePagePath)
  for (const p of await listPagePaths(fragmentsFolder, site, token)) paths.add(p)
  return [...paths]
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates (or updates) DA event pages for all applicable locales.
 *
 * Returns per-locale results. The caller (useDaPageCreation / useEventFormSave)
 * decides whether a partial failure blocks the overall save.
 */
export async function createEventPages(input: DaPageCreationInput): Promise<DaPageCreationResult> {
  const {
    eventData,
    publish,
    liveUpdate = false,
    token,
    spLocales = DEFAULT_SP_LOCALES,
    dryRun = false,
  } = input

  const site = getDaSiteForSeries(eventData?.series?.targetCms?.code)
  const ietfLocales = deriveIetfLocales(eventData)

  const helixFlags = { published: publish, liveUpdate }
  const helixOp = resolveHelixOperation(helixFlags)

  const helixConfig = {
    org: DA_CONFIG.org,
    site,
    branch: DA_CONFIG.branch,
  }

  const allPages = new Set<string>()
  const results: LocalePageResult[] = []

  for (const locale of ietfLocales) {
    try {
      const { pages } = await performEventDetailPageOperation(
        eventData,
        locale,
        site,
        spLocales,
        token,
        dryRun
      )
      pages.forEach((p) => allPages.add(p))
      results.push({ locale, success: true, pages })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`DA: page creation failed for locale ${locale}:`, err)
      results.push({ locale, success: false, pages: [], error: message })
    }
  }

  // Bulk Helix preview/publish across all created pages
  const createdPages = [...allPages]
  if (createdPages.length > 0 && !dryRun) {
    try {
      await bulkHelixOperation(helixConfig, createdPages, helixOp, token)
    } catch (err) {
      console.error('DA: Helix operation failed after page writes:', err)
      // Non-fatal: pages are written to DA; Helix failure degrades preview/live but isn't a blocking error
    }
  }

  const success = results.length > 0 && results.every((r) => r.success)
  return { success, results, allPages: createdPages }
}
