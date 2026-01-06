# 🎯 CHECKLIST - Después de clonar el proyecto

## ✅ Configuración Inicial

### 1️⃣ App React Native

```bash
# 1. Instalar dependencias
cd rugby-attendance
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Editar .env con tus credenciales de Supabase
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_ANON_KEY=tu_clave_anonima_aqui

# 4. Iniciar la app
npx expo start --clear
```

### 2️⃣ Formulario Web (Vercel)

**Opción A - Deploy automático (recomendado):**
- El push a GitHub dispara auto-deploy en Vercel
- Ve a Settings → Environment Variables en Vercel
- Agrega SUPABASE_URL y SUPABASE_ANON_KEY
- Redeploy el proyecto

**Opción B - Deploy manual:**
```bash
cd formulario-web
vercel --prod
```

📖 **Guía detallada:** [docs/VERCEL_ENV_SETUP.md](../docs/VERCEL_ENV_SETUP.md)

---

## 🔐 Variables de Entorno Requeridas

### App React Native (.env)
```env
SUPABASE_URL=https://ynrotwnxqwjekuivungk.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...tu_clave
```

### Vercel (Environment Variables Dashboard)
```
SUPABASE_URL = https://ynrotwnxqwjekuivungk.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...tu_clave
```

---

## ⚠️ Errores Comunes

### ❌ "Module '@env' not found"
```bash
npx expo start --clear
```

### ❌ "Faltan variables de entorno requeridas"
- Verifica que existe el archivo `.env`
- Verifica que tiene las dos variables
- Reinicia Metro: `npx expo start --clear`

### ❌ Formulario web no conecta a Supabase
1. Verifica variables en Vercel Dashboard
2. Redeploy el proyecto en Vercel
3. Limpia cache del navegador (Ctrl+Shift+R)

### ❌ Cambios en .env no se reflejan
```bash
# Detén el servidor (Ctrl+C)
npx expo start --clear
```

---

## 📚 Documentación

- [Guía Completa de Variables de Entorno](../docs/ENVIRONMENT_VARIABLES.md)
- [Configuración Vercel Paso a Paso](../docs/VERCEL_ENV_SETUP.md)
- [README Principal](../README.md)

---

## 🚀 Verificación

### ✅ App funcionando correctamente si ves:
```
🚀 [SUPABASE] Inicializando servicio...
✅ [SUPABASE] Servicio inicializado
```

### ✅ Formulario web funcionando si ves (en consola del navegador):
```
🔧 Inicializando Supabase...
✅ Supabase inicializado
📥 Cargando categorías desde Supabase...
✅ Categorías cargadas: X categorías
```

---

## 🔒 Seguridad

- ✅ Archivos `.env` están en `.gitignore`
- ✅ Credenciales nunca se commitean
- ✅ Usa `.env.example` como referencia
- ⚠️ **NUNCA** compartas tu `.env` por chat/email
- ⚠️ Si expones credenciales, rota las keys inmediatamente

---

## 📦 Scripts Útiles

```bash
# Limpiar cache y reiniciar
npx expo start --clear

# Build APK para Android
eas build --profile production --platform android

# Deploy formulario web
cd formulario-web && vercel --prod

# Ver logs en tiempo real
npx expo start
```

---

## 🎉 Todo listo si:

- [x] `.env` existe y tiene las credenciales
- [x] App inicia sin errores
- [x] Puedes hacer login
- [x] Formulario web carga categorías
- [x] Variables configuradas en Vercel

---

**¿Problemas?** Revisa [docs/ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md) o abre un issue.
