import { supabase } from '@/lib/supabase'
import { updateProfileSettings } from '@/features/settings/profileApi'

const BUCKET = 'avatars'
const MAX_BYTES = 51200 // 50 KB
const OUTPUT_SIZE = 256

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function getAvatarUrl(path: string, cacheBuster?: number): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const bust = cacheBuster ?? 0
  return bust ? `${data.publicUrl}?t=${bust}` : data.publicUrl
}

// ---------------------------------------------------------------------------
// Canvas helpers — crop + resize to 256×256
// ---------------------------------------------------------------------------

interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = src
  })
}

export async function cropAndResize(imageSrc: string, pixelCrop: PixelCrop): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  // Try decreasing quality levels until the blob fits within MAX_BYTES
  const toBlob = (quality: number) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))

  for (let q = 0.85; q >= 0.45; q -= 0.05) {
    const blob = await toBlob(q)
    if (blob && blob.size <= MAX_BYTES) return blob
  }

  // Final fallback — should essentially never be needed at 256×256
  const blob = await toBlob(0.45)
  if (!blob) throw new Error('Failed to encode image')
  return blob
}

// ---------------------------------------------------------------------------
// Storage upload / remove
// ---------------------------------------------------------------------------

export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(userId, blob, {
    upsert: true,
    contentType: 'image/jpeg',
  })
  if (error) throw error
  return userId
}

export async function saveAvatarPath(userId: string, path: string | null): Promise<void> {
  await updateProfileSettings(userId, { avatar_path: path })
}

export async function removeAvatar(userId: string): Promise<void> {
  // Delete from storage (ignore "not found" errors — file may not exist)
  await supabase.storage.from(BUCKET).remove([userId])
  await saveAvatarPath(userId, null)
}
