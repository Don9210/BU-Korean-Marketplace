-- 기능 2 사진 삭제에 필요한 본인 파일 읽기 권한.
-- 기존 schema.sql 적용 후 실행한다. 테이블이나 기존 정책은 변경하지 않는다.
-- (2026-11-15) 같은 규칙을 schema.sql 6번에도 넣었다. schema.sql 을 새로 실행하면
-- 이 파일은 따로 실행하지 않아도 된다. 팀 Supabase 에는 이미 적용됨.
-- Storage remove API는 SELECT와 DELETE 정책이 모두 필요하다.
drop policy if exists "listing-images: 내 사진 읽기" on storage.objects;
create policy "listing-images: 내 사진 읽기" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
