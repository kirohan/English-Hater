# English Haters — V1 Private Alpha

**Current build:** Phase 2.1 — Structured Lesson Engine

This repository is intended to remain private. The browser uses only the Supabase publishable key; never commit service-role/secret keys or `.env` files.


Security-hardened cloud beta. Keep the source private.

## What changed in 1.8A
- protected server-mediated question sessions
- no direct anonymous cloud question reads
- answer/explanation returned only after check/submit
- per-account beta delivery quotas
- private avatar bucket + signed profile-photo URLs
- Supabase client pinned to 2.95.0
- private-repository `.gitignore`

Read `PHASE-1.8-SECURITY.md` first.

## Local test
```bash
python -m http.server 8080
```
Open `http://localhost:8080`. The live Supabase project is already configured in `backend-config.js`.

The 36 bundled questions are demo-only and intentionally remain available for local/offline testing. Real production questions must live only in Supabase.


## Phase 1.10 — Production Content System
- Review queue and approval workflow
- Exact duplicate detection before import
- Expanded curriculum metadata
- Import batch tracking
- 200-row chunked cloud publishing
- Only approved content is eligible for student publishing


## Phase 2.0.2
Protected device sync + stale-PWA-cache fix.

## Structured lesson content (Phase 2.1)

For long-form lessons with multiple sections, run `supabase-structured-lessons.sql` once in the Supabase SQL Editor after the main database setup. The migration adds a JSONB payload column without deleting or rewriting existing lessons. Use `LESSON-CONTENT-GUIDE.md` and `lesson-import-template.json` to prepare and import full lessons through the Content Admin.


### First source-based chapter: Articles

The first editorial pilot is in `content/articles/`. It was developed from the uploaded NEED *Basic English Grammar* Article chapter (printed pp. 218–241). The package contains a structured SSC lesson JSON, 31 original MCQs for the protected question bank, three levels of original written worksheets, and an editorial report documenting source coverage and corrections.

Import `content/articles/lesson-ssc-article.json` and `content/articles/article-question-bank.csv` through Content Admin. Both imports enter the review queue and remain unpublished until approved. The source PDF is not included in this repository package.
