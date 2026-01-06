# 🌐 Configuración de Variables de Entorno en Vercel

## 📋 Pasos para Configurar

### 1. Accede al Dashboard de Vercel

1. Ve a: https://vercel.com
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto **formulariorugby**

---

### 2. Agrega las Variables de Entorno

1. **En el menú lateral, ve a:** Settings
2. **Haz clic en:** Environment Variables
3. **Agrega cada variable:**

#### Variable 1: SUPABASE_URL
```
Name: SUPABASE_URL
Value: https://ynrotwnxqwjekuivungk.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

#### Variable 2: SUPABASE_ANON_KEY
```
Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlucm90d254cXdqZWt1aXZ1bmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDM5OTEsImV4cCI6MjA4Mjk3OTk5MX0.Iu5kBp57jbO7dVRhB1V2CzJ724Vz3f0GgEa7HDkl9zQ
Environments: ✅ Production ✅ Preview ✅ Development
```

4. **Haz clic en:** Save

---

### 3. Redeploy el Proyecto

Después de agregar las variables:

**Opción A - Desde Vercel Dashboard:**
1. Ve a la pestaña "Deployments"
2. Encuentra el último deployment
3. Haz clic en el menú (⋮) → "Redeploy"
4. Confirma el redeploy

**Opción B - Desde Terminal:**
```bash
cd formulario-web
vercel --prod
```

**Opción C - Desde Git:**
```bash
git add .
git commit -m "chore: configurar variables de entorno"
git push
# Vercel detectará el push y hará redeploy automático
```

---

### 4. Verifica que Funcione

1. **Abre el formulario:** https://formulariorugby.vercel.app
2. **Abre la consola del navegador:** F12 → Console
3. **Verifica que no haya errores de Supabase**
4. **Prueba registrando un jugador de prueba**

Deberías ver logs como:
```
🔧 Inicializando Supabase...
✅ Supabase inicializado
📥 Cargando categorías desde Supabase...
✅ Categorías cargadas: X categorías
```

---

## 🔄 Actualizar Variables

Si necesitas cambiar las credenciales:

1. Ve a: Settings → Environment Variables
2. Encuentra la variable
3. Haz clic en el menú (⋮) → Edit
4. Actualiza el valor
5. Save
6. Redeploy el proyecto

---

## ⚠️ Importante

- **Las variables NO se actualizan automáticamente** en deployments existentes
- **Debes hacer redeploy** después de cambiar variables
- **Las variables son secretas** - Vercel las oculta en los logs
- **No agregues variables sensibles al código** - siempre usa Environment Variables

---

## 🐛 Troubleshooting

### "Supabase client is not initialized"
- Las variables no están configuradas
- Redeploy después de agregar las variables

### "Invalid API key"
- La clave SUPABASE_ANON_KEY es incorrecta
- Verifica que copiaste la clave completa (sin espacios extras)

### Cambios no se reflejan
- Haz redeploy explícito (no confíes solo en auto-deploy)
- Limpia cache del navegador (Ctrl+Shift+R)

### Las categorías no cargan
- Verifica que SUPABASE_URL sea correcta
- Verifica que las RLS policies permitan SELECT en tabla categorias
- Revisa la consola del navegador para errores específicos

---

## 📸 Capturas de Referencia

### Dónde agregar variables:
```
Dashboard → Tu Proyecto → Settings → Environment Variables
```

### Formato esperado:
```
SUPABASE_URL         = https://....supabase.co
SUPABASE_ANON_KEY    = eyJ...
```

### Ambientes a seleccionar:
```
☑️ Production
☑️ Preview
☑️ Development
```

---

## 🔗 Links Útiles

- **Proyecto en Vercel:** https://vercel.com/dashboard
- **Formulario Web:** https://formulariorugby.vercel.app
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Documentación Vercel Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
