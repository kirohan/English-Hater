# English Haters Phase 1.10 — Final Admin & Content System

Production workflow: Import → Validate → Duplicate Check → Review → Approve → Publish → Backup.

## Question metadata
track, topic, subtopic, curriculum, chapter, unit, difficulty, source_type, source_name, source_year, tags, review_status, import_batch, published.

## Review states
- draft
- review
- approved
- rejected
- archived

Only approved + published questions are sent to students.

## Bulk import safety
CSV rows are fully validated before commit. Exact question+choice duplicates against existing local content and within the incoming file stop the import. Imported content defaults to the review queue unless explicitly approved.

## Cloud publishing
Publishing is chunked in batches of 200 rows so thousands of questions can be uploaded without one oversized request. Supabase remains the authoritative cloud store.
