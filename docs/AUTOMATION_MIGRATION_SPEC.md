# EMC V2 Automation Migration Specification

> **Purpose**: Complete FE Repo Agent Contract output (per section 1.7 of `automation-contract.md`) for migrating the Platform-UI-EC automation suite from old ECC to EMC V2. This is the single source of truth for building new page objects, section mixins, field handlers, and selectors.

---

## 1. Architecture Delta: Old ECC vs EMC V2

| Aspect | Old ECC | EMC V2 |
|--------|---------|--------|
| **Routing** | `/ecc/create/{projectId}`, `/ecc/dashboard/{projectId}` | HashRouter: `/#/events`, `/#/events/new/:eventType`, `/#/events/edit/:id` |
| **UI Components** | Spectrum Web Components (`sp-picker`, `sp-switch`, `sp-dialog`, `sp-menu-item`) | React Spectrum S2 — renders **standard HTML** (`<button>`, `<input>`, `<div role="dialog">`) |
| **Selectors** | ID-based (`#info-field-event-title input`) | `data-testid` attributes on all interactive elements (prop-driven, context-prefixed) |
| **Form Structure** | 8 nav sections on one page | 4 wizard steps via `FormWizard` (side nav, step locking, progress bar) |
| **Date/Time** | Custom calendar widget (`.calendar-container`, `.calendar-day`) | S2 `DatePicker` with `granularity="minute"` (segmented input + calendar popover) |
| **Dropdowns** | `sp-picker` → `sp-menu-item:has-text()` | S2 `Picker`: `<button>` trigger → `[role="listbox"]` → `[role="option"]` |
| **Toggles** | `sp-switch[name="fieldName"]` | S2 `Switch`: `<input role="switch">` identified by `data-testid` or label text |
| **Tables** | `.dashboard-table`, `.event-row` | Custom `DataTable` with prop-driven `testIds` (context-prefixed per consumer) |
| **Dialogs** | `sp-dialog` | S2 `Dialog`/`AlertDialog`: `<div role="dialog">` / `<div role="alertdialog">` |
| **Autocomplete** | `sp-popover sp-menu sp-menu-item` | S2 `ComboBox`: `<input role="combobox">` → `[role="listbox"]` → `[role="option"]` |
| **Auth/Nav** | Gnav-based sign-in, project-scoped URLs | ExC Shell auth, group-scoped RBAC, TopNav with tabs |

### Key Design Decision: `data-testid` via Props

Shared components (`FormWizard`, `DataTable`, `ResourceDashboardLayout`) accept a `testIds` prop object. Each consumer provides its own context-prefixed values. This avoids ID collisions when a shared component appears multiple times on a page.

Example pattern:
```tsx
const EVENTS_DASHBOARD_TABLE_TEST_IDS = {
  root: 'events-dashboard-table',
  emptyState: 'events-dashboard-table-empty-state',
  pageInput: 'events-dashboard-table-page-input',
  header: (columnKey: string) => `events-dashboard-table-header-${columnKey}`,
  row: (itemKey: string) => `events-dashboard-table-row-${itemKey}`,
}
```

---

## 2. S2 Component → DOM Rendering Reference

| S2 Component | Rendered HTML | Selector Pattern |
|---|---|---|
| `TextField label="X"` | `<label>X</label>` + `<input>` | `[data-testid]` or label association |
| `TextArea label="X"` | `<label>X</label>` + `<textarea>` | `[data-testid]` or label association |
| `Picker label="X"` | `<button>` opens `[role="listbox"]` with `[role="option"]` | `[data-testid]` to click trigger, then `[role="option"]:has-text()` |
| `ComboBox label="X"` | `<input role="combobox">` + `[role="listbox"]` | `[data-testid]` or `input[role="combobox"]` near label |
| `Switch` with text | `<label>...<input role="switch">...</label>` | `[data-testid]` |
| `DatePicker label="X"` | Segmented inputs + calendar popover | `[data-testid]` then interact with segments |
| `TimeField label="X"` | Segmented time inputs | Segments within label group |
| `NumberField label="X"` | `<input>` + stepper buttons | `[data-testid]` |
| `RadioGroup` / `Radio` | `<input type="radio">` | `input[type="radio"]` near label |
| `Button` text | `<button>text</button>` | `button:has-text("text")` or `[data-testid]` |
| `ActionButton aria-label="X"` | `<button aria-label="X">` | `button[aria-label="X"]` |
| `Dialog` | `<div role="dialog">` | `[role="dialog"]` |
| `AlertDialog` | `<div role="alertdialog">` | `[role="alertdialog"]` |
| `Menu` / `MenuItem id="X"` | `[role="menu"]` + `[role="menuitem"]` | `[role="menuitem"][id="X"]` or `:has-text()` |
| `Tab id="X"` | `[role="tab"]` | `[role="tab"]:has-text("X")` |

---

## 3. Field Type Handler Changes

### 3.1 Handlers That Must Be Rewritten

| Field Type | Old Handler | Required Change |
|---|---|---|
| `dropdown` | Click `sp-picker` → `sp-menu-item:has-text()` | Click S2 Picker trigger `<button>` → `[role="option"]:has-text()` in `[role="listbox"]` |
| `date` | Custom calendar: click container, navigate month, click day cell | S2 DatePicker: interact with date segments (type values) OR open calendar popover |
| `time` | `sp-picker` for hour, minute, AM/PM separately | **Removed** — time is combined into DatePicker `granularity="minute"`. For agenda TimeField: interact with hour/minute/period segments |
| `checkbox`/`toggle` | Click `sp-switch` by `name` attribute | Click S2 Switch via `[data-testid]` |
| `autocomplete` | Fill → wait for `sp-menu-item` suggestions | S2 ComboBox: type in `[role="combobox"]` → click `[role="option"]` |
| `agenda` | Click `repeater-element` to add rows, fill with `>> nth=-1` | Click `[data-testid="agenda-add-slot"]`, fill per-card: DatePicker + TimeField + TextField + RichTextEditor |
| `partner` | Click `repeater-element`, fill autocomplete + image dropzone | Sponsor/Partner picker dialog — completely new interaction |

### 3.2 Handlers That Need Selector Updates Only

| Field Type | Notes |
|---|---|
| `text` | `fillText()` on `<input>` — same logic, new selectors via `[data-testid]` |
| `textarea` | `fillText()` on `<textarea>` — same logic |
| `richtext` | EMC V2 still uses Quill RTE → `[role="textbox"]` — selectors are similar |
| `number` | `.fill(String(value))` on S2 NumberField `<input>` |
| `radio` | S2 RadioGroup renders standard `<input type="radio">` — mostly unchanged |
| `image`/`dropzone` | ImageUploader wraps `input[type="file"]` — similar pattern |
| `venue` | Google Places autocomplete — `[data-testid="venue-name-input"]` + `.pac-item` for suggestions |

### 3.3 New Field Types to Register

| Type | Component | Interaction |
|---|---|---|
| `s2picker` | S2 Picker | Click trigger button → select from `[role="listbox"]` → `[role="option"]` |
| `s2combobox` | S2 ComboBox | Type in `[role="combobox"]` → select from `[role="option"]` |
| `s2datepicker` | S2 DatePicker granularity="minute" | Type into segments OR open calendar popover |
| `s2timefield` | S2 TimeField | Type into hour/minute/period segments |
| `s2switch` | S2 Switch | Click via `[data-testid]` |
| `s2numberfield` | S2 NumberField | Fill input or use stepper +/- buttons |
| `tagselector` | Custom TagSelector | Search, click tags to add, click X to remove |
| `speakerpicker` | SpeakerPickerDialog | Open dialog, search speakers, select, close |
| `sponsorpicker` | SponsorPickerDialog | Open dialog, search sponsors, select, close |
| `menuaction` | MenuTrigger → Menu → MenuItem | Click trigger → select `[role="menuitem"]` |

---

## 4. Complete Selector Manifests

### 4.1 EventsDashboard

```yaml
# selector-manifest-events-dashboard.yml
# Component: EventsDashboard
# Source: pages/EventsDashboard/EventsDashboard.tsx

page:
  name: "EventsDashboard"
  route: "/events"
  urlPath: "/#/events"

sections:
  - name: "EventsTable"
    description: "Main events data table with enriched columns"
    fields:
      - name: "searchInput"
        selector: 'input[type="search"]'
        fieldType: "text"
        required: false

    helpers:
      - name: "table"
        selector: '[data-testid="events-dashboard-table"] table'
        purpose: "Main data table element"
      - name: "tableBody"
        selector: '[data-testid="events-dashboard-table"] table tbody'
        purpose: "Table body containing event rows"
      - name: "emptyState"
        selector: '[data-testid="events-dashboard-table-empty-state"]'
        purpose: "Empty state when no events exist"

  - name: "EventsFilters"
    description: "Filter controls above the table"
    fields:
      - name: "seriesFilter"
        selector: '[data-testid="filter-series-picker"]'
        fieldType: "s2picker"
        required: false
      - name: "creatorFilter"
        selector: '[data-testid="filter-creator-picker"]'
        fieldType: "s2picker"
        required: false
      - name: "statusFilter"
        selector: '[data-testid="filter-status-picker"]'
        fieldType: "s2picker"
        required: false
        options: ["All", "Published", "Draft"]
      - name: "cloudFilter"
        selector: '[data-testid="filter-cloud-picker"]'
        fieldType: "s2picker"
        required: false
        options: ["All", "CreativeCloud", "ExperienceCloud", "None"]

  - name: "EventsPagination"
    description: "Pagination controls"
    fields:
      - name: "pageInput"
        selector: '[data-testid="events-dashboard-table-page-input"]'
        fieldType: "number"
        required: false

    helpers:
      - name: "prevPageButton"
        selector: 'button[aria-label="Previous page"]'
        purpose: "Navigate to previous page"
      - name: "nextPageButton"
        selector: 'button[aria-label="Next page"]'
        purpose: "Navigate to next page"

  - name: "FormatSelectionOverlay"
    description: "Modal overlay for cloud/series/type selection when creating new event"
    fields:
      - name: "cloudPicker"
        selector: '[data-testid="format-cloud-picker"]'
        fieldType: "s2picker"
        required: true
        options: ["CreativeCloud", "ExperienceCloud"]
      - name: "seriesPicker"
        selector: '[data-testid="format-series-picker"]'
        fieldType: "s2picker"
        required: true

    helpers:
      - name: "overlayBackdrop"
        selector: '[data-testid="format-selection-overlay"]'
        purpose: "Frosted glass overlay backdrop"

dynamicSelectors:
  - name: "eventRowByName"
    template: '[data-testid="events-dashboard-table"] table tbody tr:has-text("{eventName}")'
    parameter: "eventName"
    description: "Find event row by event name text"

  - name: "eventRowByKey"
    template: '[data-testid="events-dashboard-table-row-{eventId}"]'
    parameter: "eventId"
    description: "Find event row by eventId"

  - name: "eventRowActionMenu"
    template: '[data-testid="events-dashboard-table-row-{eventId}"] button[aria-label="Actions menu"]'
    parameter: "eventId"
    description: "Open actions menu for specific event"

  - name: "menuItem"
    template: '[role="menuitem"][id="{action}"]'
    parameter: "action"
    description: "Select menu action by id (edit, publish, unpublish, clone, delete, preview-pre, preview-post, copy-url)"

  - name: "menuItemByText"
    template: '[role="menuitem"]:has-text("{text}")'
    parameter: "text"
    description: "Select menu item by visible text"

  - name: "createEventType"
    template: '[role="menuitem"]:has-text("{eventType}")'
    parameter: "eventType"
    description: "Select event type from create menu (In-person, Webinar)"

  - name: "columnHeader"
    template: '[data-testid="events-dashboard-table-header-{columnKey}"]'
    parameter: "columnKey"
    description: "Click column header to sort"

  - name: "pickerOption"
    template: '[role="option"]:has-text("{option}")'
    parameter: "option"
    description: "Select option from any open S2 Picker listbox"

actions:
  - name: "createEventButton"
    selector: '[data-testid="create-event-trigger"]'
  - name: "confirmDeleteButton"
    selector: '[role="alertdialog"] button:has-text("Delete")'
  - name: "cancelDeleteButton"
    selector: '[role="alertdialog"] button:has-text("Cancel")'
  - name: "confirmFormatButton"
    selector: '[data-testid="format-confirm-button"]'
  - name: "cancelFormatButton"
    selector: '[data-testid="format-cancel-button"]'
```

### 4.2 EventForm (All Steps)

```yaml
# selector-manifest-event-form.yml
# Component: EventForm (FormWizard with 4 steps)
# Source: pages/EventForm/*.tsx, components/shared/FormWizard.tsx

page:
  name: "EventForm"
  route: "/events/new/:eventType"
  routeEdit: "/events/edit/:id"
  urlPath: "/#/events/new/{eventType}"
  urlPathEdit: "/#/events/edit/{eventId}"

sections:
  # ===== WIZARD CHROME (always visible) =====
  - name: "FormWizard"
    description: "Wizard navigation, progress, and action buttons. TestIds are prefixed with 'event-form-'."
    fields: []

    helpers:
      - name: "wizardContainer"
        selector: '[data-testid="event-form-wizard"]'
        purpose: "Root wizard container"
      - name: "sideNav"
        selector: '[data-testid="event-form-side-nav"]'
        purpose: "Left side navigation panel"
      - name: "progressBar"
        selector: '[data-testid="event-form-progress"]'
        purpose: "Progress bar showing completion"
      - name: "stepHeading"
        selector: '[data-testid="event-form-step-heading"]'
        purpose: "Current step heading text"
      - name: "statusBadge"
        selector: '[data-testid="event-form-status-badge"]'
        purpose: "Draft/Published status badge"

  # ===== STEP 1: BASIC INFO =====

  - name: "EventFormat"
    description: "Read-only display of cloud type and series"
    fields: []

    helpers:
      - name: "formatSection"
        selector: '[data-testid="event-format-section"]'
        purpose: "Event format display section"
      - name: "cloudBadge"
        selector: '[data-testid="cloud-badge"]'
        purpose: "Cloud type badge (CreativeCloud / ExperienceCloud)"
      - name: "seriesBadge"
        selector: '[data-testid="series-badge"]'
        purpose: "Series name badge"
      - name: "reselectButton"
        selector: '[data-testid="reselect-format-button"]'
        purpose: "Re-select button (only for unsaved events)"

  - name: "EventInfo"
    description: "Core event information fields"
    fields:
      - name: "language"
        selector: '[data-testid="language-picker"]'
        fieldType: "s2picker"
        required: false

      - name: "title"
        selector: '[data-testid="event-title-input"]'
        fieldType: "text"
        required: true

      - name: "enTitle"
        selector: '[data-testid="event-en-title-input"]'
        fieldType: "text"
        required: false

      - name: "description"
        selector: '[data-testid="event-description-rte"] [role="textbox"]'
        fieldType: "richtext"
        required: true

      - name: "shortDescription"
        selector: '[data-testid="event-seo-description"]'
        fieldType: "textarea"
        required: false

      - name: "startDateTime"
        selector: '[data-testid="start-datetime-picker"]'
        fieldType: "s2datepicker"
        required: true

      - name: "endDateTime"
        selector: '[data-testid="end-datetime-picker"]'
        fieldType: "s2datepicker"
        required: true

      - name: "timezone"
        selector: '[data-testid="timezone-combobox"]'
        fieldType: "s2combobox"
        required: true

      - name: "privateEvent"
        selector: '[data-testid="private-event-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "inviteOnly"
        selector: '[data-testid="invite-only-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "hasSecondaryLink"
        selector: '[data-testid="secondary-link-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "secondaryLinkTitle"
        selector: '[data-testid="secondary-link-title"]'
        fieldType: "text"
        required: false

      - name: "secondaryLinkUrl"
        selector: '[data-testid="secondary-link-url"]'
        fieldType: "text"
        required: false

  - name: "Venue"
    description: "Venue info section (in-person / hybrid events only)"
    fields:
      - name: "venueName"
        selector: '[data-testid="venue-name-input"]'
        fieldType: "venue"
        required: true

      - name: "venuePostEvent"
        selector: '[data-testid="venue-visible-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "altVenueName"
        selector: '[data-testid="venue-alt-name-input"]'
        fieldType: "text"
        required: false

      - name: "venueImage"
        selector: '[data-testid="hero-image-uploader"] input[type="file"]'
        fieldType: "image"
        required: false

      - name: "venueInstructionsPostEvent"
        selector: '[data-testid="venue-instructions-visible-switch"]'
        fieldType: "s2switch"
        required: false

    helpers:
      - name: "venueAutocompleteDropdown"
        selector: ".pac-container"
        purpose: "Google Places autocomplete suggestions container"
      - name: "venueAutocompleteItem"
        selector: ".pac-item"
        purpose: "Individual Google Places suggestion"

  - name: "Agenda"
    description: "Agenda items (collapsible cards with date/time/title/description)"
    fields:
      - name: "orderByTime"
        selector: '[data-testid="agenda-order-by-time"]'
        fieldType: "s2switch"
        required: false

      - name: "showAgendaPostEvent"
        selector: '[data-testid="agenda-post-event-switch"]'
        fieldType: "s2switch"
        required: false

    helpers:
      - name: "agendaSection"
        selector: '[data-testid="agenda-section"]'
        purpose: "Agenda section wrapper"
      - name: "addSlotButton"
        selector: '[data-testid="agenda-add-slot"]'
        purpose: "Add time slot / Add another time slot button"

  - name: "EventTags"
    description: "Tag selection with search"
    fields: []

    helpers:
      - name: "tagSelector"
        selector: '[data-testid="tag-selector"]'
        purpose: "Tag selector container"

  - name: "PageMetadata"
    description: "SEO and page metadata fields (dynamic Pickers from catalogue)"
    fields: []

  - name: "MarketoIntegration"
    description: "Marketo-specific fields (conditional on registration type)"
    fields:
      - name: "marketoEventType"
        selector: '[data-testid="marketo-event-type-picker"]'
        fieldType: "s2picker"
        required: false
      - name: "salesforceCampaignId"
        selector: '[data-testid="marketo-campaign-id-input"]'
        fieldType: "text"
        required: false
      - name: "programName"
        selector: '[data-testid="marketo-program-name-input"]'
        fieldType: "text"
        required: false

  - name: "VideoContent"
    description: "Video content section"
    fields:
      - name: "videoUrl"
        selector: '[data-testid="video-url-input"]'
        fieldType: "text"
        required: false

  # ===== STEP 2: SPEAKERS & HOSTS =====

  - name: "Speakers"
    description: "Speaker/host management with picker dialog"
    fields: []

    helpers:
      - name: "addSpeakerButton"
        selector: '[data-testid="add-speaker-button"]'
        purpose: "Opens SpeakerPickerDialog"
      - name: "speakerPickerDialog"
        selector: '[data-testid="speaker-picker-dialog"]'
        purpose: "Speaker picker modal dialog"

  # ===== STEP 3: ADDITIONAL CONTENT =====

  - name: "PromotionalContent"
    description: "Promotional messaging and content"
    fields: []

    helpers:
      - name: "promoContentWrapper"
        selector: '[data-testid="promo-content-rte"]'
        purpose: "Promotional content section"

  - name: "Sponsors"
    description: "Sponsor/partner management"
    fields: []

    helpers:
      - name: "addSponsorButton"
        selector: '[data-testid="add-sponsor-button"]'
        purpose: "Opens sponsor picker or inline form"

  - name: "EventImages"
    description: "Hero image and event card image uploads"
    fields:
      - name: "heroImage"
        selector: '[data-testid="hero-image-uploader"] input[type="file"]'
        fieldType: "image"
        required: false
      - name: "cardImage"
        selector: '[data-testid="card-image-uploader"] input[type="file"]'
        fieldType: "image"
        required: false

  # ===== STEP 4: RSVP =====

  - name: "RegistrationConfig"
    description: "RSVP and registration configuration"
    fields:
      - name: "attendeeLimit"
        selector: '[data-testid="attendee-limit-input"]'
        fieldType: "s2numberfield"
        required: false

      - name: "allowWaitlist"
        selector: '[data-testid="allow-waitlist-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "allowGuestRegistration"
        selector: '[data-testid="allow-guest-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "contactHost"
        selector: '[data-testid="contact-host-switch"]'
        fieldType: "s2switch"
        required: false

      - name: "hostEmail"
        selector: '[data-testid="host-email-input"]'
        fieldType: "text"
        required: false

      - name: "rsvpDescription"
        selector: '[data-testid="rsvp-description-rte"] [role="textbox"]'
        fieldType: "richtext"
        required: false

  - name: "RegistrationFields"
    description: "Dynamic RSVP form field visibility and required toggles"
    fields: []

dynamicSelectors:
  - name: "wizardStep"
    template: '[data-testid="event-form-step-{stepId}"]'
    parameter: "stepId"
    description: "Navigate to wizard step by step ID (basic-info, speakers-hosts, additional-content, rsvp)"

  - name: "rsvpFieldVisible"
    template: '[data-testid="rsvp-field-{fieldName}-visible"]'
    parameter: "fieldName"
    description: "Toggle visibility for RSVP field"

  - name: "rsvpFieldRequired"
    template: '[data-testid="rsvp-field-{fieldName}-required"]'
    parameter: "fieldName"
    description: "Toggle required for RSVP field"

  - name: "metaFieldInput"
    template: '[data-testid="meta-{fieldKey}-input"]'
    parameter: "fieldKey"
    description: "Page metadata field by key"

  - name: "pickerOption"
    template: '[role="option"]:has-text("{option}")'
    parameter: "option"
    description: "Select option from any S2 Picker or ComboBox"

actions:
  - name: "saveButton"
    selector: '[data-testid="event-form-save-button"]'
  - name: "nextButton"
    selector: '[data-testid="event-form-next-button"]'
  - name: "backButton"
    selector: '[data-testid="event-form-back-button"]'
  - name: "publishButton"
    selector: '[data-testid="event-form-publish-button"]'
  - name: "dashboardButton"
    selector: '[data-testid="event-form-dashboard-button"]'
  - name: "previewPreEvent"
    selector: '[data-testid="event-form-preview-pre"]'
  - name: "previewPostEvent"
    selector: '[data-testid="event-form-preview-post"]'
```

### 4.3 SeriesDashboard

```yaml
# selector-manifest-series-dashboard.yml
# Component: SeriesDashboard
# Source: pages/SeriesDashboard/SeriesDashboard.tsx

page:
  name: "SeriesDashboard"
  route: "/series"
  urlPath: "/#/series"

sections:
  - name: "SeriesTable"
    description: "Series data table"
    fields: []

    helpers:
      - name: "table"
        selector: '[data-testid="series-dashboard-table"] table'
        purpose: "Main series data table"
      - name: "emptyState"
        selector: '[data-testid="series-dashboard-table-empty-state"]'
        purpose: "Empty state"

dynamicSelectors:
  - name: "seriesRowByKey"
    template: '[data-testid="series-dashboard-table-row-{seriesId}"]'
    parameter: "seriesId"
    description: "Find series row by seriesId"
  - name: "seriesActionMenu"
    template: '[data-testid="series-dashboard-table-row-{seriesId}"] button[aria-label="Actions menu"]'
    parameter: "seriesId"
    description: "Open actions for specific series"
  - name: "columnHeader"
    template: '[data-testid="series-dashboard-table-header-{columnKey}"]'
    parameter: "columnKey"
    description: "Click column header to sort"

actions:
  - name: "createSeriesButton"
    selector: '[data-testid="create-series-button"]'
  - name: "confirmDeleteButton"
    selector: '[role="alertdialog"] button:has-text("Delete")'
  - name: "cancelDeleteButton"
    selector: '[role="alertdialog"] button:has-text("Cancel")'
```

### 4.4 SeriesForm

```yaml
# selector-manifest-series-form.yml
# Component: SeriesForm (single-step form, not wizard)
# Source: pages/SeriesForm/*.tsx

page:
  name: "SeriesForm"
  route: "/series/new"
  routeEdit: "/series/edit/:id"
  urlPath: "/#/series/new"
  urlPathEdit: "/#/series/edit/{seriesId}"

sections:
  - name: "SeriesDetails"
    description: "Core series information"
    fields:
      - name: "seriesName"
        selector: '[data-testid="series-name-input"]'
        fieldType: "text"
        required: true

      - name: "cloudType"
        selector: '[data-testid="series-cloud-picker"]'
        fieldType: "s2picker"
        required: true
        options: ["CreativeCloud", "ExperienceCloud"]

      - name: "seriesDescription"
        selector: '[data-testid="series-description-input"]'
        fieldType: "textarea"
        required: false

  - name: "SeriesTemplate"
    description: "Template picker"
    fields:
      - name: "template"
        selector: '[data-testid="series-template-picker"]'
        fieldType: "custom"
        required: false

actions:
  - name: "saveButton"
    selector: 'button:has-text("Save")'
  - name: "publishButton"
    selector: 'button:has-text("Publish")'
```

### 4.5 SpeakersDashboard

```yaml
# selector-manifest-speakers-dashboard.yml
# Component: SpeakersDashboard (NEW - no ECC equivalent)
# Source: pages/SpeakersDashboard/SpeakersDashboard.tsx

page:
  name: "SpeakersDashboard"
  route: "/speakers"
  urlPath: "/#/speakers"

sections:
  - name: "SpeakersTable"
    description: "Speakers data table with series-scoped view"
    fields:
      - name: "seriesSelector"
        selector: '[data-testid="series-selector"]'
        fieldType: "s2combobox"
        required: true

    helpers:
      - name: "table"
        selector: '[data-testid="speakers-dashboard-table"] table'
        purpose: "Speakers data table"
      - name: "emptyState"
        selector: '[data-testid="speakers-dashboard-table-empty-state"]'
        purpose: "No speakers found"

dynamicSelectors:
  - name: "speakerRowByKey"
    template: '[data-testid="speakers-dashboard-table-row-{speakerId}"]'
    parameter: "speakerId"
    description: "Find speaker row by speakerId"
  - name: "speakerActionMenu"
    template: '[data-testid="speakers-dashboard-table-row-{speakerId}"] button[aria-label="Actions menu"]'
    parameter: "speakerId"
    description: "Open actions for speaker"

actions:
  - name: "addSpeakerButton"
    selector: '[data-testid="add-speaker-button"]'
```

### 4.6 Registrations

```yaml
# selector-manifest-registrations.yml
# Component: Registrations (NEW - tabbed dashboard)
# Source: pages/Registrations/*.tsx

page:
  name: "Registrations"
  route: "/registrations"
  routeWithEvent: "/registrations/:eventId"
  urlPath: "/#/registrations"

sections:
  - name: "EventSelector"
    description: "Event selection for viewing registrations"
    fields:
      - name: "eventSelector"
        selector: '[data-testid="event-selector-combobox"]'
        fieldType: "s2combobox"
        required: true

  - name: "RegistrationsTab"
    description: "Attendee registrations table"
    fields: []

    helpers:
      - name: "tab"
        selector: '[role="tab"]:has-text("Registrations")'
        purpose: "Registrations tab"
      - name: "table"
        selector: '[data-testid="attendee-table"] table'
        purpose: "Attendees data table"
      - name: "emptyState"
        selector: '[data-testid="attendee-table-empty-state"]'
        purpose: "No attendees"
      - name: "exportButton"
        selector: '[data-testid="export-button"]'
        purpose: "Export attendees"

  - name: "CampaignsTab"
    description: "Campaign management table"
    fields: []

    helpers:
      - name: "tab"
        selector: '[role="tab"]:has-text("Campaigns")'
        purpose: "Campaigns tab"
      - name: "table"
        selector: '[data-testid="campaigns-table"] table'
        purpose: "Campaigns data table"
      - name: "emptyState"
        selector: '[data-testid="campaigns-table-empty-state"]'
        purpose: "No campaigns"
      - name: "createCampaignButton"
        selector: 'button:has-text("Create Campaign")'
        purpose: "Open campaign creation"

dynamicSelectors:
  - name: "attendeeRowByKey"
    template: '[data-testid="attendee-table-row-{attendeeId}"]'
    parameter: "attendeeId"
    description: "Find attendee row by attendeeId"
  - name: "campaignRowByKey"
    template: '[data-testid="campaigns-table-row-{campaignId}"]'
    parameter: "campaignId"
    description: "Find campaign row by campaignId"
```

### 4.7 Admin Pages

```yaml
# selector-manifest-admin-pages.yml
# Components: UserManagement, RoleManagement, ScopeGroupManagement (all NEW)

# === USER MANAGEMENT ===
page:
  name: "UserManagement"
  route: "/users"
  urlPath: "/#/users"

sections:
  - name: "UsersTable"
    description: "RBAC user management table"
    fields: []

    helpers:
      - name: "table"
        selector: '[data-testid="user-management-table"] table'
        purpose: "Users data table"
      - name: "emptyState"
        selector: '[data-testid="user-management-table-empty-state"]'
        purpose: "No users"

dynamicSelectors:
  - name: "userRowByKey"
    template: '[data-testid="user-management-table-row-{userId}"]'
    parameter: "userId"
    description: "Find user row"

---

# === ROLE MANAGEMENT ===
page:
  name: "RoleManagement"
  route: "/roles"
  urlPath: "/#/roles"

sections:
  - name: "RolesTable"
    description: "RBAC role management table"
    fields: []

    helpers:
      - name: "table"
        selector: '[data-testid="role-management-table"] table'
        purpose: "Roles data table"
      - name: "emptyState"
        selector: '[data-testid="role-management-table-empty-state"]'
        purpose: "No roles"

---

# === SCOPE & GROUP MANAGEMENT ===
page:
  name: "ScopeGroupManagement"
  route: "/access"
  urlPath: "/#/access"

sections:
  - name: "GroupManagement"
    description: "Group management within scopes"
    fields: []

    helpers:
      - name: "table"
        selector: '[data-testid="scope-group-management-groups-table"] table'
        purpose: "Groups data table"
      - name: "emptyState"
        selector: '[data-testid="scope-group-management-groups-table-empty-state"]'
        purpose: "No groups"
```

### 4.8 TopNav (Layout)

```yaml
# selector-manifest-topnav.yml
# Component: TopNav + UserPanel
# Source: components/layout/TopNav.tsx, components/user/UserPanel.tsx

page:
  name: "TopNav"
  route: "*"
  urlPath: "all pages"

sections:
  - name: "Navigation"
    description: "Main navigation tabs and user panel"
    fields: []

    helpers:
      - name: "logo"
        selector: 'a[href="#/"]'
        purpose: "Adobe EMC logo (home link)"
      - name: "userPanel"
        selector: '[data-testid="user-panel"]'
        purpose: "User avatar/menu trigger"
      - name: "activeGroupBadge"
        selector: '[data-testid="active-group-badge"]'
        purpose: "Current RBAC group badge"

dynamicSelectors:
  - name: "navTab"
    template: 'nav a:has-text("{tabName}")'
    parameter: "tabName"
    description: "Navigate to tab by name (Home, Overview, Events, Registrations, Speakers, Series, About)"

  - name: "groupSwitcherItem"
    template: '[role="menuitem"]:has-text("{groupName}")'
    parameter: "groupName"
    description: "Switch RBAC group"

actions:
  - name: "signOutButton"
    selector: '[role="menuitem"]:has-text("Sign Out")'
  - name: "profileButton"
    selector: '[role="menuitem"]:has-text("Profile")'
```

---

## 5. Old ECC → EMC V2 Selector Migration Map

### 5.1 Dashboard Selectors

| Old ECC Selector | New EMC V2 Selector |
|---|---|
| `h1:has-text("All Events")` | Heading in `ResourceDashboardLayout` |
| `a:has-text("Create new event")` | `[data-testid="create-event-trigger"]` |
| `.dropdown-content` | `[role="menu"]` |
| `a.dropdown-item:has-text("In-Person")` | `[role="menuitem"]:has-text("In-person")` |
| `input[placeholder="Search"]` | `input[type="search"]` |
| `.dashboard-table` | `[data-testid="events-dashboard-table"] table` |
| `.event-row` | `[data-testid="events-dashboard-table-row-{eventId}"]` |
| `.option-col img` | `button[aria-label="Actions menu"]` |
| `.dash-event-tool:has-text("Delete")` | `[role="menuitem"][id="delete"]` |
| `sp-dialog` (delete confirm) | `[role="alertdialog"]` |
| `sp-button:has-text("Yes, I want to delete")` | `[role="alertdialog"] button:has-text("Delete")` |
| `sp-toast:has-text(...)` | Toast via ToastContext |

### 5.2 Event Form Selectors

| Old ECC Selector | New EMC V2 Selector |
|---|---|
| `#info-field-event-title input` | `[data-testid="event-title-input"]` |
| `#event-info-details-rte [role="textbox"]` | `[data-testid="event-description-rte"] [role="textbox"]` |
| `#info-field-event-description textarea` | `[data-testid="event-seo-description"]` |
| `#language-picker` | `[data-testid="language-picker"]` |
| `#event-info-date-picker` | `[data-testid="start-datetime-picker"]` |
| `#time-zone-select-input` | `[data-testid="timezone-combobox"]` |
| `#time-picker-start-time` | **REMOVED** — combined into start DatePicker |
| `#time-picker-end-time` | **REMOVED** — combined into end DatePicker |
| `#private-event` | `[data-testid="private-event-switch"]` |
| `#checkbox-secondary-url` | `[data-testid="secondary-link-switch"]` |
| `#secondary-cta-label input` | `[data-testid="secondary-link-title"]` |
| `#secondary-cta-url input` | `[data-testid="secondary-link-url"]` |
| `.select-input[label="Select a cloud"]` | `[data-testid="format-cloud-picker"]` |
| `.select-input[label="Select a series"]` | `[data-testid="format-series-picker"]` |
| `#venue-info-venue-name input` | `[data-testid="venue-name-input"]` |
| `#checkbox-venue-info-visible` | `[data-testid="venue-visible-switch"]` |
| `.pac-item` | `.pac-item` (unchanged) |
| `#attendee-count-input` | `[data-testid="attendee-limit-input"]` |
| `sp-switch.check-appear[name="X"]` | `[data-testid="rsvp-field-X-visible"]` |
| `sp-switch.check-require[name="X"]` | `[data-testid="rsvp-field-X-required"]` |
| `a[href*="#next"]` | `[data-testid="event-form-next-button"]` |
| `a[href*="#save"]` | `[data-testid="event-form-save-button"]` |
| `a:has-text("Publish event")` | `[data-testid="event-form-publish-button"]` |
| `.save-success-msg` | Toast notification (ToastContext) |
| `button.nav-item:has-text("section")` | `[data-testid="event-form-step-{stepId}"]` |
| `#marketo-event-type-select-input` | `[data-testid="marketo-event-type-picker"]` |
| `#marketo-salesforce-campaign-id-input input` | `[data-testid="marketo-campaign-id-input"]` |

### 5.3 Form Step Mapping (Old Sections → New Steps)

| Old ECC Section | New Wizard Step | Step ID |
|---|---|---|
| EventFormatSection | Step 1 "Basic Info" | `basic-info` |
| EventInfoSection | Step 1 "Basic Info" | `basic-info` |
| EventAgendaSection | Step 1 "Basic Info" | `basic-info` |
| EventVenueSection | Step 1 "Basic Info" | `basic-info` |
| EventTagsSection | Step 1 "Basic Info" | `basic-info` |
| PageMetadataSection | Step 1 "Basic Info" | `basic-info` |
| MarketoIntegrationSection | Step 1 "Basic Info" | `basic-info` |
| VideoContentSection | Step 1 "Basic Info" | `basic-info` |
| SpeakersSection (new) | Step 2 "Speakers & Hosts" | `speakers-hosts` |
| EventAdditionalContentSection | Step 3 "Additional Content" | `additional-content` |
| EventRSVPSection | Step 4 "RSVP" | `rsvp` |

**Key implication**: Step 1 is a long scrollable page. Tests that previously clicked between sections must now scroll within Step 1. Navigation selectors: `[data-testid="event-form-step-basic-info"]`, `[data-testid="event-form-step-speakers-hosts"]`, `[data-testid="event-form-step-additional-content"]`, `[data-testid="event-form-step-rsvp"]`.

---

## 6. Complete `data-testid` Reference

Every `data-testid` value that exists in the EMC V2 codebase, organized by component:

### Layout & Navigation
| testid | File | Element |
|--------|------|---------|
| `user-panel` | UserPanel.tsx | User avatar menu trigger |
| `active-group-badge` | UserPanel.tsx | Current RBAC group badge |

### EventsDashboard
| testid | File | Element |
|--------|------|---------|
| `events-dashboard` | EventsDashboard.tsx | Root wrapper |
| `create-event-trigger` | EventsDashboard.tsx | Create new event button |
| `filter-series-picker` | EventsDashboard.tsx | Series filter |
| `filter-creator-picker` | EventsDashboard.tsx | Creator filter |
| `filter-status-picker` | EventsDashboard.tsx | Status filter |
| `filter-cloud-picker` | EventsDashboard.tsx | Cloud filter |
| `events-dashboard-table` | (via testIds prop) | Table root |
| `events-dashboard-table-empty-state` | (via testIds prop) | Empty state |
| `events-dashboard-table-page-input` | (via testIds prop) | Page input |
| `events-dashboard-table-header-{key}` | (via testIds prop) | Column header |
| `events-dashboard-table-row-{eventId}` | (via testIds prop) | Data row |

### EventForm (FormatSelectionOverlay)
| testid | File | Element |
|--------|------|---------|
| `format-selection-overlay` | EventForm.tsx | Overlay backdrop |
| `format-cloud-picker` | EventForm.tsx | Cloud Picker |
| `format-series-picker` | EventForm.tsx | Series Picker |
| `format-cancel-button` | EventForm.tsx | Back to Dashboard |
| `format-confirm-button` | EventForm.tsx | Confirm & Continue |

### EventForm (FormWizard — via testIds prop)
| testid | File | Element |
|--------|------|---------|
| `event-form-wizard` | EventForm.tsx → FormWizard | Root |
| `event-form-side-nav` | EventForm.tsx → FormWizard | Side nav |
| `event-form-dashboard-button` | EventForm.tsx → FormWizard | Dashboard button |
| `event-form-step-{stepId}` | EventForm.tsx → FormWizard | Step nav button |
| `event-form-progress` | EventForm.tsx → FormWizard | Progress bar |
| `event-form-back-button` | EventForm.tsx → FormWizard | Back (ChevronLeft) |
| `event-form-preview-pre` | EventForm.tsx → FormWizard | Pre-event preview |
| `event-form-preview-post` | EventForm.tsx → FormWizard | Post-event preview |
| `event-form-publish-button` | EventForm.tsx → FormWizard | Publish/Re-publish |
| `event-form-save-button` | EventForm.tsx → FormWizard | Save |
| `event-form-next-button` | EventForm.tsx → FormWizard | Next |
| `event-form-step-heading` | EventForm.tsx → FormWizard | Step heading |
| `event-form-status-badge` | EventForm.tsx → FormWizard | Status badge |

### EventForm (Step 1 — Basic Info)
| testid | File | Element |
|--------|------|---------|
| `event-format-section` | EventFormatComponent.tsx | Format section wrapper |
| `cloud-badge` | EventFormatComponent.tsx | Cloud type text |
| `series-badge` | EventFormatComponent.tsx | Series name text |
| `reselect-format-button` | EventFormatComponent.tsx | Re-select button |
| `tag-selector` | EventTagsComponent.tsx | Tag selector wrapper |
| `language-picker` | EventInfoComponent.tsx | Language Picker |
| `event-title-input` | EventInfoComponent.tsx | Event Title TextField |
| `event-en-title-input` | EventInfoComponent.tsx | English URL title |
| `event-description-rte` | EventInfoComponent.tsx | Description RTE wrapper |
| `event-seo-description` | EventInfoComponent.tsx | SEO description TextArea |
| `start-datetime-picker` | EventInfoComponent.tsx | Start DatePicker |
| `end-datetime-picker` | EventInfoComponent.tsx | End DatePicker |
| `timezone-combobox` | EventInfoComponent.tsx | Timezone ComboBox |
| `private-event-switch` | EventInfoComponent.tsx | Private event Switch |
| `invite-only-switch` | EventInfoComponent.tsx | Invite only Switch |
| `secondary-link-switch` | EventInfoComponent.tsx | Secondary link toggle |
| `secondary-link-title` | EventInfoComponent.tsx | Secondary link title |
| `secondary-link-url` | EventInfoComponent.tsx | Secondary link URL |
| `agenda-section` | AgendaComponent.tsx | Agenda wrapper |
| `agenda-order-by-time` | AgendaComponent.tsx | Order by time Switch |
| `agenda-add-slot` | AgendaComponent.tsx | Add slot button |
| `agenda-post-event-switch` | AgendaComponent.tsx | Post-event Switch |
| `venue-name-input` | VenueComponent.tsx | Venue name input |
| `venue-visible-switch` | VenueComponent.tsx | Show venue post-event |
| `venue-alt-name-input` | VenueComponent.tsx | Alt venue name TextField |
| `venue-instructions-visible-switch` | VenueComponent.tsx | Show instructions post-event |
| `meta-{field.key}-input` | PageMetadataComponent.tsx | Dynamic metadata Picker |
| `marketo-event-type-picker` | MarketoIntegrationComponent.tsx | Marketo event type |
| `marketo-campaign-id-input` | MarketoIntegrationComponent.tsx | Salesforce campaign ID |
| `marketo-program-name-input` | MarketoIntegrationComponent.tsx | MCZ program name |
| `video-url-input` | VideoContentComponent.tsx | Video URL TextField |

### EventForm (Step 2 — Speakers)
| testid | File | Element |
|--------|------|---------|
| `add-speaker-button` | SpeakersComponent.tsx | Add Speaker button (x2) |
| `speaker-picker-dialog` | SpeakerPickerDialog.tsx | Speaker picker Dialog |

### EventForm (Step 3 — Additional Content)
| testid | File | Element |
|--------|------|---------|
| `promo-content-rte` | PromotionalContentComponent.tsx | Promo content wrapper |
| `add-sponsor-button` | SponsorsComponent.tsx | Add Partner button (x2) |
| `hero-image-uploader` | EventImagesComponent.tsx | Hero image wrapper |
| `card-image-uploader` | EventImagesComponent.tsx | Card image wrapper |

### EventForm (Step 4 — RSVP)
| testid | File | Element |
|--------|------|---------|
| `attendee-limit-input` | RegistrationConfigComponent.tsx | Attendee limit NumberField |
| `allow-waitlist-switch` | RegistrationConfigComponent.tsx | Waitlist Switch |
| `allow-guest-switch` | RegistrationConfigComponent.tsx | Guest registration Switch |
| `contact-host-switch` | RegistrationConfigComponent.tsx | Contact host Switch |
| `host-email-input` | RegistrationConfigComponent.tsx | Host email TextField |
| `rsvp-description-rte` | RegistrationConfigComponent.tsx | RSVP description wrapper |
| `rsvp-field-{name}-visible` | RegistrationFieldsComponent.tsx | Field visibility Switch |
| `rsvp-field-{name}-required` | RegistrationFieldsComponent.tsx | Field required Switch |

### SeriesDashboard
| testid | File | Element |
|--------|------|---------|
| `series-dashboard` | SeriesDashboard.tsx | Root wrapper |
| `create-series-button` | (via ResourceDashboardLayout) | Create button |
| `series-dashboard-table` | (via testIds prop) | Table root |
| `series-dashboard-table-*` | (via testIds prop) | Headers, rows, etc. |

### SeriesForm
| testid | File | Element |
|--------|------|---------|
| `series-name-input` | SeriesDetailsComponent.tsx | Series Name TextField |
| `series-cloud-picker` | SeriesDetailsComponent.tsx | Cloud Picker |
| `series-description-input` | SeriesDetailsComponent.tsx | Description TextArea |
| `series-template-picker` | SeriesTemplateComponent.tsx | Template picker |

### SpeakersDashboard
| testid | File | Element |
|--------|------|---------|
| `speakers-dashboard` | SpeakersDashboard.tsx | Root wrapper |
| `series-selector` | SpeakersDashboard.tsx | Series ComboBox |
| `add-speaker-button` | SpeakersDashboard.tsx | Add Speaker button |
| `speakers-dashboard-table` | (via testIds prop) | Table root |
| `speakers-dashboard-table-*` | (via testIds prop) | Headers, rows, etc. |

### Registrations
| testid | File | Element |
|--------|------|---------|
| `event-selector-combobox` | EventSelectorComponent.tsx | Event ComboBox |
| `export-button` | RegistrationsTab.tsx | Export ActionButton |
| `attendee-table` | (via testIds prop) | Attendee table root |
| `attendee-table-*` | (via testIds prop) | Headers, rows, etc. |
| `campaigns-table` | (via testIds prop) | Campaigns table root |
| `campaigns-table-*` | (via testIds prop) | Headers, rows, etc. |

### Admin Pages
| testid | File | Element |
|--------|------|---------|
| `user-management-table` | (via testIds prop) | Users table root |
| `user-management-table-*` | (via testIds prop) | Headers, rows, etc. |
| `role-management-table` | (via testIds prop) | Roles table root |
| `role-management-table-*` | (via testIds prop) | Headers, rows, etc. |
| `scope-group-management-groups-table` | (via testIds prop) | Groups table root |
| `scope-group-management-groups-table-*` | (via testIds prop) | Headers, rows, etc. |

---

## 7. API Layer Notes

The API endpoints and entities are **unchanged** between old ECC and EMC V2. Both apps call the same ESP/ESL backends.

- **Same endpoints**: `/v1/events`, `/v1/series`, `/v1/events/{eventId}/venues`, etc.
- **Same auth**: Bearer token + `x-gw-ims-org-id` + `x-api-key: acom_event_service`
- **Same RBAC header**: `x-adobe-esp-group-id`
- **Same entity models**: Event, Series, Venue, Speaker, Sponsor, Campaign, Attendee

**All API tests (`@api` tag) should work as-is with no changes.**

---

## 8. Risk Assessment & Migration Phases

### High Risk (Must Resolve First)
1. **DatePicker handler** — Completely different interaction model (segmented vs calendar widget)
2. **Dropdown handler** — `sp-picker` → S2 Picker `[role="listbox"]`/`[role="option"]`
3. **Switch handler** — `sp-switch[name]` → S2 Switch via `[data-testid]`
4. **Wizard step navigation** — 8 sections → 4 steps (scrolling within Step 1)

### Medium Risk
5. **ComboBox handler** — New pattern for timezone, series selector, speaker search
6. **Agenda card interaction** — Collapsible cards vs repeater-element rows
7. **Speaker/Sponsor picker dialogs** — Entirely new UI flow
8. **Toast notifications** — From CSS class `.save-success-msg` to S2 Toast via context

### Low Risk
9. **Text/textarea/richtext** — Same interaction, new `[data-testid]` selectors
10. **Image upload** — Same `input[type="file"]` pattern
11. **Venue autocomplete** — Same Google Places, `[data-testid="venue-name-input"]` + `.pac-item`
12. **API tests** — No changes needed

### Recommended Phases

| Phase | Scope |
|---|---|
| **Phase 1** | Rewrite field handlers: `s2picker`, `s2switch`, `s2datepicker`, `s2combobox` |
| **Phase 2** | Create new base page class for HashRouter navigation |
| **Phase 3** | Migrate EventsDashboard + SeriesDashboard page objects |
| **Phase 4** | Migrate EventForm page object (all 4 steps) |
| **Phase 5** | Create new page objects: SpeakersDashboard, Registrations |
| **Phase 6** | Migrate feature files (update steps, selectors, nav flow) |
| **Phase 7** | Full regression pass |
