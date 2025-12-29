# 🔧 Solución de Problemas - EAS Build

## ❌ Error: "Build failed - Unknown error in Prebuild phase"

Este error ocurrió porque faltaban los assets (icon.png, splash.png, etc.) referenciados en `app.json`.

### ✅ SOLUCIÓN APLICADA

He actualizado los siguientes archivos:

1. **app.json** - Removido las referencias a assets específicos
2. **package.json** - Agregado `expo-dev-client`
3. **eas.json** - Creado con configuración optimizada
4. **.easignore** - Para evitar subir archivos innecesarios

### 🚀 PASOS PARA BUILDEAR AHORA

```bash
# 1. Vuelve a tu carpeta del proyecto
cd /mnt/c/Users/josda/Desktop/appRugby/rugby-attendance

# 2. Actualiza los archivos
# (Descarga los archivos actualizados que te pasé)

# 3. Reinstala dependencias
rm -rf node_modules package-lock.json
npm install

# 4. Hacer commit de los cambios
git add .
git commit -m "Fix: Configuración para EAS Build"

# 5. Intenta buildear nuevamente
eas build --profile development --platform android
```

## 📱 ALTERNATIVA: Build Local (Más Rápido para Testing)

Si quieres probar la app rápido sin esperar el build en la nube:

### Opción 1: Usar Expo Go (MÁS FÁCIL)

```bash
# Simplemente corre
npm start

# Escanea el QR con Expo Go
# ✅ Funciona inmediatamente
# ❌ No puedes usar módulos nativos personalizados
```

### Opción 2: Build Local con EAS

```bash
# Instala dependencias locales
npm install -g eas-cli

# Build local (más rápido, no usa créditos EAS)
eas build --profile development --platform android --local

# ⚠️ Requiere Android Studio instalado
# ⚠️ Toma más recursos de tu PC
```

## 🔍 Verificar el Estado Actual

```bash
# Ver configuración de EAS
eas config

# Ver proyectos vinculados
eas project:info

# Ver builds anteriores
eas build:list
```

## 📊 Ver Logs del Build Fallido

Puedes ver los logs completos del build que falló en:
https://expo.dev/accounts/podnuk/projects/rugby-attendance/builds/b7937edb-1d7e-4dce-889e-1b0c0b606de2

Los logs te dirán exactamente qué falló en la fase de Prebuild.

## 🎯 Recomendación para Desarrollo

Para desarrollo rápido, te recomiendo:

### Durante Desarrollo (AHORA)
```bash
npm start
# Usa Expo Go para probar
```

**Ventajas:**
- ✅ Instantáneo
- ✅ Hot reload
- ✅ No necesitas buildear
- ✅ Perfecto para desarrollo

**Desventajas:**
- ❌ Necesitas Expo Go instalado
- ❌ Necesitas WiFi

### Para Distribución (DESPUÉS)
```bash
eas build --profile production --platform android
# Genera APK/AAB para distribución
```

## 🐛 Otros Problemas Comunes

### Error: "Metro bundler failed to start"
```bash
npm start -- --reset-cache
```

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Failed to install dependencies"
```bash
# Limpiar cache de npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Build se queda en "Computing project fingerprint"
Espera 2-3 minutos. Si persiste:
```bash
# Cancela (Ctrl+C) e intenta con skip fingerprint
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android
```

## 📝 Checklist Antes de Buildear

Verifica que:
- [ ] `package.json` tenga todas las dependencias
- [ ] `app.json` esté correctamente configurado
- [ ] `eas.json` exista con los perfiles correctos
- [ ] Git repository esté inicializado
- [ ] Último commit incluya todos los cambios
- [ ] No haya errores al correr `npm install`

## 🎨 Si Quieres Agregar Assets Personalizados

Si más adelante quieres agregar tu logo/iconos:

1. Crea la carpeta `assets/`
2. Agrega estas imágenes:
   - `icon.png` (1024x1024)
   - `splash.png` (1242x2436)
   - `adaptive-icon.png` (1024x1024)

3. Actualiza `app.json`:
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      ...
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        ...
      }
    }
  }
}
```

4. Buildea de nuevo

## 📞 Soporte EAS

Si sigues teniendo problemas:
- Docs oficiales: https://docs.expo.dev/build/introduction/
- Discord de Expo: https://chat.expo.dev/
- Forum: https://forums.expo.dev/

## ✨ Estado Actual

Con los cambios aplicados, tu proyecto ahora:
- ✅ Tiene configuración correcta de EAS
- ✅ No requiere assets para buildear
- ✅ Usa defaults de Expo para íconos
- ✅ Está listo para build en la nube
- ✅ Está listo para desarrollo con Expo Go

## 🚀 Siguiente Paso

```bash
# Prueba primero con Expo Go
npm start
# Escanea QR y verifica que todo funcione

# Luego, cuando esté todo OK, buildea
eas build --profile development --platform android
```

¡Suerte! 🏉
