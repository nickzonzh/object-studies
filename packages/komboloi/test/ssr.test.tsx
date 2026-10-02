import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Komboloi, MATERIAL_IDS } from '../src/index.js'

// Node with no DOM globals: the physics, painting and sound wait for the browser.
test('a strand renders on the server as a sized, labelled, focusable placeholder', () => {
  const html = renderToString(<Komboloi material="olive-wood" beads={17} />)
  assert.match(html, /class="komboloi"/)
  assert.match(html, /aria-label="Olive wood komboloi, 17 beads"/)
  assert.match(html, /aria-roledescription="worry beads"/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /aspect-ratio:\s*1 \/ 2/)
  assert.match(html, /<canvas/)
})

test('every material renders on the server', () => {
  for (const material of MATERIAL_IDS) assert.match(renderToString(<Komboloi material={material} />), /komboloi/)
})
