# Standalone Biometric Check-in Page

Rebuild the biometric check-in flow as a **zero-build, public-facing HTML page** using only browser-native APIs and ESM CDN imports. No React, no bundler, no Node.

---

## Goals

- Single `index.html` deployable to any static host (S3, Cloudflare Pages, GH Pages, etc.)
- All dependencies loaded as ES modules from CDN at runtime
- No build step, no `node_modules`, no framework
- Same check-in UX: token → load event → camera → face detect → capture → confirm → done

---

## Architecture

```
biometric-checkin/
├── index.html          # Entry point, shell markup, <script type="module">
├── style.css           # All styles (no CSS-in-JS, no design tokens runtime)
├── modules/
│   ├── app.js          # State machine, DOM orchestration, init()
│   ├── camera.js       # getUserMedia, canvas capture, stream lifecycle
│   ├── faceDetection.js# MediaPipe loader, detection loop, bounding box
│   ├── api.js          # fetch() wrappers for ESP endpoints
│   ├── token.js        # btoa/atob token encode/decode
│   └── ui.js           # DOM helpers: createElement, show/hide, render functions
```

All files are `<script type="module">` or imported via `import` statements. No globals except the single `init()` entry point.

---

## Step 1: Token & API Layer

### `modules/token.js`

Port `checkinToken.ts` verbatim — it's already vanilla JS.

```js
export function parseCheckinToken(token) {
  try {
    const decoded = atob(token)
    const [eventId, attendeeId] = decoded.split(':')
    if (!eventId || !attendeeId) return null
    return { eventId, attendeeId }
  } catch { return null }
}

export function createCheckinToken(eventId, attendeeId) {
  return btoa(`${eventId}:${attendeeId}`)
}
```

### `modules/api.js`

Thin `fetch()` wrappers. The public check-in page needs a different auth strategy than the internal SPA (see Step 6), but the shape is:

```js
const ESP_HOST = 'https://events-service-platform.adobe.io' // or stage variant

async function espFetch(path, options = {}) {
  const res = await fetch(`${ESP_HOST}${path}`, {
    headers: {
      'x-api-key': 'acom_event_service',
      'x-request-id': crypto.randomUUID(),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) throw new Error(`ESP ${res.status}: ${res.statusText}`)
  return res.json()
}

export async function getEvent(eventId) {
  return espFetch(`/v1/events/${eventId}`)
}

export async function getAttendee(eventId, attendeeId) {
  return espFetch(`/v1/events/${eventId}/attendees/${attendeeId}`)
}

export async function checkinAttendee(eventId, attendeeId) {
  return espFetch(`/v1/events/${eventId}/attendees/${attendeeId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ checkedIn: true }),
  })
}
```

**Open question:** Auth. The current SPA uses an IMS Bearer token. A public page can't expose that. Options:
1. **Signed token** — Embed a short-lived HMAC signature in the check-in URL itself. A lightweight edge function (Cloudflare Worker / Lambda@Edge) validates the signature and proxies the ESP call with the real Bearer token. The HTML page never sees the credential.
2. **Public ESP endpoint** — If Adobe ESP supports scoped API keys or unsigned attendee-level endpoints, use those directly. Needs ESP team confirmation.
3. **Thin proxy** — An App Builder action that accepts the check-in token, validates it, and forwards to ESP. The action holds the IMS credential.

Option 3 (App Builder proxy action) is the most practical near-term path since the infra already exists.

---

## Step 2: Camera Module

### `modules/camera.js`

Port `useCamera.ts` logic. Without React hooks, this becomes a plain object that holds refs and exposes methods.

```js
export function createCamera({ facingMode = 'user', width = 640, height = 480 } = {}) {
  let stream = null
  let videoEl = null

  return {
    async start(targetVideoEl) {
      videoEl = targetVideoEl
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: width }, height: { ideal: height } }
      })
      videoEl.srcObject = stream
      await videoEl.play()
    },

    capture() {
      const canvas = document.createElement('canvas')
      canvas.width = videoEl.videoWidth
      canvas.height = videoEl.videoHeight
      canvas.getContext('2d').drawImage(videoEl, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.9)
    },

    stop() {
      stream?.getTracks().forEach(t => t.stop())
      stream = null
    }
  }
}
```

Mirroring (`scaleX(-1)`) is CSS-only on the `<video>` and preview `<img>` elements — no JS needed.

---

## Step 3: Face Detection Module

### `modules/faceDetection.js`

MediaPipe's `@mediapipe/tasks-vision` publishes ESM builds on CDN.

```js
import { FaceDetector, FilesetResolver } from
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm'

let detector = null

async function getDetector() {
  if (detector) return detector
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  )
  detector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.5,
  })
  return detector
}

export function createFaceDetectionLoop(videoEl, onResult, interval = 250) {
  let rafId = null
  let lastTime = 0

  async function tick() {
    const now = performance.now()
    if (now - lastTime >= interval && videoEl.readyState >= 2) {
      lastTime = now
      const det = await getDetector()
      const result = det.detectForVideo(videoEl, now)
      const face = result.detections[0]
      onResult(face ? { detected: true, box: face.boundingBox } : { detected: false })
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    start()   { tick() },
    stop()    { cancelAnimationFrame(rafId) },
  }
}
```

Key detail: the WASM + model files are ~4 MB total. They're cached by the browser after first load. The `+esm` suffix on jsDelivr gives us a native ES module wrapper.

---

## Step 4: UI Rendering

### `modules/ui.js`

Minimal DOM helpers — no virtual DOM, no diffing. The page has a fixed set of "screens" that get shown/hidden.

```js
export const $ = (sel) => document.querySelector(sel)
export const show = (el) => el.removeAttribute('hidden')
export const hide = (el) => el.setAttribute('hidden', '')

export function renderEventBanner(container, event) {
  container.innerHTML = ''
  const title = document.createElement('h2')
  title.textContent = event.title || event.enTitle || ''
  container.appendChild(title)
  // date, time, venue lines...
}
```

Each "screen" is a `<section hidden>` in `index.html`. State transitions just toggle `hidden` attributes. No re-renders, no template strings injected into innerHTML for user-supplied data (XSS prevention — use `textContent` for all dynamic values).

### `index.html` — Shell Markup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Check-in</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <section id="screen-loading">Loading...</section>

    <section id="screen-error" hidden>
      <h2 id="error-heading"></h2>
      <p id="error-message"></p>
    </section>

    <section id="screen-event" hidden>
      <h1>Check-in</h1>
      <div id="event-banner"></div>
    </section>

    <section id="screen-capture" hidden>
      <div class="camera-container">
        <video id="camera-feed" autoplay playsinline muted></video>
        <canvas id="face-overlay"></canvas>
        <div id="face-guide" class="face-guide"></div>
      </div>
      <button id="btn-capture" disabled>Capture</button>
    </section>

    <section id="screen-preview" hidden>
      <img id="preview-photo" alt="Captured photo">
      <div class="button-row">
        <button id="btn-retake">Retake</button>
        <button id="btn-confirm">Confirm Check-in</button>
      </div>
    </section>

    <section id="screen-checking-in" hidden>
      <div class="spinner"></div>
      <p>Checking in...</p>
    </section>

    <section id="screen-success" hidden>
      <div class="success-icon">&#10003;</div>
      <h2>Check-in Confirmed</h2>
      <p id="success-detail"></p>
    </section>
  </main>

  <script type="module" src="modules/app.js"></script>
</body>
</html>
```

---

## Step 5: State Machine

### `modules/app.js`

Same states as the React version, but as a plain switch-based controller.

```
States: loading → [error | already-checked-in | capture] → preview → checking-in → success
```

```js
import { parseCheckinToken } from './token.js'
import { getEvent, getAttendee, checkinAttendee } from './api.js'
import { createCamera } from './camera.js'
import { createFaceDetectionLoop } from './faceDetection.js'
import { $, show, hide, renderEventBanner } from './ui.js'

const screens = ['loading', 'error', 'event', 'capture', 'preview', 'checking-in', 'success']

function transition(screen) {
  screens.forEach(s => hide($(`#screen-${s}`)))
  show($(`#screen-${screen}`))
}

async function init() {
  const token = new URLSearchParams(location.search).get('token')
  if (!token) return showError('Invalid Link', 'No check-in token provided.')

  const parsed = parseCheckinToken(token)
  if (!parsed) return showError('Invalid Link', 'The check-in link is malformed or expired.')

  const { eventId, attendeeId } = parsed

  try {
    const [attendee, event] = await Promise.all([
      getAttendee(eventId, attendeeId),
      getEvent(eventId),
    ])

    renderEventBanner($('#event-banner'), event)
    show($('#screen-event'))

    if (attendee.checkedIn) {
      return showError('Already Checked In', 'This attendee has already been checked in.')
    }

    // Start camera + face detection, wire up buttons...
    setupCapture(eventId, attendeeId)
  } catch (err) {
    showError('Not Found', 'Failed to load attendee data.')
  }
}

init()
```

---

## Step 6: Auth Proxy (Required)

The public page **cannot** hold IMS credentials. Create an App Builder action as a thin proxy:

```
biometric-checkin/
  actions/
    checkin-proxy/
      index.js    # Validates token, calls ESP with server-side IMS token
```

**Endpoint contract:**
- `GET /api/checkin-data?token=<base64>` → returns `{ event, attendee }`
- `POST /api/checkin-confirm` `{ token }` → calls `updateAttendee({ checkedIn: true })`

This collapses the three ESP calls into two proxy calls, keeps credentials server-side, and gives us a place to add rate limiting or token expiry validation later.

The `modules/api.js` in the public page then points at the proxy, not ESP directly.

---

## Step 7: Styling

### `style.css`

Port the visual design from the React Spectrum components to plain CSS. Key pieces:

- **Camera container:** Relative-positioned box, `object-fit: cover`, `transform: scaleX(-1)` for mirror
- **Face guide oval:** Absolute-positioned, `200×260px`, `border-radius: 50%`, dashed white border
- **Face bounding box:** Absolute-positioned, `2px solid #00C853`, `box-shadow: 0 0 8px rgba(0,200,83,0.4)`, `transition: all 150ms ease-out`
- **Spinner:** CSS-only `@keyframes spin` on a bordered circle
- **Buttons:** Adobe-ish flat style — no need to match Spectrum exactly since this is a standalone public page
- **Responsive:** The camera view should work on mobile. Use `max-width: 100%` on the container, let video scale down.

---

## File Inventory

| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `index.html` | Shell markup, all screen sections | ~80 |
| `style.css` | Layout, camera, buttons, states | ~150 |
| `modules/token.js` | `parseCheckinToken` / `createCheckinToken` | ~15 |
| `modules/api.js` | `fetch()` wrappers pointing at proxy | ~30 |
| `modules/camera.js` | `createCamera()` — start, capture, stop | ~35 |
| `modules/faceDetection.js` | MediaPipe ESM loader + detection loop | ~45 |
| `modules/ui.js` | DOM helpers, render functions | ~50 |
| `modules/app.js` | State machine, init, event wiring | ~100 |
| **Total** | | **~505** |

---

## Migration Sequence

1. **Token + API stub** — Get `token.js` and `api.js` working with hardcoded mock data. Verify parse → fetch → render cycle.
2. **Camera** — Get `camera.js` streaming to a `<video>` element. Verify capture → preview round-trip.
3. **Face detection** — Wire up MediaPipe ESM import. Verify bounding box overlay renders.
4. **State machine** — Wire all screens together in `app.js`. Full flow with mock API.
5. **Auth proxy** — Build the App Builder action. Switch `api.js` from mocks to proxy endpoints.
6. **Styling polish** — Match the look to the EMC design language (or diverge intentionally for the public face).
7. **Deploy** — Static files to CDN, proxy action deployed via `aio app deploy`.

---

## Risks & Decisions

| Item | Notes |
|------|-------|
| **Auth** | Must build proxy. Cannot ship IMS tokens to a public page. |
| **MediaPipe CDN** | `cdn.jsdelivr.net` is reliable but not Adobe-controlled. Could vendor the WASM/model files on our own CDN if needed. |
| **CORS** | ESP endpoints likely don't allow arbitrary origins. The proxy solves this too. |
| **Mobile camera** | `getUserMedia` works on mobile Safari/Chrome but needs `playsinline` attribute and may prompt differently. Test on iOS Safari specifically. |
| **No framework** | State management is simple enough (8 states, linear flow). If scope grows significantly (enrollment, matching, admin), reconsider. |
| **Offline** | Not a goal. Camera + API both require connectivity. |
