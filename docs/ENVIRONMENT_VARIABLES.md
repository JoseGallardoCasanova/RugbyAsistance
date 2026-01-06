# 🔐 Configuración de Variables de Entorno

## 📱 App React Native (Expo)

### Instalación de dependencias

```bash
npm install react-native-dotenv --save-dev
```

### Configuración

1. **Copia el archivo de ejemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Edita `.env` con tus credenciales:**
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu_clave_anonima_aqui
   ```

3. **Reinicia Metro Bundler:**
   ```bash
   # Detén el servidor actual (Ctrl+C)
   npx expo start --clear
   ```

### Archivos configurados

- ✅ `.env` - Credenciales reales (NO COMMITEAR)
- ✅ `.env.example` - Template sin credenciales
- ✅ `.gitignore` - Ignora archivos .env
- ✅ `babel.config.js` - Plugin react-native-dotenv configurado
- ✅ `src/config/env.ts` - Validación de variables
- ✅ `src/types/env.d.ts` - Type definitions
- ✅ `src/services/SupabaseService.ts` - Usa ENV en lugar de hardcode

---

## 🌐 Formulario Web (Vercel)

### Configuración en Vercel

1. **Ve a tu proyecto en Vercel:**
   https://vercel.com/tu-usuario/formulariorugby

2. **Settings → Environment Variables**

3. **Agrega las variables:**
   ```
   SUPABASE_URL = https://ynrotwnxqwjekuivungk.supabase.co
   SUPABASE_ANON_KEY = eyJhbGc...
   ```

4. **Aplica a:** Production, Preview, Development

5. **Redeploy el proyecto** para que tome las nuevas variables

### Archivos configurados

- ✅ `formulario-web/.env` - Variables locales (NO COMMITEAR)
- ✅ `formulario-web/.env.example` - Template
- ✅ `formulario-web/.gitignore` - Ignora .env

### Uso en desarrollo local

```bash
cd formulario-web
# Copia y edita .env con tus credenciales
cp .env.example .env
# Inicia un servidor local
python -m http.server 8000
# O usa Live Server en VS Code
```

---

## 🔒 Seguridad

### ⚠️ NUNCA hagas:
- ❌ Commitear archivos `.env`
- ❌ Compartir credenciales en chats/emails
- ❌ Subir credenciales a repositorios públicos
- ❌ Hardcodear URLs/keys en el código

### ✅ SIEMPRE:
- ✅ Usa variables de entorno
- ✅ Agrega `.env` al `.gitignore`
- ✅ Mantén `.env.example` actualizado (sin valores reales)
- ✅ Rota las keys si se exponen accidentalmente

---

## 🔄 Rotación de Credenciales

Si tus credenciales se exponen:

1. **Ve a Supabase Dashboard**
2. Settings → API → Reset anon key
3. Actualiza el valor en:
   - `.env` (app React Native)
   - Variables de entorno en Vercel
   - Formulario web si lo usas localmente
4. Redeploy ambos proyectos

---

## 🧪 Testing

### App React Native:
```bash
# Reinicia con cache limpio
npx expo start --clear

# Verifica que cargue las variables
# Deberías ver: "✅ [SUPABASE] Servicio inicializado"
```

### Formulario Web (Local):
```bash
cd formulario-web
python -m http.server 8000
# Abre: http://localhost:8000
```

### Formulario Web (Vercel):
- Redeploy después de configurar las variables
- Verifica en consola del navegador que no haya errores de Supabase

---

## 📦 Estructura de Archivos

```
rugby-attendance/
├── .env                          # ❌ NO COMMITEAR
├── .env.example                  # ✅ Commitear
├── .gitignore                    # ✅ Incluye .env
├── babel.config.js               # ✅ Plugin dotenv configurado
├── src/
│   ├── config/
│   │   └── env.ts               # ✅ Validación de variables
│   ├── types/
│   │   └── env.d.ts             # ✅ Type definitions
│   └── services/
│       └── SupabaseService.ts   # ✅ Usa ENV
└── formulario-web/
    ├── .env                      # ❌ NO COMMITEAR
    ├── .env.example              # ✅ Commitear
    ├── .gitignore                # ✅ Incluye .env
    ├── index.html                # ✅ Hardcoded (Vercel inyecta en build)
    └── app.js                    # ✅ Hardcoded (Vercel inyecta en build)
```

---

## ❓ Troubleshooting

### "Module '@env' not found"
```bash
# Reinicia Metro con cache limpio
npx expo start --clear
```

### "Faltan variables de entorno requeridas"
```bash
# Verifica que .env existe y tiene las variables correctas
cat .env
```

### Cambios en .env no se reflejan
```bash
# Reinicia completamente
npx expo start --clear
```

### Formulario web no conecta a Supabase
1. Verifica las variables en Vercel Dashboard
2. Redeploy el proyecto en Vercel
3. Limpia cache del navegador (Ctrl+Shift+R)
