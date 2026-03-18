/**
 * GitHub API service for managing users.json via pull requests.
 *
 * Uses a personal access token stored in sessionStorage (never persisted to disk).
 * Calls go through fetch() directly (not apiService — different auth model).
 */

const GITHUB_OWNER = 'adobecom'
const GITHUB_REPO = 'EMC'
const USERS_JSON_PATH = 'web-src/src/config/users.json'
const GITHUB_BASE_BRANCH = 'main'
const STORAGE_KEY = 'emc_github_pat'
const BASE_URL = 'https://api.github.com'

// ============================================================================
// Token management (sessionStorage only)
// ============================================================================

export function setToken(pat: string): void {
  sessionStorage.setItem(STORAGE_KEY, pat)
}

export function getToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

export function clearToken(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

// ============================================================================
// API helpers
// ============================================================================

function headers(): Record<string, string> {
  const token = getToken()
  if (!token) throw new Error('GitHub PAT not set')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

async function ghFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, { ...options, headers: { ...headers(), ...options?.headers } })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`GitHub API ${response.status}: ${body}`)
  }

  return response.json()
}

// ============================================================================
// File operations
// ============================================================================

interface FileContent {
  content: string
  sha: string
}

export async function fetchFileContent(
  owner = GITHUB_OWNER,
  repo = GITHUB_REPO,
  path = USERS_JSON_PATH,
  branch = GITHUB_BASE_BRANCH
): Promise<FileContent> {
  const data = await ghFetch<{ content: string; sha: string }>(
    `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  )
  return {
    content: atob(data.content.replace(/\n/g, '')),
    sha: data.sha,
  }
}

export async function createBranch(
  owner = GITHUB_OWNER,
  repo = GITHUB_REPO,
  baseBranch = GITHUB_BASE_BRANCH,
  newBranch: string
): Promise<void> {
  // Get the SHA of the base branch
  const ref = await ghFetch<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`
  )

  // Create new branch
  await ghFetch(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${newBranch}`,
      sha: ref.object.sha,
    }),
  })
}

export async function updateFile(
  owner = GITHUB_OWNER,
  repo = GITHUB_REPO,
  path = USERS_JSON_PATH,
  content: string,
  sha: string,
  branch: string,
  message: string
): Promise<void> {
  await ghFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: btoa(content),
      sha,
      branch,
    }),
  })
}

interface PullRequestResult {
  html_url: string
}

export async function createPullRequest(
  owner = GITHUB_OWNER,
  repo = GITHUB_REPO,
  title: string,
  body: string,
  head: string,
  base = GITHUB_BASE_BRANCH
): Promise<PullRequestResult> {
  return ghFetch<PullRequestResult>(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, body, head, base }),
  })
}

// ============================================================================
// Convenience constants for consumers
// ============================================================================

export { GITHUB_OWNER, GITHUB_REPO, USERS_JSON_PATH, GITHUB_BASE_BRANCH }
