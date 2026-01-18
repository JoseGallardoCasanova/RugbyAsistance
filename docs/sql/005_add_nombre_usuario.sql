-- ============================================
-- AGREGAR COLUMNA nombre_usuario A usuarios
-- ============================================
-- Fecha: 2026-01-18
-- Descripción: Agregar campo nombre_usuario a tabla usuarios
--              para permitir usernames personalizados
-- ============================================

-- Agregar columna nombre_usuario (opcional, único)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(50) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario ON usuarios(nombre_usuario);

-- Comentario
COMMENT ON COLUMN usuarios.nombre_usuario IS 'Nombre de usuario personalizado (opcional, único)';

-- ============================================
-- MIGRACIÓN DE DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- Si quieres auto-generar usernames para usuarios existentes:
-- Descomenta estas líneas después de verificar que funciona
/*
UPDATE usuarios
SET nombre_usuario = LOWER(
  SUBSTRING(SPLIT_PART(nombre, ' ', 1), 1, 2) || 
  REPLACE(SPLIT_PART(nombre, ' ', 2), ' ', '')
)
WHERE nombre_usuario IS NULL
AND nombre IS NOT NULL
AND nombre != '';
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver usuarios con nombre_usuario
SELECT id, nombre, nombre_usuario, email, role
FROM usuarios
ORDER BY id;
