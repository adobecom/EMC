/**
 * Catalog of event-libs integrations that read a named entry out of the
 * generic `custom-attributes` scope config (see ConfigManagement.tsx). These
 * names/types/values are a wire contract with event-libs — a typo in the
 * name or an unexpected inputType makes the integration silently do nothing.
 * Surfacing them here lets an admin pick a known integration instead of
 * guessing the exact contract from event-libs source.
 *
 * Whenever event-libs adds a new admin-defined custom-attributes integration
 * (grep event-libs for JSON.parse(getMetadata('custom-attributes')), or the
 * getCustomAttribute/getAttrText/getAttrValues helpers in
 * v1/c2/utils/custom-attributes.js), add an entry here.
 *
 * Only event-level attributes belong in this catalog. event-libs also reads
 * a number of session-level fields (e.g. Track, Format, Technical Level) —
 * those are RainFocus-native session taxonomy fields with no EMC authoring
 * surface, not admin-defined custom attributes, and don't belong here.
 */
import { CustomAttributeInputType } from '../types/configApi'

export interface KnownCustomAttribute {
  /** Exact wire-contract name event-libs matches, case-insensitively. */
  name: string
  /** Admin-facing display label, pre-filled into the attribute's Label field. */
  label: string
  /** What it does and which event-libs code consumes it. */
  description: string
  inputType: CustomAttributeInputType
  /**
   * Pre-fill only, not a hard enum — admins can still add/edit/remove value
   * rows after picking a known integration (e.g. `theme`'s block-scoped
   * syntax, or `promotionalItems`' free-form fragment paths).
   */
  suggestedValues?: { label: string; value: string }[]
}

export const KNOWN_CUSTOM_ATTRIBUTES: KnownCustomAttribute[] = [
  {
    name: 'theme',
    label: 'Page Theme',
    description: 'Applies a dark/light theme to the event page (event-libs applyAreaTheme(), decorate.js). Advanced: a value can also be "dark(blocks:name1,name2)" to scope to specific blocks instead of the whole page.',
    inputType: 'single-select',
    suggestedValues: [
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ],
  },
  {
    name: 'hide-timezone-label',
    label: 'Hide Timezone Label',
    description: 'Suppresses the "GMT+2"-style timezone abbreviation on session/event date-time text (event-libs sessions-hub block plus the [[user-event-date-time-range]]/[[user-start-date-time]]/[[user-end-date-time]] placeholders). Defaults to shown.',
    inputType: 'single-select',
    suggestedValues: [
      { label: 'True', value: 'true' },
      { label: 'False', value: 'false' },
    ],
  },
  {
    name: 'promotionalItems',
    label: 'Promotional Items',
    description: 'List of fragment paths featured as promotional content blocks on the event page (event-libs promotional-content block). Values are author-chosen fragment paths entered per-event — no fixed options here.',
    inputType: 'multi-select',
  },
]
