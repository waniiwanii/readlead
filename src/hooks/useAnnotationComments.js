import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAnnotationComments(annotationId) {
  const [comments, setComments] = useState([])
  const [profilesById, setProfilesById] = useState({})

  useEffect(() => {
    if (!annotationId) {
      setComments([])
      return
    }
    let active = true

    async function load() {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('annotation_id', annotationId)
        .order('created_at', { ascending: true })

      if (!active || error) return
      setComments(data ?? [])

      const ids = [...new Set((data ?? []).map((c) => c.user_id))]
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, nickname, color').in('id', ids)
        if (active && profs) {
          setProfilesById(Object.fromEntries(profs.map((p) => [p.id, p])))
        }
      }
    }
    load()

    const channel = supabase
      .channel(`annotation-comments-${annotationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `annotation_id=eq.${annotationId}`,
        },
        async (payload) => {
          setComments((prev) => (prev.some((c) => c.id === payload.new.id) ? prev : [...prev, payload.new]))
          const uid = payload.new.user_id
          setProfilesById((prev) => {
            if (prev[uid]) return prev
            supabase
              .from('profiles')
              .select('id, nickname, color')
              .eq('id', uid)
              .maybeSingle()
              .then(({ data }) => {
                if (data) setProfilesById((p) => ({ ...p, [uid]: data }))
              })
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [annotationId])

  const addComment = useCallback(
    async (content, userId) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({ annotation_id: annotationId, user_id: userId, content })
        .select()
        .single()
      if (error) throw error
      setComments((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]))
      return data
    },
    [annotationId]
  )

  return { comments, profilesById, addComment }
}
