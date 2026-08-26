// content 문자열과 underline annotation 목록으로부터,
// 겹치는 구간까지 고려한 렌더링용 세그먼트 배열을 만든다.
// 반환: [{ start, end, text, annotations: [annotation, ...] }]
export function buildUnderlineSegments(content, underlineAnnotations) {
  if (!underlineAnnotations.length) {
    return [{ start: 0, end: content.length, text: content, annotations: [] }]
  }

  const breakpoints = new Set([0, content.length])
  for (const a of underlineAnnotations) {
    breakpoints.add(clamp(a.data.start))
    breakpoints.add(clamp(a.data.end))
  }
  const sorted = [...breakpoints].sort((x, y) => x - y)

  const segments = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (start === end) continue
    const covering = underlineAnnotations.filter((a) => a.data.start <= start && a.data.end >= end)
    segments.push({ start, end, text: content.slice(start, end), annotations: covering })
  }
  return segments

  function clamp(n) {
    return Math.max(0, Math.min(content.length, n))
  }
}

// 현재 페이지 텍스트 컨테이너 안에서의 selection을,
// content 문자열 기준 {start, end} 문자 오프셋으로 변환한다.
export function selectionToOffsets(container) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null

  const preRange = range.cloneRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length
  const end = start + range.toString().length

  if (end <= start) return null
  return { start, end, text: range.toString() }
}
