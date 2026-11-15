import { supabase } from './supabase'

export const LISTING_IMAGE_BUCKET = 'listing-images'
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 업로드 전에 긴 변을 1600px 이하로 줄이고 JPEG로 압축한다. */
export async function compressListingImage(file: File): Promise<File> {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error('JPG, PNG, WebP 사진을 선택해 주세요. HEIC 사진은 JPG로 변환해 주세요.')
  }
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('사진을 읽지 못했어요. 다른 사진을 선택해 주세요.'))
      image.src = sourceUrl
    })
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('사진을 준비하지 못했어요. 브라우저를 다시 열어 주세요.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('사진 압축에 실패했어요.')), 'image/jpeg', 0.82)
    })
    if (blob.size > 5 * 1024 * 1024) throw new Error('사진이 너무 커요. 더 작은 사진을 선택해 주세요.')
    return new File([blob], `${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export function ownedImagePath(url: string, userId: string): string | null {
  const base = supabase.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl('').data.publicUrl
  if (!url.startsWith(base)) return null
  try {
    const path = decodeURIComponent(url.slice(base.length))
    return path.startsWith(`${userId}/`) && !path.split('/').includes('..') ? path : null
  } catch {
    return null
  }
}

/** DB에 반영된 뒤 필요 없어진 본인 사진만 정리한다. 정리 실패로 저장 성공을 취소하지 않는다. */
export async function removeListingImages(paths: string[]) {
  if (!paths.length) return
  try {
    const { error } = await supabase.storage.from(LISTING_IMAGE_BUCKET).remove([...new Set(paths)])
    if (error) console.warn('사용하지 않는 사진을 정리하지 못했습니다.', error.message)
  } catch {
    console.warn('사용하지 않는 사진을 정리하지 못했습니다.')
  }
}
