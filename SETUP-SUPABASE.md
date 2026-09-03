# English Haters — Phase 1.5 Cloud Setup

Phase 1.5 runs immediately in **Local Beta mode**. Profile pictures, name, XP and practice history still work locally.

To switch on real student accounts, cloud profile photos, progress sync, the 2-device foundation, and secure content publishing, connect a Supabase project.

## 1. Create the project

Create a Supabase project on the free plan. Keep the database password somewhere safe.

You do **not** need to buy a VPS for this Phase 1.5 beta.

## 2. Build the database/security rules

In the Supabase dashboard open **SQL Editor**, paste the entire contents of:

`supabase-setup.sql`

Run it once.

It creates:

- student profiles
- XP/progress cloud backup
- registered devices
- lessons and questions
- admin-only content write policies
- profile-photo storage bucket
- signup profile trigger
- 2-device registration function
- Row Level Security policies

## 3. Connect the website

In Supabase, copy:

- Project URL
- public **Publishable/anon** key

Open `backend-config.js` and paste them:

```js
window.EH_BACKEND_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-PUBLIC-KEY',
  maxDevices: 2
};
```

### Important security rule

Use only the public publishable/anon key in this website.

**Never put a Supabase service-role/secret key in `backend-config.js`, GitHub, or browser code.**

The public key is safe to expose only because the SQL file turns on Row Level Security.

## 4. Run English Haters

From the project folder:

```bash
python -m http.server 8080
```

Open:

- Student app: http://localhost:8080/
- Local Content Admin: http://localhost:8080/admin.html
- Secure Cloud Publisher: http://localhost:8080/cloud-admin.html

Hard refresh once with `Ctrl + Shift + R` if an older PWA is cached.

## 5. Create the founder account

Open **Student app → Profile → Create account**.

Use your real founder email and password.

If email confirmation is enabled in your Supabase Authentication settings, confirm the email and then sign in.

## 6. Promote only the founder account to admin

After the founder account exists, return to Supabase SQL Editor and run this after replacing the email:

```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='YOUR-FOUNDER-EMAIL@example.com');
```

Do not give normal student accounts the admin role.

Phase 1.5 also includes a database trigger that blocks a student from changing their own role to `admin` through the browser/API.

## 7. Publish content

Continue writing/testing content in:

`http://localhost:8080/admin.html`

That editor remains local-first because it is fast and easy to back up.

When content is reviewed, open:

`http://localhost:8080/cloud-admin.html`

Sign in with the founder admin account and click:

**Publish local content to cloud**

Students will then receive published cloud lessons/questions in the normal app.

## Profile pictures

Students can upload JPG, PNG or WebP.

The app:

- rejects source files larger than 5 MB
- center-crops to a square
- resizes to 512×512
- converts to compressed JPEG
- stores a local preview in Local Beta mode
- stores the image in the user's own Supabase Storage folder in Cloud mode

The cloud bucket has a 2 MB file-size limit as an additional safety check.

## Device limit

Each browser installation receives a random device ID.

The database allows at most **2 registered devices** at the same time. Existing registered devices can be removed from the Profile page.

Beta limitation: if a student loses access to both registered devices, founder/admin support may be required to remove an old device directly from the database. A self-service recovery flow can be added later.

## Progress sync behavior

When signed in, the beta syncs:

- XP
- current track
- practice history
- Mistake Book
- practice days/streak data
- exam history

The current Phase 1.5 implementation stores these as compact JSON progress snapshots for simplicity. At national scale, we will move answer events into dedicated analytics/attempt tables instead of syncing a large JSON history object.

## What remains local in this phase

- unpublished founder drafts in Content Admin
- PWA offline cache

Everything else required for real student identity is now cloud-ready.
