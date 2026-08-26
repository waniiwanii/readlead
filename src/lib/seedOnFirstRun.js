import { supabase } from './supabaseClient'
import { SEED_BOOK, paginateContent } from '../data/seedBook'

// 앱이 처음 실행될 때(=books 테이블이 비어있을 때) 예시 책을 자동으로 시딩한다.
// 여러 탭이 동시에 처음 열려도 book title unique 제약이 없으므로,
// 아주 드물게 중복 삽입될 수 있는데 이는 Reader에서 가장 최근 책만 쓰면 되므로 무해하다.
export async function seedOnFirstRunIfEmpty() {
  const { count, error } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.warn('[seed] books count 조회 실패', error)
    return
  }
  if (count && count > 0) return

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert(SEED_BOOK)
    .select()
    .single()

  if (bookError) {
    console.warn('[seed] 책 시딩 실패', bookError)
    return
  }

  const pages = paginateContent().map((content, i) => ({
    book_id: book.id,
    page_number: i + 1,
    content,
  }))

  const { error: pagesError } = await supabase.from('book_pages').insert(pages)
  if (pagesError) {
    console.warn('[seed] 페이지 시딩 실패', pagesError)
  }
}
