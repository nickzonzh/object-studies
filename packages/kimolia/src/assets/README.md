# Material assets

The five SVG materials are deterministic output from `npm run materials`.

`mineral.png` (1000 × 620) and `noise.png` (160 × 160) are raster companions of the corresponding SVGs, rendered at their native dimensions using Chromium Canvas 2D and `toBlob('image/png')`. They are used only by PNG export. Regenerate these companions if the source SVGs change: load each SVG into an Image in a same-origin Chromium page, draw it to a canvas at its native dimensions, and save the canvas as PNG. Do not flatten the alpha channel or add a background.

Mobile WebKit verification caught a `SecurityError` when serialising a canvas containing these filtered SVGs, both as data URLs and as same-origin files. The baked PNGs preserve the existing grain while keeping the export canvas readable. No remote image source or runtime rendering library is used.

K6 losslessly stores these grayscale assets with luminance and alpha channels instead of duplicated RGB channels. Decoding back to RGBA was byte-for-byte identical before and after compression. The pair fell from 736,330 to 394,181 bytes (46% smaller). When regenerating, convert to grayscale-plus-alpha only after verifying the reconstructed RGBA bytes match the original, then save with PNG compression level 9. Pillow's `LA` mode was used for this one-time asset encoding; it is not an app dependency.
