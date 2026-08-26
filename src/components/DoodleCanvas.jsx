import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

// 캔버스 자유 드로잉 레이어.
// 좌표는 항상 page_width x page_height 기준 고정 좌표계에 저장/재생한다.
// (부모의 scale wrapper 덕분에 화면 크기가 달라져도 이 좌표계는 그대로 유효하다.)
const DoodleCanvas = forwardRef(function DoodleCanvas(
  { width, height, strokes, drawColor, enabled, onStrokeComplete },
  ref
) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(null) // { points: [{x,y}] }

  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of strokes) {
      drawPath(ctx, stroke.points, stroke.color, stroke.width)
    }
    if (drawingRef.current) {
      drawPath(ctx, drawingRef.current.points, drawColor, 3)
    }
  }

  function drawPath(ctx, points, color, lineWidth) {
    if (!points || points.length === 0) return
    ctx.strokeStyle = color
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
  }

  useEffect(redraw, [strokes, width, height])

  useImperativeHandle(ref, () => ({ redraw }))

  function toLocalPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handlePointerDown(e) {
    if (!enabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = { points: [toLocalPoint(e)] }
    redraw()
  }

  function handlePointerMove(e) {
    if (!enabled || !drawingRef.current) return
    drawingRef.current.points.push(toLocalPoint(e))
    redraw()
  }

  function handlePointerUp() {
    if (!enabled || !drawingRef.current) return
    const finished = drawingRef.current
    drawingRef.current = null
    if (finished.points.length > 0) {
      onStrokeComplete?.({ points: finished.points, color: drawColor, width: 3 })
    }
    redraw()
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`doodle-canvas${enabled ? ' doodle-canvas--active' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  )
})

export default DoodleCanvas
