/**
 * Generate PWA icons without external dependencies
 * Creates minimal valid PNG files with a blue background and white "Z" letter
 */

const zlib = require('zlib')
const { writeFileSync } = require('fs')
const { join } = require('path')

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

function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const ihdrChunk = makeChunk('IHDR', ihdr)

  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2])
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData))
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 3)
  const bg = [0x19, 0x89, 0xfa]
  const fg = [0xff, 0xff, 0xff]

  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = bg[0]; pixels[i * 3 + 1] = bg[1]; pixels[i * 3 + 2] = bg[2]
  }

  const margin = Math.floor(size * 0.22)
  const inner = size - margin * 2
  const thick = Math.max(Math.floor(size * 0.11), 3)

  function fillRect(x1, y1, w, h) {
    for (let y = y1; y < y1 + h && y < size; y++)
      for (let x = x1; x < x1 + w && x < size; x++) {
        const idx = (y * size + x) * 3
        pixels[idx] = fg[0]; pixels[idx + 1] = fg[1]; pixels[idx + 2] = fg[2]
      }
  }

  // Top bar
  fillRect(margin, margin, inner, thick)
  // Diagonal
  for (let i = 0; i <= inner; i++) {
    const x = margin + inner - 1 - Math.floor(i * (inner - thick) / inner)
    const y = margin + Math.floor(i * (inner - thick) / inner)
    fillRect(x, y, thick, thick)
  }
  // Bottom bar
  fillRect(margin, margin + inner - thick, inner, thick)

  return pixels
}

const base = join(__dirname, 'public', 'icons')
for (const size of [192, 512]) {
  const pixels = drawIcon(size)
  const png = createPNG(size, size, pixels)
  const path = join(base, `icon-${size}x${size}.png`)
  writeFileSync(path, png)
  console.log(`Generated: icon-${size}x${size}.png (${png.length} bytes)`)
}
console.log('Done!')
