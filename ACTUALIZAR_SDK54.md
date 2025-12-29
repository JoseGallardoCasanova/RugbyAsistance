# 🚀 Actualizar a Expo SDK 54

## ❌ El Problema

Tu Expo Go en el celular es SDK 54, pero el proyecto usa SDK 52.

## ✅ SOLUCIÓN: Actualizar Proyecto a SDK 54

### Pasos:

#### 1. Detener el servidor si está corriendo
```bash
# Presiona Ctrl+C en la terminal donde corre npm start
```

#### 2. Descargar el package.json actualizado
- Descarga `package-sdk54.json` (arriba ↑)
- Renómbralo a `package.json`
- Reemplaza el archivo en tu proyecto

#### 3. Limpiar e instalar
```bash
cd /mnt/c/Users/josda/Desktop/appRugby/rugby-attendance

# Borrar instalación antigua
rm -rf node_modules package-lock.json .expo

# Reinstalar con SDK 54
npm install
```

#### 4. Iniciar el proyecto
```bash
npm start
```

#### 5. Escanear QR con Expo Go
¡Ahora debería funcionar! 🎉

---

## 📝 ¿Qué cambió?

**Antes (SDK 52):**
- expo: ~52.0.0
- react-native: 0.76.5
- Otras versiones antiguas

**Ahora (SDK 54):**
- expo: ~54.0.0  ✅
- react-native: 0.76.6  ✅
- Versiones actualizadas de todos los paquetes ✅

---

## 🔍 Verificar que funcionó

Cuando hagas `npm start`, deberías ver:
```
› Metro waiting on exp://192.168.0.190:8081
› Scan the QR code above with Expo Go (Android)
```

Y al escanear con Expo Go:
- ✅ NO debería dar error de versión incompatible
- ✅ Debería abrir la app normalmente
- ✅ Verás la pantalla de login

---

## ⚠️ Si da algún error durante la instalación

### Error: "Cannot resolve dependency"
```bash
npm install --legacy-peer-deps
```

### Error: "Metro bundler failed"
```bash
npm start -- --reset-cache
```

### Error en AsyncStorage u otro módulo nativo
```bash
npx expo install --fix
```

---

## 🎯 Resumen Ultra Rápido

```bash
# 1. Detener servidor (Ctrl+C)

# 2. Reemplazar package.json con el actualizado

# 3. Limpiar
rm -rf node_modules package-lock.json .expo

# 4. Instalar
npm install

# 5. Iniciar
npm start

# 6. Escanear QR
# ¡Debería funcionar!
```

---

## ✨ Ventajas de SDK 54

- Más estable
- Más rápido
- Compatible con tu Expo Go actual
- Últimas features de React Native
- Mejor soporte

---

## 🆘 ALTERNATIVA (Si no quieres actualizar el proyecto)

Puedes instalar Expo Go SDK 52 en tu celular:

### Android:
1. Desinstala Expo Go actual
2. Ve a: https://expo.dev/go?sdkVersion=52&platform=android&device=true
3. Descarga e instala Expo Go SDK 52
4. Vuelve a escanear el QR

**PERO** te recomiendo actualizar el proyecto a SDK 54 (es más fácil y mejor).

---

## 📋 Checklist Post-Actualización

- [ ] `npm install` completado sin errores
- [ ] `npm start` inicia sin problemas
- [ ] QR code visible en la terminal
- [ ] Expo Go no muestra error de versión
- [ ] App abre correctamente
- [ ] Pantalla de login funciona
- [ ] Puedes hacer login y navegar

---

¡Listo! Con esto tu proyecto estará en SDK 54 compatible con tu Expo Go. 🏉
