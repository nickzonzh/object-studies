import assert from 'node:assert/strict'
import { test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Whiteboard, type Stroke } from '../src/index.ts'

// No window, no document, no localStorage: this is the whole point of the test.
test('the board renders on the server without reaching for the browser', () => {
  const html = renderToString(
    <Whiteboard persistence={{ key: 'melani:whiteboard:v2' }} brand="MELANI" />,
  )
  assert.match(html, /class="melani[ "]/)
  assert.match(html, /data-melani-slot="black"/)
  assert.match(html, /<canvas/)
  // The flying tools are portalled into the document after mount, so the
  // first client render matches this one.
  assert.ok(!html.includes('data-melani-flight'))
})

test('a server-rendered board shows the drawing it was given', () => {
  const html = renderToString(
    <Whiteboard
      showControls={false}
      brand=""
      labels={{ board: 'Tableau blanc', eraser: 'Effaceur' }}
      strokes={[{ id: 'a', tool: 'marker', color: '#1b2022', width: 6, points: [{ x: 10, y: 10, pressure: 0.5 }] }]}
    />,
  )
  assert.match(html, /aria-label="Tableau blanc"/)
  assert.match(html, /aria-label="Effaceur"/)
  assert.ok(!html.includes('Save PNG'), 'showControls={false} removes the control bar')
  assert.ok(!html.includes('MELANI'), 'brand="" removes the printed name')
})

// Drawings arrive from a consumer's server as plain JSON. A malformed one must
// stop at the component with a message that names it, not crash the renderer.
test('a malformed drawing is rejected with a message naming it', () => {
  const broken = JSON.parse(
    '[{"id":"a","tool":"marker","color":"#1b2022","width":6,"points":[{"x":1,"y":1,"pressure":0.5}]},'
    + '{"id":"b","tool":"marker","color":"#1b2022","width":6,"points":null}]',
  ) as Stroke[]
  assert.throws(() => renderToString(<Whiteboard strokes={broken} />), /`strokes\[1\]` is not a valid stroke/)
  assert.throws(() => renderToString(<Whiteboard defaultStrokes={broken} />), /`defaultStrokes\[1\]`/)
})
