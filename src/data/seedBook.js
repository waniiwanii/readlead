import rawContent from '../../supabase/seed/content/unsu-joheun-nal.txt?raw'

export const SEED_BOOK = {
  title: '운수 좋은 날',
  author: '현진건',
  source: '한국저작권위원회 공유마당 (만료 저작물)',
  license_note:
    '저작권 만료 공유저작물입니다. 이 앱에 들어있는 텍스트는 시연용 발췌본이니, ' +
    '전체 원문은 공유마당에서 내려받아 교체해주세요.',
}

export const PAGE_WIDTH = 880
export const PAGE_HEIGHT = 1200
const MAX_CHARS_PER_PAGE = 900

// 빈 줄로 구분된 문단들을 페이지당 MAX_CHARS_PER_PAGE자 내외로 묶어
// "고정 레이아웃 페이지" 배열로 만든다.
export function paginateContent(text = rawContent) {
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
