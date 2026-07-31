-- AI Market Expert: Professional UI V1
-- Run once in Supabase SQL Editor before deploying the matching frontend.

-- ============================================================
-- ADMIN ENTITLEMENT
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles
set is_admin = true,
    updated_at = now()
where lower(email) = lower('veljkom350@gmail.com');

-- ============================================================
-- TWO OUTLOOK IMAGES
-- chart_image_* remains the primary / macro chart.
-- technical_chart_image_* is shown next to Technical structure.
-- ============================================================

alter table public.macro_commentary
  add column if not exists technical_chart_image_path text,
  add column if not exists technical_chart_image_alt text,
  add column if not exists technical_chart_image_caption text;

-- ============================================================
-- ADMIN CRUD FOR OUTLOOK PUBLICATIONS
-- RLS remains the actual security boundary. Hiding an admin route in the
-- browser is useful for navigation, but it is not authorization. Humans
-- have attempted that shortcut often enough already.
-- ============================================================

grant insert, update, delete on table public.macro_commentary to authenticated;

drop policy if exists "Outlook admins can insert commentary"
  on public.macro_commentary;
create policy "Outlook admins can insert commentary"
  on public.macro_commentary
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Outlook admins can update commentary"
  on public.macro_commentary;
create policy "Outlook admins can update commentary"
  on public.macro_commentary
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Outlook admins can delete commentary"
  on public.macro_commentary;
create policy "Outlook admins can delete commentary"
  on public.macro_commentary
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

-- ============================================================
-- ADMIN STORAGE POLICIES
-- The outlook-media bucket stays private. Subscribers receive signed URLs;
-- admins can upload and maintain source files.
-- ============================================================

drop policy if exists "Outlook admins can read outlook media"
  on storage.objects;
create policy "Outlook admins can read outlook media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'outlook-media'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Outlook admins can upload outlook media"
  on storage.objects;
create policy "Outlook admins can upload outlook media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'outlook-media'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Outlook admins can update outlook media"
  on storage.objects;
create policy "Outlook admins can update outlook media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'outlook-media'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    bucket_id = 'outlook-media'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Outlook admins can delete outlook media"
  on storage.objects;
create policy "Outlook admins can delete outlook media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'outlook-media'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.is_admin = true
    )
  );

-- ============================================================
-- PAYPAL CONFIGURATION CHECKLIST
-- These are Edge Function secrets, not database values:
-- PAYPAL_ENV=live (or sandbox while testing)
-- PAYPAL_CLIENT_ID
-- PAYPAL_CLIENT_SECRET
-- PAYPAL_WEBHOOK_ID
-- PAYPAL_MODELS_PLAN_ID
-- PAYPAL_OUTLOOK_PLAN_ID
-- PAYPAL_COMPLETE_PLAN_ID
--
-- Matching Vercel variables:
-- EXPO_PUBLIC_PAYPAL_CLIENT_ID
-- EXPO_PUBLIC_PAYPAL_MODELS_PLAN_ID
-- EXPO_PUBLIC_PAYPAL_OUTLOOK_PLAN_ID
-- EXPO_PUBLIC_PAYPAL_COMPLETE_PLAN_ID
-- ============================================================
