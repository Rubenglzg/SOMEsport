-- =========================================================================
-- SOONER (SOM ESPORT) - MÓDULO MATCH DAY & PORTAL COMERCIAL MERCHANDISING
-- =========================================================================
-- Desarrollado de forma independiente por la empresa Avantia Systems.
-- Este script implementa las estructuras relacionales de base de datos,
-- vistas de caducidad médica y políticas de seguridad (RLS) granulares.
-- Copia y pega este script en el SQL Editor de tu panel de Supabase y dale a "Run".

-- =========================================================================
-- 1. ACTUALIZACIÓN DE LA TABLA DOCUMENTS (Caducidad Médica)
-- =========================================================================
-- Añadimos la columna de fecha de caducidad para llevar control burocrático.
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- =========================================================================
-- 2. VISTA DE EXPIRACIÓN DE RECONOCIMIENTOS MÉDICOS
-- =========================================================================
-- Filtra todos los jugadores que tengan el documento médico caducado
-- o a menos de 30 días de expirar para evitar sanciones al club.
CREATE OR REPLACE VIEW public.v_expired_medical_records AS
SELECT 
    p.id AS player_id,
    up.name AS player_name,
    up.email AS player_email,
    up.club_id,
    c.nombre AS club_name,
    d.id AS document_id,
    d.file_name,
    d.url AS document_url,
    d.status AS document_status,
    d.expiration_date,
    (d.expiration_date - CURRENT_DATE) AS days_until_expiration,
    CASE 
        WHEN d.expiration_date < CURRENT_DATE THEN 'caducado'
        ELSE 'proximo_a_caducar'
    END AS status_urgencia
FROM public.players p
JOIN public.users_profiles up ON p.id = up.id
LEFT JOIN public.clubs c ON up.club_id = c.id
LEFT JOIN public.documents d ON p.id = d.user_id AND d.type = 'medical'
WHERE d.expiration_date IS NOT NULL 
  AND (d.expiration_date < CURRENT_DATE OR d.expiration_date <= (CURRENT_DATE + INTERVAL '30 days'));


-- =========================================================================
-- 3. TABLA: match_convocations (Convocatorias de Partido)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.match_convocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'declinado')),
    transport_mode VARCHAR(50) NOT NULL DEFAULT 'por_cuenta_propia' CHECK (transport_mode IN ('autobus_club', 'por_cuenta_propia')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- Restricción única para evitar convocar al mismo jugador dos veces al mismo partido
    CONSTRAINT uq_event_player UNIQUE (event_id, player_id)
);

-- Habilitar RLS en convocatorias
ALTER TABLE public.match_convocations ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: public.match_convocations

-- 1. Los miembros del club pueden ver las convocatorias de su propio club
DROP POLICY IF EXISTS "Miembros del club ven convocatorias" ON public.match_convocations;
CREATE POLICY "Miembros del club ven convocatorias"
ON public.match_convocations FOR SELECT
USING (
    club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 2. El cuerpo técnico y directores pueden gestionar convocatorias
DROP POLICY IF EXISTS "Cuerpo tecnico y club gestionan convocatorias" ON public.match_convocations;
CREATE POLICY "Cuerpo tecnico y club gestionan convocatorias"
ON public.match_convocations FOR ALL
USING (
    club_id::text = (auth.jwt() -> 'user_metadata' ->> 'club_id') AND
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('club', 'staff', 'admin')
);

-- 3. Los jugadores/tutores pueden actualizar SU PROPIA convocatoria (cambiar estado o transporte)
DROP POLICY IF EXISTS "Jugadores actualizan su propia convocatoria" ON public.match_convocations;
CREATE POLICY "Jugadores actualizan su propia convocatoria"
ON public.match_convocations FOR UPDATE
USING (
    player_id = auth.uid()
)
WITH CHECK (
    player_id = auth.uid()
);

-- Trigger de updated_at para match_convocations
DROP TRIGGER IF EXISTS tr_update_match_convocations_updated_at ON public.match_convocations;
CREATE TRIGGER tr_update_match_convocations_updated_at 
    BEFORE UPDATE ON public.match_convocations 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.update_updated_at_column();
