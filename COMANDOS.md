# 🛠️ Comandos Útiles para Desarrollo

## Instalación y Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Instalar Expo CLI globalmente (si no la tienes)
npm install -g expo-cli

# 3. Iniciar el proyecto en modo desarrollo
npm start
# O
expo start
```

## Desarrollo

```bash
# Iniciar y abrir directamente en Android
npm run android
# O
expo start --android

# Iniciar y abrir en iOS (solo Mac)
npm run ios
# O
expo start --ios

# Iniciar en navegador web
npm run web
# O
expo start --web

# Limpiar cache
expo start -c
```

## Ver Logs

```bash
# Ver logs en tiempo real (útil para debugging)
# Mientras el proyecto está corriendo, los logs aparecen automáticamente

# Para ver logs de Android específicamente:
adb logcat *:S ReactNative:V ReactNativeJS:V

# Para ver logs de iOS (solo Mac):
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "Rugby Asistencia"'
```

## Generar APK de Desarrollo

### Método 1: Con EAS Build (Recomendado)

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configurar proyecto
eas build:configure

# 4. Generar APK de desarrollo
eas build --profile development --platform android --local

# O para generar en la nube (más rápido):
eas build --profile development --platform android
```

### Método 2: Con Expo Build (Método clásico)

```bash
# Generar APK
expo build:android -t apk

# Seguir las instrucciones en pantalla
# Al final obtendrás un link para descargar el APK
```

## Testing en Dispositivo Físico

```bash
# 1. Instalar Expo Go en tu celular
# Descarga desde Play Store (Android) o App Store (iOS)

# 2. Iniciar el proyecto
npm start

# 3. Escanear el QR
# Android: Con Expo Go
# iOS: Con la cámara nativa
```

## Verificar Estado del Proyecto

```bash
# Ver versión de Expo
expo --version

# Ver info del proyecto
expo diagnostics

# Ver configuración
cat app.json
```

## Solucionar Problemas

```bash
# Limpiar todo y reinstalar
rm -rf node_modules
rm package-lock.json
npm install

# Limpiar cache de Metro Bundler
npm start -- --reset-cache

# Limpiar cache de Expo
expo start -c

# Si hay problemas con watchman (Mac/Linux)
watchman watch-del-all

# Si hay problemas con Gradle (Android)
cd android
./gradlew clean
cd ..
```

## Configuración de Google Sheets

```bash
# Ver guía completa
cat GOOGLE_SHEETS_SETUP.md

# Archivo de configuración (se guarda automáticamente en AsyncStorage)
# No hay archivo físico, la config está en el storage de la app
```

## Build para Producción

```bash
# APK de producción
eas build --platform android

# AAB (para Google Play Store)
eas build --platform android --profile production

# iOS (solo en Mac)
eas build --platform ios
```

## Usuarios de Prueba

Para testing rápido:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@rugby.cl | admin123 | Admin (acceso total) |
| entrenador@rugby.cl | entrenador123 | Entrenador (puede enviar) |
| ayudante@rugby.cl | ayudante123 | Ayudante (solo marcar, categoría 1) |

## Estructura de Directorios

```
rugby-attendance/
├── src/
│   ├── context/          # AuthContext
│   ├── data/             # Datos mock
│   ├── navigation/       # Stack Navigator
│   ├── screens/          # Todas las pantallas
│   ├── services/         # Google Sheets Service
│   └── types/            # TypeScript types
├── App.tsx               # Entry point
├── app.json              # Config de Expo
├── package.json          # Dependencias
└── README.md            # Documentación
```

## Tips de Desarrollo

### Hot Reload

El proyecto usa Fast Refresh. Los cambios se reflejan automáticamente sin reiniciar la app.

### Debugging

```bash
# Abrir React Native Debugger
# 1. Presiona 'm' en la terminal donde corre expo
# 2. Selecciona "Open React Native Debugger"

# O usa las Chrome DevTools
# 1. Presiona 'm' en la terminal
# 2. Selecciona "Open Chrome DevTools"
```

### Ver Performance

```bash
# Presiona 'Shift + m' para ver el menú de desarrollo en el dispositivo
# Ahí puedes:
# - Toggle Inspector
# - Toggle Performance Monitor
# - Enable/Disable Fast Refresh
```

## Personalización Rápida

### Cambiar Colores Principales

Busca en los archivos `.tsx` estas variables:

```typescript
// Color verde rugby
backgroundColor: '#1a472a'

// Color naranja acento
backgroundColor: '#ff6b35'

// Color azul info
backgroundColor: '#2196f3'
```

### Agregar Más Categorías

Edita `src/data/mockData.ts`:

```typescript
// Agregar jugadores con categoria: 8, 9, 10, etc.

export const getCategorias = (): number[] => {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Las que necesites
};
```

## Checklist Antes de Generar APK

- [ ] Probado en modo desarrollo
- [ ] Google Sheets funcionando correctamente
- [ ] Todas las pantallas probadas
- [ ] Login con los 3 roles
- [ ] Permisos de cámara funcionando
- [ ] AsyncStorage guardando datos
- [ ] Actualizado el número de versión en `app.json`

## Recursos Útiles

- Expo Docs: https://docs.expo.dev/
- React Navigation: https://reactnavigation.org/
- Google Sheets API: https://developers.google.com/sheets/api
- TypeScript: https://www.typescriptlang.org/

## Siguientes Pasos (Backend)

Cuando estés listo para NestJS:

```bash
# En un nuevo directorio
nest new rugby-backend
cd rugby-backend

# Instalar dependencias
npm install @nestjs/typeorm typeorm pg
npm install google-auth-library googleapis

# Estructura sugerida:
# - auth/
# - users/
# - attendance/
# - categories/
# - google-sheets/
```
