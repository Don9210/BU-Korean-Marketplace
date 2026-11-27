-- =====================================================================
-- bu-market DB 설계도 (테이블 4개 + 접근 규칙(RLS) + trigger)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여 넣고 Run.
-- 여러 번 실행해도 안전하다. (이미 있는 것은 건너뛰거나 새로 덮어쓴다)
-- 셋이 함께 쓰는 공유 파일이다. 고치면 단톡에 한 줄 남긴다.
--
-- 용어
--   RLS(Row Level Security, 접근 규칙): "누가 어느 줄을 읽고 쓸 수 있는지"를 DB 가 직접 검사
--   trigger(트리거): 데이터가 바뀔 때 DB 가 자동으로 실행하는 함수
--   auth.uid(): 지금 요청을 보낸 로그인 사용자의 id
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. 준비: 화면(API)에서 직접 부를 수 없는 내부 함수용 공간
-- ---------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;


-- ---------------------------------------------------------------------
-- 1. 테이블 4개
-- ---------------------------------------------------------------------

-- 1-1. profiles: 사용자 (가입하면 trigger 가 자동으로 한 줄 만든다)
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  nickname        text unique,                 -- 첫 로그인 직후에는 비어 있다
  rating_avg      numeric(3, 2),               -- 평점이 없으면 null → "아직 평가 없음"
  rating_count    int not null default 0,
  completed_count int not null default 0,
  created_at      timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(btrim(nickname)) between 2 and 20)
);

-- 닉네임은 대소문자만 다른 것도 같은 이름으로 본다. (Kim 이 있으면 kim, KIM 은 만들 수 없다)
-- 저장되는 모양은 쓴 그대로다. 이미 만들어진 DB 에도 이 한 줄로 추가된다. (2026-11-24)
create unique index if not exists profiles_nickname_lower_key on public.profiles (lower(btrim(nickname)));

-- 1-2. listings: 판매 글
create table if not exists public.listings (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references public.profiles (id) on delete cascade,
  title               text not null,
  price               int  not null,           -- 달러 정수. 0 = 무료 나눔
  price_krw           int,                     -- 선택. "원화로도 받아요" 금액(원). 비우면 달러로만 거래
  category            text not null,
  place               text not null,
  place_detail        text,                    -- 장소가 '기타'일 때 직접 적은 곳 (예: CAS 건물 앞). 그 밖에는 비운다
  description         text not null default '',
  image_urls          text[] not null,
  status              text not null default 'available',
  buyer_id            uuid references public.profiles (id) on delete set null,
  seller_completed_at timestamptz,             -- 판매자가 "거래완료"를 누른 시각
  buyer_confirmed_at  timestamptz,             -- 구매자가 확인한 시각
  reported            boolean not null default false,
  created_at          timestamptz not null default now(),
  constraint listings_title_length  check (char_length(btrim(title)) between 1 and 60),
  constraint listings_price_range   check (price >= 0),
  constraint listings_price_krw     check (price_krw is null or (price_krw > 0 and price > 0)),
  constraint listings_category      check (category in ('가구', '주방용품', '교재', '전자기기', '의류', '기타')),
  constraint listings_place         check (place in ('GSU 앞', 'Warren Towers 앞', 'Mugar 도서관 앞', 'FitRec 앞', '기타')),
  constraint listings_place_detail  check (place_detail is null or (place = '기타' and char_length(btrim(place_detail)) between 1 and 30)),
  constraint listings_description   check (char_length(description) <= 2000),
  constraint listings_image_count   check (cardinality(image_urls) between 1 and 5),
  constraint listings_status        check (status in ('available', 'reserved', 'completed')),
  constraint listings_buyer_not_me  check (buyer_id is null or buyer_id <> seller_id)
);

-- 이미 만들어진 DB 에 나중에 추가된 변경 (새 DB 에서는 위 정의와 같아서 아무 일도 일어나지 않는다)
--   2026-11-23: 원화 가격 칸(price_krw) 추가, 사진 최대 3장 → 5장
alter table public.listings add column if not exists price_krw int;
alter table public.listings drop constraint if exists listings_price_krw;
alter table public.listings add constraint listings_price_krw
  check (price_krw is null or (price_krw > 0 and price > 0));
alter table public.listings drop constraint if exists listings_image_count;
alter table public.listings add constraint listings_image_count
  check (cardinality(image_urls) between 1 and 5);
--   2026-11-23: 거래 장소에 "FitRec 앞" 추가
alter table public.listings drop constraint if exists listings_place;
alter table public.listings add constraint listings_place
  check (place in ('GSU 앞', 'Warren Towers 앞', 'Mugar 도서관 앞', 'FitRec 앞', '기타'));
--   2026-11-26: 장소가 '기타'일 때 직접 적는 칸(place_detail) 추가. 예전 '기타' 글은 비어 있어도 된다
alter table public.listings add column if not exists place_detail text;
alter table public.listings drop constraint if exists listings_place_detail;
alter table public.listings add constraint listings_place_detail
  check (place_detail is null or (place = '기타' and char_length(btrim(place_detail)) between 1 and 30));

-- 1-3. comments: 비밀댓글 (parent_id 가 비어 있으면 댓글, 있으면 그 댓글의 답글)
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid references public.comments (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 1000)
);

-- 1-4. ratings: 평점 (거래 하나에서 한 사람이 한 번만)
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  rater_id   uuid not null references public.profiles (id) on delete cascade,  -- 평가한 사람
  ratee_id   uuid not null references public.profiles (id) on delete cascade,  -- 평가받은 사람
  score      int  not null,
  created_at timestamptz not null default now(),
  constraint ratings_score_range check (score between 1 and 5),
  constraint ratings_once_per_deal unique (listing_id, rater_id)
);

-- 자주 찾는 기준에 색인(index)을 달아 목록이 빨리 뜨게 한다
create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_seller_id_idx  on public.listings (seller_id);
create index if not exists listings_buyer_id_idx   on public.listings (buyer_id);
create index if not exists comments_listing_id_idx on public.comments (listing_id, created_at);
create index if not exists comments_author_id_idx  on public.comments (author_id);
create index if not exists comments_parent_id_idx  on public.comments (parent_id);
create index if not exists ratings_ratee_id_idx    on public.ratings (ratee_id);


-- ---------------------------------------------------------------------
-- 2. 가입 규칙: @bu.edu 만 가입 + 가입하면 profiles 한 줄 자동 생성
-- ---------------------------------------------------------------------

-- 2-1. 이메일이 @bu.edu 로 끝나지 않으면 가입(또는 이메일 변경)을 거부한다
create or replace function private.require_bu_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@bu.edu' then
    raise exception 'bu.edu 이메일만 가입할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists require_bu_email on auth.users;
create trigger require_bu_email
  before insert or update of email on auth.users
  for each row execute function private.require_bu_email();

-- 2-2. 가입이 되면 profiles 에 한 줄을 만든다 (닉네임은 프로필 설정 화면에서 채운다)
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists handle_new_user on auth.users;
create trigger handle_new_user
  after insert on auth.users
  for each row execute function private.handle_new_user();


-- ---------------------------------------------------------------------
-- 3. 접근 규칙에서 쓰는 도우미 함수
--    (comments 규칙 안에서 comments 를 다시 읽으면 무한 반복이 되므로 함수로 뺀다)
-- ---------------------------------------------------------------------

-- 이 글의 판매자 id
create or replace function private.listing_seller_id(p_listing_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select seller_id from public.listings where id = p_listing_id;
$$;

-- 이 댓글의 작성자 id
create or replace function private.comment_author_id(p_comment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select author_id from public.comments where id = p_comment_id;
$$;


-- 접근 규칙 안에서 로그인 사용자가 이 두 함수를 부를 수 있게 한다
grant execute on function private.listing_seller_id(uuid) to authenticated;
grant execute on function private.comment_author_id(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. trigger: 화면 코드가 규칙을 어기지 못하게 DB 가 직접 지킨다
-- ---------------------------------------------------------------------

-- 4-1. listings: 거래 상태 규칙
--   · 새 글은 항상 "판매중"으로 시작한다
--   · 판매자: "거래완료"로 바꾸려면 댓글 단 사람 중에서 구매자를 골라야 한다
--   · 구매자: "거래 확인"(buyer_confirmed_at)만 할 수 있다
--   · 구매자가 확인한 뒤에는 상태와 구매자를 바꿀 수 없다
create or replace function private.guard_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := auth.uid();
  result public.listings;
begin
  if tg_op = 'INSERT' then
    new.status              := 'available';
    new.buyer_id            := null;
    new.seller_completed_at := null;
    new.buyer_confirmed_at  := null;
    new.reported            := false;
    return new;
  end if;

  -- 로그인 사용자가 아닌 경우(대시보드, 서버 함수)는 그대로 통과
  if uid is null then
    return new;
  end if;

  -- 누구도 바꿀 수 없는 값
  new.id         := old.id;
  new.seller_id  := old.seller_id;
  new.created_at := old.created_at;
  new.reported   := old.reported;

  if uid = old.seller_id then
    -- 판매자는 구매자 확인 시각을 건드릴 수 없다
    new.buyer_confirmed_at := old.buyer_confirmed_at;

    -- 구매자가 이미 확인한 거래: 상태·구매자 고정 (제목·설명 등은 고칠 수 있다)
    if old.buyer_confirmed_at is not null then
      new.status              := old.status;
      new.buyer_id            := old.buyer_id;
      new.seller_completed_at := old.seller_completed_at;
      return new;
    end if;

    if new.status = 'completed' then
      if new.buyer_id is null then
        raise exception '구매자를 선택해야 거래완료로 바꿀 수 있습니다.';
      end if;
      if not exists (
        select 1 from public.comments c
        where c.listing_id = old.id and c.author_id = new.buyer_id
      ) then
        raise exception '이 글에 댓글을 단 사람만 구매자로 선택할 수 있습니다.';
      end if;
      if old.status <> 'completed' or old.buyer_id is distinct from new.buyer_id then
        new.seller_completed_at := now();
      else
        new.seller_completed_at := old.seller_completed_at;
      end if;
    else
      -- 판매중/예약중으로 되돌리면 구매자 선택도 지운다
      new.buyer_id            := null;
      new.seller_completed_at := null;
    end if;
    return new;
  end if;

  if uid = old.buyer_id then
    if old.status <> 'completed' then
      raise exception '거래완료 상태인 글만 확인할 수 있습니다.';
    end if;
    -- 구매자는 "확인"만 할 수 있다. 다른 값은 원래대로 둔다.
    result := old;
    result.buyer_confirmed_at := coalesce(old.buyer_confirmed_at, now());
    return result;
  end if;

  raise exception '이 글을 수정할 권한이 없습니다.';
end;
$$;

drop trigger if exists guard_listing on public.listings;
create trigger guard_listing
  before insert or update on public.listings
  for each row execute function private.guard_listing();

-- 4-2. listings: 구매자가 확인하면 양쪽 거래 완료 횟수 +1
create or replace function private.count_completed_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set completed_count = completed_count + 1
  where id in (new.seller_id, new.buyer_id);
  return new;
end;
$$;

drop trigger if exists count_completed_deal on public.listings;
create trigger count_completed_deal
  after update on public.listings
  for each row
  when (old.buyer_confirmed_at is null and new.buyer_confirmed_at is not null)
  execute function private.count_completed_deal();

-- 4-3. comments: 답글은 1단계만, 같은 글 안에서만. 수정은 내용(body)만.
create or replace function private.guard_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent public.comments;
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      select * into parent from public.comments where id = new.parent_id;
      if not found then
        raise exception '원 댓글을 찾을 수 없습니다.';
      end if;
      if parent.parent_id is not null then
        raise exception '답글에는 다시 답글을 달 수 없습니다. 원 댓글에 답글을 달아 주세요.';
      end if;
      if parent.listing_id <> new.listing_id then
        raise exception '다른 글의 댓글에는 답글을 달 수 없습니다.';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: 내용만 바꿀 수 있다
  new.id         := old.id;
  new.listing_id := old.listing_id;
  new.author_id  := old.author_id;
  new.parent_id  := old.parent_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists guard_comment on public.comments;
create trigger guard_comment
  before insert or update on public.comments
  for each row execute function private.guard_comment();

-- 4-4. ratings: 평점이 들어오면 평가받은 사람의 평균·개수를 다시 계산
create or replace function private.refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set rating_count = s.cnt,
      rating_avg   = s.avg
  from (
    select count(*)::int as cnt, round(avg(score), 2) as avg
    from public.ratings
    where ratee_id = new.ratee_id
  ) s
  where p.id = new.ratee_id;
  return new;
end;
$$;

drop trigger if exists refresh_rating on public.ratings;
create trigger refresh_rating
  after insert on public.ratings
  for each row execute function private.refresh_rating();


-- ---------------------------------------------------------------------
-- 5. 접근 규칙 (RLS)
--    규칙이 없는 동작은 전부 막힌다. 비로그인(anon)은 아무것도 못 한다.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.comments enable row level security;
alter table public.ratings  enable row level security;

-- 권한(grant): "이 역할이 이 표에 어떤 동작을 시도할 수 있는가". 규칙(policy)보다 먼저 검사된다.
-- 먼저 전부 거두고, 필요한 것만 다시 준다. (프로젝트 기본 설정이 무엇이든 결과가 같아진다)
revoke all on public.profiles, public.listings, public.comments, public.ratings from anon, authenticated;

-- profiles 는 이메일(email) 칸만 빼고 읽게 한다. 이메일은 다른 가입자에게 보이면 안 된다.
-- 내 이메일은 화면이 로그인 정보에서 가져오고, 알림 메일을 보내는 서버 함수는 관리자 역할로 읽는다.
-- 주의: 이 때문에 화면에서 profiles 를 select('*') 로 요청하면 실패한다. 칸 이름을 적어서 요청할 것.
grant select (id, nickname, rating_avg, rating_count, completed_count, created_at)
  on public.profiles to authenticated;
grant update (nickname)      on public.profiles to authenticated;

grant select, insert, delete on public.listings to authenticated;
grant update (title, price, price_krw, category, place, place_detail, description, image_urls, status, buyer_id, buyer_confirmed_at)
  on public.listings to authenticated;

grant select, insert, delete on public.comments to authenticated;
grant update (body)          on public.comments to authenticated;

grant select, insert         on public.ratings  to authenticated;

-- 서버 함수(Edge Function, 댓글 알림 메일)는 관리자 역할로 모든 표를 쓴다
grant all on public.profiles, public.listings, public.comments, public.ratings to service_role;

-- 5-1. profiles
--   읽기: 로그인 사용자 누구나 (이메일 칸 제외, 위 grant 참고) / 수정: 본인의 닉네임만
--   completed_count, rating_avg, rating_count 는 trigger 만 바꾼다
drop policy if exists "profiles: 로그인 사용자 읽기" on public.profiles;
create policy "profiles: 로그인 사용자 읽기" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles: 본인만 수정" on public.profiles;
create policy "profiles: 본인만 수정" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 5-2. listings
--   읽기: 로그인 사용자 누구나 / 등록: 본인 이름으로만
--   수정: 판매자, 그리고 구매자(확인만 — 4-1 trigger 가 제한) / 삭제: 판매자, 확정 전까지만
drop policy if exists "listings: 로그인 사용자 읽기" on public.listings;
create policy "listings: 로그인 사용자 읽기" on public.listings
  for select to authenticated
  using (true);

drop policy if exists "listings: 본인 이름으로 등록" on public.listings;
create policy "listings: 본인 이름으로 등록" on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "listings: 판매자 수정, 구매자 확인" on public.listings;
create policy "listings: 판매자 수정, 구매자 확인" on public.listings
  for update to authenticated
  using (seller_id = auth.uid() or buyer_id = auth.uid())
  with check (seller_id = auth.uid() or buyer_id = auth.uid());

drop policy if exists "listings: 판매자 삭제" on public.listings;
create policy "listings: 판매자 삭제" on public.listings
  for delete to authenticated
  using (seller_id = auth.uid() and buyer_confirmed_at is null);

-- 5-3. comments (비밀댓글)
--   읽기: 그 글의 판매자, 댓글 작성자 본인, 답글이면 원 댓글 작성자
--   쓰기: 본인 이름으로만. 답글은 그 글의 판매자 또는 원 댓글 작성자만
--   수정·삭제: 작성자만 (수정은 내용만)
drop policy if exists "comments: 당사자만 읽기" on public.comments;
create policy "comments: 당사자만 읽기" on public.comments
  for select to authenticated
  using (
    author_id = auth.uid()
    or private.listing_seller_id(listing_id) = auth.uid()
    or (parent_id is not null and private.comment_author_id(parent_id) = auth.uid())
  );

drop policy if exists "comments: 본인 이름으로 쓰기" on public.comments;
create policy "comments: 본인 이름으로 쓰기" on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      parent_id is null
      or private.listing_seller_id(listing_id) = auth.uid()
      or private.comment_author_id(parent_id) = auth.uid()
    )
  );

drop policy if exists "comments: 작성자만 수정" on public.comments;
create policy "comments: 작성자만 수정" on public.comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "comments: 작성자만 삭제" on public.comments;
create policy "comments: 작성자만 삭제" on public.comments
  for delete to authenticated
  using (author_id = auth.uid());

-- 5-4. ratings
--   읽기: 평가한 사람과 평가받은 사람
--   쓰기: 구매자가 확인한 거래에서, 판매자 ↔ 구매자가 서로에게만. 수정·삭제 없음
drop policy if exists "ratings: 당사자만 읽기" on public.ratings;
create policy "ratings: 당사자만 읽기" on public.ratings
  for select to authenticated
  using (rater_id = auth.uid() or ratee_id = auth.uid());

drop policy if exists "ratings: 확정된 거래의 상대만 평가" on public.ratings;
create policy "ratings: 확정된 거래의 상대만 평가" on public.ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.buyer_confirmed_at is not null
        and (
          (l.seller_id = auth.uid() and l.buyer_id = ratee_id)
          or (l.buyer_id = auth.uid() and l.seller_id = ratee_id)
        )
    )
  );


-- ---------------------------------------------------------------------
-- 6. 사진 저장소 (Storage)
--    사진은 "listing-images" 버킷의 "<내 사용자 id>/파일이름" 경로에 올린다.
--    공개 버킷: 사진 주소(URL)를 아는 사람은 로그인 없이도 사진을 볼 수 있다.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5 * 1024 * 1024,                                -- 한 장에 최대 5MB (압축 후 기준으로 넉넉함)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "listing-images: 내 폴더에 올리기" on storage.objects;
create policy "listing-images: 내 폴더에 올리기" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing-images: 내 사진 지우기" on storage.objects;
create policy "listing-images: 내 사진 지우기" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 사진을 지우려면 "지우기" 규칙만으로는 부족하다. Storage 는 지우기 전에
-- 그 파일을 먼저 찾아보기 때문에, 내 폴더의 파일을 읽는 규칙도 있어야 한다.
drop policy if exists "listing-images: 내 사진 읽기" on storage.objects;
create policy "listing-images: 내 사진 읽기" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------------------
-- 7.여기서 하지 않는 것 (대시보드에서 따로 설정)
--   · 댓글 알림 메일: Database Webhook(comments INSERT) → Edge Function → Resend
--   · 인증 코드 메일: Authentication → SMTP 설정(Resend), 이메일 OTP 6자리
-- ---------------------------------------------------------------------
