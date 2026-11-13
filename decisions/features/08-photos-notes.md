# Feature: Photos and notes

Part 1. Confluence page 524314. Jira: epic KAN-38, KAN-39 (FE), KAN-40 (BE).

**Status:** built 13 Nov 2026. The Confluence decision list (PH1–PH6) could not be read from the cloud chat (no
Atlassian connector), so the choices below were PROPOSED and built, except the storage and the new libraries,
which the owner chose. Data model decisions D3, D4, D16 (AGREED) are followed. Compare with PH1–PH6 when the
connector works; anything that differs goes back to the owner.

## Choices

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| P-a | Where the photo files live | **Azure Blob Storage**, locally the free **Azurite** emulator in Docker (port 10000). Backend library `Azure.Storage.Blobs`. Rejected: files on the API's disk for now (must be redone before beta); notes only (no photos) | **AGREED (owner, decision card, 13 Nov 2026)** |
| P-b | New app libraries | `expo-image-picker` (camera and library), `expo-image-manipulator` (make the photo smaller and the thumbnail), `expo-file-system` (keep files on the phone, upload, download), `expo-network` (Wi-Fi check). All official Expo modules, free. Native: needs a new app build (`-Rebuild`) | **AGREED (owner, same card)** |
| P-c | Photo size | The app keeps and uploads a "compressed" photo: longest side 2048 px, JPEG quality 0.8 (about 0.5–1.5 MB), and a 400 px thumbnail. The original stays in the phone's gallery. "Full quality" is for paid plans later (data model `qualityTier`) | PROPOSED (built) |
| P-d | What "notes" are | The note on each photo (data model `caption`), up to 2000 characters, written in the handwriting font. Text-only notes without a photo are not in the data model; they can come with the diary (Part 3) or as a new decision | PROPOSED (built) |
| P-e | Photo location | **Not read and not kept.** The app reads only the time the photo was taken. The file is re-saved by the phone (which drops hidden EXIF data) and the server removes EXIF/XMP/comments again before storing (GDPR: a photo's GPS position is personal data). `lat`, `lng`, `countryCode` stay empty until the Map (KAN-37) decides if photo pins are wanted | PROPOSED (built) |
| P-f | How files reach the server | Through our API, not straight to storage: `PUT /media/{id}/thumbnail` then `PUT /media/{id}/file` (raw JPEG; 1 MB / 15 MB max). The API checks owner, size and that it is a real JPEG, strips metadata, then stores it. Reading also goes through the API (`GET /media/{id}/file`, `/thumbnail`), which checks access each time. The data model said "short-lived upload URLs"; going through the API keeps storage private and the access check in one place. Can switch to upload URLs later if the API gets busy | PROPOSED (built) |
| P-g | When files upload | Record first (PowerSync, like everything else, D4), then the files, in the app while it is open: at start, after adding, when the network changes and when the app comes back. **Wi-Fi only** by default (Settings switch already there). After a failure it waits 30 s, 2 min, 10 min, then every hour. Background upload when the app is closed comes later | PROPOSED (built) |
| P-h | Files on the phone | `documents/photos/<id>/full.jpg` and `thumb.jpg` for photos added here and thumbnails downloaded; full photos from another phone go to the cache folder (the phone may clear it). Folders with no record any more (deleted elsewhere, trip deleted, another user logged in) are removed at login. Instead of the data model's `MediaLocal` table the phone uses these fixed paths plus a small upload state per photo in MMKV (counts and times only) | PROPOSED (built) |
| P-i | Same photo twice | SHA-256 of the original file (`contentHash`): refused in the same trip (phone and server), allowed in another trip | PROPOSED (built) |
| P-j | Picking | Camera (one photo) or library (up to 20 at once). Photos taken in the app are not saved to the phone's gallery (would need another library, `expo-media-library`) | PROPOSED (built) |
| P-k | What the tab shows | Buttons "Take a photo" and "From library", a line when photos are only on the phone so far, then the photos by day (newest first, same day labels as expenses) in a 3-column grid. Small marks: pen = has a note, cloud = not uploaded yet. Tap a photo: it big, the date, upload state, the note (save) and delete | PROPOSED (built) |
| P-l | Deleting (GDPR) | Delete on the phone removes the record (synced) and the files on this phone at once. The server keeps the file 30 days (data model), then a job deletes the files and the row for good. A deleted trip takes its photos with it (same 30 days). Account deletion (KAN-22) must also delete the user's files | PROPOSED (built, follows data model 12) |
| P-m | Who can see a photo | Only the person who added it, on their own trips (Part 1 trips are solo). Shared trips (Part 2) will let members see shared photos and add `MediaHidden` (D3) | PROPOSED (built) |
| P-n | Quick add | "Take a photo" and "Photos from library" first in the trip page **+** | PROPOSED (built) |

## Technical

- **Backend:** `Features/Media` (table `media` = entity `MediaItem`; `MediaSyncTable` for `POST /sync/upload` type
  `media`; `MediaEndpoints`: `GET /media?tripId=`, `PUT/GET /media/{id}/file` and `/thumbnail`; `IMediaStorage` /
  `AzureBlobMediaStorage`; `JpegMetadata` (own small JPEG parser, keeps the colour profile); `MediaCleanup` hourly job;
  `ITripDeleteHook`). Configuration `Media:BlobConnectionString` (local: `UseDevelopmentStorage=true`),
  `Media:CleanupAfterDays` (30), `Media:CleanupIntervalMinutes` (60), `Media:RequestsPerMinutePerUser` (120).
  Migration `Media`. PowerSync stream `my_media`. Docker service `azurite` (3.34.0). Storage errors answer 503, the
  API keeps running. Rules: only photos, only trip photos, source camera or library, JPEG, width/height 1–20000,
  SHA-256 hash, caption ≤ 2000, both or no position, no place link yet, cannot move trip or change hash.
- **App:** `repositories.media` (local / api / mock), `src/lib/photos.ts`, `src/services/photoFiles.ts`,
  `src/services/photoUpload.ts`, `src/features/photos/` (tab, tile, photo screen, add flow, upload hook), route
  `/photo/[id]`. The web preview shows photos' records but cannot add photos (no file system there).
- **GDPR:** nothing about photos is logged (no captions, hashes, sizes, positions, addresses). Azure SDK logging off.
  Blob keys hold only the photo id. Container is private.

## Later

- Background upload when the app is closed; "upload originals" for paid plans.
- Photo pins on the map (KAN-37), linking a photo to a place, trip cover photo.
- Shared trips: members see shared photos, `MediaHidden` (D3), removed member keeps copies (D2).
- Save photos taken in the app to the gallery (needs `expo-media-library`, ask first).
- A 1 GB limit for downloaded full photos (now the phone's cache rules apply).
