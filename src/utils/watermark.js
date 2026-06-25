/**
 * Floating watermark generator
 * Renders rotated semi-transparent text as a repeating background layer
 */

let watermarkEl = null

/**
 * Inject watermark overlay into target container
 * @param {HTMLElement} container - target DOM element
 * @param {string} text - watermark text (e.g. "nickname 2026-07-20 14:30:25")
 */
export function injectWatermark(container, text) {
  removeWatermark()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 300
  canvas.height = 200

  ctx.rotate((-15 * Math.PI) / 180)
  ctx.font = '14px sans-serif'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.fillText(text, 10, 100)

  const dataUrl = canvas.toDataURL()

  watermarkEl = document.createElement('div')
  watermarkEl.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: url(${dataUrl});
    background-repeat: repeat;
    background-size: 120px 120px;
    pointer-events: none;
    z-index: 9999;
  `

  container.style.position = 'relative'
  container.appendChild(watermarkEl)
}

/**
 * Remove watermark overlay
 */
export function removeWatermark() {
  if (watermarkEl && watermarkEl.parentNode) {
    watermarkEl.parentNode.removeChild(watermarkEl)
    watermarkEl = null
  }
}

/**
 * Generate watermark text with current timestamp
 * @param {string} nickname
 * @returns {string}
 */
export function generateWatermarkText(nickname) {
  const now = new Date()
  const ts = now.toISOString().replace('T', ' ').substring(0, 19)
  return `${nickname} ${ts}`
}
