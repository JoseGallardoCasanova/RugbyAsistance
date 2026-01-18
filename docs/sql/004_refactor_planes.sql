-- ============================================
-- REFACTORIZAR SUSCRIPCIONES A PLANES FIJOS
-- ============================================
-- Fecha: 2026-01-18
-- Descripción: Crear tabla 'planes' con 3 planes fijos y refactorizar
--              organizaciones para referenciar plan_id en vez de duplicar
--              datos en tabla suscripciones.
--
-- IMPORTANTE: Ejecutar en horarios no hábiles o con coordinación
-- ============================================

-- Paso 1: Crear tabla planes con 3 planes fijos
CREATE TABLE IF NOT EXISTS planes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  precio_mensual INTEGER NOT NULL DEFAULT 0,
  max_usuarios INTEGER NOT NULL,
  max_jugadores INTEGER NOT NULL,
  max_categorias INTEGER NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar los 3 planes fijos
INSERT INTO planes (id, nombre, slug, precio_mensual, max_usuarios, max_jugadores, max_categorias, descripcion) VALUES
  (1, 'Free', 'free', 0, 3, 50, 3, 'Plan gratuito para equipos pequeños'),
  (2, 'Pro', 'pro', 15000, 20, 500, 20, 'Plan profesional para clubes medianos'),
  (3, 'Enterprise', 'enterprise', 50000, 999999, 999999, 999999, 'Plan empresarial sin límites');

-- Reiniciar secuencia para que próximo ID sea 4 (por si se agregan más planes)
SELECT setval('planes_id_seq', 3, true);

-- Paso 2: Agregar columna plan_id a organizaciones
ALTER TABLE organizaciones
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES planes(id);

-- Paso 3: Migrar datos existentes de organizaciones.plan (varchar) a plan_id (int)
UPDATE organizaciones
SET plan_id = CASE 
  WHEN plan = 'free' THEN 1
  WHEN plan = 'pro' THEN 2
  WHEN plan = 'enterprise' THEN 3
  ELSE 1 -- default a free si no coincide
END
WHERE plan_id IS NULL;

-- Paso 4: Hacer plan_id NOT NULL ahora que todos tienen valor
ALTER TABLE organizaciones
  ALTER COLUMN plan_id SET NOT NULL;

-- Paso 5: Eliminar columna plan antigua (ya no se usa)
-- CUIDADO: Comentado por seguridad, descomentar solo cuando estés seguro
-- ALTER TABLE organizaciones DROP COLUMN plan;

-- Paso 6: Eliminar columnas redundantes de organizaciones (ahora están en tabla planes)
-- CUIDADO: Comentado por seguridad
-- ALTER TABLE organizaciones DROP COLUMN max_usuarios;
-- ALTER TABLE organizaciones DROP COLUMN max_jugadores;
-- ALTER TABLE organizaciones DROP COLUMN max_categorias;

-- Paso 7: Refactorizar tabla suscripciones para ser historial de cambios
-- En vez de eliminarla, la convertimos en un log de cambios de plan
ALTER TABLE suscripciones
  ADD COLUMN IF NOT EXISTS plan_anterior_id INTEGER REFERENCES planes(id),
  ADD COLUMN IF NOT EXISTS plan_nuevo_id INTEGER REFERENCES planes(id);

-- Migrar datos existentes de suscripciones
UPDATE suscripciones
SET plan_nuevo_id = CASE 
  WHEN plan = 'free' THEN 1
  WHEN plan = 'pro' THEN 2
  WHEN plan = 'enterprise' THEN 3
  ELSE 1
END
WHERE plan_nuevo_id IS NULL;

-- ============================================
-- FUNCIONES HELPER
-- ============================================

-- Función para obtener límites de un plan
CREATE OR REPLACE FUNCTION obtener_limites_plan(p_plan_id INTEGER)
RETURNS TABLE (
  max_usuarios INTEGER,
  max_jugadores INTEGER,
  max_categorias INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.max_usuarios,
    p.max_jugadores,
    p.max_categorias
  FROM planes p
  WHERE p.id = p_plan_id
  AND p.activo = true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener información completa de una organización con su plan
CREATE OR REPLACE FUNCTION obtener_org_con_plan(p_org_id UUID)
RETURNS TABLE (
  org_id UUID,
  org_nombre VARCHAR,
  org_slug VARCHAR,
  org_estado VARCHAR,
  plan_id INTEGER,
  plan_nombre VARCHAR,
  plan_precio INTEGER,
  max_usuarios INTEGER,
  max_jugadores INTEGER,
  max_categorias INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.nombre,
    o.slug,
    o.estado,
    o.plan_id,
    p.nombre,
    p.precio_mensual,
    p.max_usuarios,
    p.max_jugadores,
    p.max_categorias
  FROM organizaciones o
  INNER JOIN planes p ON o.plan_id = p.id
  WHERE o.id = p_org_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organizaciones_plan_id ON organizaciones(plan_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_plan_nuevo_id ON suscripciones(plan_nuevo_id);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE planes IS 'Tabla catálogo con los planes disponibles (free, pro, enterprise)';
COMMENT ON COLUMN organizaciones.plan_id IS 'FK a tabla planes - define el plan activo de la organización';
COMMENT ON TABLE suscripciones IS 'Historial de cambios de planes y pagos de las organizaciones';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver todos los planes
SELECT * FROM planes ORDER BY id;

-- Ver organizaciones con su plan
SELECT 
  o.id,
  o.nombre,
  p.nombre as plan,
  p.precio_mensual,
  o.created_at
FROM organizaciones o
INNER JOIN planes p ON o.plan_id = p.id
ORDER BY o.created_at DESC;

-- Ver conteo por plan
SELECT 
  p.nombre,
  COUNT(o.id) as cantidad_orgs
FROM planes p
LEFT JOIN organizaciones o ON p.id = o.plan_id
GROUP BY p.id, p.nombre
ORDER BY p.id;
