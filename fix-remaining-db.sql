-- =========================================================================
-- SOLUCIÓN DE RECURSIÓN DINÁMICA Y TABLAS RESTANTES PARA SOONER
-- =========================================================================
-- Copia y pega todo este script en la pestaña SQL Editor de tu panel de Supabase y dale a "Run"

-- 1. ELIMINAR CUALQUIER POLÍTICA VIEJA DE SELECT EN users_profiles QUE CAUSE BUCLES (DINÁMICAMENTE)
do $$
declare
    r record;
begin
    for r in (
        select policyname 
        from pg_policies 
        where schemaname = 'public' 
          and tablename = 'users_profiles' 
          and (cmd = 'SELECT' or cmd = 'ALL')
    ) loop
        execute 'drop policy if exists ' || quote_ident(r.policyname) || ' on public.users_profiles';
    end loop;
end $$;

-- 2. CREAR LA POLÍTICA SELECT SEGURA BASADA EN JWT PARA users_profiles
create policy "Lectura de perfiles de su propio club y propio perfil"
on public.users_profiles for select
using (
  auth.uid() = id or 
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 3. CREAR LA TABLA DE RESERVAS DE INSTALACIONES (facility_bookings)
create table if not exists public.facility_bookings (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    facility_id uuid not null references public.facilities(id) on delete cascade,
    title varchar(255) not null,
    date varchar(100) not null,  -- AAAA-MM-DD
    start_time varchar(50) not null, -- HH:MM
    end_time varchar(50) not null,   -- HH:MM
    created_by uuid references public.users_profiles(id) on delete set null,
    coach_name varchar(255),
    facility_name varchar(255),
    status varchar(50) not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default now() not null
);

-- Habilitar RLS para reservas
alter table public.facility_bookings enable row level security;

-- Políticas de RLS para reservas de instalaciones
drop policy if exists "Miembros del club ven reservas de instalaciones" on public.facility_bookings;
create policy "Miembros del club ven reservas de instalaciones"
on public.facility_bookings for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Miembros del club crean reservas de instalaciones" on public.facility_bookings;
create policy "Miembros del club crean reservas de instalaciones"
on public.facility_bookings for insert
with check (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
);

drop policy if exists "Club y staff gestionan reservas de instalaciones" on public.facility_bookings;
create policy "Club y staff gestionan reservas de instalaciones"
on public.facility_bookings for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- 4. ADAPTAR LA TABLA DE EVENTOS (events) PARA ALBERGAR PARTIDOS, ENTRENAMIENTOS Y FILTROS COMPLETOS
alter table public.events add column if not exists type varchar(50) default 'event';
alter table public.events add column if not exists date varchar(100);
alter table public.events add column if not exists time varchar(50);
alter table public.events add column if not exists squad_ids jsonb default '[]'::jsonb;
alter table public.events add column if not exists result varchar(255);
alter table public.events add column if not exists rival_name varchar(255);
alter table public.events add column if not exists goals_for integer;
alter table public.events add column if not exists goals_against integer;
alter table public.events add column if not exists match_report text;
alter table public.events add column if not exists player_stats jsonb default '{}'::jsonb;
alter table public.events add column if not exists team_notes text;
alter table public.events add column if not exists mvp_votes jsonb default '{}'::jsonb;

-- 5. ADAPTAR LA TABLA DE INSTALACIONES (facilities) PARA LA IMAGEN OPCIONAL
alter table public.facilities add column if not exists image_url text;

-- 6. FUNCIÓN DE APOYO PARA RESOLVER NOMBRE DE USUARIO A CORREO ELECTRÓNICO (EVITA ERRORES EN INICIO DE SESIÓN)
create or replace function public.resolve_username_to_email(p_username text)
returns text as $$
  select email from public.users_profiles where lower(username) = lower(trim(p_username)) limit 1;
$$ language sql security definer set search_path = public;
