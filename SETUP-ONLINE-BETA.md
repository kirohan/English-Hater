# English Haters — Phase 1.6 Online Beta Setup

This phase is deployment-ready, but an external cloud account/domain cannot be created automatically from the ZIP. Complete these steps once.

## A. Supabase — already connected

The active **Interactive English Learning App** Supabase project is already wired into `backend-config.js` with its publishable browser key, and the Phase 1.6 database/security migrations are already applied.

Remaining Supabase steps after hosting:

1. In Supabase Authentication URL settings, add your deployed site as the Site URL and an allowed Redirect URL. For local testing allow `http://localhost:8080/**`.
2. Put the production site URL in `backend-config.js` as `siteUrl` so password-recovery emails return to the correct domain.
3. Never place a service-role/secret key in browser files.

## B. Founder account

1. Run the project locally.
2. Create your founder account from Profile.
3. Confirm the email if required.
4. Promote only that account using the SQL snippet already documented in `SETUP-SUPABASE.md`.
5. Open `cloud-admin.html` and publish reviewed local content.
6. Open `launch.html` and make sure the cloud/admin checks are green.

## C. Cloudflare Pages deployment

The project is a static site. No build command is required.

### Simple upload path

Upload the contents of the `english-haters-beta` folder as the site output. Keep `_headers`, `_redirects`, `service-worker.js`, and `backend-config.js` at the site root.

### Git path

If deploying from GitHub, use the folder containing `index.html` as the Pages output. This project does not currently need npm or a framework build.

Cloudflare Pages reads `_headers` to add Beta security headers and to prevent stale caching of `backend-config.js`.

## D. Domain

After the temporary Pages URL works, connect the English Haters domain. Then update:

- Supabase Site URL
- Supabase allowed Redirect URLs
- `backend-config.js -> siteUrl`

Deploy again after changing `siteUrl`.

## E. Test before inviting students

Use at least two different browsers/phones and verify:

- signup
- email confirmation
- sign in/out
- forgot-password email and new-password flow
- profile picture upload/change/remove
- XP/progress sync between devices
- two-device limit
- removal of an old device
- Practice, Exam, QB and OMR
- admin content publish
- mobile install/PWA
- offline banner and cached app shell

## F. Before a national/public launch

The included Privacy and Terms pages are starter Beta copy only. Add an official support contact, business identity, account-deletion process, moderation/support workflow, analytics/error monitoring, database backups, and legal review before paid subscriptions.
