import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar archivo .env de forma segura y sin dependencias externas
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: No se encontró el archivo .env en la raíz del proyecto.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) {
  console.error('Error: Asegúrate de tener configurado tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY correctos en el archivo .env');
  process.exit(1);
}

console.log(`Conectando a Supabase URL: ${supabaseUrl}...`);
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// 2. Definición de usuarios de prueba (asociados a los botones rápidos de Login.tsx)
const testUsers = [
  {
    email: 'fotoesportmerch@gmail.com',
    password: '071288Merch',
    metadata: {
      name: 'Administrador Merch',
      username: 'admin',
      role: 'admin'
    }
  },
  {
    email: 'elrubodevlc@gmail.com',
    password: '071288',
    metadata: {
      name: 'Club Demo',
      username: 'club_demo',
      role: 'club'
    }
  },
  {
    email: 'mainscrowner@gmail.com',
    password: '071288',
    metadata: {
      name: 'Jugador Menor',
      username: 'jugador_menor',
      role: 'player',
      accountType: 'jugador',
      isAdult: false
    }
  },
  {
    email: 'jugador_mayor@som-esport.com',
    password: '071288',
    metadata: {
      name: 'Jugador Mayor',
      username: 'jugador_mayor',
      role: 'player',
      accountType: 'jugador',
      isAdult: true
    }
  },
  {
    email: 'entrenador_demo@som-esport.com',
    password: '071288',
    metadata: {
      name: 'Entrenador Demo',
      username: 'entrenador_demo',
      role: 'staff',
      accountType: 'entrenador'
    }
  },
  {
    email: 'directivo_demo@som-esport.com',
    password: '071288',
    metadata: {
      name: 'Directivo Demo',
      username: 'directivo_demo',
      role: 'staff',
      accountType: 'directivo'
    }
  }
];

async function seed() {
  console.log('\n--- Sembrando Usuarios de Prueba en Supabase Auth ---');
  console.log('IMPORTANTE: Primero debes copiar e importar schema_completo.sql en el SQL Editor de tu panel de Supabase.');
  console.log('IMPORTANTE: Asegúrate de desactivar "Confirm email" (Confirmar correo electrónico) en Authentication -> Providers -> Email de tu panel Supabase antes de ejecutar esto para permitir el login inmediato.');

  for (const user of testUsers) {
    console.log(`\nRegistrando usuario: ${user.email} (${user.metadata.role})...`);
    
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: user.metadata
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log(`ℹ️  El usuario ${user.email} ya está registrado en Supabase Auth.`);
      } else {
        console.error(`❌ Error registrando a ${user.email}:`, error.message);
      }
    } else if (data && data.user) {
      console.log(`✅ ¡Creado correctamente! UID: ${data.user.id}`);
    }
  }

  console.log('\n🎉 Proceso de siembra finalizado.');
}

seed();
