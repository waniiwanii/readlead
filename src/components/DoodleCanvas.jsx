import { useEffect, useRef } from 'react'

// 두 개의 캔버스를 겹쳐서 쓴다.
//  - committed: 이미 저장된 stroke들. strokes prop이 바뀔 때만(내 stroke 추가/삭제,
//    다른 사람 stroke 실시간 수신) 다시 그린다.
//  - live: 지금 그리고 있는 stroke 하나만. pointermove마다 다시 그리지만
//    이 캔버스에는 그 한 개의 선만 있으므로 비용이 문서 전체 stroke 수와 무관하다.
// 예전에는 캔버스 하나에 모든 stroke + 진행중인 선을 매 move마다 다시 그려서,
// stroke가 쌓일수록 펜 반응이 느려지고 프레임이 밀렸다. 좌표계는 항상
// page_width x page_height 기준 고정 좌표계라 리사이즈와 무관하게 유효하다.
export default function DoodleCanvas({
  width,
  height,
  strokes,
  tool, // 'pen' | 'eraser'
  color,
  penWidth,
  penOpacity,
  enabled,
  onStrokeComplete,
  onEraseStroke,
  myUserId,
}) {
  const committedRef = useRef(null)
  const liveRef = useRef(null)
  const drawingRef = useRef(null) // { points: [{x,y}] }
  const erasedThisDragRef = useRef(new Set())
  const activeRectRef = useRef(null)

  function drawPath(ctx, points, strokeColor, lineWidth, opacity = 1) {
    if (!points || points.length === 0) return
    ctx.globalAlpha = opacity
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    if (points.length === 1) {
      ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawAllOn(canvas, list) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of list) drawPath(ctx, s.points, s.color, s.width, s.opacity)
  }

  useEffect(() => {
    drawAllOn(committedRef.current, strokes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, width, height])

  function redrawLive() {
    const canvas = liveRef.current
    if (!canvas) return
    if (drawingRef.current) {
      drawAllOn(canvas, [
        { points: drawingRef.current.points, color, width: penWidth, opacity: penOpacity },
      ])
    } else {
      canvas.getContext('2d').clearRect(0, 0, width, height)
    }
  }

  function toLocalPoint(clientX, clientY) {
    // getBoundingClientRect()는 레이아웃을 강제로 다시 계산시킬 수 있는 무거운 호출이다.
    // 펜슬의 coalesced event까지 처리하면 한 번의 move에도 이 변환이 여러 번 필요한데,
    // 매번 다시 재면 그만큼 그리는 게 화면에 늦게 반영된다(입력 지연). 드래그 시작 시
    // 한 번만 재서 그 스트로크가 끝날 때까지 재사용한다.
    const rect = activeRectRef.current ?? liveRef.current.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  function eraseNear(pt) {
    const threshold = 14
    for (const s of strokes) {
      if (s.userId !== myUserId) continue
      if (erasedThisDragRef.current.has(s.annotationId)) continue
      if (s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= threshold)) {
        erasedThisDragRef.current.add(s.annotationId)
        onEraseStroke?.(s.annotationId)
      }
    }
  }

  function handlePointerDown(e) {
    if (!enabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activeRectRef.current = liveRef.current.getBoundingClientRect()
    const pt = toLocalPoint(e.clientX, e.clientY)
    if (tool === 'eraser') {
      erasedThisDragRef.current = new Set()
      eraseNear(pt)
      return
    }
    drawingRef.current = { points: [pt] }
    redrawLive()
  }

  function handlePointerMove(e) {
    if (!enabled) return
    // 스타일러스는 브라우저가 한 번에 몰아서 전달하는 pointermove 사이에
    // 더 촘촘한 표본(coalesced events)을 갖고 있다. 이걸 다 반영해야
    // 빠르게 움직일 때 선이 듬성듬성 끊겨 보이지 않는다.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]

    if (tool === 'eraser') {
      for (const ev of events) eraseNear(toLocalPoint(ev.clientX, ev.clientY))
      return
    }
    if (!drawingRef.current) return
    for (const ev of events) {
      drawingRef.current.points.push(toLocalPoint(ev.clientX, ev.clientY))
    }
    redrawLive()
  }

  function handlePointerUp() {
    if (!enabled) return
    activeRectRef.current = null
    if (tool === 'eraser') return
    const finished = drawingRef.current
    drawingRef.current = null
    redrawLive()
    if (finished && finished.points.length > 0) {
      onStrokeComplete?.({ points: finished.points, color, width: penWidth, opacity: penOpacity })
    }
  }

  return (
    <div className={`doodle-canvas-stack${enabled ? ' doodle-canvas-stack--active' : ''}`}>
      <canvas ref={committedRef} width={width} height={height} className="doodle-canvas" />
      <canvas
        ref={liveRef}
        width={width}
        height={height}
        className={`doodle-canvas doodle-canvas--live${tool === 'eraser' ? ' doodle-canvas--eraser' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}
