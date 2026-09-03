# English Haters — Phase 1.8A Security Hardening

This build changes the student question flow from direct table reads to a protected Supabase Edge Function.

## Live backend protections
- Direct anonymous access to `public.questions` is revoked.
- Signed-in students have no RLS SELECT policy for the question table; admins retain admin-only access.
- `student-content` authenticates the user itself and uses a server-only Supabase secret to read questions.
- Practice/exam sessions are short-lived and bound to the signed-in user.
- Maximum delivered batch: 50 questions (Question Bank: 20 by the app, server hard cap 30).
- Beta daily quota: 500 questions served and 500 answer reveals/checks per account.
- Practice returns question + choices only. Correct answer and explanation are returned only after checking.
- Exam answer keys are returned only on submission.
- The avatar bucket is private. Profile pictures use 1-hour signed URLs.

## Demo-content note
The bundled `data/questions.js` contains 36 disposable demo questions so local/offline mode still works. Do not put valuable production content in that file. Real curriculum content should be published to Supabase and delivered through the protected API.

## Private repository rule
Keep this source in a PRIVATE GitHub repository. Never commit `.env`, Supabase secret keys, service-role keys, payment secrets, or database passwords. The browser publishable key is intentionally public and safe only because RLS/API permissions enforce access.
