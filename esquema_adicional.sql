-- =========================================================================
-- ESQUEMA ADICIONAL PARA SOONER (Tablas Secundarias y Control RLS)
-- Copia y pega esto en la pestaña SQL Editor de tu panel de Supabase
-- =========================================================================

-- 1. TABLA: announcements (Tablón de anuncios)
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

alter table public.announcements enable row level security;

create policy "Lectura libre de anuncios"
on public.announcements for select
using ( true );

create policy "Administradores crean anuncios"
on public.announcements for all
using (
  (select role from public.users_profiles where id = auth.uid()) in ('admin', 'club')
);

-- 2. TABLA: attendance (Asistencia)
create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    date date not null,
    player_id uuid not null references public.users_profiles(id) on delete cascade,
    status varchar(50) not null check (status in ('presente', 'ausente', 'justificado')),
    created_at timestamp with time zone default now() not null,
    unique (team_id, date, player_id)
);

alter table public.attendance enable row level security;

create policy "Miembros del club ven asistencias"
on public.attendance for select
using (
  exists (
    select 1 from public.teams t
    join public.users_profiles u on t.club_id = u.club_id
    where t.id = attendance.team_id and u.id = auth.uid()
  )
);

create policy "Cuerpo técnico gestiona asistencias"
on public.attendance for all
using (
  exists (
    select 1 from public.teams t
    join public.users_profiles u on t.club_id = u.club_id
    where t.id = attendance.team_id and u.id = auth.uid() and u.role in ('club', 'staff')
  )
);

-- 3. TABLA: events (Calendario y Entrenamientos)
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

alter table public.events enable row level security;

create policy "Miembros del club ven eventos"
on public.events for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
);

create policy "Cuerpo técnico gestiona eventos"
on public.events for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff')
);

-- 4. TABLA: facilities (Instalaciones)
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

alter table public.facilities enable row level security;

create policy "Miembros del club ven instalaciones"
on public.facilities for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
);

create policy "Club gestiona instalaciones"
on public.facilities for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) = 'club'
);

-- 5. TABLA: feedback (Sugerencias o Incidencias)
create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users_profiles(id) on delete cascade,
    club_id uuid not null references public.clubs(id) on delete cascade,
    message text not null,
    category varchar(100) not null,
    status varchar(50) not null default 'pendiente' check (status in ('pendiente', 'leida', 'resuelta')),
    created_at timestamp with time zone default now() not null
);

alter table public.feedback enable row level security;

create policy "Miembros leen/crean su propio feedback"
on public.feedback for select
using ( auth.uid() = user_id );

create policy "Miembros insertan su propio feedback"
on public.feedback for insert
with check ( auth.uid() = user_id );

create policy "Club gestiona feedback de su club"
on public.feedback for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) = 'club'
);

-- 6. TABLA: inventory (Material Deportivo)
create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    nombre varchar(255) not null,
    cantidad integer not null check (cantidad >= 0),
    categoria varchar(100),
    estado varchar(50) not null default 'bueno' check (estado in ('bueno', 'desgastado', 'roto')),
    created_at timestamp with time zone default now() not null
);

alter table public.inventory enable row level security;

create policy "Miembros ven inventario de su club"
on public.inventory for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
);

create policy "Club y staff gestionan inventario de su club"
on public.inventory for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff')
);

-- 7. TABLA: inventory_loans (Préstamos de Inventario)
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

alter table public.inventory_loans enable row level security;

create policy "Miembros ven prestamos"
on public.inventory_loans for select
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
);

create policy "Club y staff gestionan prestamos"
on public.inventory_loans for all
using (
  club_id = (select club_id from public.users_profiles where id = auth.uid())
  and (select role from public.users_profiles where id = auth.uid()) in ('club', 'staff')
);

-- 8. TABLA: support_tickets (Soporte Técnico)
create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users_profiles(id) on delete cascade,
    subject varchar(255) not null,
    message text not null,
    status varchar(50) not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
    created_at timestamp with time zone default now() not null
);

alter table public.support_tickets enable row level security;

create policy "Los usuarios ven/crean sus tickets de soporte"
on public.support_tickets for all
using ( auth.uid() = user_id );

create policy "Los administradores de plataforma gestionan todo el soporte"
on public.support_tickets for all
using (
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

-- 9. TABLA: versions (Control de Versiones)
create table if not exists public.versions (
    id uuid primary key default gen_random_uuid(),
    version varchar(50) not null unique,
    build_number integer not null,
    changelog jsonb default '[]'::jsonb not null,
    created_at timestamp with time zone default now() not null
);

alter table public.versions enable row level security;

create policy "Lectura publica de versiones"
on public.versions for select
using ( true );

create policy "Solo admin edita versiones"
on public.versions for all
using (
  (select role from public.users_profiles where id = auth.uid()) = 'admin'
);

-- 10. TABLA: medical_records (Fichas Médicas de Jugadores)
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

alter table public.medical_records enable row level security;

create policy "El propio jugador ve/edita su ficha medica"
on public.medical_records for all
using ( auth.uid() = player_id );

create policy "El admin de club y staff ven fichas medicas de su club"
on public.medical_records for select
using (
  exists (
    select 1 from public.users_profiles p
    join public.users_profiles u on p.club_id = u.club_id
    where p.id = medical_records.player_id and u.id = auth.uid() and u.role in ('club', 'staff')
  )
);
