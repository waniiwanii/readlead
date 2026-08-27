import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { seedMissingBooks } from '../lib/seedOnFirstRun'

export default function Library() {
  const { profile, logout } = useAuth()
  const [books, setBooks] = useState(null)

  useEffect(() => {
    async function load() {
      await seedMissingBooks()
      const { data } = await supabase.from('books').select('*').order('created_at', { ascending: true })
      setBooks(data ?? [])
    }
    load()
  }, [])

  return (
    <div className="library">
      <header className="library-header">
        <h1>같이 읽기</h1>
        <div className="reader-me">
          <span className="dot" style={{ background: profile.color }} />
          {profile.nickname}
          <button className="link-btn" onClick={logout}>
            나가기
          </button>
        </div>
      </header>

      <p className="library-desc">
        저작권이 만료된 작품을 여러 사람이 같은 페이지에서 함께 읽으며 밑줄을 긋고, 낙서를
        남기고, 이야기를 나누는 공간이에요.
      </p>

      {books === null && <p>불러오는 중...</p>}
      {books?.length === 0 && <p>아직 책이 없어요.</p>}

      <ul className="book-list">
        {books?.map((book) => (
          <li key={book.id}>
            <Link to={`/book/${book.id}`} className="book-card">
              <h2>{book.title}</h2>
              <p className="muted">{book.author}</p>
              {book.source && <p className="book-source">{book.source}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
