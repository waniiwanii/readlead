import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function NicknameGate({ children }) {
  const { profile, loading, login } = useAuth()
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) {
    return <div className="gate-screen">불러오는 중...</div>
  }

  if (profile) return children

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(nickname)
    } catch (err) {
      setError(err.message ?? '로그인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate-screen">
      <form className="gate-card" onSubmit={handleSubmit}>
        <h1>같이 읽기</h1>
        <p className="gate-desc">
          닉네임만으로 들어갈 수 있어요. 실명이나 이메일은 받지 않지만, 같은 닉네임으로
          다시 들어오면 이전 낙서와 밑줄은 그대로 이어집니다.
        </p>
        <input
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임 (예: 산책하는곰)"
          maxLength={20}
        />
        {error && <p className="gate-error">{error}</p>}
        <button type="submit" disabled={busy || !nickname.trim()}>
          {busy ? '입장하는 중...' : '입장하기'}
        </button>
      </form>
    </div>
  )
}
