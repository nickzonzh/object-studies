/** The window event every googly eye listens for. */
export const BUMP_EVENT = 'kollaz:bump'

/** Jiggle every googly eye on the page, like knocking the table. */
export function bumpGooglyEyes(strength = 1) {
  window.dispatchEvent(new CustomEvent(BUMP_EVENT, { detail: strength }))
}
