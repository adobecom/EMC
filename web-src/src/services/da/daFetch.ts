import { isValidUrl } from '../requestHelpers'

export interface DaFetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: FormData | string
  dryRun?: boolean
}

/**
 * Fetch primitive for DA API calls.
 * Differs from safeFetch: allows text/html responses, passes FormData body as-is.
 */
export async function daFetch(url: string, options: DaFetchOptions = {}): Promise<Response> {
  if (!isValidUrl(url)) {
    throw new Error(`DA: blocked request to unauthorized host: ${url}`)
  }

  const { method = 'GET', headers = {}, body, dryRun = false } = options

  // Non-invasive test mode: skip mutating calls
  const nonInvasiveTest = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('nonInvasiveTest') === 'true'
  if ((nonInvasiveTest || dryRun) && method !== 'GET' && method !== 'HEAD') {
    console.log(`🧪 DA ${dryRun ? 'dry-run' : 'non-invasive test'}: skipping ${method} ${url}`)
    return new Response(JSON.stringify({}), {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    })
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-cache',
    ...(body ? { body } : {}),
  }

  const response = await fetch(url, fetchOptions)
  if (!response.ok) {
    const errorText = response.headers.get('x-error') || response.statusText
    throw new Error(`DA ${method} ${url} failed (${response.status}): ${errorText}`)
  }
  return response
}
