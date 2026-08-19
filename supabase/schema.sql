-- ============================================================================
-- NPCCSM Syllabus Tracker -- Supabase schema
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Course/unit/topic *definitions* stay in src/data/syllabusDatabase.js (static
-- curriculum content). Supabase only stores what actually changes at runtime:
-- which topics a faculty member has covered, their notes, and a history log.
-- ============================================================================

-- One row per subject = current live state (what the Principal/Student portals read).
create table if not exists public.syllabus_progress (
  subject_code   text primary key,               -- e.g. "CAM301-3C"
  title          text not null,
  semester       int  not null,
  covered_topics jsonb not null default '[]',     -- string[] of topic names
  topic_notes    jsonb not null default '{}',     -- { [topicName]: noteText }
  overall_notes  text,
  faculty_name   text,
  last_updated   date,
  updated_at     timestamptz not null default now()
);

-- Append-only log, one row per "Update & Publish" action -- powers the
-- "Class Update Logs" history modal in the Faculty Studio.
create table if not exists public.syllabus_history (
  id             bigint generated always as identity primary key,
  subject_code   text not null,
  title          text not null,
  semester       int  not null,
  faculty_name   text,
  lecture_date   date,
  covered_topics jsonb not null default '[]',
  topic_notes    jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists syllabus_history_created_at_idx
  on public.syllabus_history (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- This app has no login system yet (no Django/auth backend), so for now every
-- role uses the public anon key and RLS is opened up for read/write. Tighten
-- these policies (e.g. restrict writes to authenticated faculty) once auth
-- lands -- that's the natural place for the future Django/Supabase-Auth layer
-- to plug in.

alter table public.syllabus_progress enable row level security;
alter table public.syllabus_history  enable row level security;

drop policy if exists "public read progress"  on public.syllabus_progress;
drop policy if exists "public write progress" on public.syllabus_progress;
drop policy if exists "public read history"   on public.syllabus_history;
drop policy if exists "public write history"  on public.syllabus_history;

create policy "public read progress"
  on public.syllabus_progress for select
  using (true);

create policy "public write progress"
  on public.syllabus_progress for all
  using (true) with check (true);

create policy "public read history"
  on public.syllabus_history for select
  using (true);

create policy "public write history"
  on public.syllabus_history for insert
  with check (true);

-- ----------------------------------------------------------------------------
-- Users & Roles Table
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id           uuid default gen_random_uuid() primary key,
  username     text unique not null,
  password     text not null,
  role         text not null check (role in ('student', 'teacher', 'principal')),
  name         text not null,
  department   text,
  created_at   timestamptz default now()
);

alter table public.users enable row level security;

drop policy if exists "public read users" on public.users;
create policy "public read users"
  on public.users for select
  using (true);

-- Seed initial default users (student, teacher, principal)
insert into public.users (username, password, role, name, department)
values 
  ('student', 'student123', 'student', 'Student User', 'Computer Science'),
  ('teacher', 'teacher123', 'teacher', 'Prof. Het Gajjar', 'Faculty of CS & IT'),
  ('principal', 'principal123', 'principal', 'Dr. Principal', 'Administration')
on conflict (username) do nothing;

-- ----------------------------------------------------------------------------
-- Teacher Submissions Table (exact schema requested)
-- ----------------------------------------------------------------------------
create table if not exists public.teacher_submissions (
  id             uuid default gen_random_uuid() primary key,
  subject_code   text not null,
  lecture_date   date,
  covered_topic  jsonb not null default '[]',
  mandatory_note jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

alter table public.teacher_submissions enable row level security;

drop policy if exists "public read teacher_submissions" on public.teacher_submissions;
drop policy if exists "public write teacher_submissions" on public.teacher_submissions;

create policy "public read teacher_submissions"
  on public.teacher_submissions for select
  using (true);

create policy "public write teacher_submissions"
  on public.teacher_submissions for insert
  with check (true);

-- ----------------------------------------------------------------------------
-- Faculty Lecture Updates Table (REST API Endpoint)
-- ----------------------------------------------------------------------------
create table if not exists public.faculty_lecture_updates (
  id             uuid default gen_random_uuid() primary key,
  subject_code   text not null,
  title          text,
  semester       int,
  faculty_name   text,
  lecture_date   date,
  covered_topic  jsonb not null default '[]',
  mandatory_note jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

alter table public.faculty_lecture_updates enable row level security;

drop policy if exists "public read faculty_lecture_updates" on public.faculty_lecture_updates;
drop policy if exists "public write faculty_lecture_updates" on public.faculty_lecture_updates;

create policy "public read faculty_lecture_updates"
  on public.faculty_lecture_updates for select using (true);

create policy "public write faculty_lecture_updates"
  on public.faculty_lecture_updates for insert with check (true);

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.syllabus_progress;
alter publication supabase_realtime add table public.teacher_submissions;
alter publication supabase_realtime add table public.faculty_lecture_updates;



