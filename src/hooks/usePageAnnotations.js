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
          setAnnotations((prev) => [...prev, payload.new])
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
    const { data, error } = await supabase
      .from('annotations')
      .insert(annotation)
      .select()
      .single()
    if (error) throw error
    // 낙관적 반영(같은 채널의 realtime echo는 중복 방지를 위해 id로 걸러짐)
    setAnnotations((prev) => (prev.some((a) => a.id === data.id) ? prev : [...prev, data]))
    return data
  }, [])

  const removeAnnotation = useCallback(async (annotationId) => {
    const { error } = await supabase.from('annotations').delete().eq('id', annotationId)
    if (error) throw error
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
  }, [])

  return { annotations, profilesById, addAnnotation, removeAnnotation }
}
