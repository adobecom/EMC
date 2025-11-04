# Local Development with IMS Authentication

## Overview

When developing locally, you need IMS authentication to get a bearer token for calling backend APIs. Here are your options.

## Option 1: Adobe Experience Cloud Shell (DevMode) ⭐ Recommended

Access your local app through the Adobe ExC Shell to get real IMS authentication.

### Steps:

1. **Deploy your app:**
   ```bash
   aio app deploy
   ```

2. **Get your app URL from deployment output or:**
   ```bash
   aio app:get-url
   ```

3. **Access via ExC Shell with devMode:**
   ```
   https://experience.adobe.com/?devMode=true#/@YOUR-ORG-ID/YOUR-APP-ID
   ```

4. **In your browser console, run:**
   ```javascript
   // Get your IMS token
   console.log('Token:', window.adobeIMS?.getAccessToken())
   
   // Get your org ID
   console.log('Org:', window.adobeIMS?.getProfile()?.projectedProductContext?.[0]?.prodCtx?.owningEntity)
   ```

5. **Copy the token and use it in your local dev:**
   - Update `bootstrapRaw()` in `index.tsx` with the real token
   - Or store it in localStorage for persistence

### Advantages:
- ✅ Real IMS authentication
- ✅ Real user profile data
- ✅ Tests actual production flow
- ✅ No mock data needed

---

## Option 2: Mock IMS Data (Quick UI Development)

Update `index.tsx` to use realistic mock data:

```typescript
// web-src/src/index.tsx

function bootstrapRaw(): void {
  // Get from localStorage if available (from Option 1)
  const storedToken = localStorage.getItem('dev_ims_token')
  const storedOrg = localStorage.getItem('dev_ims_org')
  
  const mockIms: IMS = {
    profile: {
      userId: 'user@AdobeID',
      name: 'John Doe',
      email: 'john.doe@adobe.com',
      first_name: 'John',
      last_name: 'Doe'
    },
    org: storedOrg || '12345@AdobeOrg',
    token: storedToken || 'mock-token-replace-with-real'
  }

  ReactDOM.render(
    <App runtime={mockRuntime} ims={mockIms} />,
    document.getElementById('root')
  )
}
```

### To use a real token:

1. **Get token from ExC Shell** (see Option 1, step 4)

2. **Store it in browser console:**
   ```javascript
   localStorage.setItem('dev_ims_token', 'YOUR_REAL_TOKEN_HERE')
   localStorage.setItem('dev_ims_org', 'YOUR_ORG_ID@AdobeOrg')
   ```

3. **Refresh your local dev server**

4. **Token persists across refreshes** until you clear localStorage

### Advantages:
- ✅ Fast iteration
- ✅ Works offline
- ✅ No need to deploy
- ✅ Can use real tokens when needed

---

## Option 3: Use AIO CLI to Get Token

Get a token directly from the CLI:

```bash
# Login to Adobe I/O
aio login

# Get your access token
aio auth:ctx

# Or get it programmatically
aio where
```

The token will be in your `.aio` config file:
```bash
cat ~/.config/@adobe/aio-cli-plugin-auth/tokens.json
```

**Use this token in your mock IMS data (Option 2).**

---

## Option 4: IMS Token Helper Component

Create a helper component to easily input/manage tokens during development:

```typescript
// web-src/src/components/DevTokenManager.tsx
import React, { useState } from 'react'
import { View, TextField, Button, Flex, Heading } from '@adobe/react-spectrum'

export const DevTokenManager: React.FC = () => {
  const [token, setToken] = useState(localStorage.getItem('dev_ims_token') || '')
  const [org, setOrg] = useState(localStorage.getItem('dev_ims_org') || '')

  const handleSave = () => {
    localStorage.setItem('dev_ims_token', token)
    localStorage.setItem('dev_ims_org', org)
    window.location.reload()
  }

  const handleClear = () => {
    localStorage.removeItem('dev_ims_token')
    localStorage.removeItem('dev_ims_org')
    setToken('')
    setOrg('')
    window.location.reload()
  }

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null

  return (
    <View padding="size-300" backgroundColor="gray-100">
      <Heading level={4}>Dev Token Manager</Heading>
      <Flex direction="column" gap="size-200">
        <TextField
          label="IMS Token"
          value={token}
          onChange={setToken}
          width="100%"
        />
        <TextField
          label="Org ID"
          value={org}
          onChange={setOrg}
          width="100%"
        />
        <Flex gap="size-100">
          <Button variant="cta" onPress={handleSave}>
            Save & Reload
          </Button>
          <Button variant="secondary" onPress={handleClear}>
            Clear
          </Button>
        </Flex>
      </Flex>
    </View>
  )
}
```

**Add to your Home component:**
```typescript
// web-src/src/components/Home.tsx
import { DevTokenManager } from './DevTokenManager'

export const Home: React.FC = () => {
  return (
    <View>
      <DevTokenManager />
      {/* ... rest of home content */}
    </View>
  )
}
```

---

## Option 5: Proxy Through Local Backend

If you have backend actions deployed, they can handle authentication:

```typescript
// In your backend action
const token = getBearerToken(params) // Already validated by Adobe API Gateway
const orgId = params.__ow_headers['x-gw-ims-org-id']

// Use this token to call other Adobe APIs
const response = await fetch('https://api.adobe.io/some-service', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-gw-ims-org-id': orgId
  }
})
```

Frontend just calls your action:
```typescript
// Frontend doesn't need to manage tokens
const response = await apiService.getData()
```

---

## Recommended Workflow

### For UI Development:
1. Use **Option 2** (Mock IMS) for fast iteration
2. Use hardcoded mock data initially
3. When you need real data, use **Option 1** to get a token
4. Store token in localStorage
5. Develop against real APIs with real token

### For Backend Integration:
1. Deploy backend with `aio app deploy`
2. Use **Option 1** (ExC Shell DevMode) to test full flow
3. Backend receives validated tokens from Adobe API Gateway

### For E2E Testing:
1. Use **Option 1** (ExC Shell DevMode) exclusively
2. Tests real authentication flow
3. No mocks needed

---

## Quick Start Example

**1. Update `index.tsx`:**

```typescript
function bootstrapRaw(): void {
  const mockRuntime: RuntimeType = { 
    on: () => {},
    done: () => {}
  }
  
  // Check for dev tokens in localStorage
  const devToken = localStorage.getItem('dev_ims_token')
  const devOrg = localStorage.getItem('dev_ims_org')
  
  const mockIms: IMS = {
    profile: devToken ? {
      userId: 'dev-user@AdobeID',
      name: 'Dev User',
      email: 'dev@example.com'
    } : undefined,
    org: devOrg || undefined,
    token: devToken || undefined
  }

  console.log('🔧 Dev Mode - IMS:', mockIms)

  ReactDOM.render(
    <App runtime={mockRuntime} ims={mockIms} />,
    document.getElementById('root')
  )
}
```

**2. In browser console (after getting token from ExC Shell):**

```javascript
// Paste your real token
const token = 'eyJ...' // Your token from ExC Shell
const org = '12345@AdobeOrg' // Your org ID

localStorage.setItem('dev_ims_token', token)
localStorage.setItem('dev_ims_org', org)

// Reload page
location.reload()
```

**3. Your app now uses the real token for API calls!**

---

## Token Expiration

IMS tokens typically expire after 24 hours. When your API calls start failing:

1. Get a fresh token from ExC Shell
2. Update localStorage
3. Reload

Or automate it:

```typescript
// Add to your API service
private async callAction<T>(actionName: string, params: any): Promise<T> {
  try {
    const response = await actionWebInvoke(...)
    return response
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('❌ Token expired. Get a fresh token from ExC Shell!')
      alert('Token expired. Please update your dev token.')
    }
    throw error
  }
}
```

---

## Security Notes

⚠️ **Never commit real tokens to git**
⚠️ **Don't share tokens** (they're tied to your user account)
⚠️ **Use dev tokens only in local dev** (not production)
⚠️ **Clear tokens when done** (`localStorage.clear()`)

---

## Troubleshooting

### Issue: "IMS authentication not available yet"
**Solution:** Token is not set. Follow Option 1 or 2 to get/set a token.

### Issue: "401 Unauthorized"
**Solution:** Token expired. Get a fresh token from ExC Shell.

### Issue: "Action not found"
**Solution:** Deploy backend actions: `aio app deploy`

### Issue: "CORS errors"
**Solution:** 
- Ensure actions have `web: 'yes'` in `app.config.yaml`
- Use ExC Shell DevMode instead of direct localhost

---

## Resources

- [Adobe I/O Runtime Authentication](https://developer.adobe.com/runtime/docs/guides/using/security/)
- [IMS API Documentation](https://developer.adobe.com/developer-console/docs/guides/authentication/)
- [App Builder Local Development](https://developer.adobe.com/app-builder/docs/getting_started/first_app/)

