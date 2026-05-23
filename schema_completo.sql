-- =========================================================================
-- SCHEMA COMPLETO PARA SOONER (SUPABASE POSTGRESQL)
-- =========================================================================
-- Copia y pega todo este script en la pestaña SQL Editor de tu panel de Supabase y dale a "Run"

-- Habilitar extensión para generación de UUIDs si no está habilitada
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. TABLA: clubs
-- =========================================================================
create table if not exists public.clubs (
    id uuid primary key default gen_random_uuid(),
    nombre varchar(255) not null,
    logotipo text,
    datos_fiscales jsonb, -- Almacena información fiscal estructurada (CIF, dirección, etc.)
    admin_id uuid not null, -- ID del administrador principal (vinculado a auth.users)
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 2. TABLA: users_profiles (Extensión de Auth para Roles y Clubes)
-- =========================================================================
create table if not exists public.users_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email varchar(255) not null,
    name varchar(255),
    username varchar(100),
    role varchar(50) not null default 'player' check (role in ('admin', 'club', 'player', 'staff')),
    club_id uuid references public.clubs(id) on delete set null,
    account_type varchar(100), -- Tipo de cuenta interno
    is_adult boolean default true not null, -- Indica si es mayor de edad
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Vincular clubs.admin_id a public.users_profiles para integridad referencial
alter table public.clubs drop constraint if exists fk_clubs_admin;
alter table public.clubs add constraint fk_clubs_admin foreign key (admin_id) references public.users_profiles(id) on delete restrict;

-- =========================================================================
-- 3. TABLA: teams
-- =========================================================================
create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    nombre varchar(255) not null,
    categoria varchar(100) not null,
    temporada varchar(50) not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 4. TABLA: players
-- =========================================================================
create table if not exists public.players (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade, -- Desnormalización para RLS
    nombre varchar(150) not null,
    apellidos varchar(150) not null,
    dni varchar(20) unique,
    fecha_nacimiento date not null,
    datos_tutor jsonb, -- Flexibilidad para almacenar datos de contacto (tutor_name, tutor_phone, tutor_email)
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 5. TABLA INTERMEDIA: team_players
-- =========================================================================
create table if not exists public.team_players (
    team_id uuid references public.teams(id) on delete cascade,
    player_id uuid references public.players(id) on delete cascade,
    created_at timestamp with time zone default now() not null,
    primary key (team_id, player_id)
);

-- =========================================================================
-- 6. TABLA: registrations (Fichas de inscripción)
-- =========================================================================
create table if not exists public.registrations (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references public.players(id) on delete cascade,
    estado_ficha varchar(50) not null default 'pendiente' check (estado_ficha in ('pendiente', 'enviada', 'aprobada', 'rechazada')),
    documento_url text, -- Ubicación del archivo en Supabase Storage
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 7. TABLA: payments
-- =========================================================================
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references public.players(id) on delete cascade,
    club_id uuid not null references public.clubs(id) on delete cascade,
    concepto varchar(255) not null,
    importe numeric(10, 2) not null check (importe >= 0),
    estado_pago varchar(50) not null default 'pendiente' check (estado_pago in ('pendiente', 'pagado', 'devuelto')),
    fecha_vencimiento date not null,
    id_pasarela varchar(255),
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 8. TABLA: documents (Archivos subidos)
-- =========================================================================
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users_profiles(id) on delete cascade,
    club_id uuid not null references public.clubs(id) on delete cascade,
    type varchar(50) not null check (type in ('dni', 'medical', 'parental', 'other')),
    file_name varchar(255) not null,
    url text not null,
    status varchar(50) not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    notes text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 9. TABLA: announcements (Tablón de anuncios)
-- =========================================================================
create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title varchar(255) not null,
    body text not null,
    author_id uuid not null references public.users_profiles(id) on delete cascade,
    author_name varchar(255) not null,
    scope varchar(50) not null check (scope in ('global', 'club')),
    club_id uuid references public.clubs(id) on delete cascade,
    created_at timestamp with time zone default now() not null,
    pinned boolean default false not null,
    image_url text,
    target_clubs jsonb default '[]'::jsonb not null, -- Array de clubes objetivo
    target_audience jsonb default '[]'::jsonb not null, -- Array de roles/tags
    read_by jsonb default '[]'::jsonb not null -- Array de UIDs de lectura
);

-- =========================================================================
-- 10. TABLA: attendance (Asistencia)
-- =========================================================================
create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null,
    event_title varchar(255) not null,
    club_id uuid not null references public.clubs(id) on delete cascade,
    date varchar(100) not null,
    records jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 11. TABLA: events (Calendario y Entrenamientos)
-- =========================================================================
create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    title varchar(255) not null,
    description text,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    location varchar(255),
    team_id uuid references public.teams(id) on delete set null,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 12. TABLA: facilities (Instalaciones)
-- =========================================================================
create table if not exists public.facilities (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    nombre varchar(255) not null,
    tipo varchar(100) not null,
    estado varchar(50) not null default 'disponible' check (estado in ('disponible', 'ocupada', 'mantenimiento')),
    capacidad integer default 0 not null,
    horario_inicio time,
    horario_fin time,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 13. TABLA: feedback (Sugerencias o Incidencias)
-- =========================================================================
create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users_profiles(id) on delete cascade,
    club_id uuid not null references public.clubs(id) on delete cascade,
    message text not null,
    category varchar(100) not null,
    status varchar(50) not null default 'pendiente' check (status in ('pendiente', 'leida', 'resuelta')),
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 14. TABLA: inventory (Material Deportivo)
-- =========================================================================
create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    nombre varchar(255) not null,
    cantidad integer not null check (cantidad >= 0),
    available_quantity integer not null default 0,
    min_threshold integer not null default 0,
    location varchar(255),
    categoria varchar(100),
    estado varchar(50) not null default 'bueno' check (estado in ('bueno', 'desgastado', 'roto')),
    updated_at timestamp with time zone default now() not null,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 15. TABLA: inventory_loans (Préstamos de Inventario)
-- =========================================================================
create table if not exists public.inventory_loans (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    item_id uuid not null references public.inventory(id) on delete cascade,
    coach_id uuid not null references public.users_profiles(id) on delete cascade,
    coach_name varchar(255) not null,
    team_id uuid references public.teams(id) on delete set null,
    team_name varchar(255),
    cantidad integer not null check (cantidad > 0),
    fecha_prestamo timestamp with time zone default now() not null,
    fecha_devolucion timestamp with time zone,
    status varchar(50) not null default 'prestado' check (status in ('prestado', 'devuelto')),
    notes text,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 16. TABLA: support_tickets (Soporte Técnico)
-- =========================================================================
create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users_profiles(id) on delete cascade,
    user_name varchar(255),
    user_email varchar(255),
    user_role varchar(50),
    club_id uuid references public.clubs(id) on delete cascade,
    subject varchar(255) not null,
    message text not null,
    status varchar(50) not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
    priority varchar(50) not null default 'medium' check (priority in ('low', 'medium', 'high')),
    replies jsonb default '[]'::jsonb not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 17. TABLA: versions (Historial de Versiones)
-- =========================================================================
create table if not exists public.versions (
    id uuid primary key default gen_random_uuid(),
    version varchar(50) not null unique,
    build_number integer not null,
    changelog jsonb default '[]'::jsonb not null,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 18. TABLA: medical_records (Fichas Médicas)
-- =========================================================================
create table if not exists public.medical_records (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references public.users_profiles(id) on delete cascade,
    blood_type varchar(20),
    allergies text,
    medical_conditions text,
    cardiac_history text,
    has_cardiac_history boolean default false not null,
    notes text,
    updated_at timestamp with time zone default now() not null,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 18b. TABLA: injuries (Lesiones e Historial Médico)
-- =========================================================================
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

-- =========================================================================
-- 18c. TABLA: leads (Formulario de Contacto Landing)
-- =========================================================================
create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    club_name varchar(255) not null,
    email varchar(255) not null,
    message text not null,
    status varchar(50) not null default 'new',
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 18d. TABLA: training_feedback (Feedback de Entrenamientos)
-- =========================================================================
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

-- =========================================================================
-- 19. TABLA: seasons (Temporadas del Club o Globales)
-- =========================================================================
create table if not exists public.seasons (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    start_date varchar(100) not null,
    end_date varchar(100) not null,
    is_active boolean default false not null,
    club_id uuid references public.clubs(id) on delete cascade,
    fees_by_category jsonb default '{}'::jsonb not null,
    payment_installments jsonb default '{"enabled": false, "installments": []}'::jsonb not null,
    created_at timestamp with time zone default now() not null
);

-- =========================================================================
-- 20. TABLA: config (Parámetros de Configuración del Sistema)
-- =========================================================================
create table if not exists public.config (
    key varchar(100) primary key,
    value jsonb not null,
    updated_at timestamp with time zone default now() not null
);

-- Insertar configuración inicial de versión
insert into public.config (key, value)
values ('app_version', '{"minVersion": "1.0.0", "downloadUrl": "https://avantiaesport.com", "maintenanceMode": false}')
on conflict (key) do update set value = excluded.value;


-- =========================================================================
-- TRIGGERS PARA CONTROL AUTOMÁTICO DE UPDATED_AT Y TIMESTAMPS
-- =========================================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger tr_update_clubs_updated_at before update on public.clubs for each row execute procedure public.update_updated_at_column();
create trigger tr_update_users_profiles_updated_at before update on public.users_profiles for each row execute procedure public.update_updated_at_column();
create trigger tr_update_teams_updated_at before update on public.teams for each row execute procedure public.update_updated_at_column();
create trigger tr_update_players_updated_at before update on public.players for each row execute procedure public.update_updated_at_column();
create trigger tr_update_registrations_updated_at before update on public.registrations for each row execute procedure public.update_updated_at_column();
create trigger tr_update_payments_updated_at before update on public.payments for each row execute procedure public.update_updated_at_column();
create trigger tr_update_documents_updated_at before update on public.documents for each row execute procedure public.update_updated_at_column();
create trigger tr_update_medical_records_updated_at before update on public.medical_records for each row execute procedure public.update_updated_at_column();

-- Sincronizar perfiles de users_profiles a auth.users para mantener el JWT actualizado
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


-- =========================================================================
-- AUTOMATIZACIÓN DE PERFILES DESDE AUTH.USERS
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_club_id uuid;
  v_role varchar(50);
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'player');
  
  -- 1. Insertar perfil con club_id temporalmente nulo
  insert into public.users_profiles (id, email, name, username, role, club_id, account_type, is_adult)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    v_role,
    null, -- temporalmente nulo
    coalesce(new.raw_user_meta_data->>'accountType', new.raw_user_meta_data->>'account_type', 'jugador'),
    coalesce((new.raw_user_meta_data->>'isAdult')::boolean, true)
  );

  if v_role = 'club' then
    -- 2. Crear el club asociado (ahora admin_id ya existe en users_profiles)
    v_club_id := gen_random_uuid();
    insert into public.clubs (id, nombre, admin_id)
    values (v_club_id, coalesce(new.raw_user_meta_data->>'name', 'Club ' || split_part(new.email, '@', 1)), new.id);
    
    -- 3. Actualizar el perfil con el club_id correcto
    update public.users_profiles
    set club_id = v_club_id
    where id = new.id;
  elsif (new.raw_user_meta_data->>'club_id') is not null and (new.raw_user_meta_data->>'club_id') <> '' then
    -- 2b. O actualizar con el club_id proporcionado
    update public.users_profiles
    set club_id = (new.raw_user_meta_data->>'club_id')::uuid
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================================
-- FUNCIONES DE APOYO CON SEGURIDAD DEFINIDA (Para evitar recursión infinita en RLS)
-- =========================================================================
create or replace function public.get_user_role(p_user_id uuid)
returns varchar as $$
  select coalesce(raw_user_meta_data->>'role', 'player') from auth.users where id = p_user_id;
$$ language sql security definer set search_path = auth, public;

create or replace function public.get_user_club_id(p_user_id uuid)
returns uuid as $$
  select (raw_user_meta_data->>'club_id')::uuid from auth.users where id = p_user_id;
$$ language sql security definer set search_path = auth, public;


-- =========================================================================
-- HABILITAR RLS (ROW LEVEL SECURITY)
-- =========================================================================
alter table public.clubs enable row level security;
alter table public.users_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.announcements enable row level security;
alter table public.attendance enable row level security;
alter table public.events enable row level security;
alter table public.facilities enable row level security;
alter table public.feedback enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_loans enable row level security;
alter table public.support_tickets enable row level security;
alter table public.versions enable row level security;
alter table public.medical_records enable row level security;
alter table public.seasons enable row level security;
alter table public.config enable row level security;

-- =========================================================================
-- DEFICINIÓN DE POLÍTICAS RLS (Row Level Security)
-- =========================================================================

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
  id = public.get_user_club_id(auth.uid()) or
  public.get_user_role(auth.uid()) = 'admin'
);

create policy "Admin y gestores actualizan su propio club"
on public.clubs for update
using (
  admin_id = auth.uid() or 
  public.get_user_role(auth.uid()) = 'admin'
);

create policy "Administrador de plataforma gestiona todos los clubes"
on public.clubs for all
using (
  public.get_user_role(auth.uid()) = 'admin'
);

-- POLÍTICAS: public.teams
create policy "Miembros ven equipos de su club"
on public.teams for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club y staff gestionan equipos"
on public.teams for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.players
create policy "Miembros ven jugadores de su club"
on public.players for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club y staff gestionan jugadores"
on public.players for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.team_players
create policy "Ver asignaciones de equipo de su club"
on public.team_players for select
using (
  exists (
    select 1 from public.teams t
    join public.users_profiles u on t.club_id = u.club_id
    where t.id = team_players.team_id and u.id = auth.uid()
  ) or (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club y staff gestionan asignaciones"
on public.team_players for all
using (
  exists (
    select 1 from public.teams t
    join public.users_profiles u on t.club_id = u.club_id
    where t.id = team_players.team_id and u.id = auth.uid() and u.role in ('club', 'staff', 'admin')
  )
);

-- POLÍTICAS: public.registrations
create policy "Ver inscripciones de su club"
on public.registrations for select
using (
  exists (
    select 1 from public.players p
    join public.users_profiles u on p.club_id = u.club_id
    where p.id = registrations.player_id and u.id = auth.uid()
  ) or (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club y staff gestionan inscripciones"
on public.registrations for all
using (
  exists (
    select 1 from public.players p
    join public.users_profiles u on p.club_id = u.club_id
    where p.id = registrations.player_id and u.id = auth.uid() and u.role in ('club', 'staff', 'admin')
  )
);

-- POLÍTICAS: public.payments
create policy "Ver pagos de su club y pagos propios"
on public.payments for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club gestiona pagos"
on public.payments for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'admin')
);

-- POLÍTICAS: public.documents
create policy "Los usuarios ven sus propios documentos"
on public.documents for select
using ( auth.uid() = user_id or (select role from public.users_profiles where id = auth.uid()) = 'admin' );

create policy "El admin de club y staff ven todos los documentos de su club"
on public.documents for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
);

create policy "El admin del club gestiona los documentos de su club"
on public.documents for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'admin')
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
  (select role from public.users_profiles where id = auth.uid()) in ('admin', 'club')
);

-- POLÍTICAS: public.attendance
create policy "Miembros del club ven asistencias"
on public.attendance for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Cuerpo técnico y club gestionan asistencias"
on public.attendance for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) and
  (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.events
create policy "Miembros del club ven eventos"
on public.events for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Cuerpo técnico y club gestionan eventos"
on public.events for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.facilities
create policy "Miembros del club ven instalaciones"
on public.facilities for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club gestiona instalaciones"
on public.facilities for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'admin')
);

-- POLÍTICAS: public.feedback
create policy "Miembros leen su propio feedback"
on public.feedback for select
using ( auth.uid() = user_id or (select role from public.users_profiles where id = auth.uid()) = 'admin' );

create policy "Miembros insertan su propio feedback"
on public.feedback for insert
with check ( auth.uid() = user_id );

create policy "Club gestiona feedback de su club"
on public.feedback for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'admin')
);

-- POLÍTICAS: public.inventory
create policy "Miembros ven inventario de su club"
on public.inventory for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club y staff gestionan inventario"
on public.inventory for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.inventory_loans
create policy "Miembros ven prestamos"
on public.inventory_loans for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Club y staff gestionan prestamos"
on public.inventory_loans for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff', 'admin')
);

-- POLÍTICAS: public.support_tickets
create policy "Los usuarios ven/crean sus tickets de soporte"
on public.support_tickets for all
using ( auth.uid() = user_id or (select role from public.users_profiles where id = auth.uid()) = 'admin' );

-- POLÍTICAS: public.versions
create policy "Lectura publica de versiones"
on public.versions for select
using ( true );

create policy "Solo admin edita versiones"
on public.versions for all
using (
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

-- POLÍTICAS: public.medical_records
create policy "El propio jugador ve/edita su ficha medica"
on public.medical_records for all
using ( auth.uid() = player_id or (select role from public.users_profiles where id = auth.uid()) = 'admin' );

create policy "El admin de club y staff ven fichas medicas de su club"
on public.medical_records for select
using (
  exists (
    select 1 from public.users_profiles p
    join public.users_profiles u on p.club_id = u.club_id
    where p.id = medical_records.player_id and u.id = auth.uid() and u.role in ('club', 'staff', 'admin')
  )
);

-- POLÍTICAS: public.seasons
create policy "Lectura de temporadas del club o globales"
on public.seasons for select
using (
  club_id is null or 
  club_id = (select club_id from public.users_profiles where id = auth.uid()) or
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

create policy "Gestión de temporadas por club admin y platform admin"
on public.seasons for all
using (
  (select role from public.users_profiles where id = auth.uid()) = 'admin' or 
  (club_id = (select club_id from public.users_profiles where id = auth.uid()) and (select role from public.users_profiles where id = auth.uid()) = 'club')
);

-- POLÍTICAS: public.config
create policy "Lectura publica de config"
on public.config for select
using ( true );

create policy "Solo admin edita config"
on public.config for all
using (
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);


-- =========================================================================
-- AUTOSINCRONIZACIÓN Y SEMILLAS DE SEGURIDAD (POST-INSTALACIÓN)
-- =========================================================================

-- 1. Sincronizar cualquier usuario que ya exista en auth.users y no tenga perfil aún
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

-- 2. Asegurar que los correos clave tengan los roles correspondientes
-- Modifica estos correos si utilizas otros para tus pruebas
update public.users_profiles
set role = 'admin', name = coalesce(name, 'Administrador Merch')
where email = 'fotoesportmerch@gmail.com';

update public.users_profiles
set role = 'club', name = coalesce(name, 'Club Demo')
where email = 'elrubodevlc@gmail.com';

update public.users_profiles
set role = 'player', account_type = 'jugador', is_adult = false, name = coalesce(name, 'Jugador Menor')
where email = 'mainscrowner@gmail.com';

update public.users_profiles
set role = 'player', account_type = 'jugador', is_adult = true, name = coalesce(name, 'Jugador Mayor')
where email = 'jugador_mayor@som-esport.com';

update public.users_profiles
set role = 'staff', account_type = 'entrenador', name = coalesce(name, 'Entrenador Demo')
where email = 'entrenador_demo@som-esport.com';

update public.users_profiles
set role = 'staff', account_type = 'directivo', name = coalesce(name, 'Directivo Demo')
where email = 'directivo_demo@som-esport.com';

