# Material assets

The five SVG materials are deterministic output from `npm run materials`.

`mineral.png` (1000 × 620) and `noise.png` (160 × 160) are raster companions of the corresponding SVGs, rendered at their native dimensions using Chromium Canvas 2D and `toBlob('image/png')`. They are used only by PNG export. Regenerate these companions if the source SVGs change: load each SVG into an Image in a same-origin Chromium page, draw it to a canvas at its native dimensions, and save the canvas as PNG. Do not flatten the alpha channel or add a background.

Mobile WebKit verification caught a `SecurityError` when serialising a canvas containing these filtered SVGs, both as data URLs and as same-origin files. The baked PNGs preserve the existing grain while keeping the export canvas readable. No remote image source or runtime rendering library is used.
