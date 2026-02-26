# Script para limpiar completamente el caché de React Native y Expo

Write-Host "🧹 Limpiando caché completo..." -ForegroundColor Green

# 1. Limpiar caché de npm
Write-Host "📦 Limpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force

# 2. Limpiar caché de Expo
Write-Host "🔄 Limpiando caché de Expo..." -ForegroundColor Yellow
npx expo start --clear

Write-Host "✅ ¡Caché limpiado! Ahora reinicia la app en tu dispositivo." -ForegroundColor Green
Write-Host "   1. Cierra completamente la app en tu dispositivo" -ForegroundColor Cyan
Write-Host "   2. Vuelve a abrirla desde Expo Go" -ForegroundColor Cyan
