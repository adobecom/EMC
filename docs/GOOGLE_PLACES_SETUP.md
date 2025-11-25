# Google Places API Setup Guide

**Version:** 1.0  
**Last Updated:** November 25, 2025

## Overview

The EMC application uses Google Places API for venue autocomplete functionality in the Event Form. This guide explains how to set up and configure the Google Places API integration.

## Prerequisites

- Google Cloud Platform account
- A project in Google Cloud Console
- Billing enabled for the project (required for Maps/Places APIs)

## Setup Steps

### 1. Create/Access Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Make sure billing is enabled for the project

### 2. Enable Google Places API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Places API"
3. Click on "Places API" and click **Enable**
4. Also enable "Maps JavaScript API" (required for Places API)

### 3. Create API Key

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the generated API key

### 4. Secure Your API Key (Recommended)

1. Click on the newly created API key to edit it
2. Under **API restrictions**, select "Restrict key"
3. Choose the following APIs:
   - Places API
   - Maps JavaScript API
4. Under **Application restrictions**, choose one:
   - **HTTP referrers (websites)** - Recommended for production
     - Add your domain(s): `yourdomain.com/*`
     - For localhost: `localhost:*` and `127.0.0.1:*`
   - **IP addresses** - For backend servers only
5. Click **Save**

### 5. Configure EMC Application

1. Create/edit `.env` file in the project root

2. Add your Google Places API key(s) based on environment:
   ```
   # Development/Local environment
   DEV_GOOGLE_PLACES_API=your_dev_api_key_here
   
   # Staging environment
   STAGE_GOOGLE_PLACES_API=your_stage_api_key_here
   
   # Production environment
   PROD_GOOGLE_PLACES_API=your_prod_api_key_here
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

**Note:** The application automatically selects the correct API key based on the current environment (dev, stage, or prod).

## Usage in Application

### VenueComponent Integration

The Google Places API is automatically loaded when the VenueComponent mounts:

```typescript
import { loadGooglePlacesAPI } from '../../utils/loadGooglePlaces'

// In component
useEffect(() => {
  const initAutocomplete = async () => {
    await loadGooglePlacesAPI()
    // Initialize autocomplete
  }
  initAutocomplete()
}, [])
```

### Features

The venue autocomplete provides:

- **Real-time search** - Start typing venue name to see suggestions
- **Establishment filtering** - Only shows business/venue results
- **Auto-population** - Automatically fills:
  - Venue name
  - Full address (formatted_address)
  - Geographic coordinates (lat/lng)
  - Place ID
  - GMT offset

### Manual Override

The venue address field is auto-populated but remains editable:
- Users can modify the address if needed
- Useful for adding suite numbers, special instructions, etc.

## API Quotas and Costs

### Free Tier

Google provides a generous free tier:
- $200 monthly credit (enough for ~28,000 autocomplete requests)
- After free tier: ~$0.017 per autocomplete request

### Best Practices to Minimize Costs

1. **API Key Restrictions** - Prevent unauthorized use
2. **Session Tokens** - Group requests for billing optimization (future enhancement)
3. **Field Selection** - Only request needed fields (already implemented):
   ```typescript
   fields: ['place_id', 'name', 'formatted_address', 'geometry', 'utc_offset_minutes']
   ```

## Troubleshooting

### API Key Not Working

**Symptom:** Console warning "⚠️ Google Places API key not configured"

**Solutions:**
1. Check `.env` file exists and has the correct environment-specific key:
   - Local/Dev: `DEV_GOOGLE_PLACES_API`
   - Stage: `STAGE_GOOGLE_PLACES_API`
   - Prod: `PROD_GOOGLE_PLACES_API`
2. Restart development server after adding the key
3. Check API key is not restricted to wrong domain/IP

### Autocomplete Not Appearing

**Symptom:** No suggestions when typing in venue name field

**Solutions:**
1. Check browser console for API errors
2. Verify Places API is enabled in Google Cloud Console
3. Check API key restrictions (HTTP referrers, IP addresses)
4. Ensure billing is enabled for your Google Cloud project

### CORS Errors

**Symptom:** CORS policy errors in browser console

**Solutions:**
- Google Places API should not have CORS issues when loaded via script tag
- If issues persist, check HTTP referrer restrictions in API key settings

### Rate Limiting

**Symptom:** 429 errors or "OVER_QUERY_LIMIT" responses

**Solutions:**
1. Check your Google Cloud Console for quota usage
2. Increase quotas if needed (may require billing upgrade)
3. Implement debouncing for autocomplete requests (future enhancement)

## Development vs Production

### Development Setup

For local development:
```
# .env
DEV_GOOGLE_PLACES_API=your_dev_api_key
```

API Key restrictions:
- HTTP referrers: `localhost:*`, `127.0.0.1:*`, `*.dev.adobe.com/*`

### Staging Setup

For staging environment:
```
# .env
STAGE_GOOGLE_PLACES_API=your_stage_api_key
```

API Key restrictions:
- HTTP referrers: `*.stage.adobe.com/*`, `*.corp.adobe.com/*`

### Production Setup

For production deployment:
```
# .env
PROD_GOOGLE_PLACES_API=your_prod_api_key
```

API Key restrictions:
- HTTP referrers: `*.adobe.com/*`, `events-internal.adobe.com/*`

**Best Practice:** Use separate API keys for each environment with appropriate restrictions.

## Security Considerations

### ✅ DO

- Use separate API keys for different environments
- Restrict API keys by HTTP referrer in production
- Regularly rotate API keys
- Monitor usage in Google Cloud Console
- Set up billing alerts

### ❌ DON'T

- Commit API keys to version control (.env is gitignored)
- Use production keys in development
- Leave API keys unrestricted
- Share API keys across projects

## Future Enhancements

Potential improvements for the Places API integration:

1. **Session Tokens** - Reduce costs by grouping autocomplete requests
2. **Debouncing** - Limit API calls while user types
3. **Caching** - Cache recent venue searches
4. **Geolocation Bias** - Bias results to user's location
5. **Country Restrictions** - Limit results to specific countries
6. **Map Preview** - Show venue location on embedded map

## Related Documentation

- [VenueComponent](./MODULAR_COMPONENT_PATTERN.md#example-4-venuecomponent)
- [Event Form Guide](./EVENT_FORM.md)
- [Environment Configuration](./DEVELOPMENT_WORKFLOW.md)

## External Resources

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Places Autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)

---

**Questions?** Check the [Google Places API documentation](https://developers.google.com/maps/documentation/places/web-service) or contact the development team.

