import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import NicknameGate from './components/NicknameGate'
import Library from './pages/Library'
import Reader from './pages/Reader'

export default function App() {
  return (
    <AuthProvider>
      <NicknameGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/book/:bookId" element={<Reader />} />
          </Routes>
        </BrowserRouter>
      </NicknameGate>
    </AuthProvider>
  )
}
