-- English-Hater Phase 2.1: structured lesson content
-- Run once in the Supabase SQL Editor before publishing lessons that contain sections.
-- Safe to run more than once.

alter table public.lessons
  add column if not exists content_json jsonb not null default '{}'::jsonb;

comment on column public.lessons.content_json is
  'English-Hater structured lesson payload: schema_version, summary, level, estimated_minutes, prerequisites, learning_outcomes, sections, and practice metadata.';
