import unsuRaw from '../../supabase/seed/content/unsu-joheun-nal.txt?raw'
import prideRaw from '../../supabase/seed/content/pride-and-prejudice.txt?raw'

export const PAGE_WIDTH = 880
export const PAGE_HEIGHT = 1200
const MAX_CHARS_PER_PAGE = 900

// 첫 실행 시 자동으로 시딩되는 책 목록. 책을 더 추가하려면
// supabase/seed/content/*.txt 파일을 만들고 여기에 항목을 추가하면 된다.
export const SEED_BOOKS = [
  {
    meta: {
      title: '운수 좋은 날',
      author: '현진건',
      source: '한국저작권위원회 공유마당 (만료 저작물)',
      license_note: '저작권 만료 공유저작물입니다.',
    },
    rawContent: unsuRaw,
  },
  {
    meta: {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      source: 'Project Gutenberg (public domain, first published 1813)',
      license_note:
        'Public domain worldwide. Text via Project Gutenberg (gutenberg.org/ebooks/1342).',
    },
    rawContent: prideRaw,
  },
]

// 빈 줄로 구분된 문단들을 페이지당 MAX_CHARS_PER_PAGE자 내외로 묶어
// "고정 레이아웃 페이지" 배열로 만든다.
export function paginateContent(text) {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const pages = []
  let current = []
  let currentLen = 0

  for (const para of paragraphs) {
    if (currentLen > 0 && currentLen + para.length > MAX_CHARS_PER_PAGE) {
      pages.push(current.join('\n\n'))
      current = []
      currentLen = 0
    }
    current.push(para)
    currentLen += para.length
  }
  if (current.length) pages.push(current.join('\n\n'))

  return pages.length ? pages : ['']
}
