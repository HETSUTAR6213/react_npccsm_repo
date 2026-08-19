# NPCCSM Syllabus Tracker (React + Supabase)

This is a React rewrite of the three static dashboards (`principal.html`,
`teacher.html`, `student.html`). Same look and flow, proper component
architecture, and a real backend via **Supabase** instead of the old
`fetch()`-to-a-Flask-API-that-doesn't-exist-yet + `localStorage` fallback.

Django is not wired in yet — the code is structured so a Django/DRF (or
Supabase Auth) layer can slot in later without touching the UI (see
"Swapping in Django later" below).

## Architecture

```
src/
  data/syllabusDatabase.js     Static curriculum (courses/units/topics) —
                                extracted verbatim from the original files.
                                This rarely changes, so it's bundled JS, not a DB table.
  lib/supabaseClient.js        Supabase client, reads VITE_SUPABASE_* env vars.
  context/SyllabusContext.jsx  Single data layer: reads/writes "live" progress
                                (covered topics, notes, faculty, dates) from
                                Supabase, with automatic localStorage fallback
                                if Supabase isn't configured or a call fails.
                                Also subscribes to Supabase Realtime so Student/
                                Principal views update the moment faculty publish.
  components/layout/           Header (role-colored, semester pills), background.
  components/shared/           Modal, offline-mode banner.
  pages/
    PrincipalDashboard.jsx     Read-only completion % per subject.
    StudentPortal.jsx          Course tabs + published notes + topic checklist.
    TeacherStudio.jsx          Sidebar of subjects, unit/topic form with the
                                "note required for every checked topic" rule,
                                success + history modals.
  App.jsx                      Role picker + routes (/principal, /teacher, /student).
```

Each of the three roles is its own page/route rather than three separate HTML
files, sharing the header, ambient background, and — most importantly — the
same Supabase-backed state, so a faculty update instantly reflects in the
Student and Principal views (previously this only worked if all three hit the
same backend, which wasn't deployed).

## Setup

```bash
npm install
cp .env.example .env        # then fill in your Supabase project URL + anon key
npm run dev
```

### Supabase setup

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/schema.sql` — it creates
   `syllabus_progress` (current state) and `syllabus_history` (append-only log),
   with permissive RLS policies suitable for a no-auth app.
3. Copy the Project URL and anon public key into `.env`.

Without a `.env`, the app still runs — it just saves to the browser's
`localStorage` like the original static version did, and shows a small
"offline mode" banner.

## Swapping in Django later

`SyllabusContext.jsx` is the only place that talks to a backend. To move to
Django/DRF: replace the `supabase.from(...)` calls in that one file with
`fetch()` calls to your DRF endpoints (mirroring the shape already used —
`syllabus_progress` rows and a `syllabus_history` list). No page or component
needs to change. If you add Django for auth too, that's also the natural spot
to store a JWT/session and attach it to those requests.

## What changed from the static HTML version

- Three copy-pasted `<script>` blocks (each with its own near-identical copy
  of the syllabus DB and re-implemented render functions) → one shared data
  module + one shared context + reusable components.
- Broken `API_BASE_URL` pointing at a placeholder Render URL → real Supabase
  calls with a working local fallback.
- Manual DOM string-building (`innerHTML +=`) → declarative React rendering.
- Added live sync between roles via Supabase Realtime.
- UI/visual design (Tailwind classes, glass-panel look, colors per role) is
  preserved as-is, per your request for only minimal UI/UX changes.
