/**
 * DOM manipulation utilities for DA page templates.
 * Ported from events-platform-hh-webhooks/actions/utils.js — uses native browser
 * DOMParser/XMLSerializer instead of linkedom's parseHTML.
 */

import { camelToKebab, isPrimitive } from './placeholders'
import { constructFragmentsFolderPath } from './paths'

/**
 * Joins path parts and deduplicates consecutive slashes (except after protocol colon).
 */
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/([^:]\/)\/+/g, '$1')
}

export function parseHtmlDocument(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

export function serializeDocument(document: Document): string {
  return `<!DOCTYPE html>${document.documentElement.outerHTML}`
}

export function extractDynamicFragmentMetadata(
  html: string,
  fragmentFolderPath: string,
): Array<{
  name: string
  type: string
  fragmentTemplatePath: string
  destinationPath: string
  isArray: string
}> {
  const document = parseHtmlDocument(html)
  const fragments: Record<
    string,
    { name: string; type: string; fragmentTemplatePath: string; destinationPath: string; isArray: string }
  > = {}

  document.querySelectorAll('.dynamic-fragment-metadata').forEach((block) => {
    block.querySelectorAll(':scope > div').forEach((group) => {
      const values = Array.from(group.querySelectorAll('p')).map((p) => p.textContent?.trim() ?? '')
      if (values.length > 0) {
        const [name, type, fragmentTemplatePath, isArray] = values.map((v) => v?.toString().trim() ?? '')
        if (!name || name.endsWith('-hub')) {
          return // skip empty or hub rows — hub rows are handled separately by getHubConfigs
        }
        let destinationPath = joinPath(fragmentFolderPath, name)
        if (isArray) {
          destinationPath = joinPath(destinationPath, '/', isArray)
        }
        if (!fragments[name]) {
          fragments[name] = { name, type, fragmentTemplatePath, destinationPath, isArray }
        }
      }
    })
  })

  return Object.values(fragments)
}

export function updatePictureTags(html: string, updates: Array<{ imageKind: string; imageUrl: string }>): string {
  const document = parseHtmlDocument(html)

  updates.forEach(({ imageKind, imageUrl }) => {
    // find picture containing <img> with matching alt
    const picture = document.querySelector(`picture img[alt="[[${imageKind}]]"]`)?.closest('picture')

    if (picture) {
      const img = picture.querySelector('img')
      if (img) {
        // update src
        img.setAttribute('src', imageUrl)

        // update alt (wrap with [[ ]])
        img.setAttribute('alt', `[[${imageKind}]]`)

        // update all <source> too
        picture.querySelectorAll('source').forEach((source) => {
          source.setAttribute('srcset', imageUrl)
        })
      }
    }
  })

  return serializeDocument(document)
}

export function getHubConfigs(html: string): Record<string, { templatePath: string; hubName: string }> {
  const document = parseHtmlDocument(html)
  const hubs: Record<string, { templatePath: string; hubName: string }> = {}

  document.querySelectorAll('.dynamic-fragment-metadata').forEach((block) => {
    block.querySelectorAll(':scope > div').forEach((group) => {
      const values = Array.from(group.querySelectorAll('p')).map((p) => p.textContent?.trim() ?? '')
      if (values.length === 0) return

      // 3-col: [name, templatePath, hubName]
      // 4-col: [name, type, templatePath, hubName]
      let name: string
      let templatePath: string
      let hubName: string

      if (values.length === 3) {
        ;[name, templatePath, hubName] = values
      } else if (values.length >= 4) {
        ;[name, , templatePath, hubName] = values
      } else {
        return
      }

      if (!name || !name.endsWith('-hub')) return

      hubs[name] = { templatePath, hubName }
    })
  })

  return hubs
}

export function createMetaTag(document: Document, key: string, value: unknown): HTMLElement {
  const row = document.createElement('div')
  const keyCell = document.createElement('div')
  const valueCell = document.createElement('div')

  const keyP = document.createElement('p')
  keyP.textContent = camelToKebab(key)

  const valueP = document.createElement('p')
  valueP.textContent = isPrimitive(value) ? String(value ?? '') : JSON.stringify(value)

  keyCell.appendChild(keyP)
  valueCell.appendChild(valueP)
  row.appendChild(keyCell)
  row.appendChild(valueCell)

  return row
}

export function appendEventMetadata(document: Document, eventData: Record<string, any>): Document {
  const main = document.querySelector('main')
  if (!main) return document

  const metaBlock = document.createElement('div')
  const metaInner = document.createElement('div')
  metaInner.className = 'metadata'

  Object.entries(eventData).forEach(([key, value]) => {
    metaInner.appendChild(createMetaTag(document, key, value))
  })

  metaBlock.appendChild(metaInner)
  main.appendChild(metaBlock)

  return document
}

export function addPageMarker(document: Document, markerValue: string): Document {
  const metaBlock = document.querySelector('.metadata')
  if (metaBlock) {
    metaBlock.appendChild(createMetaTag(document, 'modifiedBy', markerValue))
  }
  return document
}

export function performDomOperations(
  document: Document,
  eventData: Record<string, any>,
  markerValue: string,
): Blob {
  // Remove all .dynamic-fragment-metadata elements
  document.querySelectorAll('.dynamic-fragment-metadata').forEach((el) => el.remove())

  appendEventMetadata(document, eventData)
  addPageMarker(document, markerValue)

  const serialized = serializeDocument(document)
  return new Blob([serialized], { type: 'text/html' })
}

// Re-export constructFragmentsFolderPath so callers can import it from this module if needed
export { constructFragmentsFolderPath }
