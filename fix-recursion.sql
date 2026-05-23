-- =========================================================================
-- SOLUCIÓN DEFINITIVA A RECURSIÓN INFINITA EN POLÍTICAS RLS DE SOONER
-- =========================================================================
-- Copia y pega todo este script en la pestaña SQL Editor de tu panel de Supabase y dale a "Run"

-- 1. Crear el disparador para sincronizar cambios de perfil hacia auth.users
-- Esto asegura que auth.users.raw_user_meta_data siempre esté actualizado y se refleje en el JWT
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

-- 2. Reescribir las funciones de apoyo para leer de auth.users (que NO tiene RLS)
-- Esto elimina completamente la posibilidad de recursión infinita en RLS
create or replace function public.get_user_role(p_user_id uuid)
returns varchar as $$
  select coalesce(raw_user_meta_data->>'role', 'player') from auth.users where id = p_user_id;
$$ language sql security definer set search_path = auth, public;

create or replace function public.get_user_club_id(p_user_id uuid)
returns uuid as $$
  select (raw_user_meta_data->>'club_id')::uuid from auth.users where id = p_user_id;
$$ language sql security definer set search_path = auth, public;

-- 3. Eliminar las políticas conflictivas de users_profiles
drop policy if exists "Lectura de perfiles de su propio club y propio perfil" on public.users_profiles;
drop policy if exists "Actualización de su propio perfil" on public.users_profiles;
drop policy if exists "Admin del club y admin de plataforma gestionan perfiles" on public.users_profiles;

-- 4. Crear las nuevas políticas seguras, ultra-rápidas y libres de recursión usando el JWT
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

-- 5. Sincronizar todos los usuarios existentes inmediatamente
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

-- 6. Asegurar columnas completas en support_tickets
alter table public.support_tickets add column if not exists user_name varchar(255);
alter table public.support_tickets add column if not exists user_email varchar(255);
alter table public.support_tickets add column if not exists user_role varchar(50);
alter table public.support_tickets add column if not exists club_id uuid references public.clubs(id) on delete cascade;
alter table public.support_tickets add column if not exists priority varchar(50) not null default 'medium';
alter table public.support_tickets add column if not exists replies jsonb default '[]'::jsonb not null;
alter table public.support_tickets add column if not exists updated_at timestamp with time zone default now() not null;

-- 7. Crear e inicializar tabla public.injuries si no existe
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

drop trigger if exists tr_update_injuries_updated_at on public.injuries;
create trigger tr_update_injuries_updated_at before update on public.injuries for each row execute procedure public.update_updated_at_column();

alter table public.injuries enable row level security;

drop policy if exists "Miembros ven lesiones de su club" on public.injuries;
create policy "Miembros ven lesiones de su club"
on public.injuries for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Club y staff gestionan lesiones" on public.injuries;
create policy "Club y staff gestionan lesiones"
on public.injuries for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);

-- 8. Crear e inicializar tabla public.leads si no existe
create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    club_name varchar(255) not null,
    email varchar(255) not null,
    message text not null,
    status varchar(50) not null default 'new',
    created_at timestamp with time zone default now() not null
);

alter table public.leads enable row level security;

drop policy if exists "Permitir inserción pública de leads" on public.leads;
create policy "Permitir inserción pública de leads"
on public.leads for insert
with check ( true );

drop policy if exists "Solo admin lee leads" on public.leads;
create policy "Solo admin lee leads"
on public.leads for select
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 9. Asegurar columnas y disparador en public.inventory
alter table public.inventory add column if not exists available_quantity integer not null default 0;
alter table public.inventory add column if not exists min_threshold integer not null default 0;
alter table public.inventory add column if not exists location varchar(255);
alter table public.inventory add column if not exists updated_at timestamp with time zone default now() not null;

drop trigger if exists tr_update_inventory_updated_at on public.inventory;
create trigger tr_update_inventory_updated_at before update on public.inventory for each row execute procedure public.update_updated_at_column();

-- 10. Crear e inicializar tabla public.training_feedback si no existe
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

alter table public.training_feedback enable row level security;

drop policy if exists "Miembros leen feedback de entrenamiento de su club" on public.training_feedback;
create policy "Miembros leen feedback de entrenamiento de su club"
on public.training_feedback for select
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') or
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Club y staff gestionan feedback de entrenamiento" on public.training_feedback;
create policy "Club y staff gestionan feedback de entrenamiento"
on public.training_feedback for all
using (
  club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id')
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('club', 'staff', 'admin')
);
