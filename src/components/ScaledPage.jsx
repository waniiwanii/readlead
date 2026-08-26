import { useEffect, useRef, useState } from 'react'

// 자식(FixedPage)은 항상 width x height 고정 픽셀로 렌더링되고,
// 이 wrapper가 뷰포트 너비에 맞춰 transform: scale()만 적용한다.
// 그래서 창 크기가 바뀌어도 자식 내부의 절대 좌표(밑줄 오프셋, 낙서 좌표)는
// 절대 어긋나지 않는다 - 오직 화면에 보이는 크기만 달라질 뿐이다.
export default function ScaledPage({ width, height, children }) {
  const outerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const availableWidth = entries[0].contentRect.width
      setScale(Math.min(1, availableWidth / width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={outerRef} className="scaled-page-outer" style={{ height: height * scale }}>
      <div
        className="scaled-page-inner"
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  )
}
