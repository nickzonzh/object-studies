import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { CraftPaper, CraftTable, GooglyEye } from '../src/index.js'

// Node with no DOM globals: canvases, textures and pointer physics must wait for the browser.
test('the craft table renders on the server with its caddy and tools', () => {
  const html = renderToString(<CraftTable />)
  assert.match(html, /class="kollaz"/)
  assert.match(html, /data-kollaz-slot="glue"/)
  assert.match(html, /data-kollaz-flight="scissors"/)
  assert.match(html, /aria-label="Glue stick"/)
  assert.match(html, /<canvas/)
})

test('the drop-ins render on the server', () => {
  const eye = renderToString(<GooglyEye size={40} track />)
  assert.match(eye, /class="kollaz-googly-eye /)
  const paper = renderToString(<CraftPaper torn={['top']}>Note</CraftPaper>)
  assert.match(paper, /class="kollaz-paper /)
  assert.match(paper, /Note/)
})
