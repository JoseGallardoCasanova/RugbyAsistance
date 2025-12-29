# 📸 Assets Necesarios para la App

La app necesita algunos assets (imágenes) para funcionar correctamente. Por ahora, Expo usará placeholders automáticos, pero para una versión más profesional, deberías crear estos archivos:

## Imágenes Requeridas

### 1. Icon (Ícono de la app)

**Ubicación**: `assets/icon.png`
**Dimensiones**: 1024x1024 px
**Formato**: PNG con transparencia
**Contenido sugerido**: 
- Logo del club de rugby
- Pelota de rugby
- Escudo del equipo

### 2. Splash Screen (Pantalla de carga)

**Ubicación**: `assets/splash.png`
**Dimensiones**: 1242x2436 px (iPhone 11 Pro Max)
**Formato**: PNG
**Contenido sugerido**:
- Logo grande al centro
- Fondo con el color del club (#1a472a - verde rugby)
- Texto: "Rugby Asistencia"

### 3. Adaptive Icon (Android)

**Ubicación**: `assets/adaptive-icon.png`
**Dimensiones**: 1024x1024 px
**Formato**: PNG con transparencia
**Nota**: Similar al icon.png pero considera que Android recorta en círculo

### 4. Favicon (Web)

**Ubicación**: `assets/favicon.png`
**Dimensiones**: 48x48 px
**Formato**: PNG

## Cómo Crear los Assets

### Opción 1: Usar Herramientas Online

1. **Icon Kitchen** (Android): https://icon.kitchen/
2. **App Icon Generator**: https://appicon.co/
3. **Canva**: https://www.canva.com/ (templates gratis)

### Opción 2: Con Figma/Photoshop

1. Crear un canvas de 1024x1024
2. Diseñar el logo/ícono
3. Exportar como PNG

### Opción 3: Placeholders Temporales

Por ahora, Expo usa imágenes por defecto. La app funciona sin problemas, pero para distribución deberías usar íconos personalizados.

## Integrar los Assets

Una vez que tengas las imágenes:

1. Crea la carpeta `assets/` en la raíz del proyecto
2. Coloca los archivos con estos nombres exactos:
   - `icon.png`
   - `splash.png`
   - `adaptive-icon.png`
   - `favicon.png`

3. Los paths ya están configurados en `app.json`:
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png"
      }
    }
  }
}
```

## Colores del Club

Si quieres mantener consistencia, usa estos colores:

- **Verde Rugby**: `#1a472a`
- **Naranja Acento**: `#ff6b35`
- **Blanco**: `#ffffff`
- **Gris Oscuro**: `#333333`

## Assets Opcionales

### Logo del Club
Podrías agregar el logo del club en la pantalla de login:

1. Guarda como: `assets/club-logo.png`
2. En `LoginScreen.tsx`, importa y usa:
```typescript
import { Image } from 'react-native';

<Image 
  source={require('../assets/club-logo.png')} 
  style={{ width: 100, height: 100 }}
/>
```

### Iconos de Categorías
Si quieres iconos diferentes para cada categoría, puedes agregarlos en:
- `assets/categoria-1.png`
- `assets/categoria-2.png`
- etc.

## Nota Importante

**La app funciona perfectamente SIN estos assets personalizados**. Expo usa placeholders automáticos. Los assets personalizados son solo para darle un toque más profesional y personalizado al club.

## Para Generar APK

Cuando generes el APK sin assets personalizados, Expo usará sus placeholders. No hay problema, pero el ícono de la app será genérico.

Si quieres un ícono personalizado antes de distribuir:
1. Crea al menos `icon.png` y `adaptive-icon.png`
2. Ponlos en `assets/`
3. Genera el APK nuevamente
