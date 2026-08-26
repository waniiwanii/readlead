import { useMemo, useRef, useState } from 'react'
import DoodleCanvas from './DoodleCanvas'
import AnnotationPopover from './AnnotationPopover'
import { buildUnderlineSegments, selectionToOffsets } from '../lib/textSegments'

// "고정 레이아웃" 페이지 한 장.
// 실제 DOM 크기는 항상 width x height (px)로 고정하고, 바깥 wrapper에서
// CSS transform: scale(...)로만 화면에 맞춰 축소/확대한다.
// 그 덕분에 밑줄 오프셋과 낙서 좌표는 리사이즈와 무관하게 항상 유효하다.
export default function FixedPage({
  page,
  annotations,
  profilesById,
  myColor,
  myUserId,
  mode, // 'read' | 'underline' | 'doodle'
  onAddUnderline,
  onAddDoodle,
  onOpenThread,
}) {
  const textRef = useRef(null)
  const [popover, setPopover] = useState(null) // { x, y, annotations }

  const underlineAnnotations = useMemo(
    () => annotations.filter((a) => a.type === 'underline'),
    [annotations]
  )
  const doodleStrokes = useMemo(
    () =>
      annotations
        .filter((a) => a.type === 'doodle')
        .flatMap((a) => a.data.paths.map((p) => ({ ...p, annotationId: a.id, color: a.color }))),
    [annotations]
  )

  const segments = useMemo(
    () => buildUnderlineSegments(page.content, underlineAnnotations),
    [page.content, underlineAnnotations]
  )

  function handleMouseUp(e) {
    if (mode !== 'underline') return
    const offsets = selectionToOffsets(textRef.current)
    if (!offsets) return
    window.getSelection()?.removeAllRanges()
    onAddUnderline(offsets)
  }

  function handleSegmentClick(e, segment) {
    if (mode !== 'read' || segment.annotations.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({
      x: rect.left + rect.width / 2,
      y: rect.top,
      annotations: segment.annotations,
    })
  }

  function handleDoodleClick(e) {
    if (mode !== 'read') return
    // 클릭 지점 근처의 낙서 stroke를 찾아 팝오버 표시 (러프한 히트 테스트)
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const scaleX = page.page_width / rect.width
    const scaleY = page.page_height / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY

    const hits = annotations.filter(
      (a) => a.type === 'doodle' && a.data.paths.some((p) => pathNear(p.points, px, py, 12))
    )
    if (hits.length === 0) return
    setPopover({ x: e.clientX, y: e.clientY, annotations: hits })
  }

  return (
    <div className="fixed-page" style={{ width: page.page_width, height: page.page_height }}>
      <div
        ref={textRef}
        className="page-text"
        onMouseUp={handleMouseUp}
        style={{ userSelect: mode === 'underline' ? 'text' : 'none' }}
      >
        {segments.map((seg, i) => (
          <UnderlineSpan key={i} segment={seg} onClick={(e) => handleSegmentClick(e, seg)} />
        ))}
      </div>

      <div className="page-doodle-layer" onClick={handleDoodleClick}>
        <DoodleCanvas
          width={page.page_width}
          height={page.page_height}
          strokes={doodleStrokes}
          drawColor={myColor}
          enabled={mode === 'doodle'}
          onStrokeComplete={(stroke) => onAddDoodle({ paths: [stroke] })}
        />
      </div>

      {popover && (
        <AnnotationPopover
          x={popover.x}
          y={popover.y}
          annotations={popover.annotations}
          profilesById={profilesById}
          onOpenThread={(a) => {
            setPopover(null)
            onOpenThread(a)
          }}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}

function UnderlineSpan({ segment, onClick }) {
  if (segment.annotations.length === 0) {
    return <span>{segment.text}</span>
  }
  const colors = segment.annotations.map((a) => a.color)
  const shadow = colors.map((c, i) => `0 ${2 + i * 3}px 0 0 ${c}`).join(', ')

  return (
    <span
      className="underline-span"
      style={{ boxShadow: shadow, paddingBottom: colors.length * 3 }}
      onClick={onClick}
    >
      {segment.text}
    </span>
  )
}

function pathNear(points, px, py, threshold) {
  return points.some((pt) => Math.hypot(pt.x - px, pt.y - py) <= threshold)
}
