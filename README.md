# English Haters — V1 Private Alpha

**Current build:** Phase 1.12 — Final Design Polish & QA

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
