# Environment Variables Setup Guide

## 📝 Setting CLIENT_IDENTITY

The `CLIENT_IDENTITY` is now properly loaded from your `.env` file using Parcel's built-in environment variable support.

### **Step 1: Add to .env File**

Open `/Users/cod87753/Code/EMC/.env` and add:

```bash
CLIENT_IDENTITY=your-actual-client-identity-value
```

Example:
```bash
CLIENT_IDENTITY=emc-adobe-internal-v2
```

### **Step 2: Restart the Dev Server**

After adding the variable to `.env`:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
aio app run
```

### **Step 3: Verify It's Working**

1. Open your browser console
2. Look for the debug output:
   ```
   🔧 Environment Configuration:
      CLIENT_IDENTITY: your-actual-value
      API_KEY: acom_event_service
      NODE_ENV: development
   ```

3. Check Network tab → Request Headers:
   - Should see: `x-client-identity: your-actual-value`

## 🔍 How It Works

### **Parcel Build-Time Injection**

Adobe I/O Runtime uses Parcel bundler which automatically:
1. Reads `.env` file from project root
2. Injects `process.env.*` variables at build time
3. Replaces them with actual values in the bundled code

### **Configuration Flow**

```
.env file
    ↓
Parcel reads environment variables
    ↓
process.env.CLIENT_IDENTITY replaced at build time
    ↓
env.ts exports the value
    ↓
requestHelpers.ts uses it in headers
    ↓
API calls include x-client-identity header
```

### **app.config.yaml Integration**

The `app.config.yaml` is configured to pass environment variables to the web app:

```yaml
application:
  web: web-src
  env:
    CLIENT_IDENTITY: $CLIENT_IDENTITY  # Reads from .env
```

## ✅ Verification Checklist

- [ ] `CLIENT_IDENTITY` added to `.env` file
- [ ] Dev server restarted
- [ ] Console shows correct value
- [ ] Network requests include correct header
- [ ] No warning about default value

## 🔒 Security

- `.env` file is in `.gitignore` - never commit it!
- Each developer should have their own `.env` file
- Production values should be set in deployment config

## 📖 Additional Variables

You can add more environment variables the same way:

```bash
# .env file
CLIENT_IDENTITY=your-value
API_KEY=acom_event_service
CUSTOM_VAR=some-value
```

Then access in code:
```typescript
process.env.CUSTOM_VAR
```

## 🐛 Troubleshooting

### Variable Not Loading

1. **Check .env file location**: Must be at project root (`/Users/cod87753/Code/EMC/.env`)
2. **Check variable name**: Must match exactly (case-sensitive)
3. **Restart dev server**: Changes require restart
4. **Check for quotes**: Use `VAR=value` not `VAR="value"` in .env

### Still Seeing Default Value

1. Clear parcel cache: `rm -rf .parcel-cache`
2. Restart dev server: `aio app run`
3. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Network Requests Still Wrong

1. Check browser console for environment debug output
2. Verify the value is correct in console
3. Check Network tab → Headers → Request Headers
4. Look for `x-client-identity` header

---

**Need Help?**
Check the browser console for debug output and warnings.

