-- =========================================================================
-- SOONER (SOM ESPORT) - MIGRACIÓN DE LÓGICA DE NEGOCIO AVANZADA
-- =========================================================================
-- Desarrollado bajo la empresa madre Avantia Systems.
-- Este script implementa los triggers, funciones relacionales y automatizaciones
-- de base de datos para habilitar un funcionamiento SaaS 100% autónomo.
-- Copia y pega este script en el SQL Editor de tu panel de Supabase y dale a "Run".

-- =========================================================================
-- 1. AUTOMATIZACIÓN DE PAGOS POR TEMPORADA (seasons -> payments)
-- =========================================================================
-- Cuando una temporada se activa (is_active = true), esta función calcula
-- automáticamente las cuotas de pago fraccionadas de todos los jugadores 
-- según su categoría y genera los registros de pago en la tabla "payments".

CREATE OR REPLACE FUNCTION public.process_season_activation_payments()
RETURNS TRIGGER AS $$
DECLARE
    r_player RECORD;
    r_installment RECORD;
    v_total_fee NUMERIC;
    v_installment_amount NUMERIC;
    v_due_date DATE;
    v_concept VARCHAR(255);
    v_installments_enabled BOOLEAN;
    v_installments_json JSONB;
BEGIN
    -- Solo ejecutar cuando la temporada pase de inactiva a activa (is_active: false -> true)
    IF NEW.is_active = TRUE AND (OLD.is_active = FALSE OR OLD.is_active IS NULL) THEN
        
        -- Obtener si los pagos fraccionados están habilitados en esta temporada
        v_installments_enabled := COALESCE((NEW.payment_installments->>'enabled')::BOOLEAN, FALSE);
        v_installments_json := NEW.payment_installments->'installments';

        -- 1. Eliminar pagos pendientes previos de esta temporada para evitar duplicados
        DELETE FROM public.payments 
        WHERE club_id = NEW.club_id 
          AND estado_pago = 'pendiente'
          AND concepto LIKE ('%' || NEW.name || '%');

        -- 2. Iterar sobre todos los jugadores activos en el club
        FOR r_player IN 
            SELECT p.id, up.category 
            FROM public.players p
            JOIN public.users_profiles up ON p.id = up.id
            WHERE up.club_id = NEW.club_id 
              AND up.role = 'player' 
              AND up.account_type = 'jugador'
              AND up.status = 'Activo'
        LOOP
            -- 3. Calcular la cuota total según la categoría del jugador
            -- Si la categoría no está en fees_by_category, se busca una por defecto o se usa 0
            v_total_fee := COALESCE((NEW.fees_by_category->>r_player.category)::NUMERIC, 0.00);
            
            -- Si la cuota es 0, intentar usar un fallback genérico (ej. "General") o saltar
            IF v_total_fee = 0 THEN
                v_total_fee := COALESCE((NEW.fees_by_category->>'General')::NUMERIC, 0.00);
            END IF;

            -- Solo generar pagos si la cuota es mayor que cero
            IF v_total_fee > 0 THEN
                
                -- Caso A: Pagos fraccionados habilitados
                IF v_installments_enabled = TRUE AND jsonb_array_length(v_installments_json) > 0 THEN
                    
                    -- Iterar sobre cada cuota definida en el JSONB
                    FOR r_installment IN 
                        SELECT * FROM jsonb_to_recordset(v_installments_json) 
                        AS x(name text, percentage numeric, dueDate text)
                    LOOP
                        -- Calcular el importe proporcional
                        v_installment_amount := ROUND((v_total_fee * r_installment.percentage) / 100, 2);
                        v_due_date := COALESCE(r_installment.dueDate::DATE, NEW.start_date);
                        v_concept := r_installment.name || ' - ' || NEW.name || ' (' || COALESCE(r_player.category, 'General') || ')';

                        -- Insertar el pago correspondiente
                        INSERT INTO public.payments (
                            player_id,
                            club_id,
                            concepto,
                            importe,
                            estado_pago,
                            fecha_vencimiento,
                            created_at,
                            updated_at
                        ) VALUES (
                            r_player.id,
                            NEW.club_id,
                            v_concept,
                            v_installment_amount,
                            'pendiente',
                            v_due_date,
                            now(),
                            now()
                        );
                    END LOOP;

                ELSE
                    -- Caso B: Pago único (total de la cuota)
                    v_concept := 'Matrícula Completa - ' || NEW.name || ' (' || COALESCE(r_player.category, 'General') || ')';
                    
                    INSERT INTO public.payments (
                        player_id,
                        club_id,
                        concepto,
                        importe,
                        estado_pago,
                        fecha_vencimiento,
                        created_at,
                        updated_at
                    ) VALUES (
                        r_player.id,
                        NEW.club_id,
                        v_concept,
                        v_total_fee,
                        'pendiente',
                        NEW.start_date,
                        now(),
                        now()
                    );
                END IF;

            END IF;
        END LOOP;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para automatizar los pagos al activar temporada
DROP TRIGGER IF EXISTS tr_process_season_activation_payments ON public.seasons;
CREATE TRIGGER tr_process_season_activation_payments
    AFTER UPDATE ON public.seasons
    FOR EACH ROW
    EXECUTE FUNCTION public.process_season_activation_payments();


-- =========================================================================
-- 2. CONTROL AUTOMÁTICO DE STOCK DE INVENTARIO (inventory <-> inventory_loans)
-- =========================================================================
-- Trigger que decrementa la "available_quantity" en la tabla "inventory" cuando 
-- se registra un préstamo y la incrementa al ser devuelto o cancelado.

CREATE OR REPLACE FUNCTION public.sync_inventory_loans_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_current_available INTEGER;
BEGIN
    -- Caso 1: Nuevo préstamo (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- Verificar si hay suficiente stock disponible
        SELECT available_quantity INTO v_current_available 
        FROM public.inventory 
        WHERE id = NEW.item_id;

        IF v_current_available < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para el artículo. Disponible: %, Solicitado: %', 
                COALESCE(v_current_available, 0), NEW.cantidad;
        END IF;

        -- Restar del stock disponible solo si el estado es 'prestado'
        IF NEW.status = 'prestado' THEN
            UPDATE public.inventory
            SET available_quantity = available_quantity - NEW.cantidad
            WHERE id = NEW.item_id;
        END IF;

    -- Caso 2: Modificación del préstamo (UPDATE)
    ELSIF TG_OP = 'UPDATE' THEN
        -- Si cambia el estado de 'prestado' a 'devuelto' -> Devolver stock
        IF OLD.status = 'prestado' AND NEW.status = 'devuelto' THEN
            UPDATE public.inventory
            SET available_quantity = available_quantity + OLD.cantidad
            WHERE id = NEW.item_id;
        
        -- Si cambia de 'devuelto' a 'prestado' -> Restar stock
        ELSIF OLD.status = 'devuelto' AND NEW.status = 'prestado' THEN
            -- Verificar stock antes de re-prestar
            SELECT available_quantity INTO v_current_available 
            FROM public.inventory 
            WHERE id = NEW.item_id;

            IF v_current_available < NEW.cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para reactivar el préstamo. Disponible: %', v_current_available;
            END IF;

            UPDATE public.inventory
            SET available_quantity = available_quantity - NEW.cantidad
            WHERE id = NEW.item_id;

        -- Si el estado sigue siendo 'prestado' pero se cambia la cantidad
        ELSIF NEW.status = 'prestado' AND OLD.cantidad <> NEW.cantidad THEN
            -- Verificar stock del diferencial
            SELECT available_quantity INTO v_current_available 
            FROM public.inventory 
            WHERE id = NEW.item_id;

            IF v_current_available < (NEW.cantidad - OLD.cantidad) THEN
                RAISE EXCEPTION 'Stock insuficiente para aumentar la cantidad. Disponible adicional: %', v_current_available;
            END IF;

            UPDATE public.inventory
            SET available_quantity = available_quantity - (NEW.cantidad - OLD.cantidad)
            WHERE id = NEW.item_id;
        END IF;

    -- Caso 3: Eliminación del préstamo (DELETE)
    ELSIF TG_OP = 'DELETE' THEN
        -- Si el préstamo se elimina y estaba activo ('prestado'), devolvemos el stock
        IF OLD.status = 'prestado' THEN
            UPDATE public.inventory
            SET available_quantity = available_quantity + OLD.cantidad
            WHERE id = OLD.item_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para control de stock
DROP TRIGGER IF EXISTS tr_sync_inventory_loans_stock ON public.inventory_loans;
CREATE TRIGGER tr_sync_inventory_loans_stock
    BEFORE INSERT OR UPDATE OR DELETE ON public.inventory_loans
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_inventory_loans_stock();


-- =========================================================================
-- 3. VALIDACIÓN AUTOMÁTICA DE FICHA Y DOCUMENTOS (documents -> registrations)
-- =========================================================================
-- Función que se dispara cuando un jugador sube o el club aprueba/rechaza
-- los documentos ('dni', 'medical', 'parental'). Actualiza automáticamente
-- el estado de la inscripción (estado_ficha) del jugador en "registrations".

CREATE OR REPLACE FUNCTION public.sync_documents_to_registration_status()
RETURNS TRIGGER AS $$
DECLARE
    v_player_id UUID;
    v_club_id UUID;
    v_dni_status VARCHAR(50);
    v_medical_status VARCHAR(50);
    v_parental_status VARCHAR(50);
    v_has_dni BOOLEAN;
    v_has_medical BOOLEAN;
    v_has_parental BOOLEAN;
    v_registration_exists BOOLEAN;
BEGIN
    -- Determinar el user_id y club_id correspondiente
    v_player_id := COALESCE(NEW.user_id, OLD.user_id);
    v_club_id := COALESCE(NEW.club_id, OLD.club_id);

    -- Comprobar si existe una ficha de inscripción para este jugador
    SELECT EXISTS(SELECT 1 FROM public.registrations WHERE player_id = v_player_id) 
    INTO v_registration_exists;

    -- Si no existe la ficha, crearla automáticamente en estado 'pendiente'
    IF NOT v_registration_exists THEN
        INSERT INTO public.registrations (player_id, estado_ficha, created_at, updated_at)
        VALUES (v_player_id, 'pendiente', now(), now());
    END IF;

    -- Consultar el estado de los tres documentos obligatorios
    SELECT 
        MAX(CASE WHEN type = 'dni' THEN status END),
        MAX(CASE WHEN type = 'medical' THEN status END),
        MAX(CASE WHEN type = 'parental' THEN status END),
        EXISTS(SELECT 1 FROM public.documents WHERE user_id = v_player_id AND type = 'dni'),
        EXISTS(SELECT 1 FROM public.documents WHERE user_id = v_player_id AND type = 'medical'),
        EXISTS(SELECT 1 FROM public.documents WHERE user_id = v_player_id AND type = 'parental')
    INTO 
        v_dni_status, v_medical_status, v_parental_status,
        v_has_dni, v_has_medical, v_has_parental
    FROM public.documents
    WHERE user_id = v_player_id;

    -- Caso A: Si alguno de los tres documentos ha sido rechazado ('rejected')
    IF v_dni_status = 'rejected' OR v_medical_status = 'rejected' OR v_parental_status = 'rejected' THEN
        UPDATE public.registrations
        SET estado_ficha = 'rechazada',
            updated_at = now()
        WHERE player_id = v_player_id;

    -- Caso B: Si los tres documentos obligatorios están aprobados ('approved')
    ELSIF v_dni_status = 'approved' AND v_medical_status = 'approved' AND v_parental_status = 'approved' THEN
        UPDATE public.registrations
        SET estado_ficha = 'aprobada',
            updated_at = now()
        WHERE player_id = v_player_id;

    -- Caso C: Si los tres documentos han sido subidos y están en revisión/pendientes ('pending' u 'approved')
    ELSIF v_has_dni AND v_has_medical AND v_has_parental THEN
        UPDATE public.registrations
        SET estado_ficha = 'enviada', -- Enviada para revisión del Club
            updated_at = now()
        WHERE player_id = v_player_id;

    -- Caso D: Si falta subir algún documento obligatorio
    ELSE
        UPDATE public.registrations
        SET estado_ficha = 'pendiente',
            updated_at = now()
        WHERE player_id = v_player_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar estado de ficha según estado de documentos
DROP TRIGGER IF EXISTS tr_sync_documents_to_registration_status ON public.documents;
CREATE TRIGGER tr_sync_documents_to_registration_status
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_documents_to_registration_status();
