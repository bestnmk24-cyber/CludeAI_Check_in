-- =====================================================================
-- เช็คชื่อคลาส Clude AI — Supabase schema (v2.0.0)
-- รันใน Supabase SQL Editor ของโปรเจกต์ใหม่ได้ทั้งไฟล์
-- =====================================================================

-- ---------- แอดมินที่ล็อกอินได้ ----------
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
insert into public.admins (email) values ('bestnmk24@gmail.com');

-- ฟังก์ชันสิทธิ์อยู่ใน schema private (ไม่ถูกเปิดเป็น API)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, supabase_auth_admin;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins a
                 where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- สร้างบัญชีได้เฉพาะอีเมลที่อยู่ใน public.admins (กันคนอื่นล็อกอินด้วย Google)
create or replace function private.enforce_admin_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins a where a.email = lower(coalesce(new.email, ''))) then
    raise exception 'email_not_allowed';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_admin_signup() from public;
grant execute on function private.enforce_admin_signup() to supabase_auth_admin;
create trigger enforce_admin_signup before insert on auth.users
  for each row execute function private.enforce_admin_signup();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

-- ---------- ผู้เรียน ----------
create table public.students (
  id text primary key default ('p' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
     check (id ~ '^[A-Za-z0-9_.:-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 200),
  code text not null default '' check (char_length(code) <= 60),
  company text not null default '' check (char_length(company) <= 200),
  position text not null default '' check (char_length(position) <= 200),
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

-- ---------- บันทึกเวลาเข้า-ออก (1 แถว / คน / วัน) ----------
create table public.attendance (
  class_date date not null,
  student_id text not null,
  student_name text not null default '',
  check_in timestamptz not null,
  check_out timestamptz,
  signature text check (signature is null or (signature like 'data:image/png;base64,%' and char_length(signature) < 400000)),
  has_signature boolean generated always as (signature is not null) stored,
  recorded_by text default lower(coalesce(auth.jwt() ->> 'email', '')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (class_date, student_id),
  check (check_out is null or check_out >= check_in)
);
create index attendance_student_idx on public.attendance (student_id);
create trigger attendance_touch before update on public.attendance
  for each row execute function public.touch_updated_at();

-- ---------- ตั้งค่าคลาส (แถวเดียว) ----------
create table public.class_settings (
  id smallint primary key default 1 check (id = 1),
  class_name text not null default 'Clude AI',
  class_start time not null default '09:00',
  late_after_minutes integer not null default 15 check (late_after_minutes between 0 and 600),
  updated_at timestamptz not null default now()
);
insert into public.class_settings (id) values (1);
create trigger class_settings_touch before update on public.class_settings
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security: เฉพาะแอดมิน ----------
alter table public.admins enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.class_settings enable row level security;

create policy "admins read admins" on public.admins for select to authenticated using ((select private.is_admin()));
create policy "admins manage students" on public.students for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins manage attendance" on public.attendance for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins read settings" on public.class_settings for select to authenticated using ((select private.is_admin()));
create policy "admins update settings" on public.class_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

revoke all on public.admins, public.students, public.attendance, public.class_settings from anon;

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.students, public.attendance, public.class_settings;

-- เพิ่มแอดมินคนอื่นในอนาคต:
--   insert into public.admins (email) values ('someone@gmail.com');
