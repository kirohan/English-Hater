# Phase 2.0.2 — Protected Device Sync Fix

This patch fixes `DEVICE_REQUIRED` / “This app version must register a device before protected content can be used.” when a browser still has a session created by an older frontend.

## Changes
- Protected requests always include the persistent browser `device_key`.
- A one-time migration path registers an existing pre-rotation session without weakening future eviction behavior.
- Once a browser has participated in the new device system, a missing device row is treated as a genuine eviction.
- `backend.js` and `app.js` are network-first in the service worker so stale code is replaced promptly.
- Service-worker registration bypasses HTTP cache and explicitly checks for updates.
- Cache version bumped to `english-haters-v14-device-sync`.

## Expected behavior
1. Old signed-in browser updates to this build and is registered once.
2. Protected Practice / Exam / Question Bank requests include `device_key`.
3. When a third device logs in, the oldest device remains evicted and cannot silently register itself again.
