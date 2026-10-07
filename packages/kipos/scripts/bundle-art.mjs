// Joins the generated art to the published stylesheet and copies its images
// beside it. Run from packages/kipos after `vite build`.
//
// The art goes in here rather than through Vite because a library build
// inlines every image a stylesheet links to, and the point of the images being
// files is that the stylesheet stays small: a page draws before the art
// arrives, fetches only the art it shows, and caches each image on its own.
// art.css links them as ./art/<name>.avif, which is where they land.

import { appendFileSync, cpSync, readFileSync } from 'node:fs'

appendFileSync('dist/style.css', '\n' + readFileSync('src/art.css', 'utf8'))
cpSync('src/art', 'dist/art', { recursive: true })
