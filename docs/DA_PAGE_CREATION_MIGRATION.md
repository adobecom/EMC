# DA Page Creation — Cross-Repo Migration Guide

EMC now creates DA event pages directly in the browser at save time (branch `page-gen-refactor`).
This document tells the owners of the three downstream repos exactly what they need to change,
in what order, and why — so the old Kinesis→ESL→Hoolihan pipeline can be safely retired.

## Background

The old flow:

```
EMC save → ESP POST/PUT → DynamoDB → Kinesis → ServiceProcessor
  → ESL (Hoolihan) → hoolihan-da-webhook → admin.da.live
```

The new flow:

```
EMC save → admin.da.live (browser, user IMS token)
         → ESP POST/PUT (with pageCreatedBy:'emc')
         → Kinesis → ServiceProcessor  ← sees the flag, skips DA tagging
```

EMC sets `pageCreatedBy: 'emc'` in the event payload **only after** successful page creation.
If page creation fails, the flag is never sent and the old pipeline remains the fallback.

---

## Rollout Order (do not skip steps)

```
1. events-service-layer   — accept + persist + forward pageCreatedBy
2. EMC page-gen-refactor  — merge + deploy (already written)
3. events-service-platform — ServiceProcessor: skip DA tagging when flag present (feature-gated)
4. events-platform-hh-webhooks — defensive early-return on flag
5. Cutover: enable the feature gate for all DA series
6. Retire: delete the DA webhook action and its secrets
```

**Step 1 is a hard prerequisite for everything else.** ESL currently strips unknown fields from
the event schema. Until ESL persists and forwards `pageCreatedBy`, the kinesis-processor never
sees it and cannot suppress the old pipeline.

---

## Repo 1: events-service-layer

**What:** Accept the `pageCreatedBy` string field in the event schema, persist it to the event
record, and include it in the kinesis stream payload that ServiceProcessor receives.

**Field definition:**

```
pageCreatedBy: string   optional
values: 'emc'           (reserved for future values like 'automation')
```

**Checklist:**
- [ ] Add `pageCreatedBy` to the event PUT/POST request schema validation (currently stripped as unknown field)
- [ ] Persist `pageCreatedBy` to the DynamoDB event record
- [ ] Include `pageCreatedBy` in the kinesis stream event payload (the payload that ServiceProcessor receives)
- [ ] Include `pageCreatedBy` in the GET /v1/events/:id response (EMC reads it back via `getEventFull`)

No logic changes required in ESL — this is a pass-through field. ESL does not need to understand
what `pageCreatedBy` means; it just needs to not drop it.

---

## Repo 2: events-service-platform

**File:** `aws/templates/lambda/events-kinesis-processor/src/ServiceProcessor.js`

**Function:** `callHydratedEvent` (line 188)

**Current code (lines 197–204):**

```js
if (seriesId) { // Adding targetCmsProvider to events object
    seriesObject = await seriesService.getSeriesData(seriesId);
    hydratedEvent.targetCmsProvider = seriesObject?.targetCms?.provider;
    logger.debug(`Adding targetCmsProvider in hydrated payload : ${hydratedEvent.targetCmsProvider}`);
    if (seriesObject?.targetCms?.provider === TARGET_CMS_PROVIDERS.DA) {
        hydratedEvent.seriesId = seriesId;
        hydratedEvent.forceSpWrite = true;
    }
}
```

**Required change:** Skip the DA-specific tagging when `pageCreatedBy === 'emc'`. Gate it behind
an environment variable so it can be enabled per-environment during rollout.

```js
if (seriesId) {
    seriesObject = await seriesService.getSeriesData(seriesId);
    hydratedEvent.targetCmsProvider = seriesObject?.targetCms?.provider;
    logger.debug(`Adding targetCmsProvider in hydrated payload : ${hydratedEvent.targetCmsProvider}`);

    const emcCreatedPage = hydratedEvent.pageCreatedBy === 'emc';
    const suppressDaWebhook = process.env.SUPPRESS_DA_WEBHOOK_FOR_EMC === 'true';

    if (seriesObject?.targetCms?.provider === TARGET_CMS_PROVIDERS.DA) {
        if (emcCreatedPage && suppressDaWebhook) {
            // EMC already created this page — skip forwarding to DA webhook.
            logger.info(`Skipping DA webhook for event ${hydratedEvent.eventId}: pageCreatedBy=emc`);
        } else {
            hydratedEvent.seriesId = seriesId;
            hydratedEvent.forceSpWrite = true;
        }
    }
}
```

**Environment variable:**

| Variable | Value during dual-run | Value at cutover |
|---|---|---|
| `SUPPRESS_DA_WEBHOOK_FOR_EMC` | `false` (default) | `true` |

This gate lets you deploy the code change safely before enabling it, verify it in dev/stage,
then flip the flag in prod without a new deployment.

**Also check:** `applyRelatedData` (line 74) sets `event.targetCmsProvider` from the series too.
Apply the same `pageCreatedBy` guard there so the field is not set on events EMC has already handled.

---

## Repo 3: events-platform-hh-webhooks

### Change A — Early-return in the webhook entry point

**File:** `actions/hoolihan-da-webhook/index.js`

**Current code (lines 42–49):**

```js
const {targetCmsProvider} = eventData;
if (targetCmsProvider !== TARGET_CMS_PROVIDERS.DA) {
    logger.debug('DA webhook only handles hydrated payloads targeted to DA_BACOM, ignoring', eventData);
    return {
        statusCode: 200,
        body: 'Request not served!',
    };
}
```

**Required change:** Add a guard before the `targetCmsProvider` check:

```js
// EMC created this page — nothing for the webhook to do.
if (eventData.pageCreatedBy === 'emc') {
    logger.info(`Skipping DA webhook for event ${eventData.eventId}: pageCreatedBy=emc`);
    return {
        statusCode: 200,
        body: 'Page already created by EMC, skipping.',
    };
}

const {targetCmsProvider} = eventData;
if (targetCmsProvider !== TARGET_CMS_PROVIDERS.DA) {
    logger.debug('DA webhook only handles hydrated payloads targeted to DA_BACOM, ignoring', eventData);
    return {
        statusCode: 200,
        body: 'Request not served!',
    };
}
```

This guard fires regardless of whether the `SUPPRESS_DA_WEBHOOK_FOR_EMC` gate in ServiceProcessor
is active yet — it is a last-resort safety net during dual-run.

### Change B — Ownership check already in place (no change needed, document only)

**File:** `actions/hoolihan-da-webhook/da-utils/index.js`

**Existing code (lines 593–600):**

```js
async checkFileOwner(filePath) {
    const {'modified-by': actualValue} = await this.getMetadataFromHtmlPage(filePath, 'modified-by');
    if (actualValue && actualValue !== DA_WEBHOOK) {
        // file is owned by something else — skip
    }
    ...
}
```

EMC sets `modified-by: EMC` in the page's `.metadata` block. Because `'EMC' !== DA_WEBHOOK`,
the webhook already skips overwriting EMC-created pages at lines 192, 243, and 621 where
`checkFileOwner` is called. **No code change is required here** — the ownership guard is the
last line of defence during dual-run if the early-return (Change A) is not yet deployed.

---

## Verification checklist

After each repo is updated, verify in dev before promoting to stage/prod:

### ESL
- [ ] `PUT /v1/events/:id` with `{ pageCreatedBy: 'emc' }` in body returns 200 and the field
  appears in the subsequent `GET /v1/events/:id` response
- [ ] The kinesis stream payload received by ServiceProcessor includes `pageCreatedBy`
  (check Splunk: `index=kinesis-events | search pageCreatedBy`)

### ServiceProcessor (with gate off)
- [ ] Save a DA-series event via EMC — ServiceProcessor still sets `targetCmsProvider` and
  forwards to the webhook (gate is `false` — old behaviour preserved)
- [ ] Webhook runs, page is created; ownership marker is `DA_WEBHOOK`

### ServiceProcessor (with gate on — cutover)
- [ ] Save a DA-series event via EMC — Splunk shows `Skipping DA webhook: pageCreatedBy=emc`
- [ ] No webhook invocation in Splunk for that event
- [ ] DA page exists at the expected path (created by EMC, `modified-by: EMC` in metadata)

### Webhook defensive guard (Change A)
- [ ] Manually POST a synthetic kinesis payload with `pageCreatedBy: 'emc'` to the webhook
  invocation URL — response body is `'Page already created by EMC, skipping.'`
- [ ] No DA API calls made (check network logs or use `?nonInvasiveTest=true`)

---

## Retirement (after cutover is stable in prod)

Once `SUPPRESS_DA_WEBHOOK_FOR_EMC=true` has been running cleanly in prod for one release cycle:

1. **events-platform-hh-webhooks:** Delete the `hoolihan-da-webhook` action directory and its
   invocation route. Remove the DA service-token secrets from `appConfig.js`
   (`DA_CLIENT_ID`, `DA_CLIENT_SECRET`, `DA_SCOPES`).
2. **events-service-platform:** Remove the `SUPPRESS_DA_WEBHOOK_FOR_EMC` env var and the gate;
   remove the `targetCmsProvider = TARGET_CMS_PROVIDERS.DA` forwarding block entirely.
3. **events-service-layer:** Confirm no other consumers read `targetCmsProvider` from the event
   schema before removing the ESL→Hoolihan republish route for events.
4. **EMC:** Remove the `modified-by: EMC` marker write from `daPageService.ts` once the webhook
   is gone (it served as the dual-run collision guard and is no longer needed).

---

## Questions / contacts

| Concern | Who to ask |
|---|---|
| ESL schema change + kinesis payload | ESL team |
| ServiceProcessor gate + deployment | events-service-platform team |
| Webhook retirement timeline | events-platform-hh-webhooks team |
| EMC DA page creation feature | author of `page-gen-refactor` branch |
| DA site permissions for EMC users | DA/org admin (separate from code) |

> **DA permission note:** Every EMC event author needs write access to the DA site for their
> series (e.g. `da-events`, `da-bacom`, `da-acom`). This is an org/IAM dependency that must be
> provisioned before the feature is enabled for authors — it is not gated by code.
