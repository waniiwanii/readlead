import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages는 https://<user>.github.io/readlead/ 하위 경로로 서빙되므로,
// 빌드할 때만 그 경로를 base로 잡아준다 (로컬 dev 서버는 영향 없음).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/readlead/' : '/',
  server: {
    port: 5173,
  },
}))
