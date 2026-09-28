import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Vase } from '../src/index.js'

// Node with no DOM globals: painting and WebGL must wait for the browser.
test('a piece renders on the server as a sized, labelled placeholder', () => {
  const html = renderToString(<Vase shape="amphora" vaseStyle="black-figure" palette="attic" seed={3} />)
  assert.match(html, /class="keramos-vase [^"]*\bkeramos-vase--painting\b/)
  assert.match(html, /role="img"/)
  assert.match(html, /aria-label="Neck amphora, black figure style"/)
  assert.match(html, /aspect-ratio:/)
  assert.match(html, /<canvas/)
})
