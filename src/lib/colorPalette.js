// 사용자별 색상 팔레트. 닉네임 해시로 결정론적으로 배정해 같은 사람은 항상 같은 색을 쓰게 한다.
export const COLOR_PALETTE = [
  '#e63946', // red
  '#f4a261', // orange
  '#e9c46a', // yellow
  '#2a9d8f', // teal
  '#264653', // deep navy
  '#457b9d', // blue
  '#8338ec', // purple
  '#ff6b9d', // pink
  '#06a77d', // green
  '#c9184a', // crimson
  '#3a86ff', // sky blue
  '#fb5607', // burnt orange
  '#7209b7', // violet
  '#2b9348', // forest green
]

export function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function colorForNickname(nickname) {
  const idx = hashString(nickname.trim().toLowerCase()) % COLOR_PALETTE.length
  return COLOR_PALETTE[idx]
}
