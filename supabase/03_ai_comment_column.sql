-- ============================================================
-- predictions tablosuna AI yorumu kolonu
-- Çalıştırma: Supabase SQL Editor → New query → yapıştır → Run
-- ============================================================

alter table predictions
  add column if not exists ai_comment      text,
  add column if not exists ai_generated_at timestamptz;

-- Doğrulama
select count(*) as total,
       count(ai_comment) as with_ai_comment
from predictions;
