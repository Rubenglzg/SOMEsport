-- =========================================================================
-- SCRIPT DE SEMILLA PARA USUARIOS DE PRUEBA EN SUPABASE AUTH Y PUBLIC
-- =========================================================================
-- Copia todo este script, pégalo en la pestaña SQL Editor de tu panel de Supabase y dale a "Run"

-- 1. HABILITAR EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FUNCIÓN DE AYUDA DINÁMICA PARA MIGRACIÓN DE IDENTIDADES
-- Corrige el mapeo exacto de provider_id para el proveedor 'email':
-- En Supabase Auth, para el proveedor 'email', el 'provider_id' de la identidad DEBE ser el correo electrónico (email) del usuario, no su UUID.
CREATE OR REPLACE FUNCTION public.seed_helper_insert_identity(
  p_user_id uuid,
  p_email text
) RETURNS void AS $$
DECLARE
  v_has_provider_id boolean;
BEGIN
  -- Comprobar si la columna provider_id existe en auth.identities
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
      AND table_name = 'identities' 
      AND column_name = 'provider_id'
  ) INTO v_has_provider_id;

  IF v_has_provider_id THEN
    -- Esquema moderno: id es un UUID interno y provider_id es el correo electrónico (text NOT NULL)
    EXECUTE '
      INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        jsonb_build_object(''sub'', $4, ''email'', $5),
        ''email'',
        now(),
        now(),
        now()
      )
      ON CONFLICT DO NOTHING
    ' USING p_user_id, p_email, p_user_id, p_user_id::text, p_email;
  ELSE
    -- Esquema clásico: id es el identificador de proveedor (el email en el caso de email provider)
    EXECUTE '
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        jsonb_build_object(''sub'', $3, ''email'', $4),
        ''email'',
        now(),
        now(),
        now()
      )
      ON CONFLICT DO NOTHING
    ' USING p_email, p_user_id, p_user_id::text, p_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ELIMINACIÓN LIMPIA DE USUARIOS DE PRUEBA PREVIOS
-- Primero eliminamos los clubes asociados a los administradores de prueba para evitar la restricción 'fk_clubs_admin' (que está configurada como ON DELETE RESTRICT)
DELETE FROM public.clubs WHERE admin_id IN (
  'c2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111'
);

-- Ahora eliminamos los usuarios de auth.users (lo que eliminará en cascada sus perfiles en public.users_profiles e identidades en auth.identities)
DELETE FROM auth.users WHERE email IN (
  'fotoesportmerch@gmail.com',
  'elrubodevlc@gmail.com',
  'mainscrowner@gmail.com',
  'jugador_mayor@som-esport.com',
  'entrenador_demo@som-esport.com',
  'directivo_demo@som-esport.com'
);


-- 4. INSERTAR EL ADMINISTRADOR GLOBAL
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'fotoesportmerch@gmail.com',
  crypt('071288Merch', gen_salt('bf', 10)),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Administrador Merch", "username": "admin", "role": "admin"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- Registrar su identidad mediante el ayudante dinámico corregido
SELECT public.seed_helper_insert_identity('a1111111-1111-1111-1111-111111111111', 'fotoesportmerch@gmail.com');


-- 5. INSERTAR EL USUARIO CLUB DEMO (CREA EL CLUB AUTOMÁTICAMENTE A TRAVÉS DE TRIGGERS)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'elrubodevlc@gmail.com',
  crypt('071288', gen_salt('bf', 10)),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Club Demo", "username": "club_demo", "role": "club"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- Registrar su identidad mediante el ayudante dinámico corregido
SELECT public.seed_helper_insert_identity('c2222222-2222-2222-2222-222222222222', 'elrubodevlc@gmail.com');


-- 6. OBTENER EL CLUB GENERADO E INSERTAR LOS OTROS ROLES ASOCIADOS
DO $$
DECLARE
  v_club_id uuid;
BEGIN
  -- Obtener el club_id que el trigger on_auth_user_created le asignó al usuario Club Demo
  SELECT club_id INTO v_club_id 
  FROM public.users_profiles 
  WHERE email = 'elrubodevlc@gmail.com';

  -- Si por algún motivo el trigger no se ejecutó, forzar la creación manual del club
  IF v_club_id IS NULL THEN
    v_club_id := '99999999-9999-9999-9999-999999999999'::uuid;
    
    INSERT INTO public.clubs (id, nombre, admin_id)
    VALUES (v_club_id, 'Club Demo', 'c2222222-2222-2222-2222-222222222222')
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.users_profiles
    SET club_id = v_club_id
    WHERE id = 'c2222222-2222-2222-2222-222222222222';
  END IF;

  RAISE NOTICE 'Se utilizará el Club ID: % para asociar los demás usuarios de prueba.', v_club_id;

  -- 6.1. INSERTAR JUGADOR MENOR
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    'f3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'mainscrowner@gmail.com',
    crypt('071288', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'Jugador Menor',
      'username', 'jugador_menor',
      'role', 'player',
      'accountType', 'jugador',
      'isAdult', false,
      'club_id', v_club_id
    ),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  PERFORM public.seed_helper_insert_identity('f3333333-3333-3333-3333-333333333333', 'mainscrowner@gmail.com');

  -- 6.2. INSERTAR JUGADOR MAYOR
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    'f4444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'jugador_mayor@som-esport.com',
    crypt('071288', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'Jugador Mayor',
      'username', 'jugador_mayor',
      'role', 'player',
      'accountType', 'jugador',
      'isAdult', true,
      'club_id', v_club_id
    ),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  PERFORM public.seed_helper_insert_identity('f4444444-4444-4444-4444-444444444444', 'jugador_mayor@som-esport.com');

  -- 6.3. INSERTAR ENTRENADOR DEMO
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    'd5555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'entrenador_demo@som-esport.com',
    crypt('071288', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'Entrenador Demo',
      'username', 'entrenador_demo',
      'role', 'staff',
      'accountType', 'entrenador',
      'club_id', v_club_id
    ),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  PERFORM public.seed_helper_insert_identity('d5555555-5555-5555-5555-555555555555', 'entrenador_demo@som-esport.com');

  -- 6.4. INSERTAR DIRECTIVO DEMO
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    'd6666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'directivo_demo@som-esport.com',
    crypt('071288', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'Directivo Demo',
      'username', 'directivo_demo',
      'role', 'staff',
      'accountType', 'directivo',
      'club_id', v_club_id
    ),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  PERFORM public.seed_helper_insert_identity('d6666666-6666-6666-6666-666666666666', 'directivo_demo@som-esport.com');

  -- 6.5. INSERTAR DATOS COMPLEMENTARIOS DE JUGADORES EN LA TABLA public.players
  -- (Evita que el panel de jugador falle al cargar su perfil de la base de datos de deportistas)
  
  -- Borrar registros previos en players
  DELETE FROM public.players WHERE id IN ('f3333333-3333-3333-3333-333333333333', 'f4444444-4444-4444-4444-444444444444');
  
  -- Jugador Menor
  INSERT INTO public.players (
    id,
    club_id,
    nombre,
    apellidos,
    dni,
    fecha_nacimiento,
    datos_tutor
  )
  VALUES (
    'f3333333-3333-3333-3333-333333333333',
    v_club_id,
    'Jugador',
    'Menor',
    '12345678A',
    '2012-05-15',
    '{"tutorName": "Tutor Demo", "tutorPhone": "600111222", "tutorEmail": "tutor@som-esport.com"}'::jsonb
  );

  -- Jugador Mayor
  INSERT INTO public.players (
    id,
    club_id,
    nombre,
    apellidos,
    dni,
    fecha_nacimiento,
    datos_tutor
  )
  VALUES (
    'f4444444-4444-4444-4444-444444444444',
    v_club_id,
    'Jugador',
    'Mayor',
    '87654321B',
    '1998-08-20',
    '{"tutorName": "", "tutorPhone": "", "tutorEmail": ""}'::jsonb
  );

END $$;


-- 7. REFORZAR LOS LOGINS CON USUARIO DIRECTO Y SINCRONIZAR SUS CAMPOS
-- Esto asegura que todas las propiedades de public.users_profiles estén perfectamente rellenadas
UPDATE public.users_profiles
SET role = 'admin', name = 'Administrador Merch', username = 'admin'
WHERE email = 'fotoesportmerch@gmail.com';

UPDATE public.users_profiles
SET role = 'club', name = 'Club Demo', username = 'club_demo'
WHERE email = 'elrubodevlc@gmail.com';

UPDATE public.users_profiles
SET role = 'player', account_type = 'jugador', is_adult = false, name = 'Jugador Menor', username = 'jugador_menor'
WHERE email = 'mainscrowner@gmail.com';

UPDATE public.users_profiles
SET role = 'player', account_type = 'jugador', is_adult = true, name = 'Jugador Mayor', username = 'jugador_mayor'
WHERE email = 'jugador_mayor@som-esport.com';

UPDATE public.users_profiles
SET role = 'staff', account_type = 'entrenador', name = 'Entrenador Demo', username = 'entrenador_demo'
WHERE email = 'entrenador_demo@som-esport.com';

UPDATE public.users_profiles
SET role = 'staff', account_type = 'directivo', name = 'Directivo Demo', username = 'directivo_demo'
WHERE email = 'directivo_demo@som-esport.com';


-- 8. SINCRONIZACIÓN FINAL INVERSA DE METADATOS EN EL JWT
-- Fuerza que el backend de Supabase contenga todos los metadatos de rol y club de forma consistente en el JWT
UPDATE auth.users u
SET raw_user_meta_data = 
  coalesce(u.raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', p.role,
    'club_id', p.club_id,
    'name', p.name,
    'username', p.username
  )
FROM public.users_profiles p
WHERE u.id = p.id;


-- 9. ELIMINAR LA FUNCIÓN DE AYUDA DE LA BASE DE DATOS
DROP FUNCTION IF EXISTS public.seed_helper_insert_identity(uuid, text);
