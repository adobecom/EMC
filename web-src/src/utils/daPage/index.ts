export {
  isPrimitive,
  camelToKebab,
  getMetadata,
  parseRegularPath,
  replacePlaceholders,
  replaceToImageTag,
  resolveArrayPlaceholders,
  updateFragmentPaths,
} from './placeholders'
export {
  handleExtension,
  getRelativePagePath,
  getRelativeEventPagePath,
  getRelativeSessionPagePath,
  constructFragmentsFolderPath,
  getLocalizedTemplatePath,
} from './paths'
export {
  mergeData,
  mergeLocalization,
  removeLocalizationObjects,
  getDisplayDateTime,
  formatDate,
  isSameDate,
  extractCustomAttributes,
  fillMissingFields,
} from './localization'
export {
  parseHtmlDocument,
  serializeDocument,
  extractDynamicFragmentMetadata,
  updatePictureTags,
  getHubConfigs,
  createMetaTag,
  appendEventMetadata,
  addPageMarker,
  performDomOperations,
} from './dom'
