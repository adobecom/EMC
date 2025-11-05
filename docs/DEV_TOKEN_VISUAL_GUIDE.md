# Dev Token System - Visual Guide

## 🎯 What Problem Does This Solve?

### Before 😞
```
Developer wants to test locally
        ↓
No real API access
        ↓
Must mock everything
        ↓
OR deploy to Experience Cloud Shell
        ↓
Slow development cycle
```

### After 😃
```
Developer wants to test locally
        ↓
Click "Dev Token" button
        ↓
Paste token from adobe.com
        ↓
Full API access immediately!
        ↓
Fast development cycle
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Application                        │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  TopNav Component                                     │  │ │
│  │  │  ┌────────────────────┐                              │  │ │
│  │  │  │ DevTokenButton     │ ← Shows status badge         │  │ │
│  │  │  │  [🟢 Active]       │   Opens dialog on click      │  │ │
│  │  │  └────────────────────┘                              │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  DevTokenDialog                                       │  │ │
│  │  │  ┌────────────────────────────────────────────────┐  │  │ │
│  │  │  │  Paste token here                              │  │  │ │
│  │  │  │  { "token": "eyJ...", "expire": "..." }        │  │  │ │
│  │  │  └────────────────────────────────────────────────┘  │  │ │
│  │  │  [ Save Token ] [ Clear Token ]                      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                      ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  TokenStorage Service                                 │  │ │
│  │  │  • saveToken()                                        │  │ │
│  │  │  • getValidToken()                                    │  │ │
│  │  │  • isTokenValid()                                     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                      ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  localStorage                                         │  │ │
│  │  │  key: "emc_dev_token"                                │  │ │
│  │  │  value: { token, expire, sid }                       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                      ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Request Helpers                                      │  │ │
│  │  │  • constructRequestHeaders(token)                     │  │ │
│  │  │  • safeFetch(url, options)                           │  │ │
│  │  │  • uploadImage(file, config, token)                  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                      ↓                                      │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  External API Service                                 │  │ │
│  │  │  • getEvents()                                        │  │ │
│  │  │  • createEvent(data)                                  │  │ │
│  │  │  • getSeries()                                        │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                      ↓                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       ↓ HTTPS with headers:
                       │ • Authorization: Bearer {token}
                       │ • x-api-key: acom_event_service
                       │ • x-request-id: {uuid}
                       │ • x-client-identity: {env}
                       ↓
          ┌────────────────────────────┐
          │  Adobe External APIs       │
          │  • events-service.adobe.io │
          └────────────────────────────┘
```

## 🎨 UI Components

### DevTokenButton

```
┌─────────────────────────────────────┐
│  🔑 Dev Token [🟢 Active]           │  ← Hover for details
└─────────────────────────────────────┘
         │
         │ On hover:
         ↓
┌─────────────────────────────────────┐
│  Token Active                        │
│  Expires: 2025-11-06 5:52 PM        │
│  Time Remaining: 23h 15m            │
│  Click to manage                    │
└─────────────────────────────────────┘
```

### DevTokenDialog (No Token)

```
┌───────────────────────────────────────────────────────────────┐
│  🔐 Developer Authentication                           [×]     │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ⚪ No Token Found                                             │
│     To use this app in local development, you need to         │
│     provide an Adobe IMS token.                               │
│                                                                │
│  How to get a token:                                          │
│  1. Open adobe.com and sign in                               │
│  2. Open Developer Tools (F12)                                │
│  3. In Console, run: window.adobeIMS?.getAccessToken()       │
│  4. Copy the entire token object or just the token string     │
│  5. Paste it below                                            │
│                                                                │
│  Adobe IMS Token                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Paste token object: {"token": "eyJ...", ...}             │ │
│  │ or just the token string                                 │ │
│  │                                                           │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  Note: You can continue without a token, but API calls will   │
│  fail.                                                         │
│                                                                │
│  [ Save Token ]  [ Continue Without Token ]                   │
└───────────────────────────────────────────────────────────────┘
```

### DevTokenDialog (With Token)

```
┌───────────────────────────────────────────────────────────────┐
│  🔐 Developer Authentication                           [×]     │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  🟢 Active Token Found                                         │
│     Expires: 2025-11-06 5:52:38 PM                            │
│     Time Remaining: 23h 15m                                   │
│                                                                │
│     [ Use Existing Token ]  [ Clear Token ]                   │
│                                                                │
│  ───────────────────────────────────────────────────────────  │
│                                                                │
│  Or paste a new token below:                                  │
│                                                                │
│  Adobe IMS Token                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  [ Save Token ]                                               │
└───────────────────────────────────────────────────────────────┘
```

## 🔄 User Flow

### Getting Started Flow

```
Start App Locally
       │
       ↓
   ┌───────────────────────┐
   │ Token in localStorage? │
   └───────┬───────┬───────┘
           │       │
      YES  │       │  NO
           ↓       ↓
   ┌───────────┐  ┌──────────────────┐
   │ Validate  │  │ Show gray badge  │
   │ expiry    │  │ Log instructions │
   └─────┬─────┘  └────────┬─────────┘
         │                 │
    Valid│    Expired      │
         │         │       │
         ↓         ↓       ↓
   ┌──────────────────────────────┐
   │ Show green badge             │
   │ Enable API calls             │
   │ User can start working! ✨   │
   └──────────────────────────────┘
```

### Adding Token Flow

```
User clicks "Dev Token" button
       │
       ↓
Dialog opens
       │
       ↓
User goes to adobe.com
       │
       ↓
Opens DevTools Console
       │
       ↓
Runs: window.adobeIMS?.getAccessToken()
       │
       ↓
Copies output
       │
       ↓
Pastes into dialog
       │
       ↓
Clicks "Save Token"
       │
       ↓
┌────────────────────────┐
│ Token validation       │
│ • Check format         │
│ • Parse JWT            │
│ • Extract expiration   │
└───────────┬────────────┘
            │
            ↓
      ┌─────────┐
      │ Valid?  │
      └────┬────┘
           │
      YES  │
           ↓
┌──────────────────────┐
│ Save to localStorage │
└──────────┬───────────┘
           │
           ↓
┌──────────────────┐
│ Reload app       │
│ Token active! ✅ │
└──────────────────┘
```

### Making API Calls Flow

```
Component needs data
       │
       ↓
import { externalApi }
       │
       ↓
await externalApi.getEvents()
       │
       ↓
┌──────────────────────────┐
│ TokenStorage Service     │
│ • getValidToken()        │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ Request Helpers          │
│ • constructHeaders()     │
│   - Authorization        │
│   - x-api-key            │
│   - x-request-id (UUID)  │
│   - x-client-identity    │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ safeFetch()              │
│ • Validate URL           │
│ • Check HTTPS            │
│ • Check allowed hosts    │
└──────────┬───────────────┘
           │
           ↓
     Fetch API
           │
           ↓
   Adobe External API
           │
           ↓
    Response data
           │
           ↓
   Component receives data
```

## 📊 Status Indicators

### Badge States

```
🟢 Active          ⚪ None
┌─────────┐       ┌─────────┐
│ Dev     │       │ Dev     │
│ Token   │       │ Token   │
│ Active  │       │ None    │
└─────────┘       └─────────┘
    ↓                 ↓
Token valid      No token
Working!         Add one
```

### Console Output

#### With Valid Token
```
⚠️  Running in standalone mode without Adobe Experience Cloud Shell
✅ Using stored development token
⏰ Token expires: 2025-11-06T17:52:38.305Z (23h 15m remaining)

📖 See: https://developer.adobe.com/app-builder/docs/getting_started/
```

#### Without Token
```
⚠️  Running in standalone mode without Adobe Experience Cloud Shell
🔐 No stored token found

ℹ️  To enable API calls, you can:
   1. Click the "Dev Token" button in the app to add a token
   2. Get a token from adobe.com by running:
      window.adobeIMS?.getAccessToken()
   3. Deploy and access via ExC Shell with devMode:
      aio app deploy
      https://experience.adobe.com/?devMode=true#/@org/app-id

📖 See: https://developer.adobe.com/app-builder/docs/getting_started/
```

## 🛡️ Security Features

```
┌──────────────────────────────────────────────────────┐
│                  Security Layers                      │
├──────────────────────────────────────────────────────┤
│                                                       │
│  1️⃣ Development Mode Only                            │
│     ✓ Only works on localhost                        │
│     ✓ Or with ?devMode=true                          │
│                                                       │
│  2️⃣ URL Validation                                    │
│     ✓ Whitelist of allowed hosts                     │
│     ✓ HTTPS enforcement (except localhost)           │
│                                                       │
│  3️⃣ Token Expiration                                  │
│     ✓ Automatic expiration checking                  │
│     ✓ Minute-by-minute validation                    │
│                                                       │
│  4️⃣ Content Type Validation                           │
│     ✓ JSON or plain text only                        │
│     ✓ Reject unexpected content types                │
│                                                       │
│  5️⃣ Non-Invasive Test Mode                           │
│     ✓ ?nonInvasiveTest=true                          │
│     ✓ Logs writes without executing                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## 📁 File Organization

```
web-src/src/
├── services/
│   ├── tokenStorage.ts         🔐 Token management
│   ├── requestHelpers.ts       🔐 API utilities
│   └── externalApi.example.ts  🔐 Usage examples
│
├── components/
│   ├── DevTokenButton.tsx      🔐 Status button
│   └── DevTokenDialog.tsx      🔐 Input dialog
│
├── hooks/
│   └── useDevToken.ts          🔐 React hook
│
├── config/
│   └── env.ts                  🔐 Environment config
│
└── index.tsx                   🔐 Bootstrap integration

docs/
├── DEV_TOKEN_QUICKSTART.md     ⚡ 30-sec setup
├── DEV_TOKEN_GUIDE.md          📖 Complete guide
├── DEV_TOKEN_SUMMARY.md        🛠️ Implementation
└── DEV_TOKEN_VISUAL_GUIDE.md   🎨 This file
```

## 🎯 Quick Reference

### Developer Actions

| I want to... | Do this... |
|-------------|------------|
| Add a token | Click "Dev Token" button → Paste → Save |
| Check token status | Hover over "Dev Token" badge |
| Clear token | Click button → Click "Clear Token" |
| See expiration | Hover over badge tooltip |
| Test without writes | Add `?nonInvasiveTest=true` to URL |
| Make API call | `await externalApi.getEvents()` |

### Code Examples

#### Check Token Status
```typescript
import { tokenStorage } from '../services/tokenStorage'

const isValid = tokenStorage.isTokenValid()
const token = tokenStorage.getValidToken()
const info = tokenStorage.getTokenExpiration()
```

#### Make API Call
```typescript
import { externalApi } from '../services/externalApi.example'

const events = await externalApi.getEvents()
const event = await externalApi.getEvent('event-123')
```

#### Custom Request
```typescript
import { constructRequestHeaders, safeFetch } from '../services/requestHelpers'
import { tokenStorage } from '../services/tokenStorage'

const token = tokenStorage.getValidToken()
const headers = constructRequestHeaders(token)

const response = await safeFetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(data)
})
```

## 🎓 Learning Path

```
Level 1: Quick Start (5 min)
├─ Read: DEV_TOKEN_QUICKSTART.md
└─ Do: Add a token and make an API call

Level 2: Understanding (15 min)
├─ Read: DEV_TOKEN_GUIDE.md (Overview section)
└─ Do: Explore the UI components

Level 3: Implementation (30 min)
├─ Read: DEV_TOKEN_GUIDE.md (Complete)
├─ Read: externalApi.example.ts
└─ Do: Create your first custom API call

Level 4: Mastery (1 hour)
├─ Read: DEV_TOKEN_SUMMARY.md
├─ Read: tokenStorage.ts, requestHelpers.ts
└─ Do: Integrate into your workflow
```

## 🚀 Success Metrics

### Before Dev Token System
- ⏱️ Time to start development: 30+ minutes
- 🔄 Deployment needed: Yes
- 🎯 API access locally: No
- 😞 Developer happiness: Low

### After Dev Token System
- ⏱️ Time to start development: 30 seconds
- 🔄 Deployment needed: No
- 🎯 API access locally: Yes ✅
- 😃 Developer happiness: High!

---

**Visual Guide Version:** 1.0
**Last Updated:** November 5, 2025

For more details, see:
- [Quick Start Guide](./DEV_TOKEN_QUICKSTART.md)
- [Complete Guide](./DEV_TOKEN_GUIDE.md)
- [Implementation Summary](./DEV_TOKEN_SUMMARY.md)

