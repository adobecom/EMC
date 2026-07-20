/**
 * Path construction utilities for DA page templates.
 * Ported from events-platform-hh-webhooks/actions/utils.js — no Node.js `path` module.
 */

import { DEFAULT_LOCALE } from '../../config/daConfig'

/**
 * Joins path parts, filtering out nullish values, and deduplicates consecutive slashes
 * (except after a protocol colon). Equivalent to node:path.join(...parts) for URL-style paths.
 */
export function joinPath(...parts: (string | undefined | null)[]): string {
  return (parts.filter(Boolean) as string[]).join('/').replace(/([^:]\/)\/+/g, '$1')
}

export function handleExtension(filePath: string): string {
  const pidx = filePath.lastIndexOf('/')
  const fld = filePath.substring(0, pidx + 1)
  let fn = filePath.substring(pidx + 1)
  if (fn.endsWith('.xlsx')) {
    fn = fn.replace('.xlsx', '.json')
  }
  if (fn.toLowerCase() === 'index.docx') {
    fn = ''
  }
  if (fn.endsWith('.docx')) {
    fn = fn.substring(0, fn.lastIndexOf('.'))
  }
  fn = fn
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${fld}${fn}`
}

export function getRelativePagePath(
  pageUrl: string,
  eventData: Record<string, any>,
  localeFolderMap: Record<string, string>,
): string | null {
  if (!pageUrl) return null
  const pagePath = pageUrl.startsWith('http') ? new URL(pageUrl).pathname : pageUrl
  const { contentRoot = `/events/` } = eventData.series ?? {}
  const pathParts = pagePath.split(contentRoot)
  const basePath = pathParts?.[0].replace(`/${localeFolderMap[eventData.defaultLocale]}`, '')
  const localFolder = eventData.locale === DEFAULT_LOCALE ? '' : `/${eventData.localeFolder}`

  return [basePath, localFolder, contentRoot, pathParts?.[1]].join('').replace(/([^:]\/)\/+/g, '$1').replace(/\.html$/, '')
}

export function getRelativeEventPagePath(
  eventData: Record<string, any>,
  localeFolderMap: Record<string, string>,
): string | null {
  return getRelativePagePath(eventData?.detailPagePath, eventData, localeFolderMap)
}

export function getRelativeSessionPagePath(
  session: Record<string, any>,
  eventData: Record<string, any>,
  localeFolderMap: Record<string, string>,
): string | null {
  return getRelativePagePath(session?.url, eventData, localeFolderMap)
}

export function constructFragmentsFolderPath(detailPagePath: string): string {
  const basePath = detailPagePath.split('/')
  const fragmentFolderName = basePath.pop()
  return joinPath(basePath.join('/'), 'fragments', fragmentFolderName ?? '')
}

export function getLocalizedTemplatePath(templatePath: string, localeFolder: string): string {
  if (!localeFolder) {
    return templatePath
  }

  // Handle paths that start with '/'
  const isRelativeTemplatePath = templatePath.startsWith('/')
  if (!isRelativeTemplatePath) {
    throw new Error('Invalid template path. Please provide a relative path')
  }
  const pathToProcess = templatePath.substring(1)

  const firstSlashIndex = pathToProcess.indexOf('/')

  if (firstSlashIndex === -1) {
    // No slash found, just append locale after the path
    return `/${pathToProcess}/${localeFolder}`
  }

  // Insert locale folder after the first path segment
  const firstSegment = pathToProcess.substring(0, firstSlashIndex)
  const restOfPath = pathToProcess.substring(firstSlashIndex)

  return `/${firstSegment}/${localeFolder}${restOfPath}`
}
