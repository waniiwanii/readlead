import { supabase } from './supabaseClient'
import { colorForNickname } from './colorPalette'

// 닉네임 기반의 "익명" 로그인.
//
// 실제 개인정보(이메일/전화번호 등)는 전혀 받지 않는다는 의미에서 익명이지만,
// 같은 닉네임으로 다시 들어오면 항상 같은 계정으로 연결되어야 하므로
// 다음과 같은 흐름을 쓴다:
//
//   1) 닉네임으로부터 결정론적인 합성 이메일/비밀번호를 만든다 (실제로 발송되지 않음).
//   2) 그 자격으로 로그인을 시도한다. 성공하면 이미 존재하는 계정 -> 그대로 사용.
//   3) 실패하면, Supabase의 실제 익명 로그인(signInAnonymously)으로 새 계정을 만들고
//      바로 그 합성 이메일/비밀번호를 연결(linking)해서 "닉네임 계정"으로 승격시킨다.
//
// 이렇게 하면 첫 진입은 진짜 익명 계정에서 시작하고, 이후로는 닉네임만으로
// 동일 계정에 재접속할 수 있다. (Supabase 프로젝트 설정에서 Auth > Providers > Email의
// "Confirm email"은 꺼져 있어야 가입 즉시 로그인이 가능하다. supabase/README.md 참고)

const EMAIL_DOMAIN = 'anon.readlead.app'
const PEPPER = 'readlead-nickname-pepper-v1'

function slugifyNickname(nickname) {
  // 사람이 읽는 표시용 닉네임은 profiles.nickname에 원문 그대로 저장하고,
  // 이메일 로컬파트는 안전한 문자만 남기고 나머지는 코드값으로 치환한다.
  const bytes = new TextEncoder().encode(nickname.trim().toLowerCase())
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function deriveCredentials(nickname) {
  const normalized = nickname.trim().toLowerCase()
  const localPart = slugifyNickname(normalized).slice(0, 40)
  const email = `n-${localPart}@${EMAIL_DOMAIN}`
  const password = (await sha256Hex(`${normalized}:${PEPPER}`)).slice(0, 32)
  return { email, password }
}

export class NicknameTakenError extends Error {}

export async function signInWithNickname(rawNickname) {
  const nickname = rawNickname.trim()
  if (!nickname) throw new Error('닉네임을 입력해주세요.')
  if (nickname.length > 20) throw new Error('닉네임은 20자 이내로 입력해주세요.')

  const { email, password } = await deriveCredentials(nickname)

  // 1) 이미 있는 닉네임 계정이면 그냥 로그인
  const signInResult = await supabase.auth.signInWithPassword({ email, password })
  if (!signInResult.error) {
    await ensureProfile(signInResult.data.user.id, nickname)
    return signInResult.data.session
  }

  // 2) 처음 쓰는 닉네임 -> 진짜 익명 계정 생성 후 해당 자격으로 승격(link)
  const anonResult = await supabase.auth.signInAnonymously()
  if (anonResult.error) throw anonResult.error

  const updateResult = await supabase.auth.updateUser({ email, password })
  if (updateResult.error) {
    // 동시에 같은 닉네임을 다른 사람이 먼저 선점한 경우
    await supabase.auth.signOut()
    throw new NicknameTakenError('이미 사용 중인 닉네임입니다. 다른 닉네임을 사용해주세요.')
  }

  await ensureProfile(anonResult.data.user.id, nickname)
  const { data: sessionData } = await supabase.auth.getSession()
  return sessionData.session
}

async function ensureProfile(userId, nickname) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, nickname, color')
    .eq('id', userId)
    .maybeSingle()

  if (existing) return existing

  const color = colorForNickname(nickname)
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, nickname, color })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getCurrentProfile() {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, color')
    .eq('id', user.id)
    .maybeSingle()

  return data
}

export async function signOutNickname() {
  await supabase.auth.signOut()
}
