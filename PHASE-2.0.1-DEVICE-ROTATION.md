# Phase 2.0.1 — Automatic Device Rotation

English Haters supports up to two registered devices per account.

## New behavior

- Device 1 signs in → registered.
- Device 2 signs in → registered.
- Device 3 signs in → Device 1 (the oldest registration) is removed automatically and Device 3 is registered.
- The evicted device checks its registration every 15 seconds and whenever the tab/window regains focus or comes back online. It then signs out locally and shows a clear message.
- Protected `student-content` requests include the browser device key and reject evicted devices server-side.
- Normal Sign Out uses Supabase local scope, so signing out one device does not sign out every device.

The registration RPC is serialized per user with an advisory transaction lock to avoid concurrent third-device races.
