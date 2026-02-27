/* 
* <license header>
*/

/* global fetch */

import { env } from './config/env'

/**
 * Invokes a web action
 *
 * @param actionUrl - The URL of the action to invoke
 * @param headers - Request headers
 * @param params - Request parameters
 * @param options - Request options (method)
 * @returns The response from the action
 */

interface InvokeOptions {
  method: 'GET' | 'POST'
}

async function actionWebInvoke(
  actionUrl: string,
  headers: { [key: string]: string } = {},
  params: { [key: string]: any } = {},
  options: InvokeOptions = { method: 'POST' }
): Promise<string | object> {
  const actionHeaders: { [key: string]: string } = {
    'Content-Type': 'application/json',
    ...headers
  }

  const fetchConfig: RequestInit = {
    headers: actionHeaders
  }

  // Enable extra logging only on localhost (not on deployed dev instances)
  if (env.isLocalhost()) {
    actionHeaders['x-ow-extra-logging'] = 'on'
  }

  fetchConfig.method = options.method.toUpperCase()

  let finalActionUrl = actionUrl

  if (fetchConfig.method === 'GET') {
    const url = new URL(actionUrl)
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    finalActionUrl = url.toString()
  } else if (fetchConfig.method === 'POST') {
    fetchConfig.body = JSON.stringify(params)
  }

  const response = await fetch(finalActionUrl, fetchConfig)

  let content: string | object = await response.text()

  if (!response.ok) {
    throw new Error(`failed request to '${actionUrl}' with status: ${response.status} and message: ${content}`)
  }
  
  try {
    content = JSON.parse(content as string)
  } catch (e) {
    // response is not json
  }
  
  return content
}

export default actionWebInvoke

