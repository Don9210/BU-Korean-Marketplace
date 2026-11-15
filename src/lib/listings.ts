import { CATEGORIES, PLACES, MAX_IMAGES, type Category, type Place } from './constants'
import { LISTING_IMAGE_BUCKET, ownedImagePath, removeListingImages } from './listing-images'
import { supabase } from './supabase'
import type { Listing } from './types'

export interface ListingDraft {
  title: string
  price: string
  category: Category | ''
  place: Place | ''
  description: string
}

export interface ListingPhoto {
  id: string
  previewUrl: string
  file?: File
  existingUrl?: string
}

export function validateListing(draft: ListingDraft, photoCount: number): string | null {
  if (photoCount < 1 || photoCount > MAX_IMAGES) return '사진을 1~3장 추가해 주세요.'
  const titleLength = Array.from(draft.title.trim()).length
  if (titleLength < 1 || titleLength > 60) return '제목을 1~60자로 입력해 주세요.'
  if (!/^\d+$/.test(draft.price.trim()) || Number(draft.price) > 2147483647) {
    return '가격은 0 이상의 달러 정수로 입력해 주세요. (최대 $2,147,483,647)'
  }
  if (!(CATEGORIES as readonly string[]).includes(draft.category)) return '카테고리를 선택해 주세요.'
  if (!(PLACES as readonly string[]).includes(draft.place)) return '거래 장소를 선택해 주세요.'
  if (Array.from(draft.description).length > 2000) return '설명은 2,000자 이하로 입력해 주세요.'
  return null
}

export async function loadOwnedListing(id: string, userId: string): Promise<Listing | null> {
  const { data, error } = await supabase.from('listings').select('*')
    .eq('id', id).eq('seller_id', userId).maybeSingle()
  if (error) throw error
  return data as Listing | null
}

export async function saveListing({ id, userId, original, draft, photos }: {
  id: string
  userId: string
  original: Listing | null
  draft: ListingDraft
  photos: ListingPhoto[]
}): Promise<Listing> {
  const validationError = validateListing(draft, photos.length)
  if (validationError) throw new Error(validationError)
  if (original && original.seller_id !== userId) throw new Error('내 글만 수정할 수 있어요.')
  const uploadedPaths: string[] = []
  const imageUrls: string[] = []

  try {
    for (const photo of photos) {
      if (photo.existingUrl) {
        if (!original?.image_urls.includes(photo.existingUrl)) throw new Error('사진 정보를 다시 확인해 주세요.')
        imageUrls.push(photo.existingUrl)
      } else if (photo.file) {
        const path = `${userId}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from(LISTING_IMAGE_BUCKET)
          .upload(path, photo.file, { contentType: 'image/jpeg', upsert: false })
        if (error) throw error
        uploadedPaths.push(path)
        imageUrls.push(supabase.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl)
      } else {
        throw new Error('사진을 다시 선택해 주세요.')
      }
    }
  } catch {
    // 아직 DB 요청 전이므로 이번에 올린 사진을 안전하게 정리할 수 있다.
    await removeListingImages(uploadedPaths)
    throw new Error('사진을 올리지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')
  }

  const values = {
    title: draft.title.trim(), price: Number(draft.price), category: draft.category,
    place: draft.place, description: draft.description.trim(), image_urls: imageUrls,
  }
  const query = original
    ? supabase.from('listings').update(values).eq('id', id).eq('seller_id', userId)
    : supabase.from('listings').insert({ ...values, id, seller_id: userId })
  const { data, error } = await query.select('*').single()
  let saved = data as Listing | null

  if (error) {
    // 응답을 잃었어도 저장됐을 수 있다. 확인 없이 사진을 지우지 않는다.
    let persisted: Listing | null = null
    try { persisted = await loadOwnedListing(id, userId) } catch { /* 결과 불명: 사진 보존 */ }
    if (persisted && persisted.title === values.title && persisted.price === values.price &&
      persisted.category === values.category && persisted.place === values.place &&
      persisted.description === values.description && JSON.stringify(persisted.image_urls) === JSON.stringify(imageUrls)) {
      saved = persisted
    } else {
      // 명확한 DB 거부일 때만 이번 사진을 정리한다. 네트워크 오류는 저장 여부가 불명확하다.
      if (/^[0-9A-Z]{5}$/.test(error.code) && error.code !== '23505') {
        await removeListingImages(uploadedPaths)
      }
      throw new Error('글을 저장하지 못했어요. 내 활동에서 저장 여부를 확인한 뒤 다시 시도해 주세요.')
    }
  }
  if (!saved) throw new Error('저장 결과를 확인하지 못했어요. 내 활동을 확인해 주세요.')

  const removed = (original?.image_urls ?? []).filter((url) => !imageUrls.includes(url))
    .map((url) => ownedImagePath(url, userId)).filter((path): path is string => Boolean(path))
  await removeListingImages(removed)
  return saved
}

export async function deleteListing(listing: Listing, userId: string) {
  if (listing.seller_id !== userId) throw new Error('내 글만 삭제할 수 있어요.')
  if (listing.buyer_confirmed_at) throw new Error('구매자가 확인한 거래는 삭제할 수 없어요.')
  const { data, error } = await supabase.from('listings').delete()
    .eq('id', listing.id).eq('seller_id', userId).is('buyer_confirmed_at', null).select('id')
  if (error || !data?.length) throw new Error('글을 삭제하지 못했어요. 새로고침 후 다시 확인해 주세요.')
  await removeListingImages(listing.image_urls.map((url) => ownedImagePath(url, userId))
    .filter((path): path is string => Boolean(path)))
}
