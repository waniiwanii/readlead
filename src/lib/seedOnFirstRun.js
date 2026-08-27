import { supabase } from './supabaseClient'
import { SEED_BOOKS, paginateContent } from '../data/seedBook'

// 앱이 처음 실행될 때, 아직 없는 시드 책들을 자동으로 추가한다.
// 이미 있는 책(제목 기준, 대소문자 무시)은 건너뛰므로 나중에 SEED_BOOKS에
// 책을 추가해도 기존 책이 중복되지 않는다.
export async function seedMissingBooks() {
  const { data: existing, error } = await supabase.from('books').select('title')

  if (error) {
    console.warn('[seed] books 조회 실패', error)
    return
  }

  const existingTitles = new Set((existing ?? []).map((b) => b.title.toLowerCase()))

  for (const { meta, rawContent } of SEED_BOOKS) {
    if (existingTitles.has(meta.title.toLowerCase())) continue

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert(meta)
      .select()
      .single()

    if (bookError) {
      console.warn(`[seed] "${meta.title}" 시딩 실패`, bookError)
      continue
    }

    const pages = paginateContent(rawContent).map((content, i) => ({
      book_id: book.id,
      page_number: i + 1,
      content,
    }))

    const { error: pagesError } = await supabase.from('book_pages').insert(pages)
    if (pagesError) {
      console.warn(`[seed] "${meta.title}" 페이지 시딩 실패`, pagesError)
    }
  }
}
