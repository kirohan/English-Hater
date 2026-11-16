# English-Hater Phase 2.1 — Structured Lesson Engine

## What changed

This upgrade adds a reusable content format for complete grammar chapters. Existing short lessons using `rule` and `examples` continue to work.

### Student app

- Renders long lessons with ordered sections and a lesson outline.
- Supports explanations, formulas, example cards, Bangla translations, comparison tables, common mistakes, notes, tips, warnings, prerequisites and learning outcomes.
- Keeps the existing topic practice button and question-bank flow.
- Labels bundled placeholder lessons as **Sample content**.

### Content Admin

- Imports one lesson or a package of lessons from JSON.
- Validates track, topic slug, section type, examples, tables and required fields before import.
- Shows a preview before committing.
- Sends every JSON import to review as unpublished, even if the incoming JSON says it is approved.
- Adds lesson approval/rejection to the Review Queue.
- Exports one lesson or all lessons as JSON. Full backups retain every section.
- Keeps CSV support for short legacy lessons and question imports.

### Supabase

- Stores the rich lesson payload in `lessons.content_json` (JSONB).
- Maps structured fields when lessons are loaded or pulled into the local editor.
- Adds `supabase-structured-lessons.sql` for existing projects. It is safe to run more than once.
- Fresh installs also create the new column in `supabase-setup.sql`.

## Important compatibility notes

- Existing `rule` and `examples` lesson records still render.
- Use one lesson per track and topic. The included template uses `track: "ssc"`, `topic: "article"`, and ID `lesson-ssc-article` so a future approved Article chapter can replace the current SSC sample lesson without creating a second Article topic.
- Keep each lesson's `topic` identical to the topic used by its question-bank rows.
- MCQ answer keys remain in the existing protected question bank. Do not put MCQ answers in public lesson JSON.
- This upgrade does not change the question-bank question types or add non-MCQ interactive exercises.

## Apply locally

1. Create or switch to an upgrade branch in your existing clone.
2. Extract the Phase 2.1 patch ZIP into the repository root, allowing files to be replaced.
3. Run `python scripts/qa.py`.
4. Inspect the changes with `git diff` and `git diff --check`.
5. Commit and push only after local review.

## Supabase migration

Before publishing structured lessons, open the Supabase SQL Editor and run `supabase-structured-lessons.sql` once. Existing lesson rows are retained; the new JSONB column defaults to an empty object.

## Local content workflow

1. Prepare JSON using `lesson-import-template.json` and `LESSON-CONTENT-GUIDE.md`.
2. Open `admin.html` locally.
3. Choose **Import / Backup** and validate the JSON.
4. Commit it to the local review queue.
5. Preview and approve it in **Review Queue**.
6. Test it in the student app.
7. Back up and publish through `cloud-admin.html` when ready.

## Verification

The included `scripts/qa.py` now runs:

- JavaScript syntax checks
- HTML local-reference checks
- PWA manifest and service-worker asset checks
- Secret-pattern scan
- Structured lesson schema tests
- Admin JSON import/review/approval tests
- Student structured lesson rendering tests

The checks do not replace testing against the live Supabase project or a real browser on desktop and mobile.


## Article pilot content

A source-based SSC Article lesson is included under `content/articles/`. It covers the full NEED chapter structure (printed pp. 218–241), including A/An, The, zero article, repetition, and three levels of written practice. The lesson JSON contains source metadata and remains in `review` status with `published: false`.

The package also includes 31 original MCQs in `article-question-bank.csv`, `article-practice-worksheets.md`, and `ARTICLE-EDITORIAL-REPORT.md`. Import the lesson JSON and question CSV separately. MCQ answers stay in the protected question table; the public lesson JSON contains no answer key.

The app now gives locally approved custom lessons/questions precedence over an older cached cloud copy on the same admin device, so an editor can preview a replacement before publishing it. Cloud publishing remains the final step.
