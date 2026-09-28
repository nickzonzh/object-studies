import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Chalkboard } from '../src/index.js'

// Node with no DOM globals: touching window, document or localStorage while
// rendering would throw here rather than in somebody's framework.
test('renders on a server without a DOM, and without reaching for storage', () => {
  const html = renderToString(
    <Chalkboard persistence={{ key: 'kimolia:test' }} />,
  )
  assert.ok(html.includes('kimolia-board'))
  assert.ok(html.includes('kimolia-slate'))
  assert.ok(html.includes('<canvas'))
  // The tools live in a portal created in an effect, so they are not in markup.
  assert.ok(!html.includes('kimolia-tool-flight'))
})

test('labels are overridable, and the defaults are not baked into markup', () => {
  const html = renderToString(
    <Chalkboard
      showControls={false}
      labels={{
        board: 'Tafel',
        empty: 'Kreide aufnehmen.',
        chalk: { white: 'Weiße Kreide' },
      }}
    />,
  )
  assert.ok(html.includes('aria-label="Tafel"'))
  assert.ok(html.includes('aria-label="Weiße Kreide"'))
  assert.ok(html.includes('aria-label="Pale yellow chalk"'))
  assert.ok(html.includes('Kreide aufnehmen.'))
  assert.ok(!html.includes('Pick up chalk'))
  assert.ok(!html.includes('kimolia-control-group'))
})
