import { daFetch } from './daFetch'
import { HELIX_BASE_URL, HELIX_OPERATIONS, type HelixOperation } from '../../config/daConfig'

interface HelixClientConfig {
  org: string
  site: string
  branch: string
}

function helixUrl(config: HelixClientConfig, operation: string, filePath: string): string {
  const cleanPath = filePath.replace(/\.html$/, '')
  return [HELIX_BASE_URL, operation, config.org, config.site, config.branch, cleanPath]
    .filter(Boolean)
    .join('/')
    .replace(/([^:]\/)\/+/g, '$1')
}

async function helixPost(url: string, token: string): Promise<void> {
  await daFetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

async function helixDelete(url: string, token: string): Promise<void> {
  // Helix delete returns 204 — daFetch throws on non-ok, so handle separately.
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    mode: 'cors',
    credentials: 'omit',
  })
  if (!response.ok && response.status !== 204) {
    const errorText = response.headers.get('x-error') || response.statusText
    throw new Error(`Helix DELETE ${url} failed (${response.status}): ${errorText}`)
  }
}

export async function helixPreview(config: HelixClientConfig, filePath: string, token: string): Promise<void> {
  await helixPost(helixUrl(config, 'preview', filePath), token)
}

export async function helixPublish(config: HelixClientConfig, filePath: string, token: string): Promise<void> {
  await helixPost(helixUrl(config, 'live', filePath), token)
}

export async function helixUnpublish(config: HelixClientConfig, filePath: string, token: string): Promise<void> {
  await helixDelete(helixUrl(config, 'live', filePath), token)
}

export async function helixDeletePreview(config: HelixClientConfig, filePath: string, token: string): Promise<void> {
  await helixDelete(helixUrl(config, 'preview', filePath), token)
}

export async function helixPurgeCache(config: HelixClientConfig, filePath: string, token: string): Promise<void> {
  await helixPost(helixUrl(config, 'cache', filePath), token)
}

/**
 * Resolves the Helix operation from event publish flags.
 * published && liveUpdate → PUBLISH
 * !published && liveUpdate → UNPUBLISH
 * else → PREVIEW
 */
export function resolveHelixOperation(flags: { published?: boolean; liveUpdate?: boolean }): HelixOperation {
  if (flags.published && flags.liveUpdate) return HELIX_OPERATIONS.PUBLISH
  if (!flags.published && flags.liveUpdate) return HELIX_OPERATIONS.UNPUBLISH
  return HELIX_OPERATIONS.PREVIEW
}

/**
 * Runs a bulk Helix operation across all paths.
 * PUBLISH: preview all → publish all → purge all.
 * UNPUBLISH: unpublish all → purge all.
 * PREVIEW: preview + purge concurrently.
 */
export async function bulkHelixOperation(
  config: HelixClientConfig,
  paths: string[],
  operation: HelixOperation,
  token: string
): Promise<void> {
  const cleanPaths = paths.map(p => p.replace(/\.html$/, '')).filter(Boolean)
  if (cleanPaths.length === 0) return

  if (operation === HELIX_OPERATIONS.PUBLISH) {
    await Promise.all(cleanPaths.map(p => helixPreview(config, p, token)))
    await Promise.all(cleanPaths.map(p => helixPublish(config, p, token)))
    await Promise.all(cleanPaths.map(p => helixPurgeCache(config, p, token)))
  } else if (operation === HELIX_OPERATIONS.UNPUBLISH) {
    await Promise.all(cleanPaths.map(p => helixUnpublish(config, p, token)))
    await Promise.all(cleanPaths.map(p => helixPurgeCache(config, p, token)))
  } else {
    await Promise.all([
      ...cleanPaths.map(p => helixPreview(config, p, token)),
      ...cleanPaths.map(p => helixPurgeCache(config, p, token)),
    ])
  }
}
