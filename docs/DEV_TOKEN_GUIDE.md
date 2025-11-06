# Development Token Management Guide

## Overview

The EMC application now includes a sophisticated token management system for local development. This allows developers to use real Adobe IMS tokens from production sites without needing to deploy to the Experience Cloud Shell.

## Features

✨ **Key Features:**
- 🔐 Secure token storage in localStorage
- ⏰ Automatic expiration detection
- 🎨 Beautiful UI for token management
- 🔄 Auto-refresh detection
- 🛡️ Token validation and parsing
- 🚦 Visual status indicators

## Quick Start

### 1. Run the App Locally

```bash
npm run dev
# or
aio app run --local
```

### 2. Get a Token

1. Open [adobe.com](https://adobe.com) in your browser and sign in
2. Open Developer Tools (F12)
3. In the Console, run:
   ```javascript
   window.adobeIMS?.getAccessToken()
   ```
4. Copy the entire output object

### 3. Add Token to the App

1. Look for the **"Dev Token"** button in the top navigation bar
2. Click it to open the token dialog
3. Paste the token (either the full object or just the token string)
4. Click **"Save Token"**

That's it! The token will be stored and used for all API calls until it expires.

## Token Format

The system accepts two formats:

### Full Token Object (Recommended)
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsIng1dSI6Imltc19uYTEta2V5LWF0LTEuY2VyIiwia2lkIjoiaW1zX25hMS1rZXktYXQtMSIsIml0dCI6ImF0In0...",
  "expire": "2025-11-06T17:52:38.305Z",
  "sid": "1762365155890_ae1b8bf3-f820-4716-b5cb-7b8da37f0289_ue1"
}
```

### Token String Only
```
eyJhbGciOiJSUzI1NiIsIng1dSI6Imltc19uYTEta2V5LWF0LTEuY2VyIiwia2lkIjoiaW1zX25hMS1rZXktYXQtMSIsIml0dCI6ImF0In0...
```

When providing just the token string, the system will automatically parse the JWT to extract the expiration time.

## UI Components

### DevTokenButton

A button that appears in the top navigation (only in dev mode) showing:
- **Green "Active" badge** - Valid token is stored
- **Gray "None" badge** - No token found
- **Tooltip** - Shows expiration info

### DevTokenDialog

A modal dialog that provides:
- Token input with validation
- Expiration information display
- Clear token functionality
- Instructions for obtaining tokens

## How It Works

### Token Storage Service

Location: `web-src/src/services/tokenStorage.ts`

The `TokenStorageService` class provides:

```typescript
// Save a token
tokenStorage.saveToken({ token, expire, sid })

// Get stored token
const token = tokenStorage.getToken()

// Check if valid
const isValid = tokenStorage.isTokenValid()

// Get valid token or null
const validToken = tokenStorage.getValidToken()

// Get expiration info
const info = tokenStorage.getTokenExpiration()
// Returns: { expired, expiresAt, timeRemaining }

// Clear token
tokenStorage.clearToken()
```

### Bootstrap Integration

Location: `web-src/src/index.tsx`

When the app starts in local mode (`bootstrapRaw`):
1. Checks localStorage for a stored token
2. Validates the token expiration
3. If valid, injects it into the mock IMS object
4. If invalid, logs helpful instructions

### API Request Headers

Location: `web-src/src/services/requestHelpers.ts`

The request helpers provide all the headers needed for external API calls:

```typescript
import { constructRequestHeaders } from '../services/requestHelpers'

const headers = constructRequestHeaders(token)
// Returns:
// {
//   'Authorization': 'Bearer {token}',
//   'x-api-key': 'acom_event_service',
//   'content-type': 'application/json',
//   'x-request-id': '{uuid}',
//   'x-client-identity': '{from env}'
// }
```

## Environment Configuration

### Setting x-client-identity

The `x-client-identity` header is read from the `.env` file:

```env
CLIENT_IDENTITY=your-client-identity-here
```

If not set, it defaults to `'emc-console-dev'`.

### Accessing in Code

```typescript
import { env } from '../config/env'

const clientId = env.CLIENT_IDENTITY
const apiKey = env.API_KEY
```

## Non-Invasive Test Mode

The system supports a non-invasive test mode that prevents write operations:

```
http://localhost:9080?nonInvasiveTest=true
```

When enabled:
- `POST`, `PUT`, `DELETE` requests are logged but not sent
- Request payloads are logged to console
- Mock responses are returned

Perfect for testing UI flows without affecting real data!

## Usage Examples

### Basic API Call with Dev Token

```typescript
import { tokenStorage } from '../services/tokenStorage'
import { constructRequestHeaders, safeFetch } from '../services/requestHelpers'

async function fetchEvents() {
  const token = tokenStorage.getValidToken()
  
  if (!token) {
    console.error('No valid token available')
    return
  }
  
  const headers = constructRequestHeaders(token)
  const url = 'https://events-service.adobe.io/v1/events'
  
  const response = await safeFetch(url, {
    method: 'GET',
    headers
  })
  
  const data = await response.json()
  return data
}
```

### Image Upload with Progress

```typescript
import { uploadImage } from '../services/requestHelpers'
import { tokenStorage } from '../services/tokenStorage'

async function handleImageUpload(file: File) {
  const token = tokenStorage.getValidToken()
  if (!token) return
  
  const tracker = { progress: 0 }
  
  const config = {
    targetUrl: 'https://events-service.adobe.io/v1/images',
    altText: 'Event banner',
    type: 'banner'
  }
  
  // Update UI with progress
  const updateProgress = setInterval(() => {
    console.log(`Upload progress: ${tracker.progress.toFixed(0)}%`)
  }, 500)
  
  try {
    const result = await uploadImage(file, config, token, tracker)
    console.log('Upload complete:', result)
  } finally {
    clearInterval(updateProgress)
  }
}
```

### Using the Hook

```typescript
import { useDevToken } from '../hooks/useDevToken'

function MyComponent() {
  const { token, isDevMode, showDialog } = useDevToken()
  
  if (!token && isDevMode) {
    return (
      <View>
        <Heading>Authentication Required</Heading>
        <Button onPress={showDialog}>
          Add Dev Token
        </Button>
      </View>
    )
  }
  
  return <View>Your component content...</View>
}
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Localhost Only**: Dev token UI **only appears on localhost** (hostname is `localhost` or `127.0.0.1`)
2. **Never Interferes with Real IMS**: When running in Adobe Experience Cloud Shell, the dev token system is completely bypassed - the real IMS token from the shell is always used
3. **Two Separate Bootstrap Paths**:
   - **Experience Cloud Shell**: Uses `bootstrapInExcShell()` with real IMS token - dev token never checked
   - **Localhost**: Uses `bootstrapRaw()` with dev token from localStorage
4. **localStorage**: Tokens are stored in browser localStorage (not secure for production, but only accessible on localhost)
5. **No Encryption**: Tokens are stored in plain text (acceptable since localhost only)
6. **Expiration**: Tokens are automatically validated against expiration
7. **URL Validation**: All API calls are validated against an allowed hosts list

## Troubleshooting

### Token Not Working

1. Check the console for error messages
2. Verify token hasn't expired (check the badge tooltip)
3. Try clearing and re-adding the token
4. Ensure you're signed in to adobe.com when copying the token

### Token Expired

1. Click the "Dev Token" button
2. Click "Clear Token"
3. Get a fresh token from adobe.com
4. Paste the new token

### API Calls Failing

1. Check browser console for network errors
2. Verify the token is valid (green badge)
3. Check that `x-client-identity` is set in `.env`
4. Ensure the API endpoint is in the allowed hosts list

### Dialog Not Showing

The dialog only appears when running on localhost. Check:
- You're running on `localhost` or `127.0.0.1`
- The `DevTokenButton` is rendered in `TopNav`

**Note**: The dev token button will NEVER show when running in Adobe Experience Cloud Shell, even with URL parameters. This is by design to prevent confusion with the real IMS session.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Action                          │
│                  (Click "Dev Token" Button)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   DevTokenDialog                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. User pastes token                                │   │
│  │  2. parseTokenInput() validates format               │   │
│  │  3. tokenStorage.saveToken() stores in localStorage  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   localStorage                               │
│  { token, expire, sid }                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              App Bootstrap (index.tsx)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. tokenStorage.getValidToken()                     │   │
│  │  2. Inject into mock IMS object                      │   │
│  │  3. Render app with token                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Calls                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. constructRequestHeaders(token)                   │   │
│  │  2. Add required headers:                            │   │
│  │     - Authorization: Bearer {token}                  │   │
│  │     - x-api-key                                      │   │
│  │     - x-request-id                                   │   │
│  │     - x-client-identity                              │   │
│  │  3. safeFetch() validates and executes               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Additional Features

### Auto-Refresh on Token Update

When a token is saved or updated, the app automatically reloads to apply the new token to all components.

### Token Expiration Monitoring

The `DevTokenButton` checks token validity every minute and updates the badge status accordingly.

### Graceful Fallback

If no token is available, the app still runs but logs helpful messages guiding the developer to add a token.

## Best Practices

1. **Refresh Tokens Regularly**: Adobe IMS tokens typically expire after 24 hours
2. **Use Non-Invasive Mode**: Test UI flows with `?nonInvasiveTest=true`
3. **Check Console Logs**: The system provides detailed logging for debugging
4. **Keep .env Updated**: Ensure `CLIENT_IDENTITY` matches your backend configuration
5. **Clear Old Tokens**: Use the "Clear Token" button before adding a new one

## Related Files

- `web-src/src/services/tokenStorage.ts` - Token storage service
- `web-src/src/services/requestHelpers.ts` - API request utilities
- `web-src/src/components/DevTokenDialog.tsx` - Token input dialog
- `web-src/src/components/DevTokenButton.tsx` - Token status button
- `web-src/src/hooks/useDevToken.ts` - Token management hook
- `web-src/src/config/env.ts` - Environment configuration
- `web-src/src/index.tsx` - Bootstrap with token integration

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review this documentation
3. Check the related source files for implementation details
4. Contact the development team

