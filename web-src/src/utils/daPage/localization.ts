/**
 * Localization and date/time utilities for DA page templates.
 * Ported from events-platform-hh-webhooks/actions/utils.js — pure JS, no DOM or Node.js deps.
 */

import { DEFAULT_LOCALIZATION_KEYS } from '../../config/daConfig'

const CUSTOM_ATTRIBUTE_NAMES = {
  PRIMARY_PRODUCT_NAME: 'primaryProductName',
  PROMOTIONAL_ITEMS: 'promotionalItems',
} as const

export function mergeData(updatedData: any, localizationData: any, overrideData: any): void {
  if (Array.isArray(localizationData)) {
    localizationData.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        updatedData[index] = updatedData[index] ?? (Array.isArray(item) ? [] : {})
        mergeData(updatedData[index], item, overrideData?.[index] ?? {})
      } else {
        updatedData[index] = overrideData?.[index] ?? item ?? updatedData[index]
      }
    })
  } else if (localizationData && typeof localizationData === 'object') {
    Object.keys(localizationData).forEach((key) => {
      const value = localizationData[key]
      if (typeof value === 'object' && value !== null) {
        updatedData[key] = updatedData[key] ?? (Array.isArray(value) ? [] : {})
        mergeData(updatedData[key], value, overrideData?.[key] ?? {})
      } else {
        updatedData[key] = overrideData?.[key] ?? value ?? updatedData[key]
      }
    })
  }
}

export function removeLocalizationObjects(
  dataObject: Record<string, any>,
  localizationKeys: readonly string[] = DEFAULT_LOCALIZATION_KEYS,
): void {
  for (const key of localizationKeys) {
    if (dataObject[key] && Array.isArray(dataObject[key])) {
      dataObject[key].forEach((item: any) => {
        delete item.localizations
        delete item.localizationOverrides
      })
    } else if (dataObject[key]) {
      delete dataObject[key].localizations
      delete dataObject[key].localizationOverrides
    }
  }
  delete dataObject.localizations
  delete dataObject.localizationOverrides
}

export function mergeLocalization(
  dataObject: Record<string, any>,
  locale: string,
  localizationKeys: readonly string[] = DEFAULT_LOCALIZATION_KEYS,
): void {
  for (const key of localizationKeys) {
    if (dataObject[key] && Array.isArray(dataObject[key])) {
      dataObject[key].forEach((item: any) =>
        mergeData(item, item.localizations?.[locale] ?? {}, item.localizationOverrides?.[locale] ?? {}),
      )
    } else if (dataObject[key]) {
      mergeData(
        dataObject[key],
        dataObject[key].localizations?.[locale] ?? {},
        dataObject[key].localizationOverrides?.[locale] ?? {},
      )
    }
  }
  mergeData(dataObject, dataObject.localizations?.[locale] ?? {}, dataObject.localizationOverrides?.[locale] ?? {})
  removeLocalizationObjects(dataObject, localizationKeys)
}

export function formatDate(date: Date, locale: string): { fullDate: string; time: string } {
  const day = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  const dayOfMonth = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date)
  const year = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date)
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours || 12
  const minutesFormatted = minutes < 10 ? '0' + minutes : minutes
  return {
    fullDate: `${day}, ${month} ${dayOfMonth} ${year} ${hours}:${minutesFormatted} ${ampm}`,
    time: `${hours}:${minutesFormatted} ${ampm}`,
  }
}

export function isSameDate(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function getDisplayDateTime(
  startDateMillis: number,
  endDateMillis: number,
  locale: string,
  gmtOffset: number,
): string | undefined {
  if (startDateMillis && endDateMillis && locale && gmtOffset !== undefined && gmtOffset !== null) {
    const offSetMilliseconds = gmtOffset * 60 * 60 * 1000
    const startDate = new Date(startDateMillis + offSetMilliseconds)
    const endDate = new Date(endDateMillis + offSetMilliseconds)
    const displayDateTime = isSameDate(startDate, endDate)
      ? `${formatDate(startDate, locale).fullDate} - ${formatDate(endDate, locale).time}`
      : `${formatDate(startDate, locale).fullDate} - ${formatDate(endDate, locale).fullDate}`
    return displayDateTime
  }
  return undefined
}

export function extractCustomAttributes(eventData: Record<string, any>): Record<string, any> {
  const updatedEventData = { ...eventData }
  const attrs = eventData.customAttributes
  const metadata = eventData.publishingProfile?.metadata

  // --- primaryProductName ---
  const primaryProduct =
    Array.isArray(attrs) && attrs.find((a: any) => a.attribute === CUSTOM_ATTRIBUTE_NAMES.PRIMARY_PRODUCT_NAME)
  if (primaryProduct?.value) {
    updatedEventData[CUSTOM_ATTRIBUTE_NAMES.PRIMARY_PRODUCT_NAME] = primaryProduct.value
  } else if (metadata?.[CUSTOM_ATTRIBUTE_NAMES.PRIMARY_PRODUCT_NAME]) {
    updatedEventData[CUSTOM_ATTRIBUTE_NAMES.PRIMARY_PRODUCT_NAME] = metadata[CUSTOM_ATTRIBUTE_NAMES.PRIMARY_PRODUCT_NAME]
  }

  // --- promotionalItems ---
  const promoFromAttrs = Array.isArray(attrs)
    ? attrs
        .filter((a: any) => a.attribute === CUSTOM_ATTRIBUTE_NAMES.PROMOTIONAL_ITEMS)
        .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((a: any) => a.value)
    : []
  if (promoFromAttrs.length > 0) {
    updatedEventData[CUSTOM_ATTRIBUTE_NAMES.PROMOTIONAL_ITEMS] = promoFromAttrs
  } else if (metadata?.[CUSTOM_ATTRIBUTE_NAMES.PROMOTIONAL_ITEMS]) {
    updatedEventData[CUSTOM_ATTRIBUTE_NAMES.PROMOTIONAL_ITEMS] = metadata[CUSTOM_ATTRIBUTE_NAMES.PROMOTIONAL_ITEMS]
  }

  return updatedEventData
}

export function fillMissingFields(eventData: Record<string, any>): Record<string, any> {
  let updatedEventData = eventData
  if (!updatedEventData.photos) {
    updatedEventData = { ...updatedEventData, photos: [] }
  }
  if (!updatedEventData.series) {
    updatedEventData = { ...updatedEventData, series: {} }
  }
  if (!updatedEventData.localizations) {
    updatedEventData = { ...updatedEventData, localizations: {} }
  }
  return updatedEventData
}
