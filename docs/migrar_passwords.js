// ============================================
// SCRIPT DE MIGRACIÓN DE PASSWORDS
// ============================================
// Este script migra passwords en texto plano a SHA-256 + Salt
// EJECUTAR SOLO UNA VEZ después de implementar hashing
// ============================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ⚠️ CONFIGURACIÓN - Usar variables de entorno en producción
const SUPABASE_URL = 'TU_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = 'TU_SERVICE_ROLE_KEY'; // ⚠️ NO usar anon key, usar service_role

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generateSalt(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function hashPassword(password) {
  const salt = generateSalt();
  const combined = password + salt;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  return `${salt}:${hash}`;
}

async function migrarPasswords() {
  try {
    console.log('🔄 Iniciando migración de passwords a SHA-256...');
    
    // Obtener todos los usuarios
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, username, password_hash')
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`📊 Total de usuarios: ${usuarios.length}`);
    
    let migrados = 0;
    let saltados = 0;

    for (const usuario of usuarios) {
      // Verificar si ya está hasheado (formato salt:hash contiene ':')
      if (usuario.password_hash.includes(':')) {
        console.log(`⏭️  ${usuario.username}: Ya está hasheado, saltando...`);
        saltados++;
        continue;
      }

      // Hashear password
      const passwordHashed = hashPassword(usuario.password_hash);
      
      // Actualizar en BD
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ password_hash: passwordHashed })
        .eq('id', usuario.id);

      if (updateError) {
        console.error(`❌ Error al migrar ${usuario.username}:`, updateError.message);
      } else {
        console.log(`✅ ${usuario.username}: Password migrado`);
        migrados++;
      }
    }

    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log(`✅ Migrados: ${migrados}`);
    console.log(`⏭️  Saltados (ya hasheados): ${saltados}`);
    console.log(`📊 Total procesados: ${usuarios.length}`);
    
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
  }
}

// EJECUTAR
if (require.main === module) {
  migrarPasswords()
    .then(() => {
      console.log('\n✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrarPasswords };
