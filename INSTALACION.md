# 🏉 Instalación del Proyecto Rugby Attendance

## Descargar y Descomprimir

### Opción 1: Si tienes el archivo .tar.gz

```bash
# Descomprimir
tar -xzf rugby-attendance.tar.gz

# Entrar al directorio
cd rugby-attendance
```

### Opción 2: Si descargaste los archivos sueltos

Ya deberías tener la carpeta `rugby-attendance/` lista para usar.

## Instalación Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el proyecto
npm start
```

## ¡Eso es todo!

El proyecto debería abrirse en Expo DevTools. Desde ahí:

- Escanea el QR con Expo Go en tu celular
- O presiona `a` para Android emulator
- O presiona `i` para iOS simulator

## Próximos Pasos

1. Lee el archivo **INICIO_RAPIDO.md** para un tour completo
2. Revisa **README.md** para documentación completa
3. Sigue **GOOGLE_SHEETS_SETUP.md** para configurar Google Sheets

## Usuarios de Prueba

| Email | Password | Rol |
|-------|---------|-----|
| admin@rugby.cl | admin123 | Admin |
| entrenador@rugby.cl | entrenador123 | Entrenador |
| ayudante@rugby.cl | ayudante123 | Ayudante |

## Estructura del Proyecto

```
rugby-attendance/
├── src/
│   ├── context/          # AuthContext
│   ├── data/             # Mock data (70 jugadores)
│   ├── navigation/       # Stack Navigator
│   ├── screens/          # 5 pantallas
│   ├── services/         # Google Sheets API
│   └── types/            # TypeScript types
├── App.tsx              # Entry point
├── package.json         # Dependencias
├── README.md           # Docs completa
├── INICIO_RAPIDO.md    # Tour rápido
├── GOOGLE_SHEETS_SETUP.md  # Guía Sheets
└── COMANDOS.md         # Comandos útiles
```

## Soporte

Cualquier duda, revisa los archivos .md o los comentarios en el código.

¡Éxito con el proyecto! 🏉
