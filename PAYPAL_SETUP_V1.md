# PayPal production setup

The frontend can render three recurring subscription products:

- Models: €24.99/month
- Outlook: €25/month
- Complete: €50/month

Access is granted only by the verified Supabase PayPal webhook. Browser approval does not directly update a profile.

## 1. Create PayPal products and monthly plans

Create one active recurring monthly plan for each product in the same PayPal REST application used by the website.

Record:

- PayPal client ID
- PayPal client secret
- Models plan ID
- Outlook plan ID
- Complete plan ID

The plan IDs must belong to the same PayPal client/application as the client ID loaded by the JavaScript SDK.

## 2. Vercel environment variables

Add these variables to Preview and Production:

```text
EXPO_PUBLIC_PAYPAL_CLIENT_ID=<paypal-client-id>
EXPO_PUBLIC_PAYPAL_MODELS_PLAN_ID=<models-plan-id>
EXPO_PUBLIC_PAYPAL_OUTLOOK_PLAN_ID=<outlook-plan-id>
EXPO_PUBLIC_PAYPAL_COMPLETE_PLAN_ID=<complete-plan-id>
```

The old `EXPO_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID` remains a temporary fallback for Models only.

Redeploy after changing Vercel variables.

## 3. Supabase Edge Function secrets

Set the server-side secrets:

```text
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=<sandbox-client-id>
PAYPAL_CLIENT_SECRET=<sandbox-client-secret>
PAYPAL_WEBHOOK_ID=<sandbox-webhook-id>
PAYPAL_MODELS_PLAN_ID=<sandbox-models-plan-id>
PAYPAL_OUTLOOK_PLAN_ID=<sandbox-outlook-plan-id>
PAYPAL_COMPLETE_PLAN_ID=<sandbox-complete-plan-id>
```

For production, replace sandbox values with live values and set:

```text
PAYPAL_ENV=live
```

The Supabase runtime also needs its standard project service credentials (`SUPABASE_URL` and either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS`).

## 4. Deploy the webhook

```bash
supabase functions deploy paypal-webhook --no-verify-jwt
```

PayPal cannot send a Supabase user JWT, so JWT verification is disabled for this Edge Function. The function authenticates PayPal by verifying the webhook signature with PayPal's API.

## 5. Register the PayPal webhook

Use the deployed Edge Function URL and subscribe to at least:

```text
BILLING.SUBSCRIPTION.CREATED
BILLING.SUBSCRIPTION.ACTIVATED
BILLING.SUBSCRIPTION.UPDATED
BILLING.SUBSCRIPTION.CANCELLED
BILLING.SUBSCRIPTION.EXPIRED
BILLING.SUBSCRIPTION.SUSPENDED
BILLING.SUBSCRIPTION.PAYMENT.FAILED
PAYMENT.SALE.COMPLETED
PAYMENT.SALE.DENIED
PAYMENT.SALE.REFUNDED
PAYMENT.SALE.REVERSED
```

Copy the exact webhook ID into `PAYPAL_WEBHOOK_ID`.

## 6. Database migration

Run:

```text
supabase/professional_ui_v1.sql
```

This adds the admin entitlement, two-chart Outlook fields, and protected admin publishing/storage policies.

The existing PayPal schema must contain:

- `paypal_webhook_events`
- `paypal_subscriptions`
- the subscription and entitlement columns in `profiles`

## 7. Sandbox acceptance test

Use a new test user and a PayPal sandbox buyer.

For each product:

1. Sign in to the website.
2. Complete the matching PayPal subscription.
3. Confirm a `BILLING.SUBSCRIPTION.ACTIVATED` event was stored with `processed = true`.
4. Confirm the subscription row contains the expected plan ID and `ACTIVE` status.
5. Confirm the profile entitlements:
   - Models: `models_access=true`, `outlook_access=false`
   - Outlook: `models_access=false`, `outlook_access=true`
   - Complete: both `true`
6. Cancel the subscription in PayPal.
7. Confirm access is removed after the signed cancellation event.

## 8. Multiple subscription test

The webhook aggregates all active PayPal subscriptions for one user.

Test this explicitly:

1. Subscribe the same user to Models.
2. Subscribe the same user to Outlook.
3. Confirm both entitlements are true.
4. Cancel only Models.
5. Confirm Models becomes false while Outlook stays true.

## 9. Production switch

Do not mix sandbox and live identifiers. Client ID, secret, webhook ID and plan IDs must all belong to the same PayPal environment.

After the sandbox matrix passes:

1. Create or verify the live products/plans.
2. Replace Vercel variables with live client and plan IDs.
3. Replace Supabase Edge Function secrets with live values.
4. Set `PAYPAL_ENV=live`.
5. Deploy the Edge Function again.
6. Run one low-value real subscription test and verify activation and cancellation records.

## Important behavior

- `CREATED` is stored but does not grant access.
- `ACTIVATED` or a verified completed subscription payment grants access.
- Unknown plan IDs fail closed and do not unlock a product.
- Duplicate webhook deliveries are treated idempotently.
- Correct access is recomputed from all active subscriptions after activation, cancellation, expiry, suspension or failed payment.
