-- =========================================================================
-- MÓDULO DE LIGAS Y CLASIFICACIONES DE SOONER
-- =========================================================================
-- Copia y pega todo este script en la pestaña SQL Editor de tu panel de Supabase y dale a "Run"

-- 1. CREAR LA TABLA DE CLASIFICACIONES DE LIGA (league_standings)
CREATE TABLE IF NOT EXISTS public.league_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL, -- Soporta tanto equipos de nuestro club como rivales
    category VARCHAR(100) NOT NULL, -- Categoría (Ej: Alevín, Infantil, Senior)
    played INTEGER DEFAULT 0 NOT NULL,
    won INTEGER DEFAULT 0 NOT NULL,
    drawn INTEGER DEFAULT 0 NOT NULL,
    lost INTEGER DEFAULT 0 NOT NULL,
    goals_for INTEGER DEFAULT 0 NOT NULL,
    goals_against INTEGER DEFAULT 0 NOT NULL,
    points INTEGER DEFAULT 0 NOT NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE RLS PARA league_standings
DROP POLICY IF EXISTS "Miembros de club leen clasificaciones" ON public.league_standings;
CREATE POLICY "Miembros de club leen clasificaciones"
ON public.league_standings FOR SELECT
USING (
  club_id = (SELECT club_id FROM public.users_profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.users_profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Cuerpo técnico gestiona clasificaciones" ON public.league_standings;
CREATE POLICY "Cuerpo técnico gestiona clasificaciones"
ON public.league_standings FOR ALL
USING (
  club_id = (SELECT club_id FROM public.users_profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.users_profiles WHERE id = auth.uid()) IN ('club', 'staff', 'admin')
);

-- 3. TRIGGER AUTOMÁTICO DE ACTUALIZACIÓN DE updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_league_standings_updated_at ON public.league_standings;
CREATE TRIGGER tr_update_league_standings_updated_at
BEFORE UPDATE ON public.league_standings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. PUNTOS POR DEFECTO PARA NUEVOS EQUIPOS EN CLASIFICACIÓN
-- Inserta la plantilla de una liga simulada estable al iniciar la tabla para una categoría
CREATE OR REPLACE FUNCTION public.initialize_simulated_league(p_club_id UUID, p_team_id UUID, p_team_name VARCHAR, p_category VARCHAR)
RETURNS VOID AS $$
BEGIN
    -- Insertar equipo del club
    INSERT INTO public.league_standings (club_id, team_id, team_name, category, played, won, drawn, lost, goals_for, goals_against, points, position)
    VALUES (p_club_id, p_team_id, p_team_name, p_category, 0, 0, 0, 0, 0, 0, 0, 1)
    ON CONFLICT DO NOTHING;

    -- Insertar rivales
    INSERT INTO public.league_standings (club_id, team_name, category, played, won, drawn, lost, goals_for, goals_against, points, position)
    VALUES 
        (p_club_id, 'Atlético Balompié', p_category, 4, 3, 0, 1, 8, 3, 9, 2),
        (p_club_id, 'Sporting Club', p_category, 4, 2, 1, 1, 6, 4, 7, 3),
        (p_club_id, 'Deportivo Unión', p_category, 4, 2, 0, 2, 5, 5, 6, 4),
        (p_club_id, 'Real Esport', p_category, 4, 1, 2, 1, 4, 4, 5, 5),
        (p_club_id, 'CD Estrella', p_category, 4, 1, 1, 2, 3, 5, 4, 6),
        (p_club_id, 'Rayo Club', p_category, 4, 1, 0, 3, 2, 7, 3, 7),
        (p_club_id, 'UD Olimpo', p_category, 4, 0, 2, 2, 2, 6, 2, 8),
        (p_club_id, 'Tormenta CF', p_category, 4, 0, 1, 3, 1, 8, 1, 9)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
