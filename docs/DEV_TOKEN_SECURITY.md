# Dev Token Security Model

## Overview

The EMC application uses a **two-path bootstrap architecture** that ensures the dev token system only activates when **explicitly enabled** and never interferes with real IMS sessions in the Adobe Experience Cloud Shell.

The dev token system is enabled **only when both** of the following are true:
1. **URL has `?devtokenmode=true`** — explicit opt-in; without it, the dev token UI is hidden and stored dev tokens are not used for API calls.
2. **Host is in the allowlist** — one of the approved development hostnames below.

**Approved development hostnames** (dev token still requires `?devtokenmode=true`):
- `localhost` / `127.0.0.1`
- `14257-emc-dev.adobeio-static.net`
- `14257-emc-qiyundai.adobeio-static.net`
- `14257-emc-shameeb.adobeio-static.net`
- `14257-emc-rkhan.adobeio-static.net`

## Bootstrap Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Application Start (index.tsx)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Try to load ExC Runtime     │
        │ require('./exc-runtime')    │
        └─────────────┬───────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    SUCCESS ✅                  FAIL ❌
         │                         │
         ▼                         ▼
┌─────────────────────┐   ┌──────────────────────┐
│ bootstrapInExcShell │   │   bootstrapRaw       │
│                     │   │                      │
│ - Real IMS Token    │   │ - Dev Token (if any) │
│ - From ExC Runtime  │   │ - From localStorage  │
│ - Production Ready  │   │ - Localhost Only     │
└─────────────────────┘   └──────────────────────┘
```

## Two Bootstrap Paths

### Path 1: Experience Cloud Shell (Production/Deployed)

**File**: `web-src/src/index.tsx` → `bootstrapInExcShell()`

```typescript
function bootstrapInExcShell(): void {
  const runtime = Runtime()
  
  runtime.on('ready', ({ imsOrg, imsToken, imsProfile }) => {
    const ims: IMS = {
      profile: imsProfile,
      org: imsOrg,
      token: imsToken  // ← Real IMS token from Experience Cloud
    }
    
    ReactDOM.render(
      <App runtime={runtime} ims={ims} />,
      document.getElementById('root')
    )
  })
}
```

**Characteristics:**
- ✅ Uses real IMS token from Adobe Experience Cloud Shell
- ✅ Dev token system is **completely bypassed**
- ✅ Dev token button **never appears** (not localhost)
- ✅ Production-ready authentication
- ✅ Org switching supported
- ✅ User profile available

### Path 2: Standalone (e.g. localhost)

**File**: `web-src/src/index.tsx` → `bootstrapStandalone()`

When the ExC runtime is not available (e.g. localhost), the app uses standalone IMS auth. The **dev token system** (button + use of stored token for API calls) is only active when the URL has **`?devtokenmode=true`** and the host is in the allowlist. When enabled:

- ApiService and components use `tokenStorage.getValidToken()` (via `getAuthToken()` / `getAuthTokenForExternalUse()`) when a stored dev token exists.
- Dev token button **appears** in top nav; token management UI is available.

**Characteristics:**
- ✅ When `?devtokenmode=true`: dev token from localStorage can be used for API auth
- ✅ Only runs when ExC runtime fails to load (e.g. on localhost)
- ✅ Dev token button **appears** only when `?devtokenmode=true` on an allowed host
- ✅ Token management UI available in that mode
- ✅ Suitable for local development
- ⚠️ No org switching when using dev token
- ⚠️ No user profile when using dev token

## Security Guarantees

### 1. Development Environment UI

The dev token button visibility and use of stored dev tokens for API auth are controlled by `isDevTokenModeEnabled()`: hostname must be in the allowlist **and** the URL must include `?devtokenmode=true`:

```typescript
// web-src/src/config/env.ts

const DEV_TOKEN_ALLOWED_HOSTNAMES = [ ... ]

// Dev token system only active when BOTH conditions hold:
export function isDevTokenModeEnabled(): boolean {
  const hostname = window.location.hostname
  const devTokenMode = new URLSearchParams(window.location.search).get('devtokenmode') === 'true'
  return DEV_TOKEN_ALLOWED_HOSTNAMES.includes(hostname) && devTokenMode
}

// Used by DevTokenButton, useDevToken hook, and ApiService.getAuthToken()
env.isDevTokenModeEnabled()
```

**Result**: Dev token UI and stored-token API usage only apply when the user opens the app with `?devtokenmode=true` on an allowed host — **never on staging or production**, and not on localhost unless the parameter is present.

### 2. Separate Bootstrap Paths

The two bootstrap functions are **mutually exclusive**:

- **Experience Cloud Shell loaded?** → Use `bootstrapInExcShell()` → Real IMS token
- **Experience Cloud Shell failed?** → Use `bootstrapRaw()` → Dev token

**Result**: When running in Experience Cloud Shell, the dev token system is never initialized.

### 3. Token Priority

There is **no fallback** from real IMS to dev token:

```typescript
// In Experience Cloud Shell:
ims.token = imsToken  // Always from runtime, dev token never checked

// On localhost:
ims.token = storedToken || undefined  // From localStorage only
```

**Result**: Real IMS sessions always use real tokens, no risk of mixing.

## Token Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                 Experience Cloud Shell                         │
│  (experience.adobe.com/#/@org/app-id)                         │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   ExC Runtime Loads   │
              │   ✅ Success          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ bootstrapInExcShell()│
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Real IMS Token      │
              │  from runtime        │
              │  ✅ Production Auth  │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  No Dev Token UI     │
              │  🚫 Button hidden    │
              └──────────────────────┘


┌───────────────────────────────────────────────────────────────┐
│                        Localhost                               │
│  (localhost:3000 or 127.0.0.1:3000)                           │
│  ⚠️ Dev token only if URL has ?devtokenmode=true               │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ ExC Runtime Loading  │
              │ ❌ Fails (not loaded)│
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ bootstrapStandalone()│
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ ?devtokenmode=true   │
              │ in URL?              │
              └──────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
        YES ✅                        NO ❌
          │                             │
          ▼                             ▼
┌─────────────────┐          ┌────────────────────┐
│  Show Dev Token │          │  No Dev Token UI   │
│  UI; use stored │          │  Stored token not  │
│  token if any   │          │  used for API calls │
└─────────────────┘          └────────────────────┘
```

## Component Token Usage

All components receive the `ims` prop with a `token` field:

```typescript
interface IMS {
  token?: string
  org?: string
  profile?: IMSProfile
}
```

Components use the token without needing to know its source:

```typescript
// web-src/src/components/EventsDashboard.tsx
// web-src/src/components/SeriesDashboard.tsx
// etc.

if (!ims.token || !ims.org) {
  console.warn('IMS authentication not available yet')
  return
}

apiService.setAuthHeaders(ims.token, ims.org)
const response = await apiService.getEvents()
```

**Result**: Components work with both real IMS tokens and dev tokens transparently.

## Testing the Security Model

### Test 1: Localhost with Dev Token ✅

```bash
# Start app on localhost
npm run dev

# Open with dev token mode enabled:
# http://localhost:3000/?devtokenmode=true

# Expected:
# - bootstrapStandalone() path (no ExC Shell)
# - Dev Token button visible
# - Can add/manage tokens
# - Token from localStorage used for API calls when present
```

### Test 2: Experience Cloud Shell ✅

```bash
# Deploy and access via ExC
aio app deploy
# Visit: https://experience.adobe.com/#/@org/app-id

# Expected:
# - bootstrapInExcShell() called
# - Real IMS token used
# - Dev Token button NOT visible
# - localStorage dev token ignored
```

### Test 3: Localhost without ?devtokenmode=true ✅

```bash
# Open localhost WITHOUT the query param
# Visit: http://localhost:3000/  (no ?devtokenmode=true)

# Expected:
# - Dev Token button NOT visible
# - Stored dev token in localStorage is NOT used for API calls
# - Only IMS (standalone OAuth) token is used
```

### Test 4: Deployed App with ?devtokenmode=true ✅

```bash
# Try to enable dev token on deployed app
# Visit: https://experience.adobe.com/?devtokenmode=true#/@org/app-id

# Expected:
# - bootstrapInExcShell() still called
# - Real IMS token still used
# - Dev Token button STILL NOT visible (hostname not in allowlist)
# - No security bypass possible
```

## Best Practices

1. **Never hardcode tokens** - Always use the dev token system on localhost
2. **Never commit tokens** - Add `*.token` to `.gitignore`
3. **Rotate tokens regularly** - Adobe IMS tokens expire in ~24 hours
4. **Use appropriate org** - Ensure your token is for the correct organization
5. **Test in both modes** - Verify features work with both dev tokens and real IMS

## Files Involved

| File | Purpose |
|------|---------|
| `web-src/src/index.tsx` | Bootstrap logic (two paths) |
| `web-src/src/hooks/useDevToken.ts` | Dev token hook (localhost check) |
| `web-src/src/components/DevTokenButton.tsx` | Dev token UI (localhost check) |
| `web-src/src/components/DevTokenDialog.tsx` | Token input dialog |
| `web-src/src/services/tokenStorage.ts` | Token storage/parsing |
| `web-src/src/config/env.ts` | `isDevTokenModeEnabled()` — hostname allowlist + `?devtokenmode=true` |

## Summary

✅ **Dev token system is secure and isolated:**
- Only activates when **`?devtokenmode=true`** is in the URL **and** host is in the allowlist (localhost or approved dev instances)
- Never interferes with real IMS sessions
- Completely separate bootstrap paths
- Explicit opt-in required; no accidental use of dev tokens
- No token mixing or fallbacks

✅ **Real IMS sessions are protected:**
- Experience Cloud Shell always uses real tokens
- Dev token system never initialized in ExC Shell
- No UI elements shown that could confuse users
- Production authentication remains pristine

✅ **Development experience is smooth:**
- Easy token management on localhost
- Visual status indicators
- Automatic expiration handling
- Helpful console logging
- No deployment needed for frontend dev

---

**Last Updated**: November 6, 2025  
**Version**: 1.0.0

