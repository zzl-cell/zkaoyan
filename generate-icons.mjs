/**
 * Generate PWA icons without external dependencies
 * Creates minimal valid PNG files with a blue background and white "Z" letter
 */

// Minimal PNG encoder
function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type: RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr)

  // IDAT chunk - raw pixel data with zlib compression
  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter type: none
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2])
    }
  }

  const rawBuffer = Buffer.from(rawData)
  const zlib = await import('zlib')
  const compressed = zlib.deflateSync(rawBuffer)
  const idatChunk = makeChunk('IDAT', compressed)

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Draw a simple "Z" on a blue background
function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 3)
  const bg = [0x19, 0x89, 0xfa] // #1989fa
  const fg = [0xff, 0xff, 0xff] // white

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = bg[0]
    pixels[i * 3 + 1] = bg[1]
    pixels[i * 3 + 2] = bg[2]
  }

  // Draw "Z" letter
  const margin = Math.floor(size * 0.2)
  const inner = size - margin * 2
  const thickness = Math.max(Math.floor(size * 0.12), 2)

  function setPixel(x, y, color) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      const idx = (y * size + x) * 3
      pixels[idx] = color[0]
      pixels[idx + 1] = color[1]
      pixels[idx + 2] = color[2]
    }
  }

  function fillRect(x1, y1, w, h, color) {
    for (let y = y1; y < y1 + h; y++) {
      for (let x = x1; x < x1 + w; x++) {
        setPixel(x, y, color)
      }
    }
  }

  // Top horizontal bar
  fillRect(margin, margin, inner, thickness, fg)

  // Diagonal (top-right to bottom-left)
  for (let i = 0; i < inner; i++) {
    const x = margin + inner - 1 - Math.floor(i * inner / inner)
    const y = margin + Math.floor(i * inner / inner)
    fillRect(x - Math.floor(thickness / 2), y, thickness, Math.ceil(thickness * 0.7), fg)
  }

  // Bottom horizontal bar
  fillRect(margin, margin + inner - thickness, inner, thickness, fg)

  return pixels
}

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

for (const size of [192, 512]) {
  const pixels = drawIcon(size)
  const png = await createPNG(size, size, pixels)
  const path = join(__dirname, 'public', 'icons', `icon-${size}x${size}.png`)
  writeFileSync(path, png)
  console.log(`Generated: ${path} (${png.length} bytes)`)
}

console.log('Done!')
