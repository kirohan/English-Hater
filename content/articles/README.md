# English-Hater Article Content Package

This package contains the first source-based structured chapter for the Phase 2.1 lesson engine.

## Files

- `lesson-ssc-article.json` — structured student lesson; import through Content Admin.
- `article-question-bank.csv` — 31 original MCQs; import through the question CSV importer.
- `article-practice-worksheets.md` — original written exercises at three levels with answers.
- `ARTICLE-EDITORIAL-REPORT.md` — source coverage and editorial corrections.

## Import order

1. Apply the Phase 2.1 code patch and Supabase migration first.
2. Open `admin.html` locally.
3. Import `lesson-ssc-article.json`; validate and commit it to the review queue.
4. Review the lesson, then approve it.
5. Import `article-question-bank.csv`; review and approve its 30 questions.
6. Test the SSC Article topic in the student app.
7. Back up local content and publish through `cloud-admin.html`.

The lesson uses `track: "ssc"` and `topic: "article"`, matching the existing SSC topic. It intentionally replaces the sample lesson with ID `lesson-ssc-article` after approval. Other tracks' sample Article lessons are not replaced by this SSC package.

All imported records enter review as unpublished. No live website or Supabase project is changed by preparing these files.
