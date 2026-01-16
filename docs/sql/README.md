# Scripts SQL - Fase 2 Multi-Tenant

## ⚠️ IMPORTANTE - ORDEN DE EJECUCIÓN

Ejecutar estos scripts **en horario NO laboral** cuando el equipo rugby NO esté usando la app.

### Paso 1: Crear tablas nuevas (0% riesgo)
```bash
# En Supabase SQL Editor:
```
1. Ejecutar: `001_multi_tenant_tables.sql`
2. Verificar que las queries de verificación retornen 0

### Paso 2: Agregar columnas opcionales (0% riesgo)
```bash
# En Supabase SQL Editor:
```
1. Ejecutar: `002_add_org_columns.sql`
2. Verificar que todas las columnas organizacion_id sean NULL

### Paso 3: Migración del equipo rugby (PENDIENTE)
**NO ejecutar aún.** Se creará cuando decidas activar multi-tenant para el equipo actual.

---

## Estado Actual

- ✅ Scripts creados y documentados
- ⏸️ Pendiente de ejecución en horario no laboral
- ⏸️ App sigue funcionando normal sin cambios

## Verificación Post-Ejecución

Después de ejecutar los scripts, verifica que la app siga funcionando:
1. Login de usuarios existentes
2. Ver categorías
3. Ver jugadores
4. Registrar asistencias

**Todo debe funcionar exactamente igual que antes.**

---

## Rollback (si algo falla)

Si por alguna razón necesitas revertir:

```sql
-- Revertir columnas
ALTER TABLE usuarios DROP COLUMN IF EXISTS organizacion_id;
ALTER TABLE categorias DROP COLUMN IF EXISTS organizacion_id;
ALTER TABLE jugadores DROP COLUMN IF EXISTS organizacion_id;
ALTER TABLE asistencias DROP COLUMN IF EXISTS organizacion_id;

-- Revertir tablas
DROP TABLE IF EXISTS invitaciones;
DROP TABLE IF EXISTS suscripciones;
DROP TABLE IF EXISTS organizaciones;
```

**Nota:** El rollback es completamente seguro porque no modificamos datos existentes.
