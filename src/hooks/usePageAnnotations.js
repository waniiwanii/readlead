import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// 특정 페이지의 annotations + comments를 불러오고,
// Supabase Realtime으로 다른 사용자의 변경 사항을 실시간 반영한다.
export function usePageAnnotations(pageId) {
  const [annotations, setAnnotations] = useState([])
  const [profilesById, setProfilesById] = useState({})
  const channelRef = useRef(null)

  const loadProfilesFor = useCallback(async (userIds) => {
    const missing = userIds.filter((id) => !profilesById[id])
    if (missing.length === 0) return
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, color')
      .in('id', missing)
    if (data) {
      setProfilesById((prev) => {
        const next = { ...prev }
        for (const p of data) next[p.id] = p
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pageId) return
    let active = true

    async function load() {
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: true })

      if (!active) return
      if (error) {
        console.warn('[annotations] load 실패', error)
        return
      }
      setAnnotations(data ?? [])
      await loadProfilesFor([...new Set((data ?? []).map((a) => a.user_id))])
    }
    load()

    const channel = supabase
      .channel(`page-annotations-${pageId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'annotations', filter: `page_id=eq.${pageId}` },
        async (payload) => {
          // 내가 방금 addAnnotation으로 낙관적 반영한 stroke도 realtime으로
          // 그대로 되돌아온다(자기 자신에게도 브로드캐스트됨). id로 걸러야
          // 같은 stroke가 배열에 두 번 들어가서 "작성자 여러 명"처럼 보이지 않는다.
          setAnnotations((prev) => (prev.some((a) => a.id === payload.new.id) ? prev : [...prev, payload.new]))
          await loadProfilesFor([payload.new.user_id])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'annotations', filter: `page_id=eq.${pageId}` },
        (payload) => {
          setAnnotations((prev) => prev.filter((a) => a.id !== payload.old.id))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [pageId, loadProfilesFor])

  const addAnnotation = useCallback(async (annotation) => {
    // 화면에 즉시 반영해야 펜을 뗀 순간과 선이 보이는 순간 사이에 서버
    // 왕복 시간만큼 아무것도 안 보이는 공백이 생기지 않는다. id를 미리
    // 만들어서 로컬 상태에 먼저 넣고, 같은 id로 insert하면 나중에 오는
    // realtime echo도 이미 있는 걸로 인식해 중복되지 않는다.
    const id = crypto.randomUUID()
    const optimistic = { ...annotation, id, created_at: new Date().toISOString() }
    setAnnotations((prev) => [...prev, optimistic])

    const { data, error } = await supabase
      .from('annotations')
      .insert(optimistic)
      .select()
      .single()

    if (error) {
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
      throw error
    }
    setAnnotations((prev) => prev.map((a) => (a.id === id ? data : a)))
    return data
  }, [])

  const removeAnnotation = useCallback(async (annotationId) => {
    const { error } = await supabase.from('annotations').delete().eq('id', annotationId)
    if (error) throw error
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
  }, [])

  return { annotations, profilesById, addAnnotation, removeAnnotation }
}
