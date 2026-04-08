# Scope Configs — FE Integration Guide

## Overview

Scope configs provide configurable, scope-inherited settings for the events console. All configuration — RSVP form fields, locales, custom attributes — lives under a single config system with typed entries. Configs inherit down the scope hierarchy (org → team) with full-replace merge per type.

Custom attributes are a config type (`type: 'custom-attributes'`), not a separate entity.

---

## API Endpoints

### Reading Configs (most common FE use case)

```
GET /v1/events/{eventId}/configs                    → all configs for an event
GET /v1/events/{eventId}/configs?type=rsvp           → just RSVP config
GET /v1/events/{eventId}/configs?type=locales         → just locales config
GET /v1/events/{eventId}/configs?type=custom-attributes → just custom attribute definitions

GET /v1/series/{seriesId}/configs                    → all configs for a series
GET /v1/series/{seriesId}/configs?type=rsvp           → just RSVP config
```

### Admin Config Management

```
GET    /v1/scopes/{scopeId}/configs                    → list configs (hierarchy merged)
POST   /v1/scopes/{scopeId}/configs                    → create config
GET    /v1/scopes/{scopeId}/configs/{configId}         → get single config
PUT    /v1/scopes/{scopeId}/configs/{configId}         → update config
DELETE /v1/scopes/{scopeId}/configs/{configId}         → delete config
```

### Required Headers

```
Authorization: Bearer {ims_token}
x-adobe-esp-group-id: {group_id}
Content-Type: application/json          ← only for POST/PUT
```

### Permissions

Config routes require `config:read`, `config:write`, or `config:delete` permissions on the user's role.

---

## Sample Responses

### GET /v1/events/{eventId}/configs — All configs

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
          "displayAs": "dropdown",
          "options": [],
          "rules": "",
          "default": ""
        },
        {
          "field": "email",
          "label": "Email",
          "placeholder": "Email",
          "type": "email",
          "required": true,
          "displayAs": "dropdown",
          "options": [],
          "rules": "",
          "default": ""
        },
        {
          "field": "jobTitle",
          "label": "Job title",
          "type": "select",
          "required": true,
          "displayAs": "dropdown",
          "options": [
            "Art or Creative Director",
            "Animator",
            "Developer",
            "Marketer",
            "Student",
            "Other"
          ],
          "rules": "",
          "default": ""
        },
        {
          "field": "productsOfInterest",
          "label": "Products of interest",
          "type": "multi-select",
          "required": false,
          "displayAs": "checkbox",
          "options": ["Acrobat Pro", "Adobe Express", "Photoshop", "Illustrator", "Premiere Pro"],
          "rules": "",
          "default": ""
        }
      ],
      "localizations": {
        "fr-FR": {
          "rsvpFormFields": [
            { "field": "firstName", "label": "Prénom", "placeholder": "Prénom" },
            { "field": "email", "label": "Courriel", "placeholder": "Courriel" },
            { "field": "jobTitle", "label": "Titre du poste", "options": ["Directeur artistique", "Animateur", "Développeur", "Spécialiste marketing", "Étudiant", "Autre"] },
            { "field": "productsOfInterest", "label": "Produits d'intérêt" }
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
      "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
      "creationTime": 1712345800000,
      "modificationTime": 1712345800000,
      "attributes": [
        {
          "attributeId": "52ff35ec-746b-4d3d-9835-5cf5eac0910b",
          "name": "primaryProductName",
          "inputType": "single-select",
          "enabled": true,
          "values": [
            { "valueId": "a1b2c3d4-0001", "value": "Photoshop", "displayOrder": 0 },
            { "valueId": "a1b2c3d4-0002", "value": "Illustrator", "displayOrder": 1 },
            { "valueId": "a1b2c3d4-0003", "value": "Premiere Pro", "displayOrder": 2 }
          ]
        },
        {
          "attributeId": "f75144b3-74a7-4a66-b2f5-2987d154546f",
          "name": "promotionalContent",
          "inputType": "multi-select",
          "enabled": true,
          "values": [
            { "valueId": "b2c3d4e5-0001", "value": "Blog Post", "displayOrder": 0 },
            { "valueId": "b2c3d4e5-0002", "value": "Social Media", "displayOrder": 1 },
            { "valueId": "b2c3d4e5-0003", "value": "Video", "displayOrder": 2 }
          ]
        },
        {
          "attributeId": "c3d4e5f6-1111-2222-3333-444455556666",
          "name": "splashPageKey",
          "inputType": "text",
          "enabled": true,
          "values": []
        },
        {
          "attributeId": "d4e5f6a7-1111-2222-3333-444455556666",
          "name": "isVipEvent",
          "inputType": "boolean",
          "enabled": false,
          "values": []
        }
      ]
    }
  ],
  "count": 3,
  "nextPageToken": null
}
```

### GET /v1/events/{eventId}/configs?type=rsvp — Filtered

```json
{
  "configs": [
    {
      "configId": "5bff274f-4f58-419e-8729-9096fac8b737",
      "type": "rsvp",
      "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
      "rsvpFormFields": [ "...same as above..." ],
      "localizations": { "...same as above..." }
    }
  ],
  "count": 1,
  "nextPageToken": null
}
```

### POST /v1/scopes/{scopeId}/configs — Create config

**Request:**
```json
{
  "type": "rsvp",
  "rsvpFormFields": [
    { "field": "firstName", "label": "First name", "type": "text", "required": true }
  ]
}
```

**Response (201):**
```json
{
  "configId": "7a8b9c0d-1234-5678-9abc-def012345678",
  "type": "rsvp",
  "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
  "creationTime": 1712345678000,
  "modificationTime": 1712345678000,
  "rsvpFormFields": [
    { "field": "firstName", "label": "First name", "type": "text", "required": true }
  ]
}
```

### POST — Create custom-attributes config

**Request:**
```json
{
  "type": "custom-attributes",
  "attributes": [
    {
      "name": "targetAudience",
      "inputType": "single-select",
      "enabled": true,
      "values": [
        { "value": "Enterprise" },
        { "value": "SMB" },
        { "value": "Education" }
      ]
    }
  ]
}
```

**Response (201):**
```json
{
  "configId": "e5f6a7b8-1234-5678-9abc-def012345678",
  "type": "custom-attributes",
  "scopeId": "de8013c1-f1d3-4f23-a62e-cdc80abf3093",
  "creationTime": 1712350000000,
  "modificationTime": 1712350000000,
  "attributes": [
    {
      "name": "targetAudience",
      "inputType": "single-select",
      "enabled": true,
      "values": [
        { "value": "Enterprise" },
        { "value": "SMB" },
        { "value": "Education" }
      ]
    }
  ]
}
```

Note: `attributeId` and `valueId` should be generated client-side (UUID) before sending. The server stores them as-is via `additionalProperties: true`.

### PUT /v1/scopes/{scopeId}/configs/{configId} — Update

**Request/Response:** Same shape as create, returns updated config with new `modificationTime`.

### DELETE /v1/scopes/{scopeId}/configs/{configId}

**Response: 204 No Content** (empty body)

---

## Error Responses

```json
{ "message": "Human-readable error description" }
```

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | — |
| 201 | Created | — |
| 204 | Deleted (empty body) | — |
| 400 | Bad request | `"type is required when creating a config"` |
| 400 | Platform restriction | `"Configs cannot be created at the platform scope level."` |
| 403 | Forbidden | `"Insufficient permissions"` |
| 404 | Not found | `"Config not found"` / `"Scope not found"` |
| 409 | Duplicate | `"A config with type 'rsvp' already exists for this scope"` |

---

## Integration Patterns

### 1. Loading RSVP Form Fields

```javascript
const { configs } = await fetch(`/v1/events/${eventId}/configs?type=rsvp`, { headers }).then(r => r.json());
const rsvpConfig = configs[0];

if (rsvpConfig) {
  const formFields = rsvpConfig.rsvpFormFields || [];

  formFields.forEach(field => {
    // field.field       → "jobTitle" (API key)
    // field.label       → "Job title" (display text)
    // field.placeholder → "Job Title"
    // field.type        → "select" | "multi-select" | "text" | "email" | "phone"
    // field.displayAs   → "dropdown" | "radio" | "checkbox"
    // field.required    → true/false
    // field.options     → ["Option A", "Option B", ...]
    // field.default     → default value
    // field.rules       → "full-width" etc.
  });
}
```

### 2. Handling RSVP Localizations

```javascript
const rsvpConfig = configs[0];
const userLocale = event.defaultLocale; // e.g. "fr-FR"

const baseFields = rsvpConfig.rsvpFormFields || [];
const localeOverrides = rsvpConfig.localizations?.[userLocale]?.rsvpFormFields || [];

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

### 3. Loading Locales

```javascript
const { configs } = await fetch(`/v1/series/${seriesId}/configs?type=locales`, { headers }).then(r => r.json());
const localesConfig = configs[0];

if (localesConfig) {
  const localeNames = localesConfig.localeNames;
  // { "en-US": "English, United States", "fr-FR": "French, France" }

  const localeUrlCodes = localesConfig.localeUrlCodes;
  // { "en-US": "", "fr-FR": "fr" }
}
```

### 4. Loading Custom Attributes

```javascript
const { configs } = await fetch(`/v1/events/${eventId}/configs?type=custom-attributes`, { headers }).then(r => r.json());
const customAttrsConfig = configs[0];

// Filter to only enabled attributes
const enabledAttributes = (customAttrsConfig?.attributes || []).filter(a => a.enabled !== false);

enabledAttributes.forEach(attr => {
  // attr.attributeId → unique ID
  // attr.name        → "Digital Agenda Track"
  // attr.inputType   → "text" | "single-select" | "multi-select" | "boolean"
  // attr.values      → [{ valueId, value, displayOrder }]

  switch (attr.inputType) {
    case 'text':       // render text input
    case 'boolean':    // render checkbox/toggle
    case 'single-select':  // render dropdown with attr.values
    case 'multi-select':   // render multi-select with attr.values
  }
});
```

### 5. Saving Custom Attribute Values on Event

```javascript
const customAttributes = [];

// Single-select: one entry
customAttributes.push({
  attributeId: "52ff35ec-...",
  attribute: "primaryProductName",
  valueId: "a1b2c3d4-0001",
  value: "Photoshop",
  displayOrder: 0
});

// Multi-select: multiple entries with same attributeId
customAttributes.push(
  { attributeId: "f75144b3-...", attribute: "promotionalContent", valueId: "b2c3d4e5-0001", value: "Blog Post", displayOrder: 0 },
  { attributeId: "f75144b3-...", attribute: "promotionalContent", valueId: "b2c3d4e5-0003", value: "Video", displayOrder: 2 }
);

// Text
customAttributes.push({
  attributeId: "c3d4e5f6-...",
  attribute: "splashPageKey",
  value: "summit-2026-splash"
});

// Boolean
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

### 6. Loading All Configs at Once

```javascript
// Parallel load: all configs + specific types
const [allRes, rsvpRes] = await Promise.all([
  fetch(`/v1/events/${eventId}/configs`, { headers }),
  fetch(`/v1/events/${eventId}/configs?type=rsvp`, { headers })
]);

const { configs: allConfigs } = await allRes.json();
const { configs: rsvpConfigs } = await rsvpRes.json();

// Or load all and filter client-side
const rsvpConfig = allConfigs.find(c => c.type === 'rsvp');
const localesConfig = allConfigs.find(c => c.type === 'locales');
const customAttrsConfig = allConfigs.find(c => c.type === 'custom-attributes');
```

---

## Hierarchy Behavior

| Merge Strategy | Behavior |
|---------------|----------|
| **Full replace** per type | If team scope has a `rsvp` config, it completely replaces the org's `rsvp` config |

Each config in the response includes a `scopeId` field indicating where it was originally defined. If `scopeId` differs from the queried scope, it's inherited from a parent.

### Overriding Inherited Configs

To override an inherited config at a child scope (e.g., team wants to disable some custom attributes from the org):

1. Read the inherited config from the parent scope
2. Copy its data (strip `configId`, `scopeId`, `creationTime`, `modificationTime`)
3. Modify as needed (e.g., set `enabled: false` on unwanted attributes)
4. Create a new config at the child scope with the same `type`

```javascript
// Override inherited custom-attributes config at team scope
const { configs } = await fetch(`/v1/scopes/${teamScopeId}/configs?type=custom-attributes`, { headers }).then(r => r.json());
const inherited = configs[0];

// Copy and modify — disable one attribute
const override = {
  type: 'custom-attributes',
  attributes: inherited.attributes.map(attr =>
    attr.name === 'unwantedAttribute' ? { ...attr, enabled: false } : attr
  )
};

// Create at team scope — this replaces the inherited config
await fetch(`/v1/scopes/${teamScopeId}/configs`, {
  method: 'POST',
  headers,
  body: JSON.stringify(override)
});
```

---

## Input Type Reference

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

### Custom Attribute `inputType` Values

| Value | Render As | Values Array |
|-------|-----------|-------------|
| `text` | Text input | Not used |
| `boolean` | Checkbox/toggle | Not used |
| `single-select` | Dropdown | Required — list of options |
| `multi-select` | Multi-select | Required — list of options |

---

## Notes

- Configs **cannot** be created at the platform scope level — only org and team
- The `?type=` query parameter filters configs; omit it to get all configs
- Custom attribute values on events are **denormalized** — both IDs and display names stored
- RSVP labels and options support **localization** via the `localizations` object
- Custom attributes with `enabled: false` should be hidden from the events console
- One config per type per scope — duplicates return 409
- Inherited configs can be **overridden** at child scopes by creating a config with the same type — the child's config fully replaces the parent's