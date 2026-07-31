# AI Market Expert - Professional UI V1 rollout

This checklist is intentionally ordered. Do not merge PR #7 before the required checks pass.

## Phase A - Database foundation

1. Open Supabase SQL Editor.
2. Run the complete file:

```text
supabase/professional_ui_v1.sql
```

3. Run:

```text
supabase/verify_professional_ui_v1.sql
```

Expected final verdict:

```text
PROFESSIONAL_UI_V1_CORE_READY
```

Every detailed verification row should show `PASS`.

### Stop condition

Do not continue to admin-panel or PayPal testing while any row shows `FAIL`.

## Phase B - Preview UI acceptance

Open the Vercel preview attached to PR #7 and test:

### Public / signed-out account

- Dashboard loads without protected data errors.
- Market Regime window is visible.
- Latest Outlook shows public preview only.
- Latest Predictions shows the free product and locked Pro content.
- Locked cards route to Pricing.
- `/performance` does not expose protected Pro history.
- Pricing clearly shows Free, Models, Outlook and Complete.

### Models-only account

- Pro model cards and model history are visible.
- Full Outlook remains locked.
- Performance shows the authorized model history.

### Outlook-only account

- Full Outlook and archive are visible.
- Pro model details remain locked.
- Models access is not granted by the legacy PayPal fallback.

### Complete account

- Models, history, full Outlook and archive are visible.

### Admin account

- `/admin-outlook` opens only for `is_admin=true`.
- Primary chart upload succeeds.
- Technical chart upload succeeds.
- A draft/publication can be inserted through the admin form.
- Non-admin accounts cannot insert, update or delete commentary.

## Phase C - Outlook two-image acceptance

Create one temporary test publication with:

- primary macro/fundamental chart
- technical chart
- base scenario
- alternative scenario
- invalidation

Verify:

- both signed images render
- the technical chart appears next to Technical structure
- archive navigation preserves the correct article and images
- generated social card is 1080 x 1350

Delete the temporary test publication after acceptance.

## Phase D - PayPal sandbox setup

Follow `PAYPAL_SETUP_V1.md` exactly.

Required sandbox identifiers:

```text
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_ID
PAYPAL_MODELS_PLAN_ID
PAYPAL_OUTLOOK_PLAN_ID
PAYPAL_COMPLETE_PLAN_ID
```

Required Vercel Preview variables:

```text
EXPO_PUBLIC_PAYPAL_CLIENT_ID
EXPO_PUBLIC_PAYPAL_MODELS_PLAN_ID
EXPO_PUBLIC_PAYPAL_OUTLOOK_PLAN_ID
EXPO_PUBLIC_PAYPAL_COMPLETE_PLAN_ID
```

Redeploy Preview after changing Vercel variables.

Deploy the Edge Function:

```bash
supabase functions deploy paypal-webhook --no-verify-jwt
```

### Sandbox acceptance matrix

Test all of these with fresh test users:

| Scenario | models_access | outlook_access |
|---|---:|---:|
| Models active | true | false |
| Outlook active | false | true |
| Complete active | true | true |
| Models + Outlook active separately | true | true |
| Cancel Models while Outlook stays active | false | true |
| Cancel Outlook while Models stays active | true | false |
| Unknown plan ID | false | false |
| CREATED event only | false | false |

For each test confirm:

- webhook signature verified
- event stored once
- `processed=true`
- expected plan ID stored
- profile entitlements recomputed correctly

## Phase E - Merge gate

Merge PR #7 only when:

- Vercel Preview is Ready
- database verifier is fully PASS
- public, product and admin access tests pass
- both Outlook images render
- PayPal sandbox matrix passes
- no protected data is visible to the wrong account tier

## Phase F - Production rollout

1. Replace sandbox PayPal identifiers with live identifiers.
2. Set `PAYPAL_ENV=live`.
3. Deploy `paypal-webhook` again.
4. Add live Vercel variables to Production.
5. Merge PR #7.
6. Wait for Vercel Production deployment to finish.
7. Run one real subscription test with the lowest practical operational risk.
8. Verify activation, account refresh and cancellation records.

## Rollback

If frontend issues appear after merge, revert the PR merge commit.

If PayPal issues appear:

- keep the frontend plans visible only after disabling affected checkout environment variables
- do not manually grant access based only on a browser approval message
- inspect `paypal_webhook_events.processing_error`
- preserve webhook payloads for diagnosis

The database migration is additive. Do not remove the second-chart or admin columns during an emergency frontend rollback.
