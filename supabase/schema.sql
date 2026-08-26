-- readlead: 같이 읽기 스키마
-- Supabase SQL editor에서 그대로 실행하세요.

create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────
-- profiles: 닉네임 기반 계정. auth.users 1:1.
-- ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_nickname_lower_idx
  on profiles (lower(nickname));

-- ────────────────────────────────────────────────────────────
-- books: 저작권 만료작 등, 여러 사람이 함께 읽는 책.
-- ────────────────────────────────────────────────────────────
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  source text,
  license_note text,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- book_pages: 책의 각 "고정 레이아웃" 페이지.
-- page_width/page_height는 낙서 좌표계의 기준 픽셀 크기이며,
-- 화면 크기가 달라져도 이 값은 바뀌지 않는다 (프론트에서 scale로 맞춤).
-- ────────────────────────────────────────────────────────────
create table if not exists book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books (id) on delete cascade,
  page_number int not null,
  content text not null,
  page_width int not null default 880,
  page_height int not null default 1200,
  created_at timestamptz not null default now(),
  unique (book_id, page_number)
);

-- ────────────────────────────────────────────────────────────
-- annotations: 펜으로 그린 한 획(stroke). 밑줄도 이 펜으로 긋는다.
-- doodle data: { "points": [{"x":number,"y":number}], "width": number, "opacity": number }
--   좌표는 book_pages.page_width/page_height 기준의 고정 좌표계.
--   'underline' 타입은 과거 텍스트-선택 기반 밑줄의 흔적으로 제약조건만 남아있다.
-- ────────────────────────────────────────────────────────────
create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books (id) on delete cascade,
  page_id uuid not null references book_pages (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('underline', 'doodle')),
  data jsonb not null,
  color text not null,
  created_at timestamptz not null default now()
);

create index if not exists annotations_page_idx on annotations (page_id);

-- ────────────────────────────────────────────────────────────
-- comments: 특정 밑줄/낙서에 달리는 토론 댓글.
-- ────────────────────────────────────────────────────────────
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references annotations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_annotation_idx on comments (annotation_id);

-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table books enable row level security;
alter table book_pages enable row level security;
alter table annotations enable row level security;
alter table comments enable row level security;

-- profiles: 닉네임/색은 다들 볼 수 있어야 낙서 작성자를 표시할 수 있음.
create policy "profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- books / book_pages: 로그인(닉네임 입장)한 사람은 모두 읽기 가능.
-- insert는 최초 시딩을 위해 인증된 사용자에게 열어둔다(개인 프로젝트 규모 가정).
create policy "authenticated can read books"
  on books for select
  to authenticated
  using (true);

create policy "authenticated can seed books"
  on books for insert
  to authenticated
  with check (true);

create policy "authenticated can read book_pages"
  on book_pages for select
  to authenticated
  using (true);

create policy "authenticated can seed book_pages"
  on book_pages for insert
  to authenticated
  with check (true);

-- annotations: 모두 읽기, 자기 것만 쓰기/삭제.
create policy "authenticated can read annotations"
  on annotations for select
  to authenticated
  using (true);

create policy "users can insert their own annotations"
  on annotations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own annotations"
  on annotations for delete
  to authenticated
  using (auth.uid() = user_id);

-- comments: 모두 읽기, 자기 것만 쓰기/삭제.
create policy "authenticated can read comments"
  on comments for select
  to authenticated
  using (true);

create policy "users can insert their own comments"
  on comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own comments"
  on comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- Realtime: 같이 읽는 사람들에게 실시간으로 반영되도록 publication에 추가.
alter publication supabase_realtime add table annotations;
alter publication supabase_realtime add table comments;
