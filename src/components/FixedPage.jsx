import { useMemo, useState } from 'react'
import DoodleCanvas from './DoodleCanvas'
import AnnotationPopover from './AnnotationPopover'

// "고정 레이아웃" 페이지 한 장.
// 실제 DOM 크기는 항상 width x height (px)로 고정하고, 바깥 wrapper에서
// CSS transform: scale(...)로만 화면에 맞춰 축소/확대한다.
// 그 덕분에 펜으로 그린 좌표는 리사이즈와 무관하게 항상 유효하다.
// 밑줄도 별도 텍스트 선택 방식이 아니라, 이 펜 레이어에 선을 긋는 것으로 처리한다
// (터치/펜 환경에서 텍스트 선택 UX가 불안정했던 문제를 근본적으로 피한다).
export default function FixedPage({
  page,
  annotations,
  profilesById,
  myUserId,
  mode, // 'read' | 'pen'
  tool, // 'pen' | 'eraser'
  penColor,
  penWidth,
  penOpacity,
  onAddStroke,
  onEraseStroke,
  onOpenThread,
}) {
  const [popover, setPopover] = useState(null) // { x, y, annotations }

  const strokes = useMemo(
    () =>
      annotations
        .filter((a) => a.type === 'doodle')
        .map((a) => ({
          annotationId: a.id,
          userId: a.user_id,
          color: a.color,
          width: a.data.width ?? 3,
          opacity: a.data.opacity ?? 1,
          points: a.data.points ?? [],
        })),
    [annotations]
  )

  function handleLayerClick(e) {
    if (mode !== 'read') return
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const scaleX = page.page_width / rect.width
    const scaleY = page.page_height / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY

    const hits = annotations.filter((a) => {
      const stroke = strokes.find((s) => s.annotationId === a.id)
      return stroke && stroke.points.some((p) => Math.hypot(p.x - px, p.y - py) <= 12)
    })
    if (hits.length === 0) return
    setPopover({ x: e.clientX, y: e.clientY, annotations: hits })
  }

  return (
    <div className="fixed-page" style={{ width: page.page_width, height: page.page_height }}>
      <div className="page-text">{page.content}</div>

      <div className="page-doodle-layer" onClick={handleLayerClick}>
        <DoodleCanvas
          width={page.page_width}
          height={page.page_height}
          strokes={strokes}
          tool={tool}
          color={penColor}
          penWidth={penWidth}
          penOpacity={penOpacity}
          enabled={mode === 'pen'}
          onStrokeComplete={(stroke) => onAddStroke(stroke)}
          onEraseStroke={onEraseStroke}
          myUserId={myUserId}
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
