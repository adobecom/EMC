/**
 * Placeholder resolution utilities for DA page templates.
 * Ported from events-platform-hh-webhooks/actions/utils.js — browser-compatible, no Node.js deps.
 */

export function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== 'object' && typeof value !== 'function')
}

export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

export function getMetadata(keyToFind: string, eventData: unknown): any {
  if (eventData && typeof eventData === 'object') {
    for (const key in eventData as Record<string, unknown>) {
      if (key === keyToFind) {
        return (eventData as Record<string, unknown>)[key]
      }
      const result = getMetadata(keyToFind, (eventData as Record<string, unknown>)[key])
      if (result !== undefined) {
        return result
      }
    }
  }
  return undefined
}

export function parseRegularPath(path: string, eventData: Record<string, any> = {}): any {
  // Split the path into segments using both . and : as delimiters
  const segments = path.split(/[.:]/).filter(Boolean)
  const delimiters = path.match(/[.:]/g) || []

  // Get the base metadata value
  let currentValue = getMetadata(segments[0], eventData)

  // If no metadata found, try eventData directly
  if (!currentValue) {
    return eventData[path] || ''
  }

  // Process remaining segments
  for (let i = 1; i < segments.length; i += 1) {
    const delimiter = delimiters[i - 1]
    const segment = segments[i]

    if (delimiter === ':') {
      // Array indexing
      const index = Number.parseInt(segment, 10)
      if (Array.isArray(currentValue) && index >= 0 && index < currentValue.length) {
        currentValue = currentValue[index]
      } else {
        return eventData[path] || ''
      }
    } else if (currentValue && typeof currentValue === 'object') {
      // Object property access
      currentValue = currentValue[segment]
    } else {
      return eventData[path] || ''
    }
  }

  return currentValue || eventData[path] || ''
}

export function replacePlaceholders(html: string, payload: Record<string, any>): string {
  let updatedHtml = html.replace(/\[\[([^\]]{1,2000})\]\]/g, (match: string, kebabPath: string): string => {
    // Convert kebab-case path to camelCase keys
    const keys = kebabPath.split('.').map((part: string) =>
      part.replace(/-([a-z])/g, (_: string, char: string) => char.toUpperCase()),
    )
    let value: any = payload
    for (const key of keys) {
      if (value && key in value) {
        value = value[key]
      } else if (key === 'photoURL' && value?.photo?.imageUrl) {
        value = value.photo.imageUrl
      } else {
        return match
      }
    }
    return String(value)
  })

  const regex = /\[\[(\w+:[\w.]+)\]\]/g
  let match

  while ((match = regex.exec(updatedHtml)) !== null) {
    const value = parseRegularPath(match[1], payload)
    if (value) {
      updatedHtml = updatedHtml.split(match[0]).join(value)
    }
  }

  return updatedHtml
}

export function replaceToImageTag(placeholder: string, html: string): string {
  // Escape special regex characters in placeholder
  const escapedPlaceholder = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, String.raw`\$&`)
  // Regex to find the parent block containing the placeholder
  const blockRegex = new RegExp(String.raw`<([a-zA-Z0-9]+)([^>]*)>[^<]*${escapedPlaceholder}[^<]*</\1>`, 'g')
  // Replace the parent block with an <img> tag using the placeholder as src
  return html.replace(blockRegex, `<img src="[[${placeholder}]]" alt="[[${placeholder}]]" />`)
}

export function resolveArrayPlaceholders(
  html: string,
  jsonData: Record<string, any>,
): { placeholder: string; path: string; values: Record<string, any>; exists: boolean } | null {
  const regex = /\[\[@array\(([^)]+)\)\]\]/
  const match = regex.exec(html)

  if (!match) {
    return null // no placeholder found
  }

  const placeholder = match[0] // [[@array(event.speakers.firstName)]]
  const path = match[1] // event.speakers.firstName
  const pathParts = path.split('.')

  // Traverse jsonData using all but last part for array, last part for property
  let current: any = jsonData
  for (let i = 0; i < pathParts.length - 2; i++) {
    if (current && typeof current === 'object') {
      current = current[pathParts[i]]
    } else {
      current = undefined
      break
    }
  }

  // The array should be at second-to-last part, property at last part
  const arrayKey = pathParts[pathParts.length - 2]
  const propertyKey = pathParts[pathParts.length - 1]

  const values: Record<string, any> = {}

  if (arrayKey && propertyKey && Array.isArray(current?.[arrayKey])) {
    current[arrayKey].forEach((item: any) => {
      if (item[propertyKey] !== undefined) {
        values[item[propertyKey]] = item // key = property value, value = full object
      }
    })
  }

  return {
    placeholder,
    path,
    values,
    exists: Object.keys(values).length > 0,
  }
}

export function updateFragmentPaths(html: string, map: Record<string, any>): string {
  let updatedHtml = html
  const getFragmentPath = (type: string, link: any): string => {
    const destinationPath = link?.destinationPath
    let fragPath = ''
    switch (type) {
      case 'link':
        fragPath = `<a href="${destinationPath}">${destinationPath}</a>`
        break
      case 'relativeValue':
        fragPath = `fragments/${destinationPath?.split('fragments/')[1]}`
        break
      case 'absoluteValue':
        fragPath = destinationPath
        break
      default:
        break
    }
    return fragPath
  }
  for (const [, value] of Object.entries(map)) {
    const { links, fragment, isArray } = value as any
    if (links && links.length > 0) {
      if (isArray) {
        const fragmentsArray: string[] = []
        for (const [index, link] of (links as any[]).entries()) {
          const fragPath = getFragmentPath(fragment.type, link)
          updatedHtml = updatedHtml.split(`[[fragment.${fragment.name}]]:${index}`).join(fragPath)
          fragmentsArray.push(fragPath)
        }
        // handling case where only one placeholder for the array
        if (updatedHtml.includes(`[[fragment.${fragment.name}]]`)) {
          updatedHtml = updatedHtml.split(`[[fragment.${fragment.name}]]`).join(fragmentsArray.join('<br>'))
        }
      } else {
        updatedHtml = updatedHtml.split(`[[fragment.${fragment.name}]]`).join(getFragmentPath(fragment.type, links?.[0]))
      }
    }
  }
  return updatedHtml
}
