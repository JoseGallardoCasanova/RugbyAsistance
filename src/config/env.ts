/**
 * Environment variables configuration
 * Las variables de entorno se cargan desde .env
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Validar que las variables existen
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '⚠️ Faltan variables de entorno requeridas.\n' +
    'Asegúrate de tener un archivo .env con:\n' +
    '- SUPABASE_URL\n' +
    '- SUPABASE_ANON_KEY\n\n' +
    'Usa .env.example como referencia.'
  );
}

export const ENV = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} as const;

export default ENV;
