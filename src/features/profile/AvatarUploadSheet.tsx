import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { BottomSheet } from '@/components/BottomSheet'
import { Button } from '@/components/Button'
import { cropAndResize, uploadAvatar, saveAvatarPath, removeAvatar, getAvatarUrl } from '@/features/profile/avatarApi'

interface AvatarUploadSheetProps {
  userId: string
  hasExistingAvatar: boolean
  onClose: () => void
  onSaved: (newUrl: string) => void
  onRemoved: () => void
}

type Step = 'crop' | 'saving' | 'error'

export function AvatarUploadSheet({
  userId,
  hasExistingAvatar,
  onClose,
  onSaved,
  onRemoved,
}: AvatarUploadSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [step, setStep] = useState<Step>('crop')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setErrorMsg(null)
    })
    reader.readAsDataURL(file)
    // Clear the input so selecting the same file again triggers onChange
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setStep('saving')
    setErrorMsg(null)
    try {
      const blob = await cropAndResize(imageSrc, croppedAreaPixels)
      await uploadAvatar(userId, blob)
      await saveAvatarPath(userId, userId)
      const cacheBust = Date.now()
      onSaved(getAvatarUrl(userId, cacheBust))
    } catch {
      setStep('error')
      setErrorMsg('Upload failed. Please try again.')
    }
  }

  const handleRetry = () => {
    setStep('crop')
    setErrorMsg(null)
  }

  const handleRemove = async () => {
    if (removing) return
    setRemoving(true)
    try {
      await removeAvatar(userId)
      onRemoved()
    } catch {
      setErrorMsg('Could not remove photo. Please try again.')
      setRemoving(false)
    }
  }

  const saving = step === 'saving'
  const hasImage = Boolean(imageSrc)

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />

      <BottomSheet
        title={hasImage ? 'Adjust photo' : 'Profile photo'}
        onClose={() => !saving && !removing && onClose()}
        showCloseButton={!hasImage}
        scrollable={false}
        bodyClassName="mt-4 flex flex-col gap-4"
      >
        {hasImage ? (
          <>
            {/* Crop area — fixed height; touch-none so the sheet does not steal pans on iOS */}
            <div
              className="relative w-full rounded-xl overflow-hidden touch-none"
              style={{ height: 288 }}
            >
              <Cropper
                image={imageSrc!}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-text-secondary select-none">−</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[var(--color-accent)]"
                aria-label="Zoom"
                disabled={saving}
              />
              <span className="text-xs text-text-secondary select-none">+</span>
            </div>

            {errorMsg && (
              <p className="text-sm text-danger text-center">{errorMsg}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                disabled={saving || removing}
                onClick={() => setImageSrc(null)}
              >
                Choose different
              </Button>
              <Button
                fullWidth
                disabled={saving || removing}
                onClick={step === 'error' ? handleRetry : handleSave}
              >
                {saving ? 'Saving…' : step === 'error' ? 'Retry' : 'Save'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary text-center">
              Choose a photo from your device. It will be cropped to a circle and saved at 256 × 256 px.
            </p>

            {errorMsg && (
              <p className="text-sm text-danger text-center">{errorMsg}</p>
            )}

            <Button
              fullWidth
              onClick={() => fileInputRef.current?.click()}
            >
              Choose photo
            </Button>

            {hasExistingAvatar && (
              <Button
                variant="danger"
                fullWidth
                disabled={removing}
                onClick={handleRemove}
              >
                {removing ? 'Removing…' : 'Remove photo'}
              </Button>
            )}
          </>
        )}
      </BottomSheet>
    </>
  )
}
