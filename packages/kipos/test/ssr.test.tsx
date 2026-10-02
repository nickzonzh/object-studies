import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Bed, Plant, Teneke } from '../src/index.js'

// Node with no DOM globals: storage and the clock wait for the browser, so the
// server render is the empty bed every visitor first sees.
test('the bed renders on the server with its plots, packets and can', () => {
  const html = renderToString(<Bed />)
  assert.match(html, /class="kipos kipos-bed"/)
  assert.match(html, /aria-label="Garden bed"/)
  assert.equal(html.match(/class="kipos-plot"/g)?.length, 3)
  assert.match(html, /aria-label="Plot 1: empty"/)
  assert.match(html, /aria-label="Tomato seeds"/)
  assert.match(html, /aria-label="Watering can"/)
  assert.match(html, /data-light="afternoon"/, 'auto light settles after mount')
})

test('the bed takes its words from labels', () => {
  const html = renderToString(
    <Bed className="yard" labels={{ bed: 'Κήπος', crops: { tomato: 'Ντομάτα' }, wateringCan: 'Ποτιστήρι' }} />,
  )
  assert.match(html, /class="kipos kipos-bed yard"/)
  assert.match(html, /aria-label="Κήπος"/)
  assert.match(html, /aria-label="Ντομάτα seeds"/)
  assert.match(html, /aria-label="Ποτιστήρι"/)
  assert.match(html, /aria-label="Cucumber seeds"/, 'labels not given keep their defaults')
})

test('a teneke renders on the server', () => {
  const html = renderToString(<Teneke plant="geranium" light="dusk" />)
  assert.match(html, /class="kipos kipos-teneke kipos-teneke--geranium"/)
  assert.match(html, /aria-label="Sow geranium"/)
  assert.match(html, /data-light="dusk"/)
})

test('a plant draws more of itself as it grows', () => {
  const count = (progress: number) =>
    renderToString(<Plant crop="tomato" progress={progress} wilted={false} seed={1} />).match(/kipos-part /g)?.length ?? 0
  assert.equal(count(0), 2, 'the canes go in at sowing')
  assert.ok(count(0.3) > count(0.1))
  assert.ok(count(1) > count(0.5))
  const wilted = renderToString(<Plant crop="tomato" progress={0.5} wilted seed={1} />)
  assert.match(wilted, /kipos-plant--wilted/)
})
