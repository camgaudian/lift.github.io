/**
 * Rasterize home-screen / PWA icons from the trophy artwork.
 * Run: npm i --no-save sharp && node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = (name) => join(root, 'public', name)

/**
 * Full-bleed square icon for raster targets (iOS applies its own mask).
 * Mirrors public/favicon.svg without the rounded-corner clip.
 */
const iconSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#ededf0"/>
    </linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#329bff"/>
      <stop offset="0.55" stop-color="#0a84ff"/>
      <stop offset="1" stop-color="#0768d6"/>
    </linearGradient>
    <filter id="drop" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="64" height="64" fill="url(#bg)"/>
  <g filter="url(#drop)">
    <path d="M18.5 14 C9 14 9 30.5 21 31.5" fill="none" stroke="url(#blue)" stroke-width="3.4"/>
    <path d="M45.5 14 C55 14 55 30.5 43 31.5" fill="none" stroke="url(#blue)" stroke-width="3.4"/>
    <path d="M18 11 H46 V22 C46 34 38.5 41 32 41 C25.5 41 18 34 18 22 Z" fill="url(#blue)"/>
    <rect x="29" y="40" width="6" height="7" fill="url(#blue)"/>
    <path d="M22 54 H42 L39 47 H25 Z" fill="url(#blue)"/>
    <rect x="19.5" y="53.5" width="25" height="4.5" rx="1.8" fill="url(#blue)"/>
  </g>
  <g stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" opacity="0.95">
    <line x1="26.5" y1="23" x2="37.5" y2="23"/>
    <line x1="24" y1="19" x2="24" y2="27"/>
    <line x1="40" y1="19" x2="40" y2="27"/>
  </g>
</svg>`)

async function writePng(filename, size, input = iconSvg) {
  await sharp(input, { density: 400 }).resize(size, size).png().toFile(out(filename))
  console.log('wrote', filename, `${size}x${size}`)
}

await writePng('apple-touch-icon.png', 180)
await writePng('icon-192.png', 192)
await writePng('icon-512.png', 512)

const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f2f2f4"/>
  <g transform="translate(51 51) scale(6.40625)">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#ededf0"/>
      </linearGradient>
      <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#329bff"/>
        <stop offset="0.55" stop-color="#0a84ff"/>
        <stop offset="1" stop-color="#0768d6"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#bg)"/>
    <path d="M18.5 14 C9 14 9 30.5 21 31.5" fill="none" stroke="url(#blue)" stroke-width="3.4"/>
    <path d="M45.5 14 C55 14 55 30.5 43 31.5" fill="none" stroke="url(#blue)" stroke-width="3.4"/>
    <path d="M18 11 H46 V22 C46 34 38.5 41 32 41 C25.5 41 18 34 18 22 Z" fill="url(#blue)"/>
    <rect x="29" y="40" width="6" height="7" fill="url(#blue)"/>
    <path d="M22 54 H42 L39 47 H25 Z" fill="url(#blue)"/>
    <rect x="19.5" y="53.5" width="25" height="4.5" rx="1.8" fill="url(#blue)"/>
    <g stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" opacity="0.95">
      <line x1="26.5" y1="23" x2="37.5" y2="23"/>
      <line x1="24" y1="19" x2="24" y2="27"/>
      <line x1="40" y1="19" x2="40" y2="27"/>
    </g>
  </g>
</svg>`)

await writePng('icon-512-maskable.png', 512, maskableSvg)
