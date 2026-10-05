import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Komboloi } from '../src/index.js'

// Node with no DOM globals: the simulation and canvases wait for the browser.
test('a strand renders on the server as a sized, labelled placeholder', () => {
  const html = renderToString(<Komboloi material="mati" beads={23} seed={2} className="bench" />)
  assert.match(html, /class="komboloi bench"/)
  assert.match(html, /role="application"/)
  assert.match(html, /aria-roledescription="worry beads"/)
  assert.match(html, /aria-label="Mati glass komboloi, 23 beads"/)
  assert.match(html, /aspect-ratio:1 \/ 2/)
  assert.equal(html.match(/<canvas/g)?.length, 2)
})

test('a label replaces the default accessible name', () => {
  const html = renderToString(<Komboloi label="Grandad's beads" />)
  assert.match(html, /aria-label="Grandad&#x27;s beads"/)
})
