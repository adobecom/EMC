import { daFetch } from './daFetch'
import { DA_CONFIG } from '../../config/daConfig'

function joinPath(...parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/([^:]\/)\/+/g, '$1')
}

export function getDaSourceUrl(path: string): string {
  return joinPath(DA_CONFIG.url, 'source', DA_CONFIG.org, path)
}

export function getDaListUrl(path: string): string {
  return joinPath(DA_CONFIG.url, 'list', DA_CONFIG.org, path)
}

/** Fetch HTML content of a DA document. Returns raw HTML text. */
export async function readFromDA(path: string, token: string): Promise<string> {
  const url = getDaSourceUrl(path)
  const response = await daFetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/html',
    },
  })
  return response.text()
}

/** Write HTML blob to a DA path via multipart POST. */
export async function writeToDA(path: string, htmlBlob: Blob, token: string, dryRun = false): Promise<Response> {
  const url = getDaSourceUrl(path)
  const formData = new FormData()
  formData.append('data', htmlBlob)
  return daFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    dryRun,
  })
}

/** List children of a DA folder. Returns array of {path, name, ext?, lastModified?}. */
export async function listDaPath(path: string, token: string): Promise<Array<{ path: string; name: string; ext?: string; lastModified?: number }>> {
  const url = getDaListUrl(path)
  const response = await daFetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

/** Delete a DA document. */
export async function deleteFromDA(path: string, token: string, dryRun = false): Promise<Response> {
  const url = getDaSourceUrl(path)
  return daFetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    dryRun,
  })
}
