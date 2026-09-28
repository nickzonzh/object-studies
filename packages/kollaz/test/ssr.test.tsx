import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { CraftPaper, CraftTable, GooglyEye } from '../src/index.js'

// Node with no DOM globals: canvases, textures and pointer physics must wait for the browser.
test('the craft table renders on the server with its caddy', () => {
  const html = renderToString(<CraftTable />)
  assert.match(html, /class="kollaz"/)
  assert.match(html, /data-kollaz-slot="glue"/)
  assert.match(html, /aria-label="Glue stick"/)
  assert.match(html, /<canvas/)
  // The tools in hand are portalled into the document after mount, so the
  // first client render matches this one.
  assert.ok(!html.includes('data-kollaz-flight'))
})

test('the table takes its words from labels', () => {
  const html = renderToString(
    <CraftTable className="studio" labels={{ table: 'Table de bricolage', glue: 'Bâton de colle', empty: 'Prends un outil.' }} />,
  )
  assert.match(html, /class="kollaz studio"/)
  assert.match(html, /aria-label="Table de bricolage"/)
  assert.match(html, /aria-label="Bâton de colle"/)
  assert.match(html, /Prends un outil\./)
  assert.match(html, /aria-label="Scissors"/, 'labels not given keep their defaults')
})

test('the drop-ins render on the server', () => {
  const eye = renderToString(<GooglyEye size={40} track />)
  assert.match(eye, /class="kollaz-googly-eye /)
  const paper = renderToString(<CraftPaper torn={['top']}>Note</CraftPaper>)
  assert.match(paper, /class="kollaz-paper /)
  assert.match(paper, /Note/)
})
