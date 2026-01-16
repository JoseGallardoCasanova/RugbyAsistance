# ⚡ SquadPro - Gestión Profesional de Equipos

Aplicación multiplataforma para gestionar asistencia, jugadores/miembros y categorías de cualquier equipo deportivo o grupo organizado.

## 🎯 Características Principales

- ✅ Control de asistencia con múltiples categorías
- 👥 3 roles: Admin, Entrenador, Ayudante  
- 📊 Exportación de asistencias a Excel con filtros personalizados
- 📱 Formulario web público para autoinscripción masiva
- 🔒 Sistema completo de permisos por rol
- 💾 Backend robusto con Supabase PostgreSQL
- 📋 Gestión integral de miembros con datos personalizables
- 🏷️ Código QR para registro rápido
- 🎨 UI moderna y neutral adaptable a cualquier organización
- 💰 Modelo de suscripción: 7 días prueba gratis, luego $4.99/mes

## 🚀 Modelo de Negocio

**SquadPro** está diseñado como SaaS multi-tenant:
- Descarga gratuita desde App Store / Google Play
- 7 días de prueba gratuita completa
- Suscripción mensual: $4.99 USD
- Cada organización tiene sus propios datos aislados
- Configuración personalizable (colores, logo, campos)

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Expo CLI
- Cuenta de Supabase (gratis)

## 🔐 Configuración de Variables de Entorno

**⚠️ IMPORTANTE:** Las credenciales ya NO están hardcodeadas en el código por seguridad.

### Primera vez - Setup inicial:

```bash
# 1. Copia el archivo de ejemplo
cp .env.example .env

# 2. Edita .env con tus credenciales de Supabase
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_ANON_KEY=tu_clave_anonima_aqui

# 3. Instala dependencias
npm install
```

### Documentación completa:
- 📖 [Guía completa de variables de entorno](docs/ENVIRONMENT_VARIABLES.md)
- 🌐 [Configuración en Vercel](docs/VERCEL_ENV_SETUP.md)

## 🛠️ Instalación

### 1. Instalar dependencias

```bash
cd rugby-attendance
npm install
```

### 2. Instalar Expo CLI (si no la tienes)

```bash
npm install -g expo-cli
```

### 3. Iniciar el proyecto

```bash
npm start
```

Esto abrirá Expo DevTools. Desde ahí puedes:
- Escanear el QR con la app Expo Go en tu celular
- Presionar `a` para abrir en emulador Android
- Presionar `i` para abrir en simulador iOS

## 📱 Generar APK para Android

### Modo Development (para probar con logs)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Configurar el proyecto
eas build:configure

# Generar APK de desarrollo
eas build --profile development --platform android

# O usando expo build (método antiguo)
expo build:android -t apk
```

Una vez finalizado, recibirás un link para descargar el APK.

### Instalar APK en el dispositivo

1. Descarga el APK en tu celular
2. Habilita "Instalar apps de fuentes desconocidas" en Configuración
3. Abre el archivo APK y sigue las instrucciones

## 🔐 Usuarios de Prueba

La app viene con 3 usuarios pre-configurados:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@rugby.cl | admin123 |
| Entrenador | entrenador@rugby.cl | entrenador123 |
| Ayudante | ayudante@rugby.cl | ayudante123 |

### Permisos por Rol

- **Admin**: Acceso total + configuración de Google Sheets
- **Entrenador**: Puede marcar y enviar asistencia de todas las categorías
- **Ayudante**: Solo puede marcar asistencia de su categoría asignada (no puede enviar)

## 📊 Configuración de Google Sheets

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Dale un nombre (ej: "Rugby Attendance")

### Paso 2: Habilitar Google Sheets API

1. En el menú lateral, ve a **APIs y Servicios** → **Biblioteca**
2. Busca "Google Sheets API"
3. Haz clic en **Habilitar**

### Paso 3: Crear API Key

1. Ve a **APIs y Servicios** → **Credenciales**
2. Haz clic en **Crear credenciales** → **Clave de API**
3. Copia la API Key generada (algo como: `AIzaSyD...`)
4. (Opcional) Restringe la API Key:
   - Haz clic en la API Key creada
   - En "Restricciones de la aplicación", selecciona "Aplicaciones de Android"
   - Agrega el package name: `com.rugby.attendance`
   - En "Restricciones de API", selecciona "Google Sheets API"

### Paso 4: Crear el Spreadsheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea un nuevo spreadsheet
3. Copia el ID del spreadsheet desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
   ```

### Paso 5: Compartir el Spreadsheet

1. Haz clic en **Compartir** en el spreadsheet
2. En "Acceso general", selecciona **"Cualquier persona con el enlace"**
3. Cambia a **"Editor"** (importante para que la app pueda escribir)

### Paso 6: Crear Hoja para el Mes

1. En el spreadsheet, crea una nueva hoja
2. Nómbrala con el formato: `Mes_Año` (ejemplo: `Enero_2025`, `Febrero_2025`)
3. Esta será la hoja donde se guardará la asistencia del mes

### Paso 7: Configurar en la App

1. Inicia sesión como **Admin**
2. Toca el botón **"⚙️ Configuración Google Sheets"**
3. Ingresa:
   - **API Key**: La clave que copiaste en el Paso 3
   - **Spreadsheet ID**: El ID que copiaste en el Paso 4
   - **Nombre de la hoja**: El nombre que pusiste (ej: `Enero_2025`)
4. Toca **"💾 Guardar configuración"**
5. Toca **"🚀 Inicializar estructura del sheet"**
   - Esto creará automáticamente las columnas para todos los días del mes

### Paso 8: Probar

1. Sal de la configuración
2. Selecciona una categoría
3. Marca algunos jugadores como presentes
4. Toca **"📤 Enviar a Google Sheets"**
5. Ve al spreadsheet en tu navegador y verifica que se hayan guardado los datos

## 📝 Estructura del Google Sheet

La app crea automáticamente esta estructura:

```
| Nombre              | Día 1 | Día 2 | Día 3 | ... | Día 31 |
|---------------------|-------|-------|-------|-----|--------|
| CATEGORÍA 1         |       |       |       |     |        |
| Matías Fernández    | SÍ    | NO    | SÍ    |     |        |
| Sebastián López     | SÍ    | SÍ    | SÍ    |     |        |
| ...                 |       |       |       |     |        |
|                     |       |       |       |     |        |
| CATEGORÍA 2         |       |       |       |     |        |
| Cristóbal Muñoz     | NO    | SÍ    | SÍ    |     |        |
| ...                 |       |       |       |     |        |
```

## 🔧 Troubleshooting

### "Error al enviar asistencia"

- Verifica que el spreadsheet esté compartido como "Editor" público
- Revisa que la API Key esté bien copiada
- Confirma que el Spreadsheet ID sea correcto
- Asegúrate que el nombre de la hoja coincida exactamente

### "No se pudo inicializar el sheet"

- Verifica que la hoja con el nombre especificado exista
- Confirma que el spreadsheet esté en modo "Editor" público

### Los logs no aparecen

- Si usas APK de producción, los logs no se muestran
- Para ver logs, usa el modo development y conecta con `npm start`

### La app no se instala

- Habilita "Instalar apps de fuentes desconocidas" en Configuración → Seguridad
- Verifica que el APK se haya descargado completamente

## 🎨 Personalización

### Cambiar colores

Edita los colores en cada archivo de pantalla en `src/screens/`:

```typescript
const styles = StyleSheet.create({
  // Cambiar color primario (verde rugby)
  header: {
    backgroundColor: '#1a472a', // Tu color aquí
  },
  
  // Cambiar color de acento (naranja)
  button: {
    backgroundColor: '#ff6b35', // Tu color aquí
  },
});
```

### Agregar más categorías

1. Edita `src/data/mockData.ts`
2. Agrega más jugadores con `categoria: 8`, `categoria: 9`, etc.
3. Actualiza la función `getCategorias()`:

```typescript
export const getCategorias = (): number[] => {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Las que necesites
};
```

## 📚 Estructura del Proyecto

```
rugby-attendance/
├── .env                         # ⚠️ Credenciales (NO COMMITEAR)
├── .env.example                 # Template de variables de entorno
├── src/
│   ├── config/
│   │   └── env.ts              # Configuración de variables de entorno
│   ├── context/
│   │   └── AuthContext.tsx     # Manejo de autenticación
│   ├── data/
│   │   └── mockData.ts         # Datos de prueba
│   ├── navigation/
│   │   └── AppNavigator.tsx    # Navegación de la app
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Pantalla de login
│   │   ├── HomeScreen.tsx      # Pantalla principal (categorías)
│   │   ├── AsistenciaScreen.tsx # Marcar asistencia
│   │   ├── PerfilScreen.tsx    # Perfil de usuario
│   │   └── admin/
│   │       ├── AdminScreen.tsx          # Panel administrador
│   │       ├── JugadoresTab.tsx         # CRUD jugadores
│   │       ├── CategoriasTab.tsx        # CRUD categorías
│   │       ├── UsuariosTab.tsx          # CRUD usuarios
│   │       ├── FormJugador.tsx          # Form con 15+ campos
│   │       ├── FormCategoria.tsx        # Form categorías
│   │       ├── FormUsuario.tsx          # Form usuarios
│   │       ├── ModalDetallesJugador.tsx # Ver info completa jugador
│   │       ├── ModalExportarAsistencias.tsx # Exportar Excel
│   │       ├── FormularioAutoinscripcion.tsx # Form autoinscripción in-app
│   │       └── BotonFlotanteInscripcion.tsx # Botón QR flotante
│   ├── services/
│   │   ├── SupabaseService.ts  # 🔒 Usa variables de entorno
│   │   ├── DatabaseService.ts  # Legacy (no usado)
│   │   └── GoogleSheetsService.ts # Legacy (no usado)
│   └── types/
│       ├── index.ts            # Tipos TypeScript
│       └── env.d.ts            # Types para variables de entorno
├── formulario-web/             # 🌐 Formulario público web
│   ├── .env                    # ⚠️ NO COMMITEAR
│   ├── .env.example            # Template
│   ├── index.html              # HTML del formulario
│   ├── app.js                  # 🔒 Credenciales hardcoded (Vercel las inyecta)
│   └── styles.css              # Estilos del formulario
├── docs/
│   ├── privacy-policy.html     # Política de privacidad
│   ├── ENVIRONMENT_VARIABLES.md # 📖 Guía variables de entorno
│   └── VERCEL_ENV_SETUP.md     # 🌐 Config Vercel paso a paso
├── App.tsx                     # Punto de entrada
├── app.json                    # Configuración de Expo
├── babel.config.js             # 🔧 Plugin react-native-dotenv configurado
└── package.json                # Dependencias
```

## 🔒 Seguridad

### ⚠️ Variables de Entorno

- **NUNCA** comitees archivos `.env`
- Usa `.env.example` como referencia
- Lee [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) para más detalles

### 🌐 Formulario Web

- Desplegado en Vercel: https://formulariorugby.vercel.app
- Configuración de variables: [docs/VERCEL_ENV_SETUP.md](docs/VERCEL_ENV_SETUP.md)
- Permite autoinscripción masiva de jugadores vía QR

## 📊 Base de Datos

### Supabase PostgreSQL

Tablas principales:
- **usuarios**: Admin, entrenadores, ayudantes
- **categorias**: Categorías del club
- **jugadores**: Jugadores con 15+ campos (médicos, contacto, etc.)
- **asistencias**: Registro de asistencias por fecha

### RLS Policies

- SELECT público en `categorias`
- INSERT público en `jugadores` (para formulario web)
- Resto requiere autenticación

## 🚀 Deployment

### App React Native

```bash
# Build APK
eas build --profile production --platform android

# Build iOS
eas build --profile production --platform ios
```

### Formulario Web

```bash
cd formulario-web
vercel --prod
```

## 📖 Documentación Adicional

- [Guía de Variables de Entorno](docs/ENVIRONMENT_VARIABLES.md)
- [Configuración Vercel](docs/VERCEL_ENV_SETUP.md)
- [Política de Privacidad](docs/privacy-policy.html)

## 🐛 Troubleshooting

### "Module '@env' not found"
```bash
npx expo start --clear
```

### Cambios en .env no se reflejan
```bash
# Reinicia Metro con cache limpio
npx expo start --clear
```

### Formulario web no conecta
1. Verifica variables en Vercel
2. Redeploy el proyecto
3. Limpia cache del navegador

## 📄 Licencia
├── App.tsx                     # Punto de entrada
├── app.json                    # Configuración de Expo
├── babel.config.js             # 🔧 Plugin react-native-dotenv
└── package.json                # Dependencias
```

## 🔜 Próximos Pasos (Backend NestJS)

Cuando estés listo para implementar el backend:

1. Crear API con NestJS
2. Base de datos PostgreSQL
3. Autenticación con JWT
4. Sincronización bidireccional con Google Sheets
5. Historial de asistencia
6. Reportes y estadísticas

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en la consola (`npm start`)
2. Verifica la configuración de Google Sheets
3. Confirma que todos los permisos estén habilitados

## 📄 Licencia

MIT
