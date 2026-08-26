import { useState } from 'react'
import { useAnnotationComments } from '../hooks/useAnnotationComments'
import { useAuth } from '../context/AuthContext'

export default function CommentPanel({ annotation, profilesById, onClose, onDeleteAnnotation }) {
  const { profile } = useAuth()
  const { comments, profilesById: commentProfiles, addComment } = useAnnotationComments(annotation?.id)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!annotation) return null

  const author = profilesById[annotation.user_id]
  const isOwner = annotation.user_id === profile?.id

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await addComment(text.trim(), profile.id)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="comment-panel">
      <div className="comment-panel-header">
        <div>
          <span className="dot" style={{ background: annotation.color }} />
          <strong>{author?.nickname ?? '알 수 없음'}</strong>
          <span className="muted"> · {annotation.type === 'doodle' ? '낙서' : '밑줄'}</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      {annotation.type === 'underline' && (
        <blockquote className="comment-panel-quote">{annotation.data.text}</blockquote>
      )}

      {isOwner && (
        <button className="link-btn danger" onClick={() => onDeleteAnnotation(annotation.id)}>
          내 {annotation.type === 'doodle' ? '낙서' : '밑줄'} 삭제
        </button>
      )}

      <div className="comment-list">
        {comments.map((c) => {
          const p = commentProfiles[c.user_id]
          return (
            <div key={c.id} className="comment-item">
              <span className="dot" style={{ background: p?.color ?? '#999' }} />
              <div>
                <div className="comment-nickname">{p?.nickname ?? '...'}</div>
                <div className="comment-content">{c.content}</div>
              </div>
            </div>
          )
        })}
        {comments.length === 0 && <p className="muted">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>}
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이 부분에 대해 이야기해보세요"
          maxLength={500}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          등록
        </button>
      </form>
    </aside>
  )
}
