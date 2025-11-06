# Dev Token Security Model

## Overview

The EMC application uses a **two-path bootstrap architecture** that ensures the dev token system only activates on localhost and never interferes with real IMS sessions in the Adobe Experience Cloud Shell.

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

### Path 2: Localhost Development

**File**: `web-src/src/index.tsx` → `bootstrapRaw()`

```typescript
function bootstrapRaw(): void {
  const mockRuntime: RuntimeType = { on: () => {}, done: () => {} }
  
  // Check for stored dev token
  const storedToken = tokenStorage.getValidToken()
  
  const mockIms: IMS = {
    token: storedToken || undefined  // ← Dev token from localStorage
  }
  
  ReactDOM.render(
    <App runtime={mockRuntime} ims={mockIms} />,
    document.getElementById('root')
  )
}
```

**Characteristics:**
- ✅ Uses dev token from localStorage
- ✅ Only runs when ExC runtime fails to load (i.e., on localhost)
- ✅ Dev token button **appears** in top nav
- ✅ Token management UI available
- ✅ Suitable for local development
- ⚠️ No org switching
- ⚠️ No user profile

## Security Guarantees

### 1. Localhost-Only UI

The dev token button visibility is controlled by strict hostname checking:

```typescript
// web-src/src/hooks/useDevToken.ts
// web-src/src/components/DevTokenButton.tsx
// web-src/src/config/env.ts

const isDevMode = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
```

**Result**: Dev token UI **never shows** on deployed environments, even with URL parameters.

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
              │   bootstrapRaw()     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Check localStorage  │
              │  for dev token       │
              └──────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
    ✅ Found                       ❌ Not Found
          │                             │
          ▼                             ▼
┌─────────────────┐          ┌────────────────────┐
│  Use Dev Token  │          │  No Token          │
│  ✅ API Ready   │          │  ⚠️ APIs will fail │
└─────────────────┘          └────────────────────┘
          │                             │
          └──────────────┬──────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Show Dev Token UI   │
              │  🔑 Button visible   │
              └──────────────────────┘
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

# Expected:
# - bootstrapRaw() called
# - Dev Token button visible
# - Can add/manage tokens
# - Token from localStorage used
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

### Test 3: Deployed App with ?devMode=true ✅

```bash
# Try to force dev mode on deployed app
# Visit: https://experience.adobe.com/?devMode=true#/@org/app-id

# Expected (after fix):
# - bootstrapInExcShell() still called
# - Real IMS token still used
# - Dev Token button STILL NOT visible (hostname check fails)
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
| `web-src/src/config/env.ts` | Environment detection |

## Summary

✅ **Dev token system is secure and isolated:**
- Only activates on localhost
- Never interferes with real IMS sessions
- Completely separate bootstrap paths
- No URL parameter bypasses
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

