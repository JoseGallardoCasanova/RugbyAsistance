/**
 * Script de prueba para OrganizacionService
 * 
 * Para ejecutar:
 * 1. Importar este archivo en App.tsx temporalmente
 * 2. Llamar testOrganizacionService() en useEffect
 * 3. Ver logs en consola
 */

import OrganizacionService from '../services/OrganizacionService';

export async function testOrganizacionService() {
  console.log('🧪 ========== PRUEBA ORGANIZACION SERVICE ==========');

  // 1. Verificar modo multi-tenant
  console.log('\n1️⃣ Detectando modo...');
  const isMultiTenant = await OrganizacionService.isMultiTenantEnabled();
  console.log(`   ${isMultiTenant ? '✅' : '⚠️'} Multi-tenant: ${isMultiTenant ? 'ACTIVADO' : 'DESACTIVADO (modo legacy)'}`);

  if (!isMultiTenant) {
    console.log('   📝 Para activar, ejecuta 003_test_crear_org.sql');
    return;
  }

  // 2. Crear organización de prueba
  console.log('\n2️⃣ Creando organización de prueba...');
  const resultado = await OrganizacionService.crearOrganizacion({
    nombre: 'Club Test App',
    email_admin: 'admin@clubtest.com',
    plan: 'pro',
  });

  if (resultado) {
    console.log('   ✅ Organización creada:', resultado.organizacion.nombre);
    console.log('   ✅ Suscripción creada:', resultado.suscripcion.plan);
    console.log('   📋 ID:', resultado.organizacion.id);
    console.log('   🔗 Slug:', resultado.organizacion.slug);

    // 3. Verificar límites
    console.log('\n3️⃣ Verificando límites...');
    const limites = await OrganizacionService.verificarLimites(resultado.organizacion.id);
    console.log('   📊 Usuarios:', limites.usuarios.actual, '/', limites.usuarios.maximo);
    console.log('   📊 Jugadores:', limites.jugadores.actual, '/', limites.jugadores.maximo);
    console.log('   📊 Categorías:', limites.categorias.actual, '/', limites.categorias.maximo);
  } else {
    console.log('   ❌ Error creando organización');
  }

  console.log('\n🧪 ========== FIN PRUEBA ==========');
}

/**
 * Para probar desde App.tsx:
 * 
 * import { testOrganizacionService } from './tests/testOrganizacion';
 * 
 * useEffect(() => {
 *   testOrganizacionService();
 * }, []);
 */
