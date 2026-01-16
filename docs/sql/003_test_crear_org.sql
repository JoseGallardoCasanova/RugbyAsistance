-- =====================================================
-- SCRIPT DE PRUEBA: Crear organización demo
-- Este script crea una organización de prueba para probar multi-tenant
-- NO afecta al equipo rugby original
-- =====================================================

-- 1. Crear organización de prueba
INSERT INTO organizaciones (
  nombre,
  slug,
  plan,
  estado,
  max_usuarios,
  max_jugadores,
  max_categorias,
  color_primario
) VALUES (
  'Club Deportivo Demo',
  'club-deportivo-demo',
  'pro',
  'active',
  20,
  500,
  20,
  '#70B77E'
) RETURNING *;

-- Guardar el ID de la organización creada
-- ID: [COPIAR_AQUI]

-- 2. Crear suscripción para la organización
INSERT INTO suscripciones (
  organizacion_id,
  plan,
  estado,
  precio_mensual,
  moneda,
  fecha_inicio,
  fecha_fin
) VALUES (
  '[PEGAR_ID_ORG]', -- Reemplazar con el ID de arriba
  'pro',
  'trialing',
  29.00,
  'USD',
  NOW(),
  NOW() + INTERVAL '14 days'
) RETURNING *;

-- 3. VERIFICACIÓN: Ver organizaciones creadas
SELECT 
  o.id,
  o.nombre,
  o.slug,
  o.plan,
  o.estado,
  s.estado as estado_suscripcion,
  s.fecha_fin
FROM organizaciones o
LEFT JOIN suscripciones s ON s.organizacion_id = o.id
WHERE o.slug = 'club-deportivo-demo';

-- 4. LIMPIAR (si quieres borrar la prueba)
-- DELETE FROM organizaciones WHERE slug = 'club-deportivo-demo';

-- =====================================================
-- NOTAS:
-- - Esto NO afecta datos del equipo rugby (tienen organizacion_id = NULL)
-- - Puedes crear múltiples orgs de prueba cambiando el slug
-- - Para probar en la app, necesitarás crear un usuario con organizacion_id
-- =====================================================
