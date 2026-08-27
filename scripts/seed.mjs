// 관리자용 시딩 스크립트. service role key로 RLS를 우회해서
// books/book_pages에 SEED_BOOKS 목록을 직접 넣는다.
//
//   npm run seed
//
// (.env에 VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY 필요)
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE_KEY가 .env에 필요합니다.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

const SEED_BOOKS = [
  {
    meta: {
      title: '운수 좋은 날',
      author: '현진건',
      source: '한국저작권위원회 공유마당 (만료 저작물)',
      license_note: '저작권 만료 공유저작물입니다.',
    },
    contentFile: 'unsu-joheun-nal.txt',
  },
  {
    meta: {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      source: 'Project Gutenberg (public domain, first published 1813)',
      license_note:
        'Public domain worldwide. Text via Project Gutenberg (gutenberg.org/ebooks/1342).',
    },
    contentFile: 'pride-and-prejudice.txt',
  },
]

const MAX_CHARS_PER_PAGE = 900

function paginate(text) {
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

async function seedBook({ meta, contentFile }) {
  const { data: existing } = await supabase
    .from('books')
    .select('id')
    .ilike('title', meta.title)
    .maybeSingle()

  if (existing) {
    console.log(`이미 "${meta.title}" 책이 있습니다 (id=${existing.id}). 건너뜁니다.`)
    return
  }

  const contentPath = path.join(__dirname, '../supabase/seed/content', contentFile)
  const raw = readFileSync(contentPath, 'utf-8')

  const { data: book, error: bookError } = await supabase.from('books').insert(meta).select().single()
  if (bookError) throw bookError

  const pages = paginate(raw).map((content, i) => ({
    book_id: book.id,
    page_number: i + 1,
    content,
  }))

  const { error: pagesError } = await supabase.from('book_pages').insert(pages)
  if (pagesError) throw pagesError

  console.log(`시딩 완료: "${meta.title}" (${pages.length}페이지)`)
}

async function main() {
  for (const book of SEED_BOOKS) {
    await seedBook(book)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
