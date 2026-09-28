import { createRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Frame, FrameImage, frameVariants } from '../src/index.ts'
import type { FrameVariant } from '../src/index.ts'

const variants = frameVariants.map(item => item.variant)

describe('server rendering', () => {
  it.each(variants)('renders %s without a DOM', variant => {
    const html = renderToString(<Frame variant={variant} aspectRatio="4 / 5"><p>content</p></Frame>)
    expect(html).toContain('class="korniza"')
    expect(html).toContain(`data-variant="${variant}"`)
    expect(html).toContain('<p>content</p>')
  })

  it('renders the mat, its window and the glazing on the server', () => {
    const html = renderToString(
      <Frame variant="dark-walnut" mat glazing ref={createRef<HTMLDivElement>()}>
        <FrameImage src="/artwork.jpg" alt="An artwork" />
      </Frame>,
    )
    expect(html).toContain('korniza-frame__opening korniza-mat')
    expect(html).toContain('korniza-frame__window')
    expect(html).toContain('korniza-glazing')
    expect(html).toContain('class="korniza-image"')
  })
})

describe('public contract', () => {
  it('names every shipped class in the package namespace', () => {
    for (const variant of variants) {
      const html = renderToString(<Frame variant={variant} mat glazing><span>x</span></Frame>)
      const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)).filter(Boolean)
      expect(classes.length).toBeGreaterThan(8)
      for (const name of classes) expect(name === 'korniza' || name.startsWith('korniza-'), `unprefixed class ${name}`).toBe(true)
    }
  })

  it('applies the aspect ratio to the opening, not the wrapper', () => {
    const html = renderToString(<Frame variant="modern-black" aspectRatio="3 / 2" />)
    expect(html).toMatch(/class="korniza-frame__opening" style="aspect-ratio:3 \/ 2"/)
    expect(html).toMatch(/class="korniza"(?![^>]*aspect-ratio)/)
  })

  it('gives a matted frame the ratio in its window, so the mat never crops the art', () => {
    const html = renderToString(<Frame variant="modern-black" aspectRatio="3 / 2" mat />)
    expect(html).toMatch(/class="korniza-frame__opening korniza-mat">/)
    expect(html).toMatch(/class="korniza-frame__window" style="aspect-ratio:3 \/ 2"/)
  })

  it('merges mat overrides and consumer style on the themeable wrapper', () => {
    const html = renderToString(<Frame variant="carved-oak" mat={{ width: '18px', color: '#f4efe4' }} style={{ maxWidth: 420 }} />)
    expect(html).toContain('max-width:420px')
    expect(html).toContain('--korniza-mat-width:18px')
    expect(html).toContain('--korniza-mat-color:#f4efe4')
  })

  it('names the offending value and the valid set for an unknown variant', () => {
    expect(() => renderToString(<Frame variant={'brushed-brass' as FrameVariant} />))
      .toThrow(/korniza: unknown Frame variant "brushed-brass".*baroque-gold.*modern-black/s)
  })
})
