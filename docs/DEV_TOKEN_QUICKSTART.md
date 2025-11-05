# Dev Token Quick Start

> **TL;DR**: Get a token from adobe.com, paste it in the app, start coding! 🚀

## 30-Second Setup

1. **Run the app**
   ```bash
   npm run dev
   ```

2. **Get a token**
   - Go to [adobe.com](https://adobe.com) and sign in
   - Open DevTools (F12) → Console
   - Run: `window.adobeIMS?.getAccessToken()`
   - Copy the output

3. **Add to app**
   - Click **"Dev Token"** button (top right, next to user menu)
   - Paste the token
   - Click **"Save Token"**

4. **Done!** ✅
   - App reloads with your token
   - All API calls work
   - Token auto-expires when it's supposed to

## Token Status

| Badge | Meaning |
|-------|---------|
| 🟢 **Active** | Token valid and working |
| ⚪ **None** | No token - add one! |

Hover over the badge to see expiration time.

## Common Tasks

### Make an API Call

```typescript
import { externalApi } from '../services/externalApi.example'

// Get events
const events = await externalApi.getEvents()

// Get specific event
const event = await externalApi.getEvent('event-123')

// Create event
const newEvent = await externalApi.createEvent({ 
  title: 'My Event' 
}, 'en_US')
```

### Check if Token Exists

```typescript
import { tokenStorage } from '../services/tokenStorage'

if (!tokenStorage.isTokenValid()) {
  console.log('Need a token!')
}
```

### Custom API Call

```typescript
import { tokenStorage } from '../services/tokenStorage'
import { constructRequestHeaders, safeFetch } from '../services/requestHelpers'

const token = tokenStorage.getValidToken()
const headers = constructRequestHeaders(token)

const response = await safeFetch('https://your-api.adobe.io/endpoint', {
  method: 'POST',
  headers,
  body: JSON.stringify({ data: 'value' })
})
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No valid token" error | Click Dev Token button and add one |
| Token expired | Clear and add a fresh token |
| API call fails | Check console for errors, verify token is valid |
| Button not showing | Make sure you're on localhost |

## Tips

- 💡 Tokens last ~24 hours
- 💡 Check the badge tooltip to see time remaining
- 💡 Use `?nonInvasiveTest=true` to test without writing data
- 💡 The app auto-reloads when you save a token

## Environment Setup

Add to `.env` file:

```env
CLIENT_IDENTITY=your-client-identity-here
```

## Need More Info?

See the full guide: [DEV_TOKEN_GUIDE.md](./DEV_TOKEN_GUIDE.md)

