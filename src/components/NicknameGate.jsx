import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function NicknameGate({ children }) {
  const { profile, loading, login } = useAuth()
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // React state가 리렌더되기 전에 더블클릭/중복 submit이 끼어들면
  // 같은 닉네임으로 익명 계정이 두 번 생성되며 이메일 연결이 경합할 수 있다.
  // 그 경쟁 상태를 막기 위해 상태와 별개로 동기적으로 체크되는 ref를 둔다.
  const submittingRef = useRef(false)

  if (loading) {
    return <div className="gate-screen">불러오는 중...</div>
  }

  if (profile) return children

  async function handleSubmit(e) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setBusy(true)
    try {
      await login(nickname)
    } catch (err) {
      setError(err.message ?? '로그인에 실패했습니다.')
    } finally {
      submittingRef.current = false
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
          disabled={busy}
        />
        {error && <p className="gate-error">{error}</p>}
        <button type="submit" disabled={busy || !nickname.trim()}>
          {busy ? '입장하는 중...' : '입장하기'}
        </button>
      </form>
    </div>
  )
}
