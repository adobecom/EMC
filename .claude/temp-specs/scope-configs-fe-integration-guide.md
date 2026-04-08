# Scope Configs & Custom Attributes — FE Integration Guide

## Overview

Scope configs and custom attributes provide configurable, scope-inherited settings for the events console. Configs hold typed configuration data (RSVP form fields, locales). Custom attributes define admin-created fields that marketers fill in per event.

Both inherit down the scope hierarchy: **org → team**. FE reads them via convenience endpoints that resolve the chain automatically.

---

## API Endpoints & Sample Responses

### 1. List Configs for an Event

```
GET /v1/events/{eventId}/configs
GET /v1/events/{eventId}/configs?type=rsvp
```

**Sample Response — all configs:**
```json
{
  "configs": [
    {
      "configId": "5bff274f-4f58-419e-8729-9096fac8b737",
      "type": "rsvp",
      "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
      "creationTime": 1712345678000,
      "modificationTime": 1712345678000,
      "rsvpFormFields": [
        {
          "field": "firstName",
          "label": "First name",
          "placeholder": "First Name",
          "type": "text",
          "required": true,
          "options": [],
          "rules": "",
          "default": "",
          "displayAs": "dropdown"
        },
        {
          "field": "lastName",
          "label": "Last name",
          "placeholder": "Last Name",
          "type": "text",
          "required": true,
          "options": [],
          "rules": "",
          "default": "",
          "displayAs": "dropdown"
        },
        {
          "field": "email",
          "label": "Email",
          "placeholder": "Email",
          "type": "email",
          "required": true,
          "options": [],
          "rules": "",
          "default": "",
          "displayAs": "dropdown"
        },
        {
          "field": "jobTitle",
          "label": "Job title",
          "placeholder": "",
          "type": "select",
          "required": true,
          "options": [
            "Art or Creative Director",
            "Animator",
            "Artist / Illustrator",
            "Graphic Designer",
            "UI / UX Designer",
            "Developer",
            "Marketer / Digital Content Creator",
            "Student",
            "Other"
          ],
          "rules": "",
          "default": "",
          "displayAs": "dropdown"
        },
        {
          "field": "productsOfInterest",
          "label": "Products of interest",
          "placeholder": "",
          "type": "multi-select",
          "required": false,
          "options": [
            "Acrobat Pro",
            "Adobe Express",
            "Adobe Firefly",
            "Adobe Photoshop",
            "Illustrator",
            "InDesign",
            "Lightroom",
            "Premiere Pro"
          ],
          "rules": "",
          "default": "",
          "displayAs": "checkbox"
        },
        {
          "field": "companySize",
          "label": "Company size",
          "placeholder": "",
          "type": "select",
          "required": false,
          "options": [
            "1",
            "2 - 9",
            "10 - 49",
            "50 - 99",
            "100 - 199",
            "200 - 499",
            "500 - 999",
            "1,000 - 2,499",
            "2,500 - 4,999",
            "5,000 - 9,999",
            "10,000 or more",
            "Don't know"
          ],
          "rules": "",
          "default": "",
          "displayAs": "radio"
        }
      ],
      "enabledAttributes": [
        {
          "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b",
          "name": "primaryProductName"
        },
        {
          "attributeId": "f75144b3-74a7-4a66-b2f5-2987d154546f",
          "name": "promotionalContent"
        }
      ],
      "localizations": {
        "fr-FR": {
          "rsvpFormFields": [
            { "field": "firstName", "label": "Prénom", "placeholder": "Prénom" },
            { "field": "lastName", "label": "Nom de famille", "placeholder": "Nom de famille" },
            { "field": "email", "label": "Courriel", "placeholder": "Courriel" },
            { "field": "jobTitle", "label": "Titre du poste", "options": [
              "Directeur artistique",
              "Animateur",
              "Artiste / Illustrateur",
              "Designer graphique",
              "Designer UI / UX",
              "Développeur",
              "Spécialiste marketing",
              "Étudiant",
              "Autre"
            ]},
            { "field": "productsOfInterest", "label": "Produits d'intérêt" },
            { "field": "companySize", "label": "Taille de l'entreprise" }
          ]
        }
      }
    },
    {
      "configId": "0ae6adb8-a3be-4ad1-997b-8184c71b051c",
      "type": "locales",
      "scopeId": "25f26faa-f8e2-4e99-b341-81a3995ef9af",
      "creationTime": 1712345700000,
      "modificationTime": 1712345700000,
      "localeNames": {
        "en-US": "English, United States",
        "fr-FR": "French, France",
        "de-DE": "German, Germany",
        "ja-JP": "Japanese, Japan"
      },
      "localeUrlCodes": {
        "en-US": "",
        "fr-FR": "fr",
        "de-DE": "de",
        "ja-JP": "jp"
      }
    },
    {
      "configId": "02510358-21b8-40ab-b693-44513051a3aa",
      "type": "custom-attributes",
      "scopeId": "25f26faa-f8e2-4e99-b341-81a3995ef9af",
      "creationTime": 1712345800000,
      "modificationTime": 1712345800000,
      "enabledAttributes": [
        {
          "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b",
          "name": "primaryProductName"
        }
      ]
    }
  ],
  "count": 3,
  "nextPageToken": null
}
```

**Sample Response — filtered by type (`?type=rsvp`):**
```json
{
  "configs": [
    {
      "configId": "5bff274f-4f58-419e-8729-9096fac8b737",
      "type": "rsvp",
      "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
      "rsvpFormFields": [ "...same as above..." ],
      "enabledAttributes": [ "...same as above..." ],
      "localizations": { "...same as above..." }
    }
  ],
  "count": 1,
  "nextPageToken": null
}
```

**Sample Response — no configs found:**
```json
{
  "configs": [],
  "count": 0
}
```

---

### 2. List Configs for a Series

```
GET /v1/series/{seriesId}/configs
GET /v1/series/{seriesId}/configs?type=locales
```

Same response shape as event configs. The series → scope resolution happens server-side.

---

### 3. List Custom Attributes for an Event

```
GET /v1/events/{eventId}/custom-attributes
```

**Sample Response:**
```json
{
  "customAttributes": [
    {
      "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b",
      "name": "primaryProductName",
      "inputType": "single-select",
      "values": [
        { "valueId": "a1b2c3d4-0001", "value": "Photoshop", "displayOrder": 0 },
        { "valueId": "a1b2c3d4-0002", "value": "Illustrator", "displayOrder": 1 },
        { "valueId": "a1b2c3d4-0003", "value": "Premiere Pro", "displayOrder": 2 }
      ],
      "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
      "creationTime": 1712340000000,
      "modificationTime": 1712340000000
    },
    {
      "attributeId": "f75144b3-74a7-4a66-b2f5-2987d154546f",
      "name": "promotionalContent",
      "inputType": "multi-select",
      "values": [
        { "valueId": "b2c3d4e5-0001", "value": "Blog Post", "displayOrder": 0 },
        { "valueId": "b2c3d4e5-0002", "value": "Social Media", "displayOrder": 1 },
        { "valueId": "b2c3d4e5-0003", "value": "Email Campaign", "displayOrder": 2 },
        { "valueId": "b2c3d4e5-0004", "value": "Video", "displayOrder": 3 }
      ],
      "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
      "creationTime": 1712341000000,
      "modificationTime": 1712341000000
    },
    {
      "attributeId": "c3d4e5f6-1111-2222-3333-444455556666",
      "name": "splashPageKey",
      "inputType": "text",
      "values": [],
      "scopeId": "25f26faa-f8e2-4e99-b341-81a3995ef9af",
      "creationTime": 1712342000000,
      "modificationTime": 1712342000000
    },
    {
      "attributeId": "d4e5f6a7-1111-2222-3333-444455556666",
      "name": "isVipEvent",
      "inputType": "boolean",
      "values": [],
      "scopeId": "25f26faa-f8e2-4e99-b341-81a3995ef9af",
      "creationTime": 1712343000000,
      "modificationTime": 1712343000000
    }
  ],
  "count": 4
}
```

---

### 4. List Custom Attributes for a Series

```
GET /v1/series/{seriesId}/custom-attributes
```

Same response shape as event custom attributes.

---

### 5. Create a Config (Admin)

```
POST /v1/scopes/{scopeId}/configs
Content-Type: application/json

{
  "type": "rsvp",
  "rsvpFormFields": [
    {
      "field": "firstName",
      "label": "First name",
      "placeholder": "First Name",
      "type": "text",
      "required": true
    }
  ],
  "enabledAttributes": [
    { "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b", "name": "primaryProductName" }
  ]
}
```

**Sample Response (201):**
```json
{
  "configId": "7a8b9c0d-1234-5678-9abc-def012345678",
  "type": "rsvp",
  "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
  "creationTime": 1712345678000,
  "modificationTime": 1712345678000,
  "rsvpFormFields": [
    {
      "field": "firstName",
      "label": "First name",
      "placeholder": "First Name",
      "type": "text",
      "required": true
    }
  ],
  "enabledAttributes": [
    { "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b", "name": "primaryProductName" }
  ]
}
```

**Error — duplicate type (409):**
```json
{
  "message": "A config with type 'rsvp' already exists for this scope"
}
```

**Error — platform scope (400):**
```json
{
  "message": "Configs cannot be created at the platform scope level. Use org or team scopes."
}
```

---

### 6. Update a Config (Admin)

```
PUT /v1/scopes/{scopeId}/configs/{configId}
Content-Type: application/json

{
  "configId": "7a8b9c0d-1234-5678-9abc-def012345678",
  "type": "rsvp",
  "rsvpFormFields": [
    { "field": "firstName", "label": "First name", "type": "text", "required": true },
    { "field": "email", "label": "Email", "type": "email", "required": true }
  ]
}
```

**Sample Response (200):**
```json
{
  "configId": "7a8b9c0d-1234-5678-9abc-def012345678",
  "type": "rsvp",
  "modificationTime": 1712346000000,
  "rsvpFormFields": [
    { "field": "firstName", "label": "First name", "type": "text", "required": true },
    { "field": "email", "label": "Email", "type": "email", "required": true }
  ]
}
```

---

### 7. Delete a Config (Admin)

```
DELETE /v1/scopes/{scopeId}/configs/{configId}
```

**Response: 204 No Content** (empty body)

---

### 8. Create a Custom Attribute (Admin)

```
POST /v1/scopes/{scopeId}/custom-attributes
Content-Type: application/json

{
  "name": "targetAudience",
  "inputType": "single-select",
  "values": [
    { "value": "Enterprise" },
    { "value": "SMB" },
    { "value": "Education" },
    { "value": "Government" }
  ]
}
```

**Sample Response (201):**
```json
{
  "attributeId": "e5f6a7b8-1234-5678-9abc-def012345678",
  "name": "targetAudience",
  "inputType": "single-select",
  "values": [
    { "valueId": "f6a7b8c9-0001", "value": "Enterprise", "displayOrder": 0 },
    { "valueId": "f6a7b8c9-0002", "value": "SMB", "displayOrder": 1 },
    { "valueId": "f6a7b8c9-0003", "value": "Education", "displayOrder": 2 },
    { "valueId": "f6a7b8c9-0004", "value": "Government", "displayOrder": 3 }
  ],
  "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
  "creationTime": 1712350000000,
  "modificationTime": 1712350000000
}
```

Note: `valueId` and `displayOrder` are auto-generated by the server. You only need to send `value` in the request.

**Error — platform scope (400):**
```json
{
  "message": "Custom attributes cannot be created at the platform scope level. Use org or team scopes."
}
```

**Error — missing name (400):**
```json
{
  "message": "name is required when creating a custom attribute"
}
```

---

### 9. Update a Custom Attribute (Admin)

```
PUT /v1/scopes/{scopeId}/custom-attributes/{attributeId}
Content-Type: application/json

{
  "attributeId": "e5f6a7b8-1234-5678-9abc-def012345678",
  "name": "targetAudience",
  "inputType": "single-select",
  "values": [
    { "valueId": "f6a7b8c9-0001", "value": "Enterprise", "displayOrder": 0 },
    { "valueId": "f6a7b8c9-0002", "value": "SMB", "displayOrder": 1 },
    { "valueId": "f6a7b8c9-0003", "value": "Education", "displayOrder": 2 },
    { "valueId": "f6a7b8c9-0004", "value": "Government", "displayOrder": 3 },
    { "value": "Non-Profit" }
  ]
}
```

**Sample Response (200):**
```json
{
  "attributeId": "e5f6a7b8-1234-5678-9abc-def012345678",
  "name": "targetAudience",
  "inputType": "single-select",
  "values": [
    { "valueId": "f6a7b8c9-0001", "value": "Enterprise", "displayOrder": 0 },
    { "valueId": "f6a7b8c9-0002", "value": "SMB", "displayOrder": 1 },
    { "valueId": "f6a7b8c9-0003", "value": "Education", "displayOrder": 2 },
    { "valueId": "f6a7b8c9-0004", "value": "Government", "displayOrder": 3 },
    { "valueId": "a7b8c9d0-0005", "value": "Non-Profit", "displayOrder": 4 }
  ],
  "modificationTime": 1712351000000
}
```

Note: New values without a `valueId` get one auto-generated. Existing values with `valueId` are preserved.

---

### 10. Delete a Custom Attribute (Admin)

```
DELETE /v1/scopes/{scopeId}/custom-attributes/{attributeId}
```

**Response: 204 No Content** (empty body)

---

### 11. Get a Single Config

```
GET /v1/scopes/{scopeId}/configs/{configId}
```

**Sample Response (200):**
```json
{
  "configId": "5bff274f-4f58-419e-8729-9096fac8b737",
  "type": "rsvp",
  "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
  "creationTime": 1712345678000,
  "modificationTime": 1712345678000,
  "rsvpFormFields": [ ... ],
  "enabledAttributes": [ ... ],
  "localizations": {
    "fr-FR": { "rsvpFormFields": [ ... ] }
  }
}
```

---

### 12. Get a Single Custom Attribute

```
GET /v1/scopes/{scopeId}/custom-attributes/{attributeId}
```

**Sample Response (200):**
```json
{
  "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b",
  "name": "primaryProductName",
  "inputType": "single-select",
  "values": [
    { "valueId": "a1b2c3d4-0001", "value": "Photoshop", "displayOrder": 0 },
    { "valueId": "a1b2c3d4-0002", "value": "Illustrator", "displayOrder": 1 },
    { "valueId": "a1b2c3d4-0003", "value": "Premiere Pro", "displayOrder": 2 }
  ],
  "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
  "creationTime": 1712340000000,
  "modificationTime": 1712340000000
}
```

---

### 13. List Configs for a Scope (Admin — with hierarchy merge)

```
GET /v1/scopes/{scopeId}/configs
GET /v1/scopes/{scopeId}/configs?type=rsvp
```

Same response shape as event/series configs. Includes configs inherited from parent scopes. Each config's `scopeId` tells you where it originated.

---

## Required Headers

```
Authorization: Bearer {ims_token}
x-adobe-esp-group-id: {group_id}
Content-Type: application/json          ← only for POST/PUT
```

---

## Integration Patterns

### 1. Loading RSVP Form Fields for Event Registration

```javascript
const res = await fetch(`/v1/events/${eventId}/configs?type=rsvp`, { headers });
const { configs } = await res.json();
const rsvpConfig = configs[0]; // one config per type

if (rsvpConfig) {
  const formFields = rsvpConfig.rsvpFormFields || [];

  formFields.forEach(field => {
    // field.field       → "jobTitle" (API key)
    // field.label       → "Job title" (display text)
    // field.placeholder → "Job Title"
    // field.type        → "select" | "multi-select" | "text" | "email" | "phone"
    // field.displayAs   → "dropdown" | "radio" | "checkbox" (for select types)
    // field.required    → true/false
    // field.options     → ["Option A", "Option B", ...] (for select types)
    // field.default     → default value
    // field.rules       → "full-width" etc.
  });
}
```

### 2. Loading Locales for Event Creation

```javascript
const res = await fetch(`/v1/series/${seriesId}/configs?type=locales`, { headers });
const { configs } = await res.json();
const localesConfig = configs[0];

if (localesConfig) {
  const localeNames = localesConfig.localeNames;
  // { "en-US": "English, United States", "fr-FR": "French, France" }
  // → populate locale dropdown

  const localeUrlCodes = localesConfig.localeUrlCodes;
  // { "en-US": "", "fr-FR": "fr" }
  // → used for building detail page paths
}
```

### 3. Loading Custom Attributes for Event Form

```javascript
const res = await fetch(`/v1/events/${eventId}/custom-attributes`, { headers });
const { customAttributes } = await res.json();

customAttributes.forEach(attr => {
  switch (attr.inputType) {
    case 'text':
      // render text input
      break;
    case 'boolean':
      // render checkbox/toggle
      break;
    case 'single-select':
      // render dropdown or radio group using attr.values
      // each value: { valueId, value, displayOrder }
      break;
    case 'multi-select':
      // render multi-select or checkbox group using attr.values
      break;
  }
});
```

### 4. Saving Custom Attribute Values on an Event

```javascript
const customAttributes = [];

// Multi-select: one entry per selected value
customAttributes.push(
  {
    attributeId: "52ff35ec-...",
    attribute: "primaryProductName",      // denormalized name
    valueId: "a1b2c3d4-0001",
    value: "Photoshop",                   // denormalized value
    displayOrder: 0
  }
);

// Multi-select with multiple selections
customAttributes.push(
  { attributeId: "f75144b3-...", attribute: "promotionalContent", valueId: "b2c3d4e5-0001", value: "Blog Post", displayOrder: 0 },
  { attributeId: "f75144b3-...", attribute: "promotionalContent", valueId: "b2c3d4e5-0004", value: "Video", displayOrder: 3 }
);

// Text attribute
customAttributes.push({
  attributeId: "c3d4e5f6-...",
  attribute: "splashPageKey",
  value: "summit-2026-splash"
});

// Boolean attribute
customAttributes.push({
  attributeId: "d4e5f6a7-...",
  attribute: "isVipEvent",
  value: "true"
});

// Save on event
await fetch(`/v1/events/${eventId}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ ...eventData, customAttributes })
});
```

### 5. Using Config-Linked Custom Attributes

```javascript
// Load RSVP config + all custom attributes in parallel
const [configRes, attrRes] = await Promise.all([
  fetch(`/v1/events/${eventId}/configs?type=rsvp`, { headers }),
  fetch(`/v1/events/${eventId}/custom-attributes`, { headers })
]);
const { configs } = await configRes.json();
const { customAttributes } = await attrRes.json();
const rsvpConfig = configs[0];

// Filter to only attributes enabled for this config
const enabledIds = new Set((rsvpConfig?.enabledAttributes || []).map(a => a.attributeId));
const rsvpAttributes = customAttributes.filter(a => enabledIds.has(a.attributeId));

// Render: RSVP form fields + rsvpAttributes together in the registration form
```

### 6. Handling RSVP Localizations

```javascript
const rsvpConfig = configs[0];
const userLocale = event.defaultLocale; // e.g. "fr-FR"

const baseFields = rsvpConfig.rsvpFormFields || [];
const localeOverrides = rsvpConfig.localizations?.[userLocale]?.rsvpFormFields || [];

// Merge: localized values override base, fall back to base if no translation
const localizedFields = baseFields.map(field => {
  const override = localeOverrides.find(o => o.field === field.field);
  return {
    ...field,
    label: override?.label || field.label,
    placeholder: override?.placeholder || field.placeholder,
    options: override?.options || field.options
  };
});
```

---

## Hierarchy Behavior

| Resource | Merge Strategy | Example |
|----------|---------------|---------|
| Configs | **Full replace** per type | Team's `rsvp` config fully replaces org's `rsvp` config |
| Custom Attributes | **Accumulate** | Team sees own attributes + all org attributes |

Each item in the response includes a `scopeId` field indicating where it was originally defined.

---

## Input Type Reference

### Custom Attribute `inputType` Values

| Value | Render As | Values Array |
|-------|-----------|-------------|
| `text` | Text input | Not used |
| `boolean` | Checkbox/toggle | Not used |
| `single-select` | Dropdown or radio buttons | Required — list of options |
| `multi-select` | Multi-dropdown or checkboxes | Required — list of options |

### RSVP Form Field `type` Values

| Value | Render As |
|-------|-----------|
| `text` | Text input |
| `email` | Email input (with validation) |
| `phone` | Phone input |
| `select` | Dropdown or radio buttons (check `displayAs`) |
| `multi-select` | Multi-dropdown or checkboxes (check `displayAs`) |

### RSVP Form Field `displayAs` Values

| Value | Applies To | Render As |
|-------|-----------|-----------|
| `dropdown` | `select` | Standard dropdown |
| `radio` | `select` | Radio button group |
| `dropdown` | `multi-select` | Multi-select dropdown |
| `checkbox` | `multi-select` | Checkbox group |

---

## Error Responses

All errors return JSON with a `message` field:

```json
{ "message": "Human-readable error description" }
```

| Status | Meaning | Example Message |
|--------|---------|-----------------|
| 200 | Success | — |
| 201 | Created | — |
| 204 | Deleted (empty body) | — |
| 400 | Bad request | `"type is required when creating a config"` |
| 400 | Platform restriction | `"Configs cannot be created at the platform scope level. Use org or team scopes."` |
| 403 | Forbidden | `"Insufficient permissions"` |
| 404 | Not found | `"Config not found"` / `"Scope not found"` |
| 409 | Duplicate | `"A config with type 'rsvp' already exists for this scope"` |
| 500 | Server error | `"Internal server error"` |

---

## Notes

- Configs and custom attributes **cannot** be created at the platform scope level — only org and team scopes
- The `?type=` query parameter filters configs by type; omit it to get all configs
- Custom attribute values on events are **denormalized** — both IDs and display names are stored for fast reads
- RSVP form field labels and select options support **localization** via the `localizations` object on the config
- New custom attribute values without a `valueId` get one auto-generated on create/update
- `displayOrder` is auto-assigned by array index if not provided