import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import NicknameGate from './components/NicknameGate'
import Library from './pages/Library'
import Reader from './pages/Reader'

// GitHub Pages는 정적 호스팅이라 새로고침/딥링크 시 서버 라우팅이 없다.
// HashRouter를 쓰면 실제 요청 경로가 항상 index.html 하나뿐이라 404 없이 동작한다.
export default function App() {
  return (
    <AuthProvider>
      <NicknameGate>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/book/:bookId" element={<Reader />} />
          </Routes>
        </HashRouter>
      </NicknameGate>
    </AuthProvider>
  )
}
