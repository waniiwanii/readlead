// 밑줄/낙서를 클릭했을 때 작성자 닉네임 목록 + 댓글로 이동하는 작은 팝오버.
export default function AnnotationPopover({ x, y, annotations, profilesById, onOpenThread, onClose }) {
  if (!annotations.length) return null

  return (
    <div className="popover" style={{ left: x, top: y }} onMouseLeave={onClose}>
      <div className="popover-title">
        {annotations.length === 1 ? '작성자' : `작성자 ${annotations.length}명`}
      </div>
      <ul className="popover-list">
        {annotations.map((a) => {
          const profile = profilesById[a.user_id]
          return (
            <li key={a.id} onClick={() => onOpenThread(a)}>
              <span className="dot" style={{ background: a.color }} />
              <span className="nickname">{profile?.nickname ?? '알 수 없음'}</span>
              <span className="type">{a.type === 'doodle' ? '낙서' : '밑줄'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
