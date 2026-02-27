/*
 * <license header>
 */

/**
 * Gate background image URLs. Uses Parcel's URL dependency pattern for reliable
 * resolution in both dev and production (including ExC Shell iframe).
 */
const gateBg1 = new URL('./gate-bg-1.jpg', import.meta.url).href
const gateBg2 = new URL('./gate-bg-2.jpg', import.meta.url).href
const gateBg3 = new URL('./gate-bg-3.jpg', import.meta.url).href
const gateBg4 = new URL('./gate-bg-4.jpg', import.meta.url).href
const gateBg5 = new URL('./gate-bg-5.jpg', import.meta.url).href
const gateBg6 = new URL('./gate-bg-6.jpg', import.meta.url).href
const gateBg7 = new URL('./gate-bg-7.jpg', import.meta.url).href
const gateBg8 = new URL('./gate-bg-8.jpg', import.meta.url).href
const gateBg9 = new URL('./gate-bg-9.jpg', import.meta.url).href

/** URLs for randomized gate screen backgrounds. */
export const GATE_BACKGROUND_IMAGES: string[] = [
  gateBg1,
  gateBg2,
  gateBg3,
  gateBg4,
  gateBg5,
  gateBg6,
  gateBg7,
  gateBg8,
  gateBg9
]
