# Dev Token Feature - Implementation Summary

## Overview

This document summarizes the new development token management system that was implemented to enhance the local development experience for the EMC application.

## Problem Statement

Previously, developers working locally needed to:
1. Deploy the app to Experience Cloud Shell to get proper authentication
2. Work without real API access in local mode
3. Manually mock all API calls

The old application had a sophisticated external API controller with required headers:
- `Authorization: Bearer {token}`
- `x-api-key: acom_event_service`
- `x-request-id: {uuid}`
- `x-client-identity: {from env}`

## Solution

A complete token management system that allows developers to:
1. Obtain a real Adobe IMS token from adobe.com
2. Store it securely in localStorage
3. Automatically use it for all API calls
4. Monitor expiration and renew when needed

## What Was Implemented

### 1. Core Services

#### Token Storage Service
**File:** `web-src/src/services/tokenStorage.ts`

- Stores tokens in localStorage with expiration
- Validates token expiration automatically
- Parses both full token objects and JWT strings
- Provides expiration time calculations

**Key Methods:**
```typescript
tokenStorage.saveToken({ token, expire, sid })
tokenStorage.getValidToken()
tokenStorage.isTokenValid()
tokenStorage.getTokenExpiration()
tokenStorage.clearToken()
```

#### Request Helpers Service
**File:** `web-src/src/services/requestHelpers.ts`

- Constructs standard headers for external API calls
- Generates UUIDs for x-request-id
- Validates URLs against allowed hosts
- Provides safe fetch wrapper
- Includes image upload with progress tracking
- Supports non-invasive test mode

**Key Functions:**
```typescript
constructRequestHeaders(token)
safeFetch(url, options)
uploadImage(file, config, token, tracker, imageId)
generateUUID()
```

#### Environment Configuration
**File:** `web-src/src/config/env.ts`

- Centralizes environment variable access
- Provides CLIENT_IDENTITY and API_KEY
- Detects development vs production mode

### 2. UI Components

#### DevTokenDialog
**File:** `web-src/src/components/DevTokenDialog.tsx`

A beautiful modal dialog that:
- Accepts token input (full object or string)
- Validates token format
- Shows existing token status
- Displays expiration information
- Provides clear token functionality
- Includes instructions for obtaining tokens

**Features:**
- Real-time validation
- Token parsing from multiple formats
- Expiration countdown display
- Confirmation dialog for clearing tokens

#### DevTokenButton
**File:** `web-src/src/components/DevTokenButton.tsx`

A status button in the top navigation that:
- Shows token status (Active/None)
- Displays expiration time in tooltip
- Opens the token dialog on click
- Auto-checks token validity every minute
- Only visible in development mode

**Visual States:**
- 🟢 Green "Active" badge - Valid token
- ⚪ Gray "None" badge - No token

### 3. React Hook

#### useDevToken Hook
**File:** `web-src/src/hooks/useDevToken.ts`

A React hook that:
- Manages token state
- Controls dialog visibility
- Detects development mode
- Auto-loads stored tokens on mount

**Usage:**
```typescript
const { 
  token, 
  isDialogOpen, 
  showDialog, 
  hideDialog, 
  handleTokenSaved, 
  isDevMode 
} = useDevToken()
```

### 4. Bootstrap Integration

#### Updated index.tsx
**File:** `web-src/src/index.tsx`

Modified the `bootstrapRaw()` function to:
- Check for stored dev tokens
- Validate token expiration
- Inject token into mock IMS object
- Provide helpful console logging

**Console Output:**
- ✅ Token found and valid
- ⏰ Expiration information
- 🔐 Instructions if no token
- 📖 Documentation links

### 5. Example Implementation

#### External API Service Example
**File:** `web-src/src/services/externalApi.example.ts`

A complete reference implementation showing how to:
- Use the token system
- Make external API calls
- Handle different environments
- Structure API service methods

**Includes methods for:**
- Events (get, create, update, delete)
- Series (get, create, update, delete)
- Speakers (get, create, update, add to events)
- Sponsors (get, create, update, add to events)
- Venues (create, update)
- Locales, clouds, images, history

### 6. Documentation

Created comprehensive documentation:

1. **DEV_TOKEN_GUIDE.md** - Complete guide with:
   - Features overview
   - Quick start instructions
   - Token format details
   - Architecture diagrams
   - Usage examples
   - Troubleshooting
   - Security considerations
   - Best practices

2. **DEV_TOKEN_QUICKSTART.md** - 30-second setup guide:
   - Minimal steps to get started
   - Common tasks reference
   - Quick troubleshooting table
   - Tips and tricks

3. **DEV_TOKEN_SUMMARY.md** - This file

4. **webpack.env.example.js** - Environment variable configuration examples

### 7. Integration Points

#### TopNav Component
**File:** `web-src/src/components/TopNav.tsx`

Added DevTokenButton to the navigation:
```tsx
<Flex direction="row" alignItems="center" gap="size-100">
  <DevTokenButton />
  <UserPanel ims={ims} compact />
</Flex>
```

#### Component Exports
**File:** `web-src/src/components/index.ts`

Added exports for new components:
```typescript
export { DevTokenButton } from './DevTokenButton'
export { DevTokenDialog } from './DevTokenDialog'
```

#### Hook Exports
**File:** `web-src/src/hooks/index.ts`

Added export for new hook:
```typescript
export { useDevToken } from './useDevToken'
```

## How It Works

### Token Flow

```
1. User opens app locally
   ↓
2. Bootstrap checks localStorage for token
   ↓
3. If valid token exists:
   → Inject into IMS object
   → Show green badge
   → Enable API calls
   ↓
4. If no valid token:
   → Show gray badge
   → Log instructions
   → User clicks badge to add token
   ↓
5. User gets token from adobe.com:
   → Navigate to adobe.com
   → Open DevTools Console
   → Run: window.adobeIMS?.getAccessToken()
   → Copy output
   ↓
6. User pastes token in dialog:
   → System validates format
   → Parses expiration
   → Saves to localStorage
   → Reloads app
   ↓
7. API calls use token:
   → constructRequestHeaders(token)
   → Add all required headers
   → safeFetch validates and calls
   → Response returned to app
```

### Security Features

- ✅ Only works in development mode (localhost)
- ✅ URL validation against allowed hosts
- ✅ Automatic token expiration checking
- ✅ HTTPS enforcement (except localhost)
- ✅ Content-type validation
- ✅ Non-invasive test mode for safe testing

## Additional Features

### Non-Invasive Test Mode

Add `?nonInvasiveTest=true` to URL to:
- Log POST/PUT/DELETE requests without sending them
- Display payloads in console
- Return mock success responses
- Perfect for UI flow testing

### Auto-Refresh

When a token is saved/updated:
- App automatically reloads
- New token is applied immediately
- All components receive fresh token

### Token Monitoring

DevTokenButton checks token validity every minute:
- Updates badge status
- Shows current expiration time
- Alerts when token expires

### Flexible Token Input

Accepts multiple formats:
```javascript
// Full token object
{ token: "eyJ...", expire: "2025-...", sid: "..." }

// Token string (auto-parsed)
"eyJhbGciOiJSUzI1NiI..."
```

### Environment Detection

Smart detection of dev mode:
- `localhost` hostname
- `127.0.0.1` hostname  
- `?devMode=true` query parameter

## Configuration

### Environment Variables

Add to `.env` file:

```env
CLIENT_IDENTITY=your-client-identity-here
API_KEY=acom_event_service
```

These are automatically loaded via the `env` config and used in request headers.

### Allowed Hosts

Configure in `requestHelpers.ts`:

```typescript
const ALLOWED_HOSTS = {
  'localhost': true,
  '127.0.0.1': true,
  'events-service.adobe.io': true,
  'events-service-stage.adobe.io': true,
  'events-service-dev.adobe.io': true,
}
```

### API Configuration

Configure in `externalApi.example.ts`:

```typescript
const API_CONFIG = {
  esp: {
    local: { host: 'http://localhost:3000' },
    dev: { host: 'https://events-service-dev.adobe.io' },
    stage: { host: 'https://events-service-stage.adobe.io' },
    prod: { host: 'https://events-service.adobe.io' }
  }
}
```

## Files Created

### Services
- `web-src/src/services/tokenStorage.ts` (193 lines)
- `web-src/src/services/requestHelpers.ts` (232 lines)
- `web-src/src/services/externalApi.example.ts` (450 lines)
- `web-src/src/config/env.ts` (58 lines)

### Components
- `web-src/src/components/DevTokenDialog.tsx` (243 lines)
- `web-src/src/components/DevTokenButton.tsx` (107 lines)

### Hooks
- `web-src/src/hooks/useDevToken.ts` (62 lines)

### Documentation
- `docs/DEV_TOKEN_GUIDE.md` (700+ lines)
- `docs/DEV_TOKEN_QUICKSTART.md` (120 lines)
- `docs/DEV_TOKEN_SUMMARY.md` (this file)
- `web-src/src/config/webpack.env.example.js` (70 lines)

### Modified Files
- `web-src/src/index.tsx` - Added token bootstrap logic
- `web-src/src/components/TopNav.tsx` - Added DevTokenButton
- `web-src/src/components/index.ts` - Added component exports
- `web-src/src/hooks/index.ts` - Added hook export

## Total Implementation

- **~2,400 lines of code**
- **11 new files**
- **4 modified files**
- **3 comprehensive documentation files**
- **Zero linter errors**

## Testing Checklist

- [x] Token storage and retrieval
- [x] Token validation and expiration
- [x] Dialog UI and interactions
- [x] Button status and tooltips
- [x] Bootstrap integration
- [x] API header construction
- [x] Safe fetch validation
- [x] Non-invasive test mode
- [x] Environment configuration
- [x] TypeScript compilation
- [x] Linter validation

## Next Steps

To use this system:

1. **Update .env file:**
   ```env
   CLIENT_IDENTITY=your-actual-client-identity
   ```

2. **Run the app:**
   ```bash
   npm run dev
   ```

3. **Add a token:**
   - Click "Dev Token" button
   - Get token from adobe.com
   - Paste and save

4. **Start making API calls:**
   ```typescript
   import { externalApi } from '../services/externalApi.example'
   const events = await externalApi.getEvents()
   ```

## Benefits

✨ **Developer Experience:**
- No more deployment required for local testing
- Real API access in development
- Beautiful, intuitive UI
- Helpful error messages and logging

🚀 **Productivity:**
- Faster development cycle
- Test with real data
- No mock data maintenance
- Quick token refresh

🛡️ **Safety:**
- URL validation
- HTTPS enforcement
- Expiration checking
- Non-invasive test mode

📚 **Maintainability:**
- Well-documented code
- Type-safe implementation
- Reusable services
- Example implementations

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Review [DEV_TOKEN_GUIDE.md](./DEV_TOKEN_GUIDE.md)
3. See [DEV_TOKEN_QUICKSTART.md](./DEV_TOKEN_QUICKSTART.md)
4. Examine example code in `externalApi.example.ts`

---

**Implementation Date:** November 5, 2025
**Status:** ✅ Complete and ready for use
**Linter Errors:** 0

