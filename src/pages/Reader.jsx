import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { usePageAnnotations } from '../hooks/usePageAnnotations'
import ScaledPage from '../components/ScaledPage'
import FixedPage from '../components/FixedPage'
import CommentPanel from '../components/CommentPanel'

export default function Reader() {
  const { bookId } = useParams()
  const { profile } = useAuth()
  const [book, setBook] = useState(null)
  const [pages, setPages] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [mode, setMode] = useState('read')
  const [activeAnnotation, setActiveAnnotation] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: bookData } = await supabase.from('books').select('*').eq('id', bookId).single()
      setBook(bookData)
      const { data: pageData } = await supabase
        .from('book_pages')
        .select('*')
        .eq('book_id', bookId)
        .order('page_number', { ascending: true })
      setPages(pageData ?? [])
    }
    load()
  }, [bookId])

  const page = pages[pageIndex]
  const { annotations, profilesById, addAnnotation, removeAnnotation } = usePageAnnotations(page?.id)

  if (!book || !page) {
    return <div className="reader-loading">불러오는 중...</div>
  }

  async function handleAddUnderline(offsets) {
    await addAnnotation({
      book_id: book.id,
      page_id: page.id,
      user_id: profile.id,
      type: 'underline',
      color: profile.color,
      data: offsets,
    })
  }

  async function handleAddDoodle(data) {
    await addAnnotation({
      book_id: book.id,
      page_id: page.id,
      user_id: profile.id,
      type: 'doodle',
      color: profile.color,
      data,
    })
  }

  async function handleDeleteAnnotation(id) {
    await removeAnnotation(id)
    setActiveAnnotation(null)
  }

  return (
    <div className="reader">
      <header className="reader-header">
        <Link to="/" className="link-btn">
          ← 서재
        </Link>
        <div className="reader-title">
          <h1>{book.title}</h1>
          <span className="muted">{book.author}</span>
        </div>
        <div className="reader-me">
          <span className="dot" style={{ background: profile.color }} />
          {profile.nickname}
        </div>
      </header>

      <div className="reader-toolbar">
        <button className={mode === 'read' ? 'active' : ''} onClick={() => setMode('read')}>
          읽기
        </button>
        <button className={mode === 'underline' ? 'active' : ''} onClick={() => setMode('underline')}>
          밑줄 긋기
        </button>
        <button className={mode === 'doodle' ? 'active' : ''} onClick={() => setMode('doodle')}>
          낙서하기
        </button>

        <div className="reader-toolbar-spacer" />

        <button disabled={pageIndex === 0} onClick={() => setPageIndex((i) => i - 1)}>
          이전 페이지
        </button>
        <span className="muted">
          {pageIndex + 1} / {pages.length}
        </span>
        <button disabled={pageIndex === pages.length - 1} onClick={() => setPageIndex((i) => i + 1)}>
          다음 페이지
        </button>
      </div>

      <div className="reader-body">
        <div className="reader-page-area">
          <ScaledPage width={page.page_width} height={page.page_height}>
            <FixedPage
              page={page}
              annotations={annotations}
              profilesById={profilesById}
              myColor={profile.color}
              myUserId={profile.id}
              mode={mode}
              onAddUnderline={handleAddUnderline}
              onAddDoodle={handleAddDoodle}
              onOpenThread={setActiveAnnotation}
            />
          </ScaledPage>
        </div>

        {activeAnnotation && (
          <CommentPanel
            annotation={activeAnnotation}
            profilesById={profilesById}
            onClose={() => setActiveAnnotation(null)}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        )}
      </div>
    </div>
  )
}
