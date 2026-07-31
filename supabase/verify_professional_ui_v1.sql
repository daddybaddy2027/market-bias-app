-- AI Market Expert: verify Professional UI V1 rollout
-- Run after supabase/professional_ui_v1.sql.
-- Every row should return status = PASS before merging PR #7.

with checks as (
  select
    'profiles.is_admin column'::text as check_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'is_admin'
    ) as passed,
    'Required by the protected admin publishing route.'::text as detail

  union all

  select
    'Veljko admin entitlement',
    exists (
      select 1
      from public.profiles
      where lower(email) = lower('veljkom350@gmail.com')
        and is_admin = true
    ),
    'The owner profile must have is_admin=true.'

  union all

  select
    'Outlook technical chart columns',
    (
      select count(*) = 3
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'macro_commentary'
        and column_name in (
          'technical_chart_image_path',
          'technical_chart_image_alt',
          'technical_chart_image_caption'
        )
    ),
    'Three columns are required for the second Outlook image.'

  union all

  select
    'macro_commentary RLS enabled',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'macro_commentary'
        and c.relkind = 'r'
    ), false),
    'Admin writes must remain protected by row-level security.'

  union all

  select
    'Outlook admin CRUD policies',
    (
      select count(*) = 3
      from pg_policies
      where schemaname = 'public'
        and tablename = 'macro_commentary'
        and policyname in (
          'Outlook admins can insert commentary',
          'Outlook admins can update commentary',
          'Outlook admins can delete commentary'
        )
    ),
    'Insert, update and delete must each be restricted to admins.'

  union all

  select
    'Private outlook-media bucket',
    exists (
      select 1
      from storage.buckets
      where id = 'outlook-media'
        and public = false
    ),
    'Charts should remain private and be delivered through signed URLs.'

  union all

  select
    'Outlook admin Storage policies',
    (
      select count(*) = 4
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname in (
          'Outlook admins can read outlook media',
          'Outlook admins can upload outlook media',
          'Outlook admins can update outlook media',
          'Outlook admins can delete outlook media'
        )
    ),
    'Admin read, upload, update and delete policies are required.'

  union all

  select
    'PayPal subscription table',
    to_regclass('public.paypal_subscriptions') is not null,
    'Verified subscription state is stored here.'

  union all

  select
    'PayPal webhook event table',
    to_regclass('public.paypal_webhook_events') is not null,
    'Webhook idempotency and processing results are stored here.'

  union all

  select
    'Profile entitlement columns',
    (
      select count(*) = 8
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name in (
          'models_access',
          'outlook_access',
          'subscription_status',
          'subscription_provider',
          'provider_subscription_id',
          'paypal_plan_id',
          'subscription_expires_at',
          'subscription_updated_at'
        )
    ),
    'The webhook needs explicit product entitlements and subscription metadata.'

  union all

  select
    'PayPal subscription core columns',
    (
      select count(*) = 5
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'paypal_subscriptions'
        and column_name in (
          'paypal_subscription_id',
          'user_id',
          'status',
          'plan_id',
          'updated_at'
        )
    ),
    'Required for aggregating multiple active products per user.'

  union all

  select
    'PayPal event processing columns',
    (
      select count(*) = 5
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'paypal_webhook_events'
        and column_name in (
          'event_id',
          'event_type',
          'processed',
          'processing_error',
          'processed_at'
        )
    ),
    'Required for webhook verification, retries and auditability.'
)
select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as status,
  detail
from checks
order by passed asc, check_name;

-- Compact final verdict.
with checks as (
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='is_admin'
  ) as ok
  union all
  select exists (
    select 1 from public.profiles
    where lower(email)=lower('veljkom350@gmail.com') and is_admin=true
  )
  union all
  select (
    select count(*)=3 from information_schema.columns
    where table_schema='public' and table_name='macro_commentary'
      and column_name in ('technical_chart_image_path','technical_chart_image_alt','technical_chart_image_caption')
  )
  union all
  select exists (
    select 1 from storage.buckets where id='outlook-media' and public=false
  )
  union all
  select to_regclass('public.paypal_subscriptions') is not null
  union all
  select to_regclass('public.paypal_webhook_events') is not null
)
select
  case when bool_and(ok)
    then 'PROFESSIONAL_UI_V1_CORE_READY'
    else 'PROFESSIONAL_UI_V1_NOT_READY'
  end as rollout_verdict
from checks;
