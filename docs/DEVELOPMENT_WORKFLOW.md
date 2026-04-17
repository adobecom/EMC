# Official Adobe App Builder Development Workflow

## Overview

This guide covers the **official Adobe-recommended approach** for developing App Builder applications with IMS authentication.

---

## 🎯 Official Development Workflow

### **Step 1: Deploy Your Application**

Deploy your app to Adobe I/O Runtime:

```bash
aio app deploy
```

This deploys:
- ✅ Backend actions to Adobe I/O Runtime
- ✅ Frontend to CDN
- ✅ Generates action URLs
- ✅ Configures authentication

### **Step 2: Access via Experience Cloud Shell**

#### **For Production:**
```
https://experience.adobe.com/#/@YOUR-ORG/YOUR-APP-ID
```

#### **For Development (DevMode):**
```
https://experience.adobe.com/?devMode=true#/@YOUR-ORG/YOUR-APP-ID
```

**DevMode enables:**
- ✅ Hot reload of frontend changes
- ✅ Better debugging tools
- ✅ Faster iteration
- ✅ Full IMS authentication

### **Step 3: Develop with Hot Reload**

When you access your app via ExC Shell with `devMode=true`:

1. **Make changes** to your frontend code (`web-src/`)
2. **Save the file**
3. **Browser auto-refreshes** with your changes
4. **IMS authentication** works automatically

---

## 🔄 Development Modes

### **Mode 1: Deployed Backend + Local Frontend (Recommended)**

**Use this for active development:**

```bash
# Deploy backend actions
aio app deploy

# Access via ExC Shell with devMode
# https://experience.adobe.com/?devMode=true#/@org/app-id
```

**What happens:**
- ✅ Frontend served from your local dev server (hot reload)
- ✅ Backend actions run on Adobe I/O Runtime
- ✅ IMS authentication from ExC Shell
- ✅ Fast frontend iteration

**Best for:** UI development, component work, styling

---

### **Mode 2: Fully Local (Actions + Frontend)**

**Use this to test actions locally:**

```bash
# Run everything locally
aio app run --local
```

**What happens:**
- ✅ Frontend at `localhost:3000` (see `package.json` `dev` script)
- ✅ Actions run in local OpenWhisk container
- ✅ Need to access via ExC Shell for IMS

**Best for:** Backend action development, debugging actions

**Access locally running app:**
```
https://experience.adobe.com/?devMode=true&localDevUrl=https://localhost:3000#/@org/app-id
```

---

### **Mode 3: Standard Run (No Local Actions)**

**Quick frontend-only development:**

```bash
aio app run
```

**What happens:**
- ✅ Frontend at `localhost:3000` (see `package.json` `dev` script)
- ✅ Calls deployed backend actions
- ❌ No IMS authentication in standalone mode

**Best for:** Quick UI checks without authentication

---

## 📝 Typical Development Session

### **Morning: Deploy & Start**

```bash
# 1. Deploy your app (if you made backend changes)
aio app deploy

# 2. Get your app URL
aio app:get-url

# 3. Open in browser with devMode
# https://experience.adobe.com/?devMode=true#/@YOUR-ORG/YOUR-APP-ID
```

### **During Development: Make Changes**

1. **Edit your code** in `web-src/`
2. **Save the file**
3. **Browser refreshes** automatically
4. **Test with real IMS authentication**

### **For Backend Changes:**

```bash
# Redeploy actions
aio app deploy

# Or deploy only actions (faster)
aio app deploy --actions
```

### **End of Day: Check Logs**

```bash
# View runtime logs
aio app logs

# View specific activation
aio rt activation list
aio rt activation get <activation-id>
```

---

## 🔐 How IMS Authentication Works

### **In Production / DevMode:**

```
User → ExC Shell → Your App
              ↓
         IMS Token Provided Automatically
              ↓
         Frontend (receives ims prop)
              ↓
         Backend Actions (token validated by API Gateway)
```

**You don't manage tokens manually.** Adobe handles everything.

### **Authentication Flow:**

1. **User logs in** to experience.adobe.com
2. **Adobe IMS** authenticates the user
3. **ExC Shell** provides IMS data to your app:
   ```typescript
   runtime.on('ready', ({ imsOrg, imsToken, imsProfile }) => {
     const ims: IMS = {
       profile: imsProfile,
       org: imsOrg,
       token: imsToken
     }
     // Your app receives authenticated IMS data
   })
   ```
4. **Frontend** passes token in API calls (via apiService)
5. **Adobe API Gateway** validates token
6. **Your backend actions** receive validated requests

**You never handle raw tokens.** The framework does it.

---

## 🏗️ Project Structure for Development

```
EMC/
├── web-src/              # Frontend (hot reload in devMode)
│   └── src/
│       ├── components/   # Edit these frequently
│       └── services/     # API service (calls deployed actions)
│
├── actions/              # Backend (deploy to test)
│   ├── sample/
│   └── utils.js
│
└── app.config.yaml       # Action configuration
```

**Development pattern:**
- ✅ Edit frontend → auto-refresh
- ✅ Edit backend → `aio app deploy --actions`
- ✅ Test with real IMS via ExC Shell

---

## 🚀 Quick Reference Commands

### **Deployment:**
```bash
aio app deploy                # Deploy everything
aio app deploy --actions      # Deploy only actions (faster)
aio app deploy --web-assets   # Deploy only frontend
aio app undeploy              # Remove deployment
```

### **Development:**
```bash
aio app run                   # Run frontend locally
aio app run --local           # Run actions + frontend locally
aio app logs                  # View runtime logs
```

### **Information:**
```bash
aio app:get-url               # Get your app URL
aio app:info                  # Show app info
aio rt action list            # List deployed actions
aio rt activation list        # List recent activations
```

### **Debugging:**
```bash
aio app logs --tail           # Tail logs in real-time
aio rt activation logs <id>   # Get specific activation logs
aio rt activation get <id>    # Get full activation details
```

---

## 🎨 Frontend Development Flow

### **Quick Iteration:**

1. **Open app in ExC Shell** with devMode
2. **Make changes** to React components
3. **Save file** → browser auto-refreshes
4. **See changes instantly** with real IMS data
5. **Repeat**

**No manual token management needed!**

### **Example: Adding a New Component**

```bash
# 1. App is already deployed and open in ExC Shell

# 2. Create new component
touch web-src/src/components/NewFeature.tsx

# 3. Edit the file
# ... add your component code ...

# 4. Import in App.tsx and add route

# 5. Save → Browser refreshes automatically

# 6. Test with real IMS authentication
```

---

## ⚙️ Backend Action Development Flow

### **Testing Actions:**

1. **Write your action** in `actions/myaction/index.js`
2. **Deploy it:**
   ```bash
   aio app deploy --actions
   ```
3. **Test via frontend** in ExC Shell
4. **Check logs:**
   ```bash
   aio app logs --tail
   ```
5. **Iterate** and redeploy

### **Local Action Testing:**

```bash
# Run actions locally
aio app run --local

# Access via ExC Shell
# https://experience.adobe.com/?devMode=true&localDevUrl=https://localhost:3000
```

---

## 🔧 Environment Configuration

### **app.config.yaml:**

Your actions are configured to require authentication:

```yaml
actions:
  myaction:
    function: actions/myaction/index.js
    web: 'yes'
    runtime: nodejs:22
    annotations:
      require-adobe-auth: true  # ← Adobe validates IMS token
      final: true
```

**This means:**
- ✅ Adobe API Gateway validates tokens
- ✅ Invalid tokens are rejected automatically
- ✅ Your action receives validated requests
- ✅ No manual token validation needed

---

## 🎯 Best Practices

### **DO:**
- ✅ Deploy regularly to test backend changes
- ✅ Use ExC Shell with devMode for development
- ✅ Let Adobe handle authentication
- ✅ Use `aio app logs` to debug
- ✅ Test with real IMS data

### **DON'T:**
- ❌ Manually manage IMS tokens
- ❌ Store tokens in code or localStorage
- ❌ Try to authenticate yourself
- ❌ Bypass Adobe's authentication
- ❌ Use mock data when real IMS is available

---

## 📊 Development Workflow Comparison

| Task | Command | IMS Auth | Speed |
|------|---------|----------|-------|
| **Quick UI check** | `aio app run` | ❌ No | ⚡ Fast |
| **UI dev with IMS** | Deploy + ExC Shell devMode | ✅ Yes | ⚡⚡ Fast |
| **Backend testing** | `aio app deploy --actions` | ✅ Yes | ⚡ Medium |
| **Full local** | `aio app run --local` | ✅ Yes* | ⚡ Medium |
| **Production** | `aio app deploy` | ✅ Yes | ⚡ Fast |

*Requires ExC Shell access

---

## 🐛 Troubleshooting

### **Issue: "No IMS token"**
**Solution:** Access app via ExC Shell, not direct localhost

### **Issue: "Action not found"**
**Solution:** Run `aio app deploy`

### **Issue: "401 Unauthorized"**
**Solution:** Ensure `require-adobe-auth: true` in app.config.yaml

### **Issue: "Changes not showing"**
**Solution:** Clear browser cache or hard refresh (Cmd+Shift+R)

---

## 📚 Resources

- [App Builder Documentation](https://developer.adobe.com/app-builder/docs/)
- [IMS Authentication](https://developer.adobe.com/developer-console/docs/guides/authentication/)
- [Runtime Documentation](https://developer.adobe.com/runtime/docs/)
- [CLI Reference](https://github.com/adobe/aio-cli)

---

## ✅ Summary

**The official way:**
1. Deploy your app: `aio app deploy`
2. Access via ExC Shell with devMode
3. Develop with hot reload
4. Let Adobe handle IMS authentication
5. Test with real authentication data

**No token management, no workarounds, no hacks.** Just the Adobe way. 🎯

