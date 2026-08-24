# PayPal sandbox rollout

This guide creates and verifies the three recurring PayPal products used by AI Market Expert:

- Models: EUR 24.99/month
- Outlook: EUR 25.00/month
- Complete: EUR 50.00/month

Use sandbox credentials first. Do not paste a PayPal client secret into GitHub, Vercel public variables, screenshots, chat messages, or frontend code.

## 1. Create a PayPal sandbox REST app

In PayPal Developer Dashboard:

1. Open Apps & Credentials.
2. Switch to Sandbox.
3. Create or open a REST app owned by the sandbox Business account.
4. Copy its Client ID.
5. Reveal and copy its Secret only when running the local script.

The sandbox buyer and seller must be different PayPal sandbox accounts.

## 2. Pull this branch locally

```powershell
git checkout main
git pull
git checkout feature/paypal-sandbox-rollout
```

## 3. Create the product and three active monthly plans

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\create-paypal-subscription-plans.ps1" -Environment sandbox
```

The script asks for:

- sandbox Client ID
- sandbox Client Secret, entered as hidden input

It creates one catalog product and three ACTIVE fixed monthly EUR plans. It writes only non-secret IDs to:

```text
.paypal-plan-ids.json
```

That file is ignored by Git.

## 4. Add Vercel Preview variables

Use the values printed by the script:

```text
EXPO_PUBLIC_PAYPAL_CLIENT_ID=<sandbox-client-id>
EXPO_PUBLIC_PAYPAL_MODELS_PLAN_ID=<sandbox-models-plan-id>
EXPO_PUBLIC_PAYPAL_OUTLOOK_PLAN_ID=<sandbox-outlook-plan-id>
EXPO_PUBLIC_PAYPAL_COMPLETE_PLAN_ID=<sandbox-complete-plan-id>
```

Set them for Preview only during sandbox testing, then redeploy the branch preview.

Never place the Client Secret in Vercel public variables.

## 5. Configure Supabase Edge Function secrets

Set:

```text
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=<sandbox-client-id>
PAYPAL_CLIENT_SECRET=<sandbox-client-secret>
PAYPAL_MODELS_PLAN_ID=<sandbox-models-plan-id>
PAYPAL_OUTLOOK_PLAN_ID=<sandbox-outlook-plan-id>
PAYPAL_COMPLETE_PLAN_ID=<sandbox-complete-plan-id>
```

The function also needs the existing Supabase server credentials.

## 6. Deploy the webhook

```powershell
supabase functions deploy paypal-webhook --no-verify-jwt
```

The endpoint is normally:

```text
https://<project-ref>.supabase.co/functions/v1/paypal-webhook
```

## 7. Register the sandbox webhook in PayPal

Register the deployed HTTPS endpoint on the same sandbox REST app that owns the Client ID and plan IDs.

Subscribe to:

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

Copy the exact webhook ID and add one more Supabase secret:

```text
PAYPAL_WEBHOOK_ID=<sandbox-webhook-id>
```

Redeploy the Edge Function after setting or changing secrets.

## 8. Acceptance test

Use a fresh website test account and a PayPal sandbox Personal buyer.

Test each product independently:

### Models

Expected profile state:

```text
models_access=true
outlook_access=false
```

### Outlook

Expected profile state:

```text
models_access=false
outlook_access=true
```

### Complete

Expected profile state:

```text
models_access=true
outlook_access=true
```

For each checkout verify:

1. PayPal sandbox checkout completes.
2. `paypal_webhook_events` stores the event with `processed=true`.
3. `paypal_subscriptions` stores the subscription and correct plan ID.
4. The matching profile entitlement changes only after a verified activation or payment event.
5. Cancelling the subscription removes only the entitlement associated with that active product.

## 9. Multiple-subscription test

1. Subscribe the same test user to Models.
2. Subscribe the same test user to Outlook.
3. Confirm both entitlements become true.
4. Cancel Models only.
5. Confirm Models becomes false while Outlook remains true.

## 10. Production switch

Only after the complete sandbox matrix passes:

1. Create equivalent live plans using the same script with `-Environment live`.
2. Replace Vercel Production variables with live Client ID and live plan IDs.
3. Replace Supabase secrets with live values.
4. Set `PAYPAL_ENV=live`.
5. Register the live webhook on the live REST app.
6. Deploy the webhook again.
7. Perform one real low-value subscription, activation, cancellation, and entitlement test.

Do not mix sandbox Client IDs, secrets, webhook IDs, plans, buyers, or API URLs with live values.
