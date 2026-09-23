# Performance polish — 23 September 2026

Large restores, resizes and uncached history changes now yield between batches instead of replaying the entire drawing in one JavaScript task. A batch stops after about 6 ms or 64 work units. Individual canvas calls can exceed the budget; this is cooperative scheduling, not worker rendering. Cached short jobs still finish immediately.

Clear, another history change, resizing and unmount cancel pending work. Cancelled partial strokes never become cache checkpoints. Drawing and PNG export wait until the canvas is complete, with a subdued “Updating drawing…” status and `aria-busy` on the slate. Autosave always uses the complete authoritative records, including while pixels are still rebuilding.

Autosave no longer parses and reconstructs every point immediately after serialising it. Record and point limits are checked before serialisation; character limits and storage failures remain guarded. Restored data still receives full validation. The duster also reuses one 128 × 48 felt-brush canvas instead of allocating another for every stroke; each stroke still regenerates its seeded grain.

## Verification

- 31 unit tests, lint, strict TypeScript and production build pass. New coverage includes yielding, cheap-command batch limits, cancellation, replacement jobs and preserving an existing save when the point limit is exceeded.
- Chromium and WebKit stress checks use 480 mixed chalk/duster strokes with 24,000 points at desktop DPR 2. Rapid resizes, Clear during restoration and Redo during Undo all preserve the final alpha pixels. Input during restoration cannot create a new gesture; partial PNG export is blocked.
- Chromium's 64-unit stress run delivered 410 animation frames during restoration, with a largest observed gap of 66.6 ms and one 56 ms long task in the navigation/restore interval. These are local observations, not phone FPS guarantees.
- WebKit also repaints during reconstruction, but the extreme fixture still exposes roughly one-second early frame gaps and smaller raster stalls. Profiling found expensive individual canvas calls; time slicing cannot interrupt a call already executing. A 16-unit experiment increased total reconstruction time substantially without removing those stalls, so the final limit remains 64.
- Phone-sized checks cover 390, 320 and 280px, chalk/duster, Undo/Redo/Clear recovery, refresh, resize, 44px utility targets and real PNG downloads. Chromium uses continuous emulated touch; WebKit uses touch controls and mouse paths. Physical iPhone and stylus performance remains unverified.

## Remaining limits

Very dense drawings still take time to restore, particularly in WebKit. A worker-backed renderer would be a larger follow-up if actual-device use warrants it. This pass improves responsiveness and cancellation, not the total amount of painting. Browser-local save limits and session-only undo remain unchanged. Switching between mobile and desktop board proportions still scales the artwork with the slate.
