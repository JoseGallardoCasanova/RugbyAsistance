# 📊 GUÍA DETALLADA: Configurar Google Sheets API

## ⚠️ IMPORTANTE: Lee todo antes de empezar

Esta guía te llevará paso a paso para conectar la app con Google Sheets. El proceso toma aproximadamente 10-15 minutos.

---

## 📝 PASO 1: Crear Proyecto en Google Cloud

### 1.1 Acceder a Google Cloud Console

1. Abre tu navegador
2. Ve a: https://console.cloud.google.com/
3. Inicia sesión con tu cuenta de Google

### 1.2 Crear Nuevo Proyecto

1. En la parte superior, haz clic en el selector de proyectos (al lado del logo de Google Cloud)
2. Haz clic en **"NUEVO PROYECTO"**
3. Ingresa:
   - **Nombre del proyecto**: `Rugby Attendance` (o el que quieras)
   - **Organización**: Deja el valor por defecto
4. Haz clic en **"CREAR"**
5. Espera 10-20 segundos mientras se crea el proyecto
6. Cuando termine, asegúrate que el proyecto esté seleccionado (arriba a la izquierda)

---

## 🔌 PASO 2: Habilitar Google Sheets API

### 2.1 Ir a Biblioteca de APIs

1. En el menú lateral (☰), haz clic en **"APIs y Servicios"**
2. Luego haz clic en **"Biblioteca"**

### 2.2 Buscar y Habilitar

1. En el buscador, escribe: `Google Sheets API`
2. Haz clic en el resultado **"Google Sheets API"**
3. Haz clic en el botón azul **"HABILITAR"**
4. Espera 5-10 segundos mientras se habilita

---

## 🔑 PASO 3: Crear API Key

### 3.1 Ir a Credenciales

1. En el menú lateral, haz clic en **"Credenciales"**
2. Arriba, haz clic en **"+ CREAR CREDENCIALES"**
3. Selecciona **"Clave de API"**

### 3.2 Copiar API Key

1. Se creará automáticamente una API Key
2. Aparecerá un popup con la key (algo como: `AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. **IMPORTANTE**: Haz clic en **"COPIAR"** y guárdala en un lugar seguro (Notas, archivo de texto, etc.)

### 3.3 (Opcional pero Recomendado) Restringir la API Key

1. En la pantalla de credenciales, haz clic en la API Key que acabas de crear
2. En **"Restricciones de la aplicación"**:
   - Selecciona **"Ninguna"** por ahora (para testing)
   - Más adelante puedes restringirla a tu app Android
3. En **"Restricciones de API"**:
   - Selecciona **"Restringir clave"**
   - Marca solo **"Google Sheets API"**
4. Haz clic en **"GUARDAR"**

---

## 📋 PASO 4: Crear tu Spreadsheet

### 4.1 Crear Nuevo Spreadsheet

1. Abre una nueva pestaña
2. Ve a: https://sheets.google.com/
3. Haz clic en el **"+"** grande (Spreadsheet en blanco)
4. Arriba a la izquierda, cambia el nombre:
   - De "Spreadsheet sin título"
   - A: **"Rugby Asistencia 2025"** (o el nombre que prefieras)

### 4.2 Copiar el Spreadsheet ID

1. Mira la URL en la barra de direcciones:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID_QUE_NECESITAS/edit#gid=0
   ```
2. Copia SOLO la parte entre `/d/` y `/edit`
3. Ejemplo: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
4. **IMPORTANTE**: Guarda este ID (es diferente para cada spreadsheet)

---

## 🌐 PASO 5: Hacer el Spreadsheet Público (MUY IMPORTANTE)

### 5.1 Compartir el Documento

1. En tu spreadsheet, haz clic en **"Compartir"** (botón azul arriba a la derecha)
2. En "Acceso general", haz clic en **"Cambiar"**
3. Selecciona **"Cualquier persona con el enlace"**
4. En el menú desplegable de la derecha, cambia de "Lector" a **"Editor"**
   - ⚠️ **ESTO ES CRUCIAL**: Si no es Editor, la app no podrá escribir
5. Haz clic en **"Listo"**
6. Cierra el diálogo de compartir

### 5.2 Verificar Permisos

Para verificar que esté bien configurado:
1. Abre una ventana de incógnito
2. Pega el enlace del spreadsheet
3. Deberías poder ver Y editar el documento sin iniciar sesión

---

## 📅 PASO 6: Crear Hoja del Mes

### 6.1 Crear Nueva Hoja

1. En la parte inferior del spreadsheet, hay pestañas
2. La primera dice "Hoja 1"
3. Haz clic derecho en "Hoja 1" → **"Cambiar nombre"**
4. Escribe el nombre con este formato exacto: `Enero_2025`
   - **FORMATO**: `Mes_Año`
   - **Ejemplos válidos**: `Enero_2025`, `Febrero_2025`, `Marzo_2025`
   - ⚠️ **SIN ESPACIOS**, usar guión bajo `_`

### 6.2 Por qué este formato

- La app usa el nombre para:
  - Calcular cuántos días tiene el mes
  - Crear las columnas automáticamente
  - Identificar si es año bisiesto (para Febrero)

---

## 📱 PASO 7: Configurar en la App

### 7.1 Abrir Configuración

1. Abre la app **Rugby Asistencia**
2. Inicia sesión como **Admin**:
   - Email: `admin@rugby.cl`
   - Contraseña: `admin123`
3. En la pantalla principal, toca **"⚙️ Configuración Google Sheets"**

### 7.2 Ingresar Datos

Llena los 3 campos:

**1. API Key**
```
Pega aquí la API Key que copiaste en el Paso 3
Ejemplo: AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**2. Spreadsheet ID**
```
Pega aquí el ID que copiaste en el Paso 4
Ejemplo: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

**3. Nombre de la hoja**
```
Escribe el nombre exacto de la hoja que creaste
Ejemplo: Enero_2025
```

### 7.3 Guardar y Verificar

1. Toca **"💾 Guardar configuración"**
2. Deberías ver un mensaje: **"✅ Guardado"**

---

## 🚀 PASO 8: Inicializar Estructura

### 8.1 Crear Columnas Automáticamente

1. Toca **"🚀 Inicializar estructura del sheet"**
2. Confirma en el diálogo que aparece
3. Espera 5-10 segundos

### 8.2 Verificar en Google Sheets

1. Abre tu spreadsheet en el navegador
2. Refresca la página (F5)
3. Deberías ver:
   - Columna A: "Nombre"
   - Columna B: "Día 1"
   - Columna C: "Día 2"
   - ... hasta el día 31 (o los días que tenga el mes)
   - Secciones para cada categoría (1 a 7)
   - Nombres de todos los jugadores

---

## ✅ PASO 9: Probar el Sistema

### 9.1 Marcar Primera Asistencia

1. En la app, vuelve atrás a la pantalla principal
2. Toca **"Categoría 1"**
3. Marca algunos jugadores como presentes (toca sobre ellos)
4. Toca **"📤 Enviar a Google Sheets"**
5. Confirma el envío

### 9.2 Verificar en Google Sheets

1. Abre tu spreadsheet
2. Refresca la página
3. En la columna del día actual, deberías ver:
   - "SÍ" para jugadores presentes
   - "NO" para jugadores ausentes

### 9.3 Si Todo Funciona

🎉 **¡Felicitaciones!** El sistema está configurado correctamente.

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### Error: "No se pudo enviar la asistencia"

**Posibles causas:**

1. **API Key incorrecta**
   - Solución: Verifica que copiaste toda la key (empieza con `AIza`)
   - Revisa que no tenga espacios al inicio o final

2. **Spreadsheet no es público/editor**
   - Solución: Vuelve al Paso 5.1
   - Asegúrate que sea "Cualquier persona con el enlace" + "Editor"

3. **Spreadsheet ID incorrecto**
   - Solución: Verifica el ID desde la URL
   - Debe ser solo la parte entre `/d/` y `/edit`

4. **Nombre de hoja incorrecto**
   - Solución: Debe coincidir EXACTAMENTE
   - Ej: `Enero_2025` (con mayúscula, guión bajo, sin espacios)

### Error: "No se pudo inicializar el sheet"

**Posibles causas:**

1. **La hoja no existe**
   - Solución: Verifica que creaste la hoja con el nombre exacto

2. **Permisos insuficientes**
   - Solución: Repite Paso 5.1 (hacer el spreadsheet público como Editor)

### Los datos no aparecen en Google Sheets

1. Refresca la página del spreadsheet (F5)
2. Verifica que estés viendo la hoja correcta (pestañas abajo)
3. Revisa los logs en la consola de la app

---

## 🔄 CAMBIAR AL PRÓXIMO MES

Cuando llegue un nuevo mes:

1. En Google Sheets, crea una nueva hoja
2. Nómbrala: `Febrero_2025` (o el mes que corresponda)
3. En la app, ve a Configuración
4. Cambia solo el **"Nombre de la hoja"** al nuevo mes
5. Guarda
6. Inicializa la estructura nuevamente

**Nota**: No necesitas cambiar API Key ni Spreadsheet ID, solo el nombre de la hoja.

---

## 📞 ¿Necesitas Más Ayuda?

Si después de seguir todos estos pasos aún tienes problemas:

1. Revisa los logs en la consola cuando corres `npm start`
2. Verifica cada paso nuevamente
3. Asegúrate que el spreadsheet sea público como Editor
4. Confirma que la API Key esté correcta

---

## ✨ Tips Adicionales

### Backup de Datos

- Google Sheets guarda versión automática
- Puedes ver el historial: Archivo → Historial de versiones

### Ver Logs de la App

```bash
# Inicia el proyecto
npm start

# Luego en otra terminal, para ver logs de Android
npx react-native log-android
```

### Seguridad

Para producción, considera:
1. Restringir API Key solo a tu app Android
2. Usar autenticación de servicio en lugar de API Key pública
3. Implementar backend con NestJS para mayor seguridad

---

## 🎯 Resumen Rápido

1. ✅ Crear proyecto en Google Cloud
2. ✅ Habilitar Google Sheets API
3. ✅ Crear y copiar API Key
4. ✅ Crear spreadsheet y copiar ID
5. ✅ Hacer spreadsheet público como Editor
6. ✅ Crear hoja con formato `Mes_Año`
7. ✅ Configurar en la app
8. ✅ Inicializar estructura
9. ✅ Probar con una asistencia

**Tiempo total**: ~15 minutos

¡Listo! 🏉
