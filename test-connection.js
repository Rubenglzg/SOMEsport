import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: No se encontró el archivo .env');
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

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);
console.log('Key prefix:', supabaseAnonKey ? supabaseAnonKey.substring(0, 15) : 'none');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    console.log('Intentando iniciar sesión con elrubodevlc@gmail.com...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'elrubodevlc@gmail.com',
      password: '071288'
    });
    
    if (error) {
      console.error('Error devuelto por Supabase Auth:', {
        message: error.message,
        status: error.status,
        name: error.name,
        error: error
      });
    } else {
      console.log('¡Inicio de sesión exitoso!');
      console.log('User metadata:', data.user?.user_metadata);
      
      console.log('Consultando users_profiles...');
      const { data: profiles, error: profError } = await supabase
        .from('users_profiles')
        .select('*');
        
      if (profError) {
        console.error('Error al consultar users_profiles:', profError);
      } else {
        console.log('Perfiles encontrados:', profiles);
      }
    }
  } catch (err) {
    console.error('Excepción catastrófica:', err);
  }
}

test();
