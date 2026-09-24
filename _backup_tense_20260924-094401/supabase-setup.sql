-- English Haters Phase 1.6 — final hardened Supabase foundation
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  current_track text not null default 'ssc' check (current_track in ('junior','ssc','hsc','admission')),
  xp integer not null default 0 check (xp >= 0),
  avatar_path text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  history_json jsonb not null default '[]'::jsonb,
  mistakes_json jsonb not null default '{}'::jsonb,
  practice_days_json jsonb not null default '[]'::jsonb,
  exam_history_json jsonb not null default '[]'::jsonb,
  achievements_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress add column if not exists achievements_json jsonb not null default '[]'::jsonb;

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null,
  device_name text not null default 'Browser',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(user_id, device_key)
);

create table if not exists public.lessons (
  id text primary key,
  track text not null check (track in ('junior','ssc','hsc','admission')),
  topic text not null,
  title text not null,
  rule text not null,
  examples jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  track text not null check (track in ('junior','ssc','hsc','admission')),
  topic text not null,
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  question text not null,
  choices jsonb not null,
  answer integer not null check (answer between 0 and 3),
  explanation text not null,
  source_type text,
  source_name text,
  source_year integer,
  tags jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_questions_track_topic on public.questions(track, topic, published);
create index if not exists idx_lessons_track_topic on public.lessons(track, topic, published);
create index if not exists idx_user_devices_user on public.user_devices(user_id, last_seen_at desc);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- New-user profile trigger. No browser role receives EXECUTE on this trigger function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Admin helper lives outside the exposed public Data API schema.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- Students cannot self-promote; only a current admin may change role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'Only an admin can change account roles';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before update on public.profiles
for each row execute procedure public.protect_profile_role();

-- Two-device registration. Security definer is intentional so counting/inserting
-- is atomic behind one authenticated RPC; PUBLIC execute is explicitly revoked.
create or replace function public.register_device(
  p_device_key text,
  p_device_name text,
  p_max_devices integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  existing_id uuid;
  current_count integer;
  effective_limit integer := least(greatest(1, coalesce(p_max_devices, 2)), 2);
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(length(p_device_key),0) < 8 or length(p_device_key) > 200 then
    raise exception 'Invalid device key';
  end if;

  select id into existing_id
  from public.user_devices
  where user_id = uid and device_key = p_device_key;

  if existing_id is not null then
    update public.user_devices
      set device_name = left(coalesce(p_device_name, 'Browser'), 80), last_seen_at = now()
      where id = existing_id;
    return jsonb_build_object('allowed', true, 'existing', true,
      'count', (select count(*) from public.user_devices where user_id = uid));
  end if;

  -- Serialize registration attempts per user to avoid two simultaneous third-device inserts.
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select count(*) into current_count from public.user_devices where user_id = uid;
  if current_count >= effective_limit then
    return jsonb_build_object('allowed', false, 'existing', false, 'count', current_count);
  end if;

  insert into public.user_devices(user_id, device_key, device_name)
  values(uid, p_device_key, left(coalesce(p_device_name, 'Browser'), 80));

  return jsonb_build_object('allowed', true, 'existing', false, 'count', current_count + 1);
end;
$$;
revoke all on function public.register_device(text,text,integer) from public, anon, authenticated;
grant execute on function public.register_device(text,text,integer) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_devices enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;

-- Data API object privileges (RLS still controls rows).
grant usage on schema public to anon, authenticated;
grant select on public.lessons, public.questions to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_progress to authenticated;
grant select, delete on public.user_devices to authenticated;
grant insert, update, delete on public.lessons, public.questions to authenticated;

-- Profiles
DROP POLICY IF EXISTS "profile read own" ON public.profiles;
CREATE POLICY "profile read own" ON public.profiles FOR SELECT TO authenticated
USING ((select auth.uid()) = id OR private.is_admin());
DROP POLICY IF EXISTS "profile update own" ON public.profiles;
CREATE POLICY "profile update own" ON public.profiles FOR UPDATE TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Progress
DROP POLICY IF EXISTS "progress own" ON public.user_progress;
CREATE POLICY "progress own" ON public.user_progress FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Devices: registration is via RPC; users may list/delete only their own rows.
DROP POLICY IF EXISTS "devices own" ON public.user_devices;
CREATE POLICY "devices own" ON public.user_devices FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "devices delete own" ON public.user_devices;
CREATE POLICY "devices delete own" ON public.user_devices FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

-- Published learning content is public read-only; authenticated admins manage all content.
DROP POLICY IF EXISTS "published lessons readable" ON public.lessons;
CREATE POLICY "published lessons readable" ON public.lessons FOR SELECT TO anon, authenticated
USING (published = true);
DROP POLICY IF EXISTS "admin lessons readable" ON public.lessons;
CREATE POLICY "admin lessons readable" ON public.lessons FOR SELECT TO authenticated
USING (private.is_admin());
DROP POLICY IF EXISTS "admin lessons insert" ON public.lessons;
CREATE POLICY "admin lessons insert" ON public.lessons FOR INSERT TO authenticated
WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "admin lessons update" ON public.lessons;
CREATE POLICY "admin lessons update" ON public.lessons FOR UPDATE TO authenticated
USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "admin lessons delete" ON public.lessons;
CREATE POLICY "admin lessons delete" ON public.lessons FOR DELETE TO authenticated
USING (private.is_admin());

DROP POLICY IF EXISTS "published questions readable" ON public.questions;
CREATE POLICY "published questions readable" ON public.questions FOR SELECT TO anon, authenticated
USING (published = true);
DROP POLICY IF EXISTS "admin questions readable" ON public.questions;
CREATE POLICY "admin questions readable" ON public.questions FOR SELECT TO authenticated
USING (private.is_admin());
DROP POLICY IF EXISTS "admin questions insert" ON public.questions;
CREATE POLICY "admin questions insert" ON public.questions FOR INSERT TO authenticated
WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "admin questions update" ON public.questions;
CREATE POLICY "admin questions update" ON public.questions FOR UPDATE TO authenticated
USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "admin questions delete" ON public.questions;
CREATE POLICY "admin questions delete" ON public.questions FOR DELETE TO authenticated
USING (private.is_admin());

-- Profile photos. Public read is intentional for profile-avatar display; writes are owner-scoped.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "avatar upload own folder" ON storage.objects;
CREATE POLICY "avatar upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
DROP POLICY IF EXISTS "avatar read own folder" ON storage.objects;
CREATE POLICY "avatar read own folder" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
DROP POLICY IF EXISTS "avatar update own folder" ON storage.objects;
CREATE POLICY "avatar update own folder" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
DROP POLICY IF EXISTS "avatar delete own folder" ON storage.objects;
CREATE POLICY "avatar delete own folder" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Security-advisor note: public.register_device is intentionally SECURITY DEFINER and
-- executable only by authenticated users. It validates auth.uid(), constrains input,
-- caps device count at 2, and serializes concurrent registrations.


-- Phase 1.8A SECURITY HARDENING ---------------------------------------------
create table if not exists private.student_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  questions_served integer not null default 0 check (questions_served >= 0),
  answers_revealed integer not null default 0 check (answers_revealed >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
alter table private.student_daily_usage enable row level security;
revoke all on table private.student_daily_usage from public, anon, authenticated;

create or replace function public.consume_student_quota(p_user_id uuid,p_kind text,p_units integer,p_limit integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare used_now integer; allowed boolean := false; units integer := greatest(1,least(coalesce(p_units,1),1000)); hard_limit integer := greatest(1,least(coalesce(p_limit,1),10000));
begin
  if p_user_id is null then raise exception 'user_id required'; end if;
  if p_kind not in ('questions','answers') then raise exception 'invalid quota kind'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || current_date::text || ':' || p_kind));
  insert into private.student_daily_usage(user_id,usage_date) values(p_user_id,current_date) on conflict(user_id,usage_date) do nothing;
  if p_kind='questions' then
    select questions_served into used_now from private.student_daily_usage where user_id=p_user_id and usage_date=current_date;
    if used_now+units<=hard_limit then update private.student_daily_usage set questions_served=questions_served+units,updated_at=now() where user_id=p_user_id and usage_date=current_date; used_now:=used_now+units; allowed:=true; end if;
  else
    select answers_revealed into used_now from private.student_daily_usage where user_id=p_user_id and usage_date=current_date;
    if used_now+units<=hard_limit then update private.student_daily_usage set answers_revealed=answers_revealed+units,updated_at=now() where user_id=p_user_id and usage_date=current_date; used_now:=used_now+units; allowed:=true; end if;
  end if;
  return jsonb_build_object('allowed',allowed,'used',used_now,'limit',hard_limit,'kind',p_kind);
end; $$;
revoke all on function public.consume_student_quota(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_student_quota(uuid,text,integer,integer) to service_role;

create table if not exists public.question_sessions_secure (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('practice','exam','question_bank','tutor')), question_ids text[] not null default '{}',
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '2 hours')
);
create index if not exists idx_question_sessions_secure_user_expiry on public.question_sessions_secure(user_id,expires_at desc);
alter table public.question_sessions_secure enable row level security;
revoke all on table public.question_sessions_secure from public,anon,authenticated;
grant all on table public.question_sessions_secure to service_role;

drop policy if exists "published questions readable" on public.questions;
revoke select on public.questions from anon;

update storage.buckets set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='avatars';

-- Explicit deny policies make intentional server-only tables clear to security linters.
drop policy if exists "deny direct student session access" on public.question_sessions_secure;
create policy "deny direct student session access" on public.question_sessions_secure for all to anon,authenticated using(false) with check(false);
drop policy if exists "deny direct usage access" on private.student_daily_usage;
create policy "deny direct usage access" on private.student_daily_usage for all to anon,authenticated using(false) with check(false);


-- Phase 1.10: production content workflow metadata and duplicate protection
alter table public.questions
  add column if not exists subtopic text not null default '',
  add column if not exists curriculum text not null default '',
  add column if not exists chapter text not null default '',
  add column if not exists unit text not null default '',
  add column if not exists review_status text not null default 'approved',
  add column if not exists content_hash text,
  add column if not exists import_batch text not null default '',
  add column if not exists created_at timestamptz not null default now();
alter table public.lessons
  add column if not exists curriculum text not null default '',
  add column if not exists chapter text not null default '',
  add column if not exists review_status text not null default 'approved',
  add column if not exists import_batch text not null default '',
  add column if not exists created_at timestamptz not null default now();
do $$ begin
  if not exists (select 1 from pg_constraint where conname='questions_review_status_check') then
    alter table public.questions add constraint questions_review_status_check check (review_status in ('draft','review','approved','rejected','archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname='lessons_review_status_check') then
    alter table public.lessons add constraint lessons_review_status_check check (review_status in ('draft','review','approved','rejected','archived'));
  end if;
end $$;
update public.questions set content_hash=md5(lower(regexp_replace(trim(question),'\s+',' ','g'))||'|'||lower(coalesce(choices->>0,''))||'|'||lower(coalesce(choices->>1,''))||'|'||lower(coalesce(choices->>2,''))||'|'||lower(coalesce(choices->>3,''))) where content_hash is null or content_hash='';
create unique index if not exists uq_questions_content_hash on public.questions(content_hash) where content_hash is not null and content_hash<>'';
create index if not exists idx_questions_review_status on public.questions(review_status,published,track,topic);
create index if not exists idx_questions_curriculum on public.questions(track,curriculum,chapter,topic,subtopic);
create index if not exists idx_questions_import_batch on public.questions(import_batch) where import_batch<>'';
create index if not exists idx_lessons_review_status on public.lessons(review_status,published,track,topic);
create index if not exists idx_lessons_curriculum on public.lessons(track,curriculum,chapter,topic);
create or replace function private.set_question_content_hash() returns trigger language plpgsql security definer set search_path='' as $$
begin new.content_hash:=md5(lower(regexp_replace(trim(new.question),'\s+',' ','g'))||'|'||lower(coalesce(new.choices->>0,''))||'|'||lower(coalesce(new.choices->>1,''))||'|'||lower(coalesce(new.choices->>2,''))||'|'||lower(coalesce(new.choices->>3,''))); return new; end; $$;
revoke all on function private.set_question_content_hash() from public,anon,authenticated;
drop trigger if exists set_question_content_hash_trigger on public.questions;
create trigger set_question_content_hash_trigger before insert or update of question,choices on public.questions for each row execute function private.set_question_content_hash();
