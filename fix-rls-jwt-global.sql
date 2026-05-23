-- =========================================================================
-- SOLUCIÓN MAESTRA Y GLOBAL DE RECURSIÓN RLS (BASADO EN JWT) PARA SOONER
-- =========================================================================
-- Copia y pega todo este script en la pestaña SQL Editor de tu panel de Supabase y dale a "Run"

-- 1. ELIMINAR ABSOLUTAMENTE TODAS LAS POLÍTICAS DE RLS EXISTENTES EN EL ESQUEMA PÚBLICO
do $$
declare
    r record;
begin
    for r in (
        select policyname, tablename 
        from pg_policies 
        where schemaname = 'public'
    ) loop
        execute 'drop policy if exists ' || quote_ident(r.policyname) || ' on public.' || quote_ident(r.tablename);
    end loop;
end $$;

-- 2. ASEGURAR QUE TODAS LAS TABLAS SECUNDARIAS EXISTAN Y ESTÉN CORRECTAMENTE ESTRUCTURADAS
-- Crear función de actualización de marca de tiempo (si no existe)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Crear tabla de reservas de instalaciones
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

-- Crear tabla de lesiones (injuries)
create table if not exists public.injuries (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    player_id uuid not null references public.users_profiles(id) on delete cascade,
    player_name varchar(255) not null,
    category varchar(100),
    type varchar(50) not null,
    severity varchar(50) not null,
    status varchar(50) not null,
    injury_date varchar(100) not null,
    estimated_recovery_date varchar(100),
    notes text,
    recommendations text,
    progress_notes jsonb default '[]'::jsonb not null,
    updated_at timestamp with time zone default now() not null,
    created_at timestamp with time zone default now() not null
);

-- Crear disparador de marca de tiempo en lesiones
drop trigger if exists tr_update_injuries_updated_at on public.injuries;
create trigger tr_update_injuries_updated_at before update on public.injuries for each row execute procedure public.update_updated_at_column();

-- Crear tabla de leads de la landing page
create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    club_name varchar(255) not null,
    email varchar(255) not null,
    message text not null,
    status varchar(50) not null default 'new',
    created_at timestamp with time zone default now() not null
);

-- Crear tabla de feedback de entrenamientos (training_feedback)
create table if not exists public.training_feedback (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    team_id uuid not null references public.teams(id) on delete cascade,
    team_name varchar(255) not null,
    coach_id uuid not null references public.users_profiles(id) on delete cascade,
    coach_name varchar(255) not null,
    date varchar(100) not null,
    category varchar(100) not null,
    intensity integer not null check (intensity between 1 and 5),
    notes text,
    created_at timestamp with time zone default now() not null
);

-- 3. ADAPTAR Y COLUMNAS DE TABLAS EXISTENTES
-- Adaptar soporte (support_tickets)
alter table public.support_tickets add column if not exists user_name varchar(255);
alter table public.support_tickets add column if not exists user_email varchar(255);
alter table public.support_tickets add column if not exists user_role varchar(50);
alter table public.support_tickets add column if not exists club_id uuid references public.clubs(id) on delete cascade;
alter table public.support_tickets add column if not exists priority varchar(50) not null default 'medium';
alter table public.support_tickets add column if not exists replies jsonb default '[]'::jsonb not null;
alter table public.support_tickets add column if not exists updated_at timestamp with time zone default now() not null;

drop trigger if exists tr_update_support_tickets_updated_at on public.support_tickets;
create trigger tr_update_support_tickets_updated_at before update on public.support_tickets for each row execute procedure public.update_updated_at_column();

-- Adaptar inventario (inventory)
alter table public.inventory add column if not exists available_quantity integer not null default 0;
alter table public.inventory add column if not exists min_threshold integer not null default 0;
alter table public.inventory add column if not exists location varchar(255);
alter table public.inventory add column if not exists updated_at timestamp with time zone default now() not null;

drop trigger if exists tr_update_inventory_updated_at on public.inventory;
create trigger tr_update_inventory_updated_at before update on public.inventory for each row execute procedure public.update_updated_at_column();

-- Adaptar eventos (events)
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

-- Adaptar instalaciones (facilities)
alter table public.facilities add column if not exists image_url text;

-- Habilitar RLS en tablas recién creadas/aseguradas
alter table public.facility_bookings enable row level security;
alter table public.injuries enable row level security;
alter table public.leads enable row level security;
alter table public.training_feedback enable row level security;

-- 4. CREAR O CORREGIR DISPARADOR PARA AUTOSINCRONIZACIÓN DE PERFILES A AUTH.USERS
create or replace function public.sync_profile_to_auth_users()
returns trigger as $$
begin
  update auth.users
  set raw_user_meta_data = 
    coalesce(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', new.role,
      'club_id', new.club_id,
      'name', new.name,
      'username', new.username
    )
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = auth, public;

drop trigger if exists tr_sync_profile_to_auth_users on public.users_profiles;
create trigger tr_sync_profile_to_auth_users
  after insert or update on public.users_profiles
  for each row execute procedure public.sync_profile_to_auth_users();

-- 5. SINCRONIZACIÓN INICIAL BIDIRECCIONAL (COMPLETA METADATOS DE USUARIOS EXISTENTES)
-- Sincronizar usuarios de auth.users a public.users_profiles si faltan perfiles
insert into public.users_profiles (id, email, name, role, username)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  coalesce(raw_user_meta_data->>'role', 'player'),
  coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1))
from auth.users
where id not in (select id from public.users_profiles)
on conflict (id) do nothing;

-- Sincronización inversa (Guarda los perfiles en raw_user_meta_data para el JWT)
update auth.users u
set raw_user_meta_data = 
  coalesce(u.raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', p.role,
    'club_id', p.club_id,
    'name', p.name,
    'username', p.username
  )
from public.users_profiles p
where u.id = p.id;

-- 6. REESCRIBIR FUNCIONES DE APOYO LEYENDO DE AUTH.USERS (EVITA RECURSIÓN AL 100%)
create or replace function public.get_user_role(p_user_id uuid)
returns varchar as $$
  select coalesce(raw_user_meta_data->>'role', 'player') from auth.users where id = p_user_id;
$$ language sql security definer set search_path = auth, public;

create or replace function public.get_user_club_id(p_user_id uuid)
returns uuid as $$
  select (raw_user_meta_data->>'club_id')::uuid from auth.users where id = p_user_id;
$$ language sql security definer set search_path = auth, public;

create or replace function public.resolve_username_to_email(p_username text)
returns text as $$
  select email from public.users_profiles where lower(username) = lower(trim(p_username)) limit 1;
$$ language sql security definer set search_path = public;

-- 7. CREACIÓN DE NUEVAS POLÍTICAS RLS SEGURAS Y ULTRA-RÁPIDAS BASADAS EN JWT

-- POLÍTICAS: public.users_profiles
create policy "Lectura de perfiles de su propio club y propio perfil"
on public.users_profiles for select
using (
  auth.uid() = id or 
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Actualización de su propio perfil"
on public.users_profiles for update
using (
  auth.uid() = id or 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Admin del club y admin de plataforma gestionan perfiles"
on public.users_profiles for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'admin')
);

-- POLÍTICAS: public.clubs
create policy "Lectura de club propio"
on public.clubs for select
using (
  id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Admin y gestores actualizan su propio club"
on public.clubs for update
using (
  admin_id = auth.uid() or 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Administrador de plataforma gestiona todos los clubes"
on public.clubs for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- POLÍTICAS: public.teams
create policy "Miembros ven equipos de su club"
on public.teams for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan equipos"
on public.teams for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.players
create policy "Miembros ven jugadores de su club"
on public.players for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan jugadores"
on public.players for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.team_players
create policy "Ver asignaciones de equipo de su club"
on public.team_players for select
using (
  exists (
    select 1 from public.teams t
    where t.id = team_players.team_id and t.club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
  ) or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan asignaciones"
on public.team_players for all
using (
  exists (
    select 1 from public.teams t
    where t.id = team_players.team_id 
      and t.club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') 
      and (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
  )
);

-- POLÍTICAS: public.registrations
create policy "Ver inscripciones de su club"
on public.registrations for select
using (
  exists (
    select 1 from public.players p
    where p.id = registrations.player_id and p.club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
  ) or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan inscripciones"
on public.registrations for all
using (
  exists (
    select 1 from public.players p
    where p.id = registrations.player_id 
      and p.club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') 
      and (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
  )
);

-- POLÍTICAS: public.payments
create policy "Ver pagos de su club y pagos propios"
on public.payments for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club gestiona pagos"
on public.payments for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'admin')
);

-- POLÍTICAS: public.documents
create policy "Los usuarios ven sus propios documentos"
on public.documents for select
using ( auth.uid() = user_id or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

create policy "El admin de club y staff ven todos los documentos de su club"
on public.documents for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
);

create policy "El admin del club gestiona los documentos de su club"
on public.documents for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'admin')
);

create policy "El propio usuario inserta su documento"
on public.documents for insert
with check ( auth.uid() = user_id );

-- POLÍTICAS: public.announcements
create policy "Lectura de anuncios pública"
on public.announcements for select
using ( true );

create policy "Administradores y club gestionan anuncios"
on public.announcements for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'club')
);

-- POLÍTICAS: public.attendance
create policy "Miembros del club ven asistencias"
on public.attendance for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Cuerpo técnico y club gestionan asistencias"
on public.attendance for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.events
create policy "Miembros del club ven eventos"
on public.events for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Cuerpo técnico y club gestionan eventos"
on public.events for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.facilities
create policy "Miembros del club ven instalaciones"
on public.facilities for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club gestiona instalaciones"
on public.facilities for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'admin')
);

-- POLÍTICAS: public.facility_bookings
create policy "Miembros del club ven reservas de instalaciones"
on public.facility_bookings for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Miembros del club crean reservas de instalaciones"
on public.facility_bookings for insert
with check (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
);

create policy "Club y staff gestionan reservas de instalaciones"
on public.facility_bookings for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.feedback
create policy "Miembros leen su propio feedback"
on public.feedback for select
using ( auth.uid() = user_id or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

create policy "Miembros insertan su propio feedback"
on public.feedback for insert
with check ( auth.uid() = user_id );

create policy "Club gestiona feedback de su club"
on public.feedback for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'admin')
);

-- POLÍTICAS: public.training_feedback
create policy "Miembros leen feedback de entrenamiento de su club"
on public.training_feedback for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan feedback de entrenamiento"
on public.training_feedback for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.inventory
create policy "Miembros ven inventario de su club"
on public.inventory for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan inventario"
on public.inventory for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.inventory_loans
create policy "Miembros ven prestamos"
on public.inventory_loans for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan prestamos"
on public.inventory_loans for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.leads
create policy "Permitir inserción pública de leads"
on public.leads for insert
with check ( true );

create policy "Solo admin lee leads"
on public.leads for select
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- POLÍTICAS: public.support_tickets
create policy "Los usuarios ven/crean sus tickets de soporte"
on public.support_tickets for all
using ( auth.uid() = user_id or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- POLÍTICAS: public.versions
create policy "Lectura publica de versiones"
on public.versions for select
using ( true );

create policy "Solo admin edita versiones"
on public.versions for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- POLÍTICAS: public.medical_records
create policy "El propio jugador ve/edita su ficha medica"
on public.medical_records for all
using ( auth.uid() = player_id or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

create policy "El admin de club y staff ven fichas medicas de su club"
on public.medical_records for select
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin') and
  exists (
    select 1 from public.users_profiles p
    where p.id = medical_records.player_id and p.club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
  )
);

-- POLÍTICAS: public.injuries
create policy "Miembros ven lesiones de su club"
on public.injuries for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Club y staff gestionan lesiones"
on public.injuries for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and
  (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.seasons
create policy "Lectura de temporadas del club o globales"
on public.seasons for select
using (
  club_id is null or 
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Gestión de temporadas por club admin y platform admin"
on public.seasons for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' or 
  (club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') and (auth.jwt() -> 'user_metadata' ->> 'role') = 'club')
);

-- POLÍTICAS: public.config
create policy "Lectura publica de config"
on public.config for select
using ( true );

create policy "Solo admin edita config"
on public.config for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
