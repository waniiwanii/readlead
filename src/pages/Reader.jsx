import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { usePageAnnotations } from '../hooks/usePageAnnotations'
import { COLOR_PALETTE } from '../lib/colorPalette'
import ScaledPage from '../components/ScaledPage'
import FixedPage from '../components/FixedPage'
import CommentPanel from '../components/CommentPanel'

const PEN_SWATCHES_COUNT = 8

export default function Reader() {
  const { bookId } = useParams()
  const { profile } = useAuth()
  const [book, setBook] = useState(null)
  const [pages, setPages] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [mode, setMode] = useState('read') // 'read' | 'pen'
  const [tool, setTool] = useState('pen') // 'pen' | 'eraser'
  const [penColor, setPenColor] = useState(profile?.color)
  const [penWidth, setPenWidth] = useState(4)
  const [penOpacity, setPenOpacity] = useState(1)
  const [activeAnnotation, setActiveAnnotation] = useState(null)

  const swatches = [
    profile?.color,
    ...COLOR_PALETTE.filter((c) => c !== profile?.color),
  ].slice(0, PEN_SWATCHES_COUNT)

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

  async function handleAddStroke(stroke) {
    await addAnnotation({
      book_id: book.id,
      page_id: page.id,
      user_id: profile.id,
      type: 'doodle',
      color: stroke.color,
      data: { points: stroke.points, width: stroke.width, opacity: stroke.opacity },
    })
  }

  async function handleEraseStroke(annotationId) {
    await removeAnnotation(annotationId)
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
        <button className={mode === 'pen' ? 'active' : ''} onClick={() => setMode('pen')}>
          펜
        </button>

        {mode === 'pen' && (
          <div className="pen-options">
            <div className="pen-swatches">
              {swatches.map((c) => (
                <button
                  key={c}
                  className={`swatch${tool === 'pen' && penColor === c ? ' swatch--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => {
                    setTool('pen')
                    setPenColor(c)
                  }}
                  aria-label={`펜 색상 ${c}`}
                />
              ))}
            </div>

            <label className="pen-slider">
              굵기
              <input
                type="range"
                min={2}
                max={20}
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
              />
            </label>

            <label className="pen-slider">
              진하기
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={penOpacity}
                onChange={(e) => setPenOpacity(Number(e.target.value))}
              />
            </label>

            <button
              className={tool === 'eraser' ? 'active' : ''}
              onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
            >
              지우개
            </button>
          </div>
        )}
      </div>

      <div className="reader-body">
        <div className="reader-page-area">
          <ScaledPage width={page.page_width} height={page.page_height}>
            <FixedPage
              page={page}
              annotations={annotations}
              profilesById={profilesById}
              myUserId={profile.id}
              mode={mode}
              tool={tool}
              penColor={penColor}
              penWidth={penWidth}
              penOpacity={penOpacity}
              onAddStroke={handleAddStroke}
              onEraseStroke={handleEraseStroke}
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

      <div className="reader-pagebar">
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
    </div>
  )
}
