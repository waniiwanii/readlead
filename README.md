# readlead — 같이 읽기

저작권이 만료된 작품(공유마당 등)을 여러 사람이 같은 페이지에서 함께 읽으며,
문단에 밑줄을 긋고 자유롭게 낙서하고 토론하는 웹앱입니다.

- **React + Vite** 프론트엔드, **Supabase**(Postgres + Auth + Realtime) 백엔드
- 페이지는 고정 픽셀 크기로 렌더링되고 화면 크기에는 CSS `transform: scale()`만
  적용되므로, 창 크기를 바꿔도 밑줄/낙서 좌표가 절대 어긋나지 않습니다.
- 밑줄은 텍스트 선택(문자 오프셋 저장) 방식, 낙서는 canvas 위 자유 드로잉(벡터 좌표 저장) 방식입니다.
- 계정은 닉네임만으로 만들어지며, 같은 닉네임은 항상 같은 계정으로 연결됩니다
  (자세한 방식은 `src/lib/nicknameAuth.js` 주석 참고).

## 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 내용을 실행 (테이블 + RLS + Realtime publication)
3. **Authentication → Providers → Email**에서 **"Confirm email" 옵션을 끄세요.**
   닉네임 가입 시 익명 계정에 이메일/비밀번호를 즉시 연결(link)하는데, 이메일 확인이
   켜져 있으면 확인 전까지 로그인이 막힙니다.
4. **Authentication → Sign In / Providers**에서 **Anonymous sign-ins**를 켜세요.

## 2. 환경 변수

```
cp .env.example .env
```

`.env`를 열어 Supabase 프로젝트의 URL / anon key / (선택) service role key를 채웁니다.
(Project Settings → API)

## 3. 설치 & 실행

```
npm install
npm run dev
```

브라우저에서 앱을 열고 닉네임을 입력하면, 서재 화면에서 책 목록을 불러오는 시점에
`books` 테이블이 비어 있으면 예시 작품이 자동으로 시딩됩니다 (클라이언트 측 첫 실행 시딩).

관리자가 직접, service role key로 한 번에 시딩하고 싶다면:

```
npm run seed
```

## 시딩되는 예시 작품에 대한 안내

기본으로 들어있는 「운수 좋은 날」(현진건, 1924, 공유마당 만료 저작물) 텍스트는
공유마당 공식 원문 전문입니다. 자세한 내용은 `supabase/seed/content/README.md`를
참고하세요.

## 4. GitHub Pages 배포

`.github/workflows/deploy.yml`이 main 브랜치에 push될 때마다(또는 Actions 탭에서
수동으로) `dist/`를 빌드해 GitHub Pages로 배포합니다. 처음 한 번만 아래 두 가지를
설정해주세요.

1. **저장소 Secrets** — Settings → Secrets and variables → Actions →
   New repository secret으로 다음 두 개를 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (`.env`에 쓴 값과 동일합니다. 빌드 시 워크플로우가 이 값을 환경변수로 주입합니다.)

2. **Pages 소스 설정** — Settings → Pages → Build and deployment → Source를
   **GitHub Actions**로 선택 (처음 한 번만 필요).

이후 main에 push하면 자동 배포되고, 배포 주소는 다음 형태입니다:

```
https://<계정 또는 organization>.github.io/readlead/
```

앱은 GitHub Pages 하위 경로(`/readlead/`)에서 서빙되도록 `vite.config.js`의
`base`를 빌드 시에만 적용하고, 클라이언트 라우팅은 서버 rewrite가 필요 없는
`HashRouter`를 씁니다(그래서 URL에 `#`이 붙습니다. 예: `.../readlead/#/book/xxx`).

## 데이터 모델

| 테이블 | 설명 |
| --- | --- |
| `profiles` | 닉네임, 색상. `auth.users`와 1:1 |
| `books` | 함께 읽는 책 |
| `book_pages` | 책의 고정 레이아웃 페이지 (page_width/height = 좌표 기준) |
| `annotations` | 밑줄(`underline`) 또는 낙서(`doodle`). `data` jsonb에 좌표/오프셋 저장 |
| `comments` | 특정 annotation에 달리는 토론 댓글 |

## 알려진 제한점 / 다음 단계

- 밑줄 좌표는 "페이지 텍스트 전체 문자열 기준 오프셋"이라, 페이지 내용을 나중에
  수정하면 기존 밑줄 위치가 어긋날 수 있습니다 (콘텐츠는 불변이라고 가정).
- 낙서 히트 테스트(클릭해서 작성자 보기)는 점 사이 거리 기반의 단순한 방식입니다.
- `books`/`book_pages`에 대한 insert RLS 정책이 로그인한 모든 사용자에게 열려있는데,
  이는 첫 실행 자동 시딩을 위한 것입니다. 운영 단계에서 더 이상 클라이언트가 책을
  추가할 필요가 없다면 해당 insert 정책은 지우고 `npm run seed`(service role)만
  쓰도록 좁히는 것을 권장합니다.
