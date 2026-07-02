// Generates pwa-192x192.png and pwa-512x512.png: black barbell glyph on volt.
// Zero-dependency PNG writer (RGB, zlib via node).
import { deflateSync } from "node:zlib"
import { writeFileSync } from "node:fs"

const VOLT = [0xd6, 0xfb, 0x2e]
const CARBON = [0x0c, 0x0c, 0x0d]

function crc32(buf) {
  let c,
    crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixelAt) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1)
    raw[row] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x / size, y / size)
      const i = row + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// Barbell: horizontal bar + inner/outer plates each side, in normalized coords.
function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

function pixelAt(x, y) {
  const bar = inRect(x, y, 0.14, 0.465, 0.86, 0.535)
  const plateOuterL = inRect(x, y, 0.2, 0.27, 0.27, 0.73)
  const plateInnerL = inRect(x, y, 0.3, 0.33, 0.36, 0.67)
  const plateOuterR = inRect(x, y, 0.73, 0.27, 0.8, 0.73)
  const plateInnerR = inRect(x, y, 0.64, 0.33, 0.7, 0.67)
  const glyph = bar || plateOuterL || plateInnerL || plateOuterR || plateInnerR
  return glyph ? CARBON : VOLT
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/pwa-${size}x${size}.png`, import.meta.url), png(size, pixelAt))
  console.log(`wrote public/pwa-${size}x${size}.png`)
}
