#!/bin/bash
# Script para verificar que la migración a Supabase está completa

echo "🔍 Verificando migración a Supabase..."
echo ""

# Verificar que no se usen los servicios antiguos
echo "📋 Buscando referencias a DatabaseService..."
grep -r "DatabaseService\." src/screens src/context 2>/dev/null
if [ $? -eq 0 ]; then
    echo "⚠️  Se encontraron referencias a DatabaseService (revisar)"
else
    echo "✅ No hay referencias a DatabaseService"
fi
echo ""

echo "📋 Buscando referencias a GoogleSheetsService..."
grep -r "GoogleSheetsService\." src/screens 2>/dev/null
if [ $? -eq 0 ]; then
    echo "⚠️  Se encontraron referencias a GoogleSheetsService (revisar)"
else
    echo "✅ No hay referencias a GoogleSheetsService"
fi
echo ""

# Verificar que exista SupabaseService
if [ -f "src/services/SupabaseService.ts" ]; then
    echo "✅ SupabaseService.ts existe"
else
    echo "❌ SupabaseService.ts NO existe"
fi
echo ""

# Verificar credenciales
echo "🔑 Verificando credenciales..."
if grep -q "tu-proyecto.supabase.co" src/services/SupabaseService.ts; then
    echo "⚠️  IMPORTANTE: Debes configurar tus credenciales de Supabase"
    echo "   Edita: src/services/SupabaseService.ts (líneas 5-6)"
else
    echo "✅ Credenciales configuradas (verifica que sean correctas)"
fi
echo ""

# Verificar documentación
if [ -f "docs/SUPABASE_SETUP.md" ]; then
    echo "✅ Guía de setup existe: docs/SUPABASE_SETUP.md"
else
    echo "❌ Guía de setup NO existe"
fi
echo ""

if [ -f "docs/MIGRACION_COMPLETADA.md" ]; then
    echo "✅ Resumen de migración existe: docs/MIGRACION_COMPLETADA.md"
else
    echo "❌ Resumen de migración NO existe"
fi
echo ""

echo "🎉 Verificación completada"
echo ""
echo "📖 Lee la guía completa en: docs/SUPABASE_SETUP.md"
