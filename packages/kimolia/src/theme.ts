/**
 * The documented theming surface. The tools in flight are portalled out of the
 * board, so whatever a consumer set on the component root has to be copied
 * across to them: custom properties inherit through the DOM tree, not through
 * the React tree.
 */
export const themeProperties = [
  '--kimolia-timber',
  '--kimolia-timber-light',
  '--kimolia-timber-dark',
  '--kimolia-slate',
  '--kimolia-slate-light',
  '--kimolia-slate-dark',
  '--kimolia-chalk-white',
  '--kimolia-chalk-yellow',
  '--kimolia-chalk-blue',
  '--kimolia-chalk-pink',
] as const

export function copyTheme(from: HTMLElement, to: HTMLElement) {
  const styles = getComputedStyle(from)
  for (const name of themeProperties) {
    const value = styles.getPropertyValue(name).trim()
    if (value) to.style.setProperty(name, value)
  }
}
