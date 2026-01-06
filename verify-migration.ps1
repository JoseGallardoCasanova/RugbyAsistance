# Script para verificar que la migración a Supabase está completa

Write-Host "🔍 Verificando migración a Supabase..." -ForegroundColor Cyan
Write-Host ""

# Verificar que no se usen los servicios antiguos
Write-Host "📋 Verificando archivos migrados..." -ForegroundColor Yellow

$hasOldRefs = $false

# Buscar DatabaseService
$dbRefs = Select-String -Path "src\screens\*.tsx","src\screens\admin\*.tsx","src\context\*.tsx" -Pattern "DatabaseService\." -ErrorAction SilentlyContinue
if ($dbRefs) {
    Write-Host "⚠️  Se encontraron referencias a DatabaseService:" -ForegroundColor Yellow
    $dbRefs | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
    $hasOldRefs = $true
} else {
    Write-Host "✅ No hay referencias a DatabaseService" -ForegroundColor Green
}
Write-Host ""

# Buscar GoogleSheetsService
$gsRefs = Select-String -Path "src\screens\*.tsx","src\screens\admin\*.tsx" -Pattern "GoogleSheetsService\." -ErrorAction SilentlyContinue
if ($gsRefs) {
    Write-Host "⚠️  Se encontraron referencias a GoogleSheetsService:" -ForegroundColor Yellow
    $gsRefs | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
    $hasOldRefs = $true
} else {
    Write-Host "✅ No hay referencias a GoogleSheetsService" -ForegroundColor Green
}
Write-Host ""

# Verificar que exista SupabaseService
if (Test-Path "src\services\SupabaseService.ts") {
    Write-Host "✅ SupabaseService.ts existe" -ForegroundColor Green
} else {
    Write-Host "❌ SupabaseService.ts NO existe" -ForegroundColor Red
}
Write-Host ""

# Verificar credenciales
Write-Host "🔑 Verificando credenciales..." -ForegroundColor Yellow
$supabaseFile = Get-Content "src\services\SupabaseService.ts" -Raw
if ($supabaseFile -match "tu-proyecto\.supabase\.co") {
    Write-Host "⚠️  IMPORTANTE: Debes configurar tus credenciales de Supabase" -ForegroundColor Yellow
    Write-Host "   Edita: src\services\SupabaseService.ts (líneas 5-6)" -ForegroundColor Gray
    Write-Host "   1. Ve a https://supabase.com" -ForegroundColor Gray
    Write-Host "   2. Crea un proyecto" -ForegroundColor Gray
    Write-Host "   3. Copia Project URL y anon key" -ForegroundColor Gray
} else {
    Write-Host "✅ Credenciales configuradas (verifica que sean correctas)" -ForegroundColor Green
}
Write-Host ""

# Verificar documentación
if (Test-Path "docs\SUPABASE_SETUP.md") {
    Write-Host "✅ Guía de setup existe: docs\SUPABASE_SETUP.md" -ForegroundColor Green
} else {
    Write-Host "❌ Guía de setup NO existe" -ForegroundColor Red
}

if (Test-Path "docs\MIGRACION_COMPLETADA.md") {
    Write-Host "✅ Resumen de migración existe: docs\MIGRACION_COMPLETADA.md" -ForegroundColor Green
} else {
    Write-Host "❌ Resumen de migración NO existe" -ForegroundColor Red
}
Write-Host ""

# Resumen
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
if (-not $hasOldRefs) {
    Write-Host "🎉 Migración completada correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📖 PRÓXIMO PASO: Configurar Supabase" -ForegroundColor Yellow
    Write-Host "   Lee la guía en: docs\SUPABASE_SETUP.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   O abre el archivo directamente:" -ForegroundColor Gray
    Write-Host "   code docs\SUPABASE_SETUP.md" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Hay algunas referencias antiguas que revisar" -ForegroundColor Yellow
}
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
