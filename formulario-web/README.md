# 🌐 GUÍA: Formulario Web de Inscripción Rugby Club

## 📋 ¿Qué es esto?

Un formulario web público para que los jugadores se autoinscriban escaneando un código QR. Los datos se guardan directamente en tu base de datos Supabase.

---

## 🚀 CÓMO PUBLICAR EL FORMULARIO (3 opciones)

### ✅ OPCIÓN 1: Vercel (RECOMENDADO - Gratis)

**Paso 1:** Crear cuenta en Vercel
1. Ve a https://vercel.com
2. Crea cuenta con GitHub (gratis)

**Paso 2:** Subir el formulario
1. Abre la terminal en `formulario-web/`
2. Ejecuta:
```bash
npm install -g vercel
vercel login
vercel
```

3. Sigue las instrucciones:
   - Project name: `rugby-inscripcion`
   - Framework: `Other`
   - Deploy: `Yes`

**Paso 3:** Obtener URL
- Al terminar verás: `https://rugby-inscripcion-xxx.vercel.app`
- ⭐ **ESA es tu URL para el QR**

**Tiempo total:** 5 minutos

---

### ✅ OPCIÓN 2: Netlify (También gratis)

**Paso 1:** Crear cuenta
1. Ve a https://netlify.com
2. Regístrate gratis

**Paso 2:** Drag & Drop
1. Arrastra la carpeta `formulario-web/` completa
2. Suéltala en Netlify Drop
3. Espera 30 segundos

**Paso 3:** Obtener URL
- URL generada: `https://rugby-xxx.netlify.app`
- ⭐ **ESA es tu URL para el QR**

**Tiempo total:** 3 minutos

---

### ✅ OPCIÓN 3: GitHub Pages (Gratis pero más pasos)

**Paso 1:** Crear repositorio
1. Ve a https://github.com/new
2. Nombre: `rugby-inscripcion`
3. Public
4. Create

**Paso 2:** Subir archivos
```bash
cd formulario-web
git init
git add .
git commit -m "Formulario inscripción"
git remote add origin https://github.com/TU_USUARIO/rugby-inscripcion.git
git push -u origin main
```

**Paso 3:** Activar GitHub Pages
1. Settings → Pages
2. Source: `main` branch
3. Save

**Paso 4:** URL
- `https://TU_USUARIO.github.io/rugby-inscripcion/`

**Tiempo total:** 10 minutos

---

## 📱 GENERAR CÓDIGO QR

### Opción A: Online (Rápido)

1. Ve a https://www.qr-code-generator.com
2. Pega tu URL: `https://rugby-inscripcion-xxx.vercel.app`
3. Descarga el QR
4. Imprímelo o compártelo

### Opción B: Desde la app (Ya implementado)

1. Abre la app Rugby Attendance
2. Ve a HomeScreen
3. Presiona botón flotante 📝
4. Elige "Mostrar Código QR"
5. Escanea con tu móvil para probar

---

## 🔧 CONFIGURACIÓN

### 1. Actualizar URL del QR en la app

Abre `src/components/BotonFlotanteInscripcion.tsx`:

```typescript
// Línea 17
const FORMULARIO_URL = 'https://rugby-inscripcion-xxx.vercel.app'; // ⬅️ TU URL AQUÍ
```

### 2. Verificar credenciales Supabase

Ya están configuradas correctamente en:
- ✅ `formulario-web/app.js`
- ✅ URL: `https://ynrotwnxqwjekuivungk.supabase.co`
- ✅ Key: Ya incluida

---

## 🧪 PROBAR EL FORMULARIO

### Antes de compartir con 300 jugadores:

1. **Abre la URL en tu móvil**
   - Escanea el QR o entra directamente

2. **Completa el formulario de prueba**
   - RUT: 12345678-9
   - Llena todos los campos obligatorios
   - Envía

3. **Verifica en Supabase**
   - Ve a Supabase → Table Editor → jugadores
   - Debería aparecer el nuevo registro

4. **Verifica en la app**
   - Abre la app Rugby Attendance
   - Inicia sesión como admin
   - Panel de Admin → Jugadores
   - Debería aparecer el jugador recién inscrito

---

## 📊 FLUJO COMPLETO (Para los 300 jugadores)

```
1. Admin genera QR con la URL del formulario
   ↓
2. Comparte QR (WhatsApp, email, póster, etc.)
   ↓
3. Jugadores escanean QR con su móvil
   ↓
4. Se abre formulario web en navegador
   ↓
5. Jugador completa todos los campos
   ↓
6. Presiona "Enviar Inscripción"
   ↓
7. Datos se guardan en Supabase
   ↓
8. Mensaje de éxito
   ↓
9. ✅ Jugador aparece en la app automáticamente
```

---

## ✨ CARACTERÍSTICAS DEL FORMULARIO WEB

✅ **Responsive:** Funciona en cualquier móvil
✅ **Validaciones:** Verifica RUT, email, campos obligatorios
✅ **Sin duplicados:** No permite RUTs repetidos
✅ **Todos los campos:** Los mismos 15+ campos que en la app
✅ **Diseño profesional:** Colores del club, fácil de usar
✅ **Conexión directa:** Guarda en Supabase sin intermediarios
✅ **Offline friendly:** Muestra errores claros si falla

---

## 📝 ARCHIVOS CREADOS

```
formulario-web/
├── index.html       # Formulario completo con estilos
├── app.js          # Lógica + conexión Supabase
└── README.md       # Esta guía
```

---

## 🔒 SEGURIDAD

**¿Es seguro exponer la ANON_KEY?**
✅ SÍ - Es una clave pública, diseñada para esto

**¿Pueden borrar datos?**
❌ NO - Supabase RLS solo permite INSERT en jugadores

**¿Pueden ver otros datos?**
❌ NO - Solo pueden insertar, no leer otros registros

**Recomendación adicional:**
En Supabase → Authentication → Policies, verifica que la política de `jugadores` permita INSERT público pero no DELETE/UPDATE.

---

## 🎯 CHECKLIST PRE-LANZAMIENTO

- [ ] Formulario subido a Vercel/Netlify
- [ ] URL del formulario obtenida
- [ ] QR generado con esa URL
- [ ] QR actualizado en la app (BotonFlotanteInscripcion.tsx)
- [ ] Prueba completa: Escanear QR → Llenar → Enviar
- [ ] Verificar en Supabase que se guardó
- [ ] Verificar en app que aparece el jugador
- [ ] Probar en iOS y Android
- [ ] Compartir QR con los 300 jugadores

---

## 📞 COMPARTIR EL QR

### Ideas para distribuir:

1. **WhatsApp:**
   - Grupo del club
   - Mensaje individual a capitanes
   - Estado de WhatsApp

2. **Email:**
   - Lista de correos de jugadores actuales
   - Newsletter del club

3. **Redes Sociales:**
   - Instagram Stories
   - Facebook del club
   - Twitter

4. **Físico:**
   - Imprimir póster con QR
   - Colocar en vestuario
   - Entregar volantes

5. **Presencial:**
   - Mostrar QR en entrenamientos
   - Proyectar en pantalla

---

## ❓ PROBLEMAS COMUNES

### "No se cargan las categorías"
→ Verifica que en Supabase las categorías estén marcadas como `activo: true`

### "RUT duplicado"
→ Normal, no puede haber RUTs repetidos. Jugador ya está inscrito.

### "Error al enviar"
→ Revisa las RLS Policies en Supabase para la tabla `jugadores`

### "El formulario no se ve bien"
→ Prueba en modo incógnito, puede ser caché del navegador

---

## 🎉 ¡LISTO!

Una vez subido y probado, solo comparte el QR y los jugadores se inscribirán automáticamente.

**Ventajas:**
✅ No necesitan instalar nada
✅ Se hace en 3 minutos por jugador
✅ Datos completos y organizados
✅ Aparecen automáticamente en la app
✅ Sin papeles, sin Excel, sin errores de transcripción

---

## 📊 MONITOREO

Para ver cuántos se han inscrito en tiempo real:

1. **Desde Supabase:**
   - Table Editor → jugadores
   - Ordena por `created_at` (más recientes primero)

2. **Desde la app:**
   - Panel de Admin → Jugadores
   - Filtra por categoría
   - Cuenta total en la parte superior

3. **Script de conteo (opcional):**
```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
  c.nombre as categoria,
  COUNT(j.rut) as total_inscritos
FROM jugadores j
JOIN categorias c ON j.categoria = c.numero
WHERE j.activo = true
GROUP BY c.nombre
ORDER BY c.numero;
```

---

¿Necesitas ayuda con algo específico? ¡Avísame! 🚀
